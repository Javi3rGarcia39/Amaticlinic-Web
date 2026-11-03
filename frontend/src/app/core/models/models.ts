// [Farmacia] se agrega el rol Farmaceutico
export type TipoUsuario = 'Paciente' | 'Medico' | 'Recepcionista' | 'Farmaceutico';
export type EstadoCita = 'Agendada' | 'Cancelada' | 'Modificada' | 'Completada';
export type DiaSemana = 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' | 'Sabado' | 'Domingo';

export interface UsuarioSesion {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: TipoUsuario;
  idPerfil: number | null;
  token: string;
}

export interface LoginResponse {
  token: string;
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: TipoUsuario;
  idPerfil: number | null;
}

export interface Medico {
  id: number;
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  especialidad: string;
  consultorio: string;
  anosExperiencia: number;
  descripcion: string;
  rating: number;
  idEspecialidad: number | null; // [Catalogo]
  precioConsulta: number;
}

export interface Paciente {
  id: number;
  idUsuario: number;
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  documentoIdentidad: string;
  fechaNacimiento: string;
  direccion: string;
  tipoSangre: string;
  alergias: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
  // [Seguros]
  idSeguro: number | null;
  nombreSeguro: string | null;
  seguroActivo: boolean;
  descuentoConsulta: number;
  descuentoMedicamentos: number;
  numeroPoliza: string | null;
}

