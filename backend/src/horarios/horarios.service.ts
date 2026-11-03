import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horario } from './horario.entity';
import { Cita } from '../citas/cita.entity';
import { MedicosService } from '../medicos/medicos.service';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { DiaSemana, EstadoCita } from '../common/enums';
import { aHora, aMinutos, diaSemanaDe, fechaLocal, horaLocal, sumarDias } from '../common/utils/fechas'; // [Disponibilidad]
import { Between, Not } from 'typeorm';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion'; // [Eliminacion]

const DIA_SEMANA_JS: Record<number, DiaSemana> = {
  0: DiaSemana.Domingo,
  1: DiaSemana.Lunes,
  2: DiaSemana.Martes,
  3: DiaSemana.Miercoles,
  4: DiaSemana.Jueves,
  5: DiaSemana.Viernes,
  6: DiaSemana.Sabado,
};

@Injectable()
export class HorariosService {
  constructor(
    @InjectRepository(Horario) private repo: Repository<Horario>,
    @InjectRepository(Cita) private citaRepo: Repository<Cita>,
    private medicosService: MedicosService,
  ) {}

  // Crea un horario validando: (1) duplicado de dia para el mismo medico, (2) horaFin > horaInicio
  async crear(dto: CreateHorarioDto): Promise<Horario> {
    const medico = await this.medicosService.obtener(dto.idMedico);

    const existeHorario = await this.repo.findOne({
      where: { medico: { id: dto.idMedico }, diaSemana: dto.diaSemana, ...NO_ELIMINADO }, // [Eliminacion]
    });
    if (existeHorario) {
      throw new ConflictException(
        `Ya existe un horario para este medico el dia ${dto.diaSemana}. Por favor, edita el horario existente o eliminalo primero.`,
      );
    }

    if (!(dto.horaFin > dto.horaInicio)) {
      throw new BadRequestException('La hora de fin debe ser mayor que la hora de inicio');
    }

    const horario = this.repo.create({
      medico,
      diaSemana: dto.diaSemana,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
    });
    return this.repo.save(horario);
  }

  listar(): Promise<Horario[]> {
    return this.repo.find({ where: NO_ELIMINADO }); // [Eliminacion]
  }

  async listarPorMedico(idMedico: number): Promise<Horario[]> {
    return this.repo.find({ where: { medico: { id: idMedico }, ...NO_ELIMINADO } }); // [Eliminacion]
  }

  async obtener(id: number): Promise<Horario> {
    const horario = await this.repo.findOne({ where: { id, ...NO_ELIMINADO } }); // [Eliminacion]
    if (!horario) throw new NotFoundException('Horario no encontrado');
    return horario;
  }

  // Calcula slots de 1 hora entre horaInicio y horaFin, marcando ocupado si ya hay una cita en esa hora
  async slotsDisponibles(idMedico: number, fecha: string) {
    const diaSemana = DIA_SEMANA_JS[new Date(fecha + 'T00:00:00').getDay()];

    const horarios = await this.repo.find({ where: { medico: { id: idMedico }, diaSemana, ...NO_ELIMINADO } }); // [Eliminacion]
    if (horarios.length === 0) return [];

    // [Disponibilidad] Las citas canceladas ya no ocupan el espacio
    const citasDelDia = (await this.citaRepo.find({ where: { medico: { id: idMedico }, fecha, ...NO_ELIMINADO } })).filter(
      (c) => c.estado !== EstadoCita.Cancelada,
    );

    const slots: { etiqueta: string; horaInicio: string; horaFin: string; ocupado: boolean }[] = [];

    for (const horario of horarios) {
      let actual = horario.horaInicio;
      while (actual < horario.horaFin) {
        const [h, m] = actual.split(':').map(Number);
        const finMinutos = h * 60 + m + 60;
        const finHora = String(Math.floor(finMinutos / 60)).padStart(2, '0');
        const finMin = String(finMinutos % 60).padStart(2, '0');
        const finSlot = `${finHora}:${finMin}`;

        const ocupado = citasDelDia.some((c) => c.horaInicio.slice(0, 5) === actual.slice(0, 5));

        slots.push({ etiqueta: actual.slice(0, 5), horaInicio: actual, horaFin: finSlot, ocupado });
        actual = finSlot;
      }
    }
    return slots;
  }

