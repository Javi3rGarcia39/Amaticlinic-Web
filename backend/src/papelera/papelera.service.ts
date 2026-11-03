import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Usuario } from '../usuarios/usuario.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Medico } from '../medicos/medico.entity';
import { Horario } from '../horarios/horario.entity';
import { Cita } from '../citas/cita.entity';
import { HistorialMedico } from '../historial/historial.entity';
import { Especialidad } from '../catalogos/especialidad.entity';
import { Seguro } from '../catalogos/seguro.entity';
import { Receta } from '../farmacia/entities/receta.entity';
import { Emergencia } from '../emergencias/emergencia.entity';
import { Notificacion } from '../notificaciones/notificacion.entity';
import { RegistroEliminacion } from './entities/registro-eliminacion.entity';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion';
import { EstadoCita, TipoUsuario } from '../common/enums';
import { fechaLocal } from '../common/utils/fechas';

export const TIPOS = ['cita', 'paciente', 'medico', 'horario', 'historial', 'usuario', 'especialidad', 'seguro'] as const;
export type TipoElemento = (typeof TIPOS)[number];

const ETIQUETA: Record<TipoElemento, string> = {
  cita: 'Cita', paciente: 'Paciente', medico: 'Medico', horario: 'Horario', historial: 'Historial medico',
  usuario: 'Usuario', especialidad: 'Especialidad', seguro: 'Seguro',
};
const ACTIVAS = [EstadoCita.Agendada, EstadoCita.Modificada];
const JUNTO_AL_MEDICO = 'Se elimino junto con el medico';
const EN_PAPELERA = { eliminadoEn: Not(IsNull()) };

export interface ElementoPapelera {
  tipo: TipoElemento;
  etiqueta: string;
  id: number;
  titulo: string;
  detalle: string;
  eliminadoEn: Date;
  eliminadoPor: string | null;
  motivo: string | null;
}

const nombre = (u: Usuario) => `${u.nombre} ${u.apellido}`;
const hora = (h: string) => (h ?? '').slice(0, 5);

