import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medico } from '../medicos/medico.entity';
import { Horario } from '../horarios/horario.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Cita } from '../citas/cita.entity';
import { CatalogosService } from '../catalogos/catalogos.service';
import { DIAS_SEMANA } from '../common/utils/fechas';
import { EstadoCita } from '../common/enums';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion'; // [Eliminacion]

// [Landing] Informacion publica para la pagina de inicio (no requiere iniciar sesion).
// Solo expone datos de presentacion: nada de correos, telefonos personales ni datos de pacientes.
@Controller('api/publico')
export class PublicoController {
  constructor(
    @InjectRepository(Medico) private medicoRepo: Repository<Medico>,
    @InjectRepository(Horario) private horarioRepo: Repository<Horario>,
    @InjectRepository(Paciente) private pacienteRepo: Repository<Paciente>,
    @InjectRepository(Cita) private citaRepo: Repository<Cita>,
    private catalogos: CatalogosService,
  ) {}

  @Get('inicio')
  async inicio() {
    const [medicos, horarios, especialidades, seguros, pacientes, atendidas, precioEmergencia] = await Promise.all([
      this.medicoRepo.find({ where: NO_ELIMINADO }), // [Eliminacion]
      this.horarioRepo.find({ where: NO_ELIMINADO }),
      this.catalogos.listarEspecialidades(),
      this.catalogos.listarSeguros(),
      this.pacienteRepo.count({ where: NO_ELIMINADO }),
      this.citaRepo.count({ where: { estado: EstadoCita.Completada, ...NO_ELIMINADO } }),
      this.catalogos.precioEmergencia(),
    ]);

    const orden = (d: string) => (DIAS_SEMANA.indexOf(d as any) + 6) % 7; // lunes primero
    const medicosPublicos = medicos
      .filter((m) => m.especialidadCatalogo?.activo !== false)
      .map((m) => {
        const suyos = horarios.filter((h) => h.medico.id === m.id).sort((a, b) => orden(a.diaSemana) - orden(b.diaSemana));
        return {
          id: m.id,
          nombre: m.usuario.nombre,
          apellido: m.usuario.apellido,
          especialidad: m.especialidadCatalogo?.nombre ?? m.especialidad,
          idEspecialidad: m.especialidadCatalogo?.id ?? null,
          anosExperiencia: m.anosExperiencia,
          descripcion: m.descripcion,
          consultorio: m.consultorio,
          rating: Number(m.rating),
          precioConsulta: Number(m.especialidadCatalogo?.precioConsulta ?? 0),
          dias: suyos.map((h) => ({ dia: h.diaSemana, horaInicio: h.horaInicio.slice(0, 5), horaFin: h.horaFin.slice(0, 5) })),
        };
      })
      .sort((a, b) => b.rating - a.rating);

    return {
      especialidades: especialidades.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        descripcion: e.descripcion,
        precioConsulta: Number(e.precioConsulta),
        medicos: medicosPublicos.filter((m) => m.idEspecialidad === e.id).length,
      })),
      medicos: medicosPublicos,
      seguros: seguros.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        descuentoConsulta: Number(s.descuentoConsulta),
        descuentoMedicamentos: Number(s.descuentoMedicamentos),
      })),
      estadisticas: {
        medicos: medicosPublicos.length,
        especialidades: especialidades.length,
        pacientes,
        consultasAtendidas: atendidas,
      },
      precioEmergencia,
    };
  }
}