  // [Disponibilidad] Dias que atiende el medico en un rango y sus espacios libres.
  // Solo devuelve los dias en que el medico tiene horario; cada dia trae sus espacios
  // de `duracion` minutos marcados como libres, ocupados (otra cita) o pasados (hoy).
  async disponibilidad(idMedico: number, desde?: string, dias = 30, duracion = 30) {
    await this.medicosService.obtener(idMedico);
    const hoy = fechaLocal();
    const inicio = desde && desde > hoy ? desde : hoy;
    const totalDias = Math.min(Math.max(dias, 1), 90);
    const fin = sumarDias(inicio, totalDias - 1);
    const paso = Math.min(Math.max(duracion, 15), 120);

    const horarios = await this.repo.find({ where: { medico: { id: idMedico }, ...NO_ELIMINADO } }); // [Eliminacion]
    const citas = await this.citaRepo.find({
      where: { medico: { id: idMedico }, fecha: Between(inicio, fin), estado: Not(EstadoCita.Cancelada), ...NO_ELIMINADO },
    });
    const ahora = aMinutos(horaLocal());

    const resultado: any[] = [];
    for (let i = 0; i < totalDias; i++) {
      const fecha = sumarDias(inicio, i);
      const dia = diaSemanaDe(fecha);
      const delDia = horarios.filter((h) => h.diaSemana === dia);
      if (!delDia.length) continue;
      const citasDia = citas.filter((c) => c.fecha === fecha);

      for (const h of delDia) {
        const slots: { horaInicio: string; horaFin: string; estado: 'libre' | 'ocupado' | 'pasado' }[] = [];
        for (let t = aMinutos(h.horaInicio); t + paso <= aMinutos(h.horaFin); t += paso) {
          const tFin = t + paso;
          const ocupado = citasDia.some((c) => aMinutos(c.horaInicio) < tFin && aMinutos(c.horaFin) > t);
          const pasado = fecha === hoy && t <= ahora;
          slots.push({ horaInicio: aHora(t), horaFin: aHora(tFin), estado: ocupado ? 'ocupado' : pasado ? 'pasado' : 'libre' });
        }
        resultado.push({
          fecha,
          diaSemana: dia,
          idHorario: h.id,
          horaInicio: h.horaInicio.slice(0, 5),
          horaFin: h.horaFin.slice(0, 5),
          total: slots.length,
          libres: slots.filter((s) => s.estado === 'libre').length,
          slots,
        });
      }
    }
    return {
      idMedico,
      desde: inicio,
      hasta: fin,
      duracionMinutos: paso,
      diasAtencion: [...new Set(horarios.map((h) => h.diaSemana))],
      proximaFechaDisponible: resultado.find((d) => d.libres > 0)?.fecha ?? null,
      dias: resultado,
    };
  }

  // Actualiza validando duplicado de dia (si cambio) y rango de horas
  async actualizar(id: number, dto: UpdateHorarioDto): Promise<Horario> {
    const horario = await this.obtener(id);

    if (horario.diaSemana !== dto.diaSemana) {
      const existeOtro = await this.repo.findOne({
        where: { medico: { id: horario.medico.id }, diaSemana: dto.diaSemana, ...NO_ELIMINADO }, // [Eliminacion]
      });
      if (existeOtro && existeOtro.id !== id) {
        throw new ConflictException(`Ya existe otro horario para este medico el dia ${dto.diaSemana}`);
      }
    }

    if (!(dto.horaFin > dto.horaInicio)) {
      throw new BadRequestException('La hora de fin debe ser mayor que la hora de inicio');
    }

    horario.diaSemana = dto.diaSemana;
    horario.horaInicio = dto.horaInicio;
    horario.horaFin = dto.horaFin;
    return this.repo.save(horario);
  }
}