export interface Horario {
  id: number;
  idMedico: number;
  nombreMedico: string;
  especialidad: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

export interface SlotDisponible {
  etiqueta: string;
  horaInicio: string;
  horaFin: string;
  ocupado: boolean;
}

export interface Cita {
  id: number;
  idPaciente: number;
  nombrePaciente: string;
  idMedico: number;
  nombreMedico: string;
  especialidad: string;
  consultorio: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoCita;
  motivoConsulta: string;
  esEmergencia: boolean; // [Emergencias]
  // [Seguros]
  costoConsulta: number | null;
  porcentajeDescuento: number;
  montoDescuento: number;
  totalPagar: number | null;
  seguroAplicado: string | null;
}

export interface HistorialMedico {
  id: number;
  idPaciente: number;
  nombrePaciente: string;
  idMedico: number;
  nombreMedico: string;
  especialidad: string;
  diagnostico: string;
  tratamiento: string;
  fechaRegistro: string;
}

export interface Estadisticas {
  citasProgramadas: number;
  diasProximaCita: number;
  medicosDisponibles?: number;
  citasEsteMes: number;
  citasProximas?: number;
  citasConfirmadas?: number;
  citasPendientes?: number;
  citasPasadas?: number;
  citasTotales: number;
}

// ================================================================
// [Farmacia] Modelos del modulo de farmacia
// ================================================================
export type EstadoReceta = 'Emitida' | 'Parcial' | 'Despachada' | 'Anulada';
export type TipoMovimiento = 'Entrada' | 'Salida' | 'Ajuste';

export interface Medicamento {
  id: number;
  nombre: string;
  principioActivo: string;
  presentacion: string;
  concentracion: string | null;
  stock: number;
  stockMinimo: number;
  stockBajo: boolean;
  precio: number;
  requiereReceta: boolean;
  activo: boolean;
}

export interface DetalleReceta {
  id: number;
  idMedicamento: number;
  medicamento: string;
  principioActivo: string;
  presentacion: string;
  concentracion: string | null;
  stockDisponible: number;
  dosis: string;
  frecuencia: string;
  duracionDias: number;
  cantidad: number;
  cantidadDespachada: number;
  pendiente: number;
  indicaciones: string | null;
  precioUnitario: number; // [Seguros]
}

export interface Receta {
  id: number;
  codigo: string;
  idCita: number;
  fechaCita: string;
  idPaciente: number;
  nombrePaciente: string;
  alergiasPaciente: string | null;
  idMedico: number;
  nombreMedico: string;
  especialidad: string;
  fechaEmision: string;
  fechaVencimiento: string;
  vencida: boolean;
  estado: EstadoReceta;
  indicacionesGenerales: string | null;
  detalles: DetalleReceta[];
  // [Seguros] Cobro de lo despachado
  subtotal: number;
  porcentajeDescuento: number;
  montoDescuento: number;
  total: number;
  seguroAplicado: string | null;
  seguroPaciente: string | null;
  descuentoMedicamentosPaciente: number;
}

export interface AlertaAlergia {
  idMedicamento: number;
  medicamento: string;
  principioActivo: string;
  alergeno: string;
}

export interface ResultadoDespacho {
  receta: Receta;
  entregados: { medicamento: string; cantidad: number }[];
  faltantes: { medicamento: string; cantidad: number }[];
  alertasStock: { medicamento: string; stock: number; stockMinimo: number }[];
  // [Lotes] [Seguros]
  cobro: Cobro;
  metodo: MetodoInventario;
  lotesUsados: { medicamento: string; lote: string; vencimiento: string | null; cantidad: number }[];
}

export interface Cobro {
  subtotal?: number;
  costo?: number;
  porcentaje: number;
  descuento: number;
  total: number;
  seguro: string | null;
}

export interface MovimientoInventario {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  idMedicamento: number;
  medicamento: string;
  cantidad: number;
  stockResultante: number;
  motivo: string | null;
  codigoReceta: string | null;
  usuario: string | null;
  // [Lotes] [Seguros]
  codigoLote: string | null;
  costoUnitario: number | null;
  precioUnitario: number | null;
  descuentoPorcentaje: number;
  montoVenta: number | null;
}

export interface ResumenFarmacia {
  medicamentosActivos: number;
  medicamentosStockBajo: number;
  recetasPendientes: number;
  recetasDespachadasHoy: number;
  unidadesDespachadasHoy: number;
  masDespachados30Dias: { medicamento: string; unidades: number }[];
  // [Lotes] [Seguros]
  metodoInventario: MetodoInventario;
  ventas30Dias: number;
  descuentosSeguro30Dias: number;
  costoVentas30Dias: number;
  margen30Dias: number;
  valorInventario: number;
  lotesVencidos: number;
  lotesPorVencer: number;
  ventasPorDia: { fecha: string; unidades: number; ventas: number }[];
}

// ================================================================
// [Mejoras] Catalogos, seguros, lotes, emergencias, disponibilidad y paneles
// ================================================================
export type MetodoInventario = 'FIFO' | 'LIFO';

export interface Especialidad {
  id: number;
  nombre: string;
  descripcion: string | null;
  precioConsulta: number;
  activo: boolean;
  medicos?: number;
}

export interface Seguro {
  id: number;
  nombre: string;
  descuentoConsulta: number;
  descuentoMedicamentos: number;
  telefono: string | null;
  activo: boolean;
  pacientes?: number;
}

export interface Configuracion {
  metodoInventario: MetodoInventario;
  precioEmergencia: number;
}

export type EstadoLote = 'Agotado' | 'Vencido' | 'PorVencer' | 'Vigente';

export interface Lote {
  id: number;
  idMedicamento: number;
  medicamento: string;
  codigo: string;
  fechaIngreso: string;
  fechaVencimiento: string | null;
  costoUnitario: number;
  cantidadInicial: number;
  cantidadDisponible: number;
  valor: number;
  proveedor: string | null;
  estado: EstadoLote;
}

export interface ValuacionInventario {
  metodo: MetodoInventario;
  totales: {
    valorInventario: number; valorVenta: number; unidades: number; unidadesVencidas: number;
    unidadesPorVencer: number; costoVentas30: number; ventas30: number; margen30: number;
  };
  detalle: {
    idMedicamento: number; medicamento: string; presentacion: string; stock: number; lotes: number;
    costoPromedio: number; valorInventario: number; valorVenta: number; unidadesVencidas: number;
    unidadesPorVencer: number; unidadesVendidas30: number; costoVentas30: number; ventas30: number; margen30: number;
  }[];
}

export interface SlotAgenda {
  horaInicio: string;
  horaFin: string;
  estado: 'libre' | 'ocupado' | 'pasado';
}

export interface DiaDisponible {
  fecha: string;
  diaSemana: DiaSemana;
  idHorario: number;
  horaInicio: string;
  horaFin: string;
  total: number;
  libres: number;
  slots: SlotAgenda[];
}

export interface Disponibilidad {
  idMedico: number;
  desde: string;
  hasta: string;
  duracionMinutos: number;
  diasAtencion: DiaSemana[];
  proximaFechaDisponible: string | null;
  dias: DiaDisponible[];
}

export type NivelTriage = 'Rojo' | 'Naranja' | 'Amarillo' | 'Verde';
export type EstadoEmergencia = 'EnEspera' | 'EnAtencion' | 'Atendida' | 'Retirada';
export type DestinoEmergencia = 'Alta' | 'Observacion' | 'Referido';

export interface Emergencia {
  id: number;
  idPaciente: number;
  nombrePaciente: string;
  documentoIdentidad: string | null;
  edad: number | null;
  alergias: string | null;
  tipoSangre: string | null;
  telefono: string | null;
  seguro: string | null;
  nivel: NivelTriage;
  nivelEtiqueta: string;
  prioridad: number;
  esperaMaxima: number;
  motivo: string;
  presionArterial: string | null;
  frecuenciaCardiaca: number | null;
  temperatura: number | null;
  saturacion: number | null;
  estado: EstadoEmergencia;
  fechaLlegada: string;
  minutosEspera: number;
  excedeEspera: boolean;
  idMedico: number | null;
  nombreMedico: string | null;
  fechaAtencion: string | null;
  fechaAlta: string | null;
  diagnostico: string | null;
  tratamiento: string | null;
  destino: DestinoEmergencia | null;
  observaciones: string | null;
  idCita: number | null;
  registradoPor: string | null;
}

export interface ResumenEmergencias {
  enEspera: number;
  enAtencion: number;
  atendidasHoy: number;
  registradasHoy: number;
  esperaPromedioMinutos: number;
  porNivel: { nivel: NivelTriage; etiqueta: string; enEspera: number }[];
}

export interface CitaResumen {
  id: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: EstadoCita;
  motivoConsulta: string | null;
  esEmergencia: boolean;
  idPaciente: number;
  nombrePaciente: string;
  idMedico: number;
  nombreMedico: string;
  especialidad: string;
  consultorio: string | null;
  totalPagar: number | null;
}

export interface PanelPaciente extends Estadisticas {
  proximaCita: CitaResumen | null;
  proximasCitas: CitaResumen[];
  consultasCompletadas: number;
  recetasPendientes: number;
  recetasPendientesCodigos: string[];
  ultimosDiagnosticos: { id: number; fecha: string; diagnostico: string; tratamiento: string | null; medico: string; especialidad: string }[];
  seguro: { nombre: string; poliza: string | null; descuentoConsulta: number; descuentoMedicamentos: number } | null;
  totalPagadoConsultas: number;
  ahorroSeguro: number;
}

export interface PanelMedico extends Estadisticas {
  citasHoy: CitaResumen[];
  proximasCitas: CitaResumen[];
  atendidasMes: number;
  pacientesAtendidosMes: number;
  canceladasMes: number;
  recetasEmitidasMes: number;
  ingresosMes: number;
  emergenciasEnEspera: number;
  emergenciasPorNivel: { nivel: NivelTriage; etiqueta: string; enEspera: number }[];
  semana: { fecha: string; diaSemana: DiaSemana; citas: number }[];
  actividad: { desde: string; hasta: string; completadas: number }[];
}

export interface PanelRecepcion {
  hoy: { fecha: string; total: number; completadas: number; pendientes: number; canceladas: number; proximas: CitaResumen[] };
  totales: { medicos: number; pacientes: number; pacientesConSeguro: number; recetasPendientesFarmacia: number };
  emergencias: ResumenEmergencias;
  porDia: { fecha: string; total: number; completadas: number; canceladas: number; pendientes: number }[];
  porEspecialidad: { especialidad: string; citas: number }[];
  porEstado30: { estado: EstadoCita; citas: number }[];
  ocupacionSemana: { idMedico: number; medico: string; especialidad: string; citas: number; capacidad: number; porcentaje: number }[];
  ingresos30: { consultasBruto: number; descuentosSeguro: number; consultasNeto: number; farmaciaNeto: number; descuentosFarmacia: number; total: number };
  porSeguro30: { seguro: string; citas: number; descuento: number }[];
}

export interface InicioPublico {
  especialidades: { id: number; nombre: string; descripcion: string | null; precioConsulta: number; medicos: number }[];
  medicos: {
    id: number; nombre: string; apellido: string; especialidad: string; idEspecialidad: number | null;
    anosExperiencia: number; descripcion: string; consultorio: string; rating: number; precioConsulta: number;
    dias: { dia: DiaSemana; horaInicio: string; horaFin: string }[];
  }[];
  seguros: { id: number; nombre: string; descuentoConsulta: number; descuentoMedicamentos: number }[];
  estadisticas: { medicos: number; especialidades: number; pacientes: number; consultasAtendidas: number };
  precioEmergencia: number;
}

// ================================================================
// [Eliminacion] Papelera y solicitudes de eliminacion de datos
// ================================================================
export type TipoElemento = 'cita' | 'paciente' | 'medico' | 'horario' | 'historial' | 'usuario' | 'especialidad' | 'seguro';

export interface ElementoPapelera {
  tipo: TipoElemento;
  etiqueta: string;
  id: number;
  titulo: string;
  detalle: string;
  eliminadoEn: string;
  eliminadoPor: string | null;
  motivo: string | null;
}

export interface RegistroEliminacion {
  id: number;
  tipo: TipoElemento;
  idElemento: number;
  descripcion: string;
  accion: string;
  usuario: string;
  solicitadoPor: string | null;
  motivo: string | null;
  fecha: string;
}

export type EstadoSolicitud = 'Pendiente' | 'Aprobada' | 'Rechazada';

export interface SolicitudEliminacion {
  id: number;
  idPaciente: number;
  paciente: string;
  correo: string | null;
  anonimizado: boolean;
  motivo: string;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  resueltoPor: string | null;
  observacion: string | null;
}