// [Eliminacion] Papelera de la clinica.
//  - eliminar():            borrado logico (oculta el registro; no lo borra de la base)
//  - restaurar():           lo regresa a las pantallas
//  - eliminarDefinitivo():  borra de la base, solo con el nombre de quien lo solicito. Si un paciente tiene
//                           historial, recetas o citas, en lugar de borrarlo se anonimiza (se conservan los
//                           registros clinicos sin sus datos personales).
//  - anonimizar():          tambien lo usa la solicitud de eliminacion del paciente.
// Todo queda en la bitacora (registro_eliminacion).
@Injectable()
export class PapeleraService {
  constructor(
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Paciente) private pacienteRepo: Repository<Paciente>,
    @InjectRepository(Medico) private medicoRepo: Repository<Medico>,
    @InjectRepository(Horario) private horarioRepo: Repository<Horario>,
    @InjectRepository(Cita) private citaRepo: Repository<Cita>,
    @InjectRepository(HistorialMedico) private historialRepo: Repository<HistorialMedico>,
    @InjectRepository(Especialidad) private espRepo: Repository<Especialidad>,
    @InjectRepository(Seguro) private seguroRepo: Repository<Seguro>,
    @InjectRepository(RegistroEliminacion) private bitacoraRepo: Repository<RegistroEliminacion>,
    private dataSource: DataSource,
  ) {}

  // ------------------------------------------------------------------ utilidades
  validarTipo(tipo: string): TipoElemento {
    if (!(TIPOS as readonly string[]).includes(tipo)) throw new BadRequestException(`Tipo desconocido: ${tipo}`);
    return tipo as TipoElemento;
  }

  async registrar(
    tipo: TipoElemento, idElemento: number, descripcion: string, accion: string, usuario: string,
    solicitadoPor: string | null = null, motivo: string | null = null,
  ) {
    await this.bitacoraRepo.save(
      this.bitacoraRepo.create({
        tipo, idElemento, descripcion: descripcion.slice(0, 255), accion, usuario,
        solicitadoPor: solicitadoPor?.trim() || null, motivo: motivo?.trim() || null,
      }),
    );
  }

  bitacora(limite = 200) {
    return this.bitacoraRepo.find({ order: { fecha: 'DESC', id: 'DESC' }, take: limite });
  }

  private async citasFuturas(columna: 'id_paciente' | 'id_medico' | 'id_horario', id: number) {
    return this.citaRepo
      .createQueryBuilder('c')
      .where(`c.${columna} = :id`, { id })
      .andWhere('c.fecha >= :hoy', { hoy: fechaLocal() })
      .andWhere('c.estado IN (:...act)', { act: ACTIVAS })
      .andWhere('c.eliminado_en IS NULL')
      .getCount();
  }

  private describir(tipo: TipoElemento, e: any): { titulo: string; detalle: string } {
    switch (tipo) {
      case 'cita':
        return {
          titulo: `${e.fecha} ${hora(e.horaInicio)} - ${nombre(e.paciente.usuario)}`,
          detalle: `Dr(a). ${nombre(e.medico.usuario)} · ${e.estado}`,
        };
      case 'paciente':
        return { titulo: nombre(e.usuario), detalle: [e.usuario.correo, e.documentoIdentidad].filter(Boolean).join(' · ') };
      case 'medico':
        return { titulo: `Dr(a). ${nombre(e.usuario)}`, detalle: `${e.especialidad} · ${e.usuario.correo}` };
      case 'horario':
        return { titulo: `Dr(a). ${nombre(e.medico.usuario)} - ${e.diaSemana}`, detalle: `${hora(e.horaInicio)} a ${hora(e.horaFin)}` };
      case 'historial':
        return { titulo: `Historial de ${nombre(e.paciente.usuario)}`, detalle: String(e.diagnostico).slice(0, 120) };
      case 'usuario':
        return { titulo: nombre(e), detalle: `${e.correo} · ${e.tipoUsuario}` };
      case 'especialidad':
        return { titulo: e.nombre, detalle: `Consulta Q${Number(e.precioConsulta).toFixed(2)}` };
      case 'seguro':
        return { titulo: e.nombre, detalle: `${e.descuentoConsulta}% consultas, ${e.descuentoMedicamentos}% medicamentos` };
    }
  }

  /** Descripcion para la bitacora: en citas e historial solo el numero de paciente */
  private descripcionBitacora(tipo: TipoElemento, e: any): string {
    if (tipo === 'cita') return `Cita ${e.fecha} ${hora(e.horaInicio)} · paciente #${e.paciente.id} · Dr(a). ${nombre(e.medico.usuario)}`;
    if (tipo === 'historial') return `Historial #${e.id} · paciente #${e.paciente.id}`;
    const d = this.describir(tipo, e);
    return `${d.titulo} (${d.detalle})`;
  }

  private repo(tipo: TipoElemento): Repository<any> {
    return {
      cita: this.citaRepo, paciente: this.pacienteRepo, medico: this.medicoRepo, horario: this.horarioRepo,
      historial: this.historialRepo, usuario: this.usuarioRepo, especialidad: this.espRepo, seguro: this.seguroRepo,
    }[tipo];
  }

  // ------------------------------------------------------------------ eliminar (a la papelera)
  async eliminar(tipoTexto: string, id: number, quien: string, motivo?: string) {
    const tipo = this.validarTipo(tipoTexto);
    const e: any = await this.repo(tipo).findOne({ where: { id, ...NO_ELIMINADO } });
    if (!e) throw new NotFoundException(`${ETIQUETA[tipo]} no encontrado`);
    const marca = { eliminadoEn: new Date(), eliminadoPor: quien, motivoEliminacion: motivo?.trim() || null };

    if (tipo === 'paciente' || tipo === 'medico' || tipo === 'horario') {
      const columna = tipo === 'paciente' ? 'id_paciente' : tipo === 'medico' ? 'id_medico' : 'id_horario';
      const n = await this.citasFuturas(columna, id);
      if (n > 0) {
        throw new ConflictException(
          `No se puede eliminar: tiene ${n} cita(s) programada(s). Cancelalas o reprogramalas primero.`,
        );
      }
    }
    if (tipo === 'usuario') {
      if (e.correo === quien) throw new ConflictException('No puedes eliminar tu propia cuenta');
      const esPaciente = await this.pacienteRepo.count({ where: { usuario: { id } } });
      const esMedico = await this.medicoRepo.count({ where: { usuario: { id } } });
      if (esPaciente || esMedico) {
        throw new ConflictException(`Este usuario es un ${esPaciente ? 'paciente' : 'medico'}: eliminalo desde la pantalla de ${esPaciente ? 'Pacientes' : 'Medicos'}`);
      }
    }

    await this.dataSource.transaction(async (m) => {
      await m.update(this.repo(tipo).target, id, marca);
      if (tipo === 'paciente' || tipo === 'medico') {
        await m.update(Usuario, e.usuario.id, marca);
      }
      if (tipo === 'medico') {
        // Sus horarios se ocultan con el y regresan si se restaura
        await m
          .createQueryBuilder()
          .update(Horario)
          .set({ ...marca, motivoEliminacion: JUNTO_AL_MEDICO })
          .where('id_medico = :id AND eliminado_en IS NULL', { id })
          .execute();
      }
    });
    await this.registrar(tipo, id, this.descripcionBitacora(tipo, e), 'Eliminado', quien, null, motivo);
  }

  // ------------------------------------------------------------------ listado
  async listar(): Promise<ElementoPapelera[]> {
    const orden = { order: { eliminadoEn: 'DESC' as const } };
    const [citas, pacientes, medicos, horarios, historial, usuarios, esps, seguros] = await Promise.all([
      this.citaRepo.find({ where: EN_PAPELERA, ...orden }),
      this.pacienteRepo.find({ where: { ...EN_PAPELERA, anonimizado: false }, ...orden }),
      this.medicoRepo.find({ where: EN_PAPELERA, ...orden }),
      this.horarioRepo.find({ where: EN_PAPELERA, ...orden }),
      this.historialRepo.find({ where: EN_PAPELERA, ...orden }),
      this.usuarioRepo.find({ where: EN_PAPELERA, ...orden }),
      this.espRepo.find({ where: EN_PAPELERA, ...orden }),
      this.seguroRepo.find({ where: EN_PAPELERA, ...orden }),
    ]);
    const lista: ElementoPapelera[] = [];
    const agregar = (tipo: TipoElemento, filas: any[]) =>
      filas.forEach((e) =>
        lista.push({
          tipo, etiqueta: ETIQUETA[tipo], id: e.id, ...this.describir(tipo, e),
          eliminadoEn: e.eliminadoEn, eliminadoPor: e.eliminadoPor, motivo: e.motivoEliminacion,
        }),
      );
    agregar('cita', citas);
    agregar('paciente', pacientes);
    agregar('medico', medicos);
    agregar('horario', horarios);
    agregar('historial', historial);
    // Las cuentas de pacientes y medicos se muestran con su perfil, no por separado
    agregar('usuario', usuarios.filter((u) => u.tipoUsuario !== TipoUsuario.Paciente && u.tipoUsuario !== TipoUsuario.Medico));
    agregar('especialidad', esps);
    agregar('seguro', seguros);
    return lista.sort((a, b) => new Date(b.eliminadoEn).getTime() - new Date(a.eliminadoEn).getTime());
  }

  private async enPapelera(tipo: TipoElemento, id: number): Promise<any> {
    const e = await this.repo(tipo).findOne({ where: { id, ...EN_PAPELERA } });
    if (!e) throw new NotFoundException(`${ETIQUETA[tipo]} no esta en la papelera`);
    return e;
  }

  // ------------------------------------------------------------------ restaurar
  async restaurar(tipoTexto: string, id: number, quien: string) {
    const tipo = this.validarTipo(tipoTexto);
    const e = await this.enPapelera(tipo, id);
    const quitar = { eliminadoEn: null, eliminadoPor: null, motivoEliminacion: null };

    if (tipo === 'cita') {
      if (e.paciente.eliminadoEn) throw new ConflictException('Primero restaura al paciente de esta cita');
      if (e.medico.eliminadoEn) throw new ConflictException('Primero restaura al medico de esta cita');
      if (ACTIVAS.includes(e.estado) && e.fecha >= fechaLocal()) {
        const choque = await this.citaRepo
          .createQueryBuilder('c')
          .where('c.id <> :id', { id })
          .andWhere('(c.id_medico = :m OR c.id_paciente = :p)', { m: e.medico.id, p: e.paciente.id })
          .andWhere('c.fecha = :f', { f: e.fecha })
          .andWhere('c.hora_inicio < :fin AND c.hora_fin > :ini', { ini: e.horaInicio, fin: e.horaFin })
          .andWhere('c.estado IN (:...act)', { act: ACTIVAS })
          .andWhere('c.eliminado_en IS NULL')
          .getCount();
        if (choque) throw new ConflictException('Ese espacio ya fue ocupado por otra cita; no se puede restaurar');
      }
    }
    if (tipo === 'paciente' && e.anonimizado) throw new ConflictException('Los datos de este paciente ya fueron eliminados');
    if (tipo === 'horario') {
      if (e.medico.eliminadoEn) throw new ConflictException('Primero restaura al medico de este horario');
      const otro = await this.horarioRepo.count({ where: { medico: { id: e.medico.id }, diaSemana: e.diaSemana, ...NO_ELIMINADO } });
      if (otro) throw new ConflictException(`El medico ya tiene otro horario el ${e.diaSemana}`);
    }

    let horariosRestaurados = 0;
    await this.dataSource.transaction(async (m) => {
      await m.update(this.repo(tipo).target, id, quitar);
      if (tipo === 'paciente' || tipo === 'medico') await m.update(Usuario, e.usuario.id, quitar);
      if (tipo === 'medico') {
        const suyos = await m.find(Horario, {
          where: { medico: { id }, eliminadoEn: e.eliminadoEn, motivoEliminacion: JUNTO_AL_MEDICO },
        });
        for (const h of suyos) {
          const ocupado = await m.count(Horario, { where: { medico: { id }, diaSemana: h.diaSemana, ...NO_ELIMINADO } });
          if (!ocupado) {
            await m.update(Horario, h.id, quitar);
            horariosRestaurados++;
          }
        }
      }
    });
    await this.registrar(tipo, id, this.descripcionBitacora(tipo, e), 'Restaurado', quien);
    return { restaurado: true, horariosRestaurados };
  }

  // ------------------------------------------------------------------ eliminar definitivamente
  async eliminarDefinitivo(tipoTexto: string, id: number, quien: string, solicitadoPor: string, motivo?: string) {
    const tipo = this.validarTipo(tipoTexto);
    if (!solicitadoPor?.trim()) throw new BadRequestException('Indica quien solicito la eliminacion definitiva');
    const e = await this.enPapelera(tipo, id);
    const descripcion = this.descripcionBitacora(tipo, e);

    if (tipo === 'paciente') {
      const tieneRegistros =
        (await this.citaRepo.count({ where: { paciente: { id } } })) +
        (await this.historialRepo.count({ where: { paciente: { id } } })) +
        (await this.dataSource.getRepository(Receta).count({ where: { paciente: { id } } })) +
        (await this.dataSource.getRepository(Emergencia).count({ where: { paciente: { id } } }));
      if (tieneRegistros) {
        await this.anonimizar(e, quien, motivo || null, solicitadoPor);
        return { resultado: 'anonimizado' as const };
      }
    }
    if (tipo === 'medico') {
      const tieneRegistros =
        (await this.citaRepo.count({ where: { medico: { id } } })) +
        (await this.historialRepo.count({ where: { medico: { id } } })) +
        (await this.dataSource.getRepository(Receta).count({ where: { medico: { id } } }));
      if (tieneRegistros) {
        throw new ConflictException(
          'El medico tiene citas, recetas o historial registrados. Esos registros clinicos se conservan, por eso el medico queda en la papelera.',
        );
      }
    }
    if (tipo === 'cita') {
      const conReceta = await this.dataSource.getRepository(Receta).count({ where: { cita: { id } } });
      const conEmergencia = await this.dataSource.getRepository(Emergencia).count({ where: { cita: { id } } });
      if (conReceta || conEmergencia) {
        throw new ConflictException('La cita tiene una receta o una atencion de emergencia; se conserva en la papelera.');
      }
    }

    try {
      await this.dataSource.transaction(async (m) => {
        switch (tipo) {
          case 'cita':
            await m.delete(Notificacion, { cita: { id } });
            await m.delete(Cita, id);
            break;
          case 'paciente':
            await m.delete(Paciente, id);
            await m.delete(Usuario, e.usuario.id);
            break;
          case 'medico':
            await m.delete(Horario, { medico: { id } });
            await m.delete(Medico, id);
            await m.delete(Usuario, e.usuario.id);
            break;
          case 'horario':
            // Las citas pasadas conservan fecha y hora; solo pierden la referencia al horario
            await m.createQueryBuilder().update(Cita).set({ horario: null }).where('id_horario = :id', { id }).execute();
            await m.delete(Horario, id);
            break;
          default:
            await m.delete(this.repo(tipo).target, id);
        }
      });
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23503') {
        throw new ConflictException(
          'No se puede borrar definitivamente porque otros registros dependen de el. Se conserva en la papelera.',
        );
      }
      throw err;
    }
    await this.registrar(tipo, id, descripcion, 'Eliminado definitivamente', quien, solicitadoPor, motivo || null);
    return { resultado: 'eliminado' as const };
  }

  // ------------------------------------------------------------------ anonimizar paciente
  /**
   * Borra los datos personales del paciente y conserva sus registros clinicos (historial, recetas,
   * citas pasadas) a nombre de "Paciente anonimizado #id". Sus citas futuras se cancelan y su cuenta
   * ya no puede iniciar sesion.
   */
  async anonimizar(paciente: Paciente, quien: string, motivo: string | null, solicitadoPor: string, manager?: EntityManager) {
    if (paciente.anonimizado) throw new ConflictException('Los datos de este paciente ya fueron eliminados');
    const ahora = new Date();
    const idUsuario = paciente.usuario.id;
    const claveImposible = await bcrypt.hash(randomBytes(24).toString('hex'), 10);

    const trabajo = async (m: EntityManager) => {
      await m
        .createQueryBuilder()
        .update(Cita)
        .set({ estado: EstadoCita.Cancelada })
        .where('id_paciente = :id AND fecha >= :hoy AND estado IN (:...act)', { id: paciente.id, hoy: fechaLocal(), act: ACTIVAS })
        .execute();
      await m.update(Usuario, idUsuario, {
        nombre: 'Paciente',
        apellido: `anonimizado #${paciente.id}`,
        correo: `anonimo.${idUsuario}@amaticlinic.local`,
        telefono: null,
        password: claveImposible,
        eliminadoEn: ahora,
        eliminadoPor: quien,
        motivoEliminacion: 'Datos personales eliminados por solicitud',
      });
      await m
        .createQueryBuilder()
        .update(Paciente)
        .set({
          documentoIdentidad: null, fechaNacimiento: null, telefono: null, correo: null, direccion: null,
          contactoEmergenciaNombre: null, contactoEmergenciaTelefono: null, numeroPoliza: null, seguro: null,
          anonimizado: true,
          eliminadoEn: paciente.eliminadoEn ?? ahora,
          eliminadoPor: paciente.eliminadoPor ?? quien,
          motivoEliminacion: motivo || 'Datos personales eliminados por solicitud',
        })
        .where('id_paciente = :id', { id: paciente.id })
        .execute();
      // El nombre del paciente tampoco debe quedar en la bitacora
      await m
        .createQueryBuilder()
        .update(RegistroEliminacion)
        .set({ descripcion: `Paciente #${paciente.id} (datos anonimizados)` })
        .where("tipo = 'paciente' AND id_elemento = :id", { id: paciente.id })
        .execute();
    };
    if (manager) await trabajo(manager);
    else await this.dataSource.transaction(trabajo);

    await this.registrar('paciente', paciente.id, `Paciente #${paciente.id} (datos anonimizados)`, 'Anonimizado', quien, solicitadoPor, motivo);
  }
}
