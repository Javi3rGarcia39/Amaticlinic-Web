import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Especialidad } from './especialidad.entity';
import { Seguro } from './seguro.entity';
import {
  Configuracion, CONFIG_METODO_INVENTARIO, CONFIG_POR_DEFECTO, CONFIG_PRECIO_EMERGENCIA,
} from './configuracion.entity';
import { Medico } from '../medicos/medico.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { EspecialidadDto, SeguroDto } from './dto/catalogos.dto';
import { redondear } from '../common/utils/fechas';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion'; // [Eliminacion]

export type MetodoInventario = 'FIFO' | 'LIFO';

export interface CalculoCosto {
  costo: number;
  porcentaje: number;
  descuento: number;
  total: number;
  seguro: string | null;
}

// [Catalogo] [Seguros] [Configuracion] Catalogos de la clinica y calculo de precios con descuento
@Injectable()
export class CatalogosService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Catalogos');

  constructor(
    @InjectRepository(Especialidad) private espRepo: Repository<Especialidad>,
    @InjectRepository(Seguro) private seguroRepo: Repository<Seguro>,
    @InjectRepository(Configuracion) private configRepo: Repository<Configuracion>,
    @InjectRepository(Medico) private medicoRepo: Repository<Medico>,
    private dataSource: DataSource,
  ) {}

  // ------------------------------------------------------------------ arranque
  // Migra los datos existentes al nuevo modelo sin perder informacion:
  //  1) crea la configuracion por defecto
  //  2) convierte la especialidad en texto libre de cada medico en un registro del catalogo
  //  3) calcula el costo de las citas que se crearon antes de existir los precios
  async onApplicationBootstrap() {
    try {
      for (const [clave, def] of Object.entries(CONFIG_POR_DEFECTO)) {
        if (!(await this.configRepo.findOne({ where: { clave } }))) {
          await this.configRepo.save(this.configRepo.create({ clave, valor: def.valor, descripcion: def.descripcion }));
        }
      }

      const sinCatalogo = await this.medicoRepo
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.especialidadCatalogo', 'e')
        .where('m.id_especialidad IS NULL')
        .getMany();
      for (const medico of sinCatalogo) {
        const esp = await this.buscarOCrearEspecialidad(medico.especialidad);
        await this.medicoRepo.update(medico.id, { especialidadCatalogo: esp, especialidad: esp.nombre });
      }
      if (sinCatalogo.length) this.logger.log(`${sinCatalogo.length} medico(s) vinculados al catalogo de especialidades`);

      const precioEmergencia = await this.precioEmergencia();
      const actualizadas = await this.dataSource.query(
        `UPDATE citas_medicas.cita c
            SET costo_consulta = sub.costo,
                porcentaje_descuento = sub.pct,
                monto_descuento = ROUND(sub.costo * sub.pct / 100, 2),
                total_pagar = sub.costo - ROUND(sub.costo * sub.pct / 100, 2),
                seguro_aplicado = sub.seguro
           FROM (
             SELECT c2.id_cita,
                    CASE WHEN c2.es_emergencia THEN $1::numeric ELSE COALESCE(e.precio_consulta, 0) END AS costo,
                    COALESCE(s.descuento_consulta, 0) AS pct,
                    s.nombre AS seguro
               FROM citas_medicas.cita c2
               JOIN citas_medicas.medico m ON m.id_medico = c2.id_medico
               LEFT JOIN citas_medicas.especialidad e ON e.id_especialidad = m.id_especialidad
               JOIN citas_medicas.paciente p ON p.id_paciente = c2.id_paciente
               LEFT JOIN citas_medicas.seguro s ON s.id_seguro = p.id_seguro AND s.activo
              WHERE c2.costo_consulta IS NULL
           ) sub
          WHERE c.id_cita = sub.id_cita`,
        [precioEmergencia],
      );
      const n = Array.isArray(actualizadas) ? actualizadas[1] : 0;
      if (n) this.logger.log(`${n} cita(s) existentes con costo calculado`);
    } catch (e) {
      this.logger.error(`No se pudo completar la migracion de catalogos: ${(e as Error).message}`);
    }
  }

  // ------------------------------------------------------------------ especialidades
  listarEspecialidades(incluirInactivas = false): Promise<Especialidad[]> {
    return this.espRepo.find({ where: { ...(incluirInactivas ? {} : { activo: true }), ...NO_ELIMINADO }, order: { nombre: 'ASC' } }); // [Eliminacion]
  }

  async conteoMedicosPorEspecialidad(): Promise<Map<number, number>> {
    const filas = await this.medicoRepo
      .createQueryBuilder('m')
      .select('m.id_especialidad', 'id')
      .addSelect('COUNT(*)', 'total')
      .where('m.eliminado_en IS NULL') // [Eliminacion]
      .groupBy('m.id_especialidad')
      .getRawMany();
    return new Map(filas.filter((f) => f.id).map((f) => [Number(f.id), Number(f.total)]));
  }

  async obtenerEspecialidad(id: number): Promise<Especialidad> {
    const esp = await this.espRepo.findOne({ where: { id, ...NO_ELIMINADO } }); // [Eliminacion]
    if (!esp) throw new NotFoundException('Especialidad no encontrada');
    return esp;
  }

  /** Busca por nombre (sin distinguir mayusculas) y si no existe la crea con precio 0 */
  async buscarOCrearEspecialidad(nombre: string): Promise<Especialidad> {
    const limpio = (nombre || 'Medicina General').trim();
    const existente = await this.espRepo
      .createQueryBuilder('e')
      .where('LOWER(e.nombre) = :n', { n: limpio.toLowerCase() })
      .getOne();
    if (existente) return existente;
    return this.espRepo.save(this.espRepo.create({ nombre: limpio, precioConsulta: 0, activo: true }));
  }

  private async validarNombreEspecialidad(nombre: string, excluirId?: number) {
    const qb = this.espRepo.createQueryBuilder('e').where('LOWER(e.nombre) = :n', { n: nombre.trim().toLowerCase() });
    if (excluirId) qb.andWhere('e.id <> :id', { id: excluirId });
    if (await qb.getCount()) throw new ConflictException(`Ya existe la especialidad ${nombre.trim()}`);
  }

  async crearEspecialidad(dto: EspecialidadDto): Promise<Especialidad> {
    await this.validarNombreEspecialidad(dto.nombre);
    return this.espRepo.save(
      this.espRepo.create({
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        precioConsulta: redondear(dto.precioConsulta),
        activo: dto.activo ?? true,
      }),
    );
  }

  async actualizarEspecialidad(id: number, dto: EspecialidadDto): Promise<Especialidad> {
    const esp = await this.obtenerEspecialidad(id);
    await this.validarNombreEspecialidad(dto.nombre, id);
    esp.nombre = dto.nombre.trim();
    esp.descripcion = dto.descripcion?.trim() || null;
    esp.precioConsulta = redondear(dto.precioConsulta);
    if (dto.activo !== undefined) esp.activo = dto.activo;
    const guardada = await this.espRepo.save(esp);
    // Mantiene el nombre de texto de los medicos sincronizado con el catalogo
    await this.medicoRepo
      .createQueryBuilder()
      .update(Medico)
      .set({ especialidad: guardada.nombre.slice(0, 50) })
      .where('id_especialidad = :id', { id })
      .execute();
    return guardada;
  }

  /** Si tiene medicos asignados no se borra: se desactiva */
  async eliminarEspecialidad(id: number, quien: string, motivo?: string): Promise<{ eliminada: boolean; desactivada: boolean }> {
    const esp = await this.obtenerEspecialidad(id);
    const medicos = await this.medicoRepo.count({ where: { especialidadCatalogo: { id }, ...NO_ELIMINADO } }); // [Eliminacion]
    if (medicos > 0) {
      esp.activo = false;
      await this.espRepo.save(esp);
      return { eliminada: false, desactivada: true };
    }
    // [Eliminacion] Sin medicos: se manda a la papelera (no se borra de la base)
    Object.assign(esp, { eliminadoEn: new Date(), eliminadoPor: quien, motivoEliminacion: motivo || null });
    await this.espRepo.save(esp);
    return { eliminada: true, desactivada: false };
  }

  // ------------------------------------------------------------------ seguros
  listarSeguros(incluirInactivos = false): Promise<Seguro[]> {
    return this.seguroRepo.find({ where: { ...(incluirInactivos ? {} : { activo: true }), ...NO_ELIMINADO }, order: { nombre: 'ASC' } }); // [Eliminacion]
  }

  async obtenerSeguro(id: number): Promise<Seguro> {
    const seguro = await this.seguroRepo.findOne({ where: { id, ...NO_ELIMINADO } }); // [Eliminacion]
    if (!seguro) throw new NotFoundException('Seguro no encontrado');
    return seguro;
  }

  private async validarNombreSeguro(nombre: string, excluirId?: number) {
    const qb = this.seguroRepo.createQueryBuilder('s').where('LOWER(s.nombre) = :n', { n: nombre.trim().toLowerCase() });
    if (excluirId) qb.andWhere('s.id <> :id', { id: excluirId });
    if (await qb.getCount()) throw new ConflictException(`Ya existe el seguro ${nombre.trim()}`);
  }

  async crearSeguro(dto: SeguroDto): Promise<Seguro> {
    await this.validarNombreSeguro(dto.nombre);
    return this.seguroRepo.save(
      this.seguroRepo.create({
        nombre: dto.nombre.trim(),
        descuentoConsulta: redondear(dto.descuentoConsulta),
        descuentoMedicamentos: redondear(dto.descuentoMedicamentos),
        telefono: dto.telefono?.trim() || null,
        activo: dto.activo ?? true,
      }),
    );
  }

  async actualizarSeguro(id: number, dto: SeguroDto): Promise<Seguro> {
    const seguro = await this.obtenerSeguro(id);
    await this.validarNombreSeguro(dto.nombre, id);
    seguro.nombre = dto.nombre.trim();
    seguro.descuentoConsulta = redondear(dto.descuentoConsulta);
    seguro.descuentoMedicamentos = redondear(dto.descuentoMedicamentos);
    seguro.telefono = dto.telefono?.trim() || null;
    if (dto.activo !== undefined) seguro.activo = dto.activo;
    return this.seguroRepo.save(seguro);
  }

  async eliminarSeguro(id: number, quien: string, motivo?: string): Promise<{ eliminado: boolean; desactivado: boolean }> {
    const seguro = await this.obtenerSeguro(id);
    const pacientes = await this.dataSource.getRepository(Paciente).count({ where: { seguro: { id }, ...NO_ELIMINADO } }); // [Eliminacion]
    if (pacientes > 0) {
      seguro.activo = false;
      await this.seguroRepo.save(seguro);
      return { eliminado: false, desactivado: true };
    }
    // [Eliminacion] Sin pacientes: se manda a la papelera (no se borra de la base)
    Object.assign(seguro, { eliminadoEn: new Date(), eliminadoPor: quien, motivoEliminacion: motivo || null });
    await this.seguroRepo.save(seguro);
    return { eliminado: true, desactivado: false };
  }

  async conteoPacientesPorSeguro(): Promise<Map<number, number>> {
    const filas = await this.dataSource
      .getRepository(Paciente)
      .createQueryBuilder('p')
      .select('p.id_seguro', 'id')
      .addSelect('COUNT(*)', 'total')
      .where('p.id_seguro IS NOT NULL')
      .andWhere('p.eliminado_en IS NULL') // [Eliminacion]
      .groupBy('p.id_seguro')
      .getRawMany();
    return new Map(filas.map((f) => [Number(f.id), Number(f.total)]));
  }

  // ------------------------------------------------------------------ configuracion
  async obtenerConfig(clave: string): Promise<string> {
    const fila = await this.configRepo.findOne({ where: { clave } });
    return fila?.valor ?? CONFIG_POR_DEFECTO[clave]?.valor ?? '';
  }

  async guardarConfig(clave: string, valor: string): Promise<void> {
    const def = CONFIG_POR_DEFECTO[clave];
    await this.configRepo.save(this.configRepo.create({ clave, valor, descripcion: def?.descripcion ?? null }));
  }

  async metodoInventario(): Promise<MetodoInventario> {
    return (await this.obtenerConfig(CONFIG_METODO_INVENTARIO)) === 'LIFO' ? 'LIFO' : 'FIFO';
  }

  async cambiarMetodoInventario(metodo: MetodoInventario): Promise<MetodoInventario> {
    if (metodo !== 'FIFO' && metodo !== 'LIFO') throw new BadRequestException('Metodo invalido');
    await this.guardarConfig(CONFIG_METODO_INVENTARIO, metodo);
    return metodo;
  }

  async precioEmergencia(): Promise<number> {
    return Number(await this.obtenerConfig(CONFIG_PRECIO_EMERGENCIA)) || 0;
  }

  async cambiarPrecioEmergencia(precio: number): Promise<number> {
    await this.guardarConfig(CONFIG_PRECIO_EMERGENCIA, String(redondear(precio)));
    return redondear(precio);
  }

  // ------------------------------------------------------------------ precios
  /** Aplica el % del seguro (si esta activo) sobre un costo */
  static aplicarDescuento(costo: number, seguro: Seguro | null | undefined, tipo: 'consulta' | 'medicamentos'): CalculoCosto {
    const base = redondear(Number(costo) || 0);
    const activo = seguro && seguro.activo;
    const porcentaje = activo
      ? Number(tipo === 'consulta' ? seguro.descuentoConsulta : seguro.descuentoMedicamentos) || 0
      : 0;
    const descuento = redondear((base * porcentaje) / 100);
    return { costo: base, porcentaje, descuento, total: redondear(base - descuento), seguro: activo ? seguro.nombre : null };
  }

  /** Costo de la consulta con un medico para un paciente, segun su especialidad y su seguro */
  costoConsulta(medico: Medico, paciente: Paciente): CalculoCosto {
    const precio = Number(medico.especialidadCatalogo?.precioConsulta ?? 0);
    return CatalogosService.aplicarDescuento(precio, paciente.seguro, 'consulta');
  }
}
