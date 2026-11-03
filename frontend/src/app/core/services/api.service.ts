import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { SIN_CARGA } from '../interceptors/loading.interceptor';
import { environment } from '../../../environments/environment';
import {
  Cita, Estadisticas, Horario, HistorialMedico, Medico, Paciente, SlotDisponible,
  // [Farmacia]
  AlertaAlergia, Medicamento, MovimientoInventario, Receta, ResultadoDespacho, ResumenFarmacia, EstadoReceta,
  // [Mejoras]
  Cobro, Configuracion, Disponibilidad, Emergencia, Especialidad, InicioPublico, Lote, MetodoInventario,
  NivelTriage, PanelMedico, PanelPaciente, PanelRecepcion, ResumenEmergencias, Seguro, ValuacionInventario,
  // [Eliminacion]
  ElementoPapelera, RegistroEliminacion, SolicitudEliminacion, TipoElemento,
} from '../models/models';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ---------- Medicos ----------
  listarMedicos() {
    return this.http.get<Medico[]>(`${BASE}/medicos`);
  }
  buscarMedicos(query?: string, especialidad?: string) {
    let params: any = {};
    if (query) params.query = query;
    if (especialidad) params.especialidad = especialidad;
    return this.http.get<Medico[]>(`${BASE}/medicos/buscar`, { params });
  }
  obtenerMedico(id: number) {
    return this.http.get<Medico>(`${BASE}/medicos/${id}`);
  }
  crearMedico(data: any) {
    return this.http.post<Medico>(`${BASE}/medicos`, data);
  }
  actualizarMedico(id: number, data: any) {
    return this.http.put<Medico>(`${BASE}/medicos/${id}`, data);
  }
  // [Eliminacion] Va a la papelera (no se borra de la base); el motivo queda registrado
  eliminarMedico(id: number, motivo = '') {
    return this.http.delete<void>(`${BASE}/medicos/${id}`, { params: motivo ? { motivo } : {} });
  }

  // ---------- Pacientes ----------
  listarPacientes() {
    return this.http.get<Paciente[]>(`${BASE}/pacientes`);
  }
  obtenerPaciente(id: number) {
    return this.http.get<Paciente>(`${BASE}/pacientes/${id}`);
  }
  crearPaciente(data: any) {
    return this.http.post<Paciente>(`${BASE}/pacientes`, data);
  }
  actualizarPaciente(id: number, data: any) {
    return this.http.put<Paciente>(`${BASE}/pacientes/${id}`, data);
  }
  // [Eliminacion] Va a la papelera (no se borra de la base); el motivo queda registrado
  eliminarPaciente(id: number, motivo = '') {
    return this.http.delete<void>(`${BASE}/pacientes/${id}`, { params: motivo ? { motivo } : {} });
  }

  // ---------- Horarios ----------
  listarHorarios() {
    return this.http.get<Horario[]>(`${BASE}/horarios`);
  }
  listarHorariosPorMedico(idMedico: number) {
    return this.http.get<Horario[]>(`${BASE}/horarios/medico/${idMedico}`);
  }
  slotsDisponibles(idMedico: number, fecha: string) {
    return this.http.get<SlotDisponible[]>(`${BASE}/horarios/slots-disponibles`, {
      params: { idMedico, fecha },
    });
  }
  crearHorario(data: any) {
    return this.http.post<Horario>(`${BASE}/horarios`, data);
  }
  actualizarHorario(id: number, data: any) {
    return this.http.put<Horario>(`${BASE}/horarios/${id}`, data);
  }
  // [Eliminacion] Va a la papelera (no se borra de la base); el motivo queda registrado
  eliminarHorario(id: number, motivo = '') {
    return this.http.delete<void>(`${BASE}/horarios/${id}`, { params: motivo ? { motivo } : {} });
  }

  // ---------- Citas ----------
  listarCitas() {
    return this.http.get<Cita[]>(`${BASE}/citas`);
  }
  obtenerCita(id: number) {
    return this.http.get<Cita>(`${BASE}/citas/${id}`);
  }
  listarCitasPorMedico(idMedico: number) {
    return this.http.get<Cita[]>(`${BASE}/citas/medico/${idMedico}`);
  }
  listarCitasPorMedicoYFecha(idMedico: number, fecha: string) {
    return this.http.get<Cita[]>(`${BASE}/citas/medico/${idMedico}/fecha`, { params: { fecha } });
  }
  listarCitasPorPaciente(idPaciente: number) {
    return this.http.get<Cita[]>(`${BASE}/citas/paciente/${idPaciente}`);
  }
  agendarCita(data: any) {
    return this.http.post<Cita>(`${BASE}/citas`, data);
  }
  cancelarCita(id: number) {
    return this.http.put<Cita>(`${BASE}/citas/${id}/cancelar`, {});
  }
  completarCita(id: number) {
    return this.http.put<Cita>(`${BASE}/citas/${id}/completar`, {});
  }
  reprogramarCita(id: number, nuevoIdHorario: number, nuevaFecha: string) {
    return this.http.put<Cita>(`${BASE}/citas/${id}/reprogramar`, null, {
      params: { nuevoIdHorario, nuevaFecha },
    });
  }
  // [Eliminacion] Va a la papelera (no se borra de la base); el motivo queda registrado
  eliminarCita(id: number, motivo = '') {
    return this.http.delete<void>(`${BASE}/citas/${id}`, { params: motivo ? { motivo } : {} });
  }

  // ---------- Historial medico ----------
  listarHistorial() {
    return this.http.get<HistorialMedico[]>(`${BASE}/historial`);
  }
  listarHistorialPorPaciente(idPaciente: number) {
    return this.http.get<HistorialMedico[]>(`${BASE}/historial/paciente/${idPaciente}`);
  }
  crearHistorial(data: any) {
    return this.http.post<HistorialMedico>(`${BASE}/historial`, data);
  }
  actualizarHistorial(id: number, data: any) {
    return this.http.put<HistorialMedico>(`${BASE}/historial/${id}`, data);
  }

  // ---------- Estadisticas ----------
  estadisticasPaciente(idPaciente: number) {
    return this.http.get<Estadisticas>(`${BASE}/estadisticas/paciente/${idPaciente}`);
  }
  estadisticasMedico(idMedico: number) {
    return this.http.get<Estadisticas>(`${BASE}/estadisticas/medico/${idMedico}`);
  }

  // ================================================================
  // [Farmacia] Medicamentos e inventario
  // ================================================================
  listarMedicamentos(buscar = '', inactivos = false) {
    const params: any = {};
    if (buscar) params.buscar = buscar;
    if (inactivos) params.inactivos = 'true';
    return this.http.get<Medicamento[]>(`${BASE}/medicamentos`, { params });
  }
  crearMedicamento(data: any) {
    return this.http.post<Medicamento>(`${BASE}/medicamentos`, data);
  }
  actualizarMedicamento(id: number, data: any) {
    return this.http.put<Medicamento>(`${BASE}/medicamentos/${id}`, data);
  }
  desactivarMedicamento(id: number) {
    return this.http.delete<Medicamento>(`${BASE}/medicamentos/${id}`);
  }
  entradaStock(id: number, cantidad: number, motivo: string) {
    return this.http.post<Medicamento>(`${BASE}/medicamentos/${id}/entrada`, { cantidad, motivo });
  }
  ajusteStock(id: number, cantidad: number, motivo: string) {
    return this.http.post<Medicamento>(`${BASE}/medicamentos/${id}/ajuste`, { cantidad, motivo });
  }
  medicamentosStockBajo() {
    return this.http.get<Medicamento[]>(`${BASE}/medicamentos/stock-bajo`);
  }
  movimientosInventario(idMedicamento?: number) {
    const params: any = idMedicamento ? { idMedicamento } : {};
    return this.http.get<MovimientoInventario[]>(`${BASE}/medicamentos/movimientos`, { params });
  }

  // ================================================================
  // [Farmacia] Recetas
  // ================================================================
  emitirReceta(data: any) {
    return this.http.post<Receta>(`${BASE}/recetas`, data);
  }
  verificarAlergias(idPaciente: number, idsMedicamento: number[]) {
    return this.http.post<{ alergiasPaciente: string | null; alertas: AlertaAlergia[] }>(
      `${BASE}/recetas/verificar-alergias`, { idPaciente, idsMedicamento });
  }
  listarRecetas(estado?: EstadoReceta) {
    const params: any = estado ? { estado } : {};
    return this.http.get<Receta[]>(`${BASE}/recetas`, { params });
  }
  recetaPorCodigo(codigo: string) {
    return this.http.get<Receta>(`${BASE}/recetas/codigo/${encodeURIComponent(codigo)}`);
  }
  recetasPorPaciente(idPaciente: number) {
    return this.http.get<Receta[]>(`${BASE}/recetas/paciente/${idPaciente}`);
  }
  recetasPorMedico(idMedico: number) {
    return this.http.get<Receta[]>(`${BASE}/recetas/medico/${idMedico}`);
  }
  recetasPorCita(idCita: number) {
    return this.http.get<Receta[]>(`${BASE}/recetas/cita/${idCita}`);
  }
  despacharReceta(id: number, items?: { idDetalle: number; cantidad: number }[]) {
    return this.http.put<ResultadoDespacho>(`${BASE}/recetas/${id}/despachar`, items ? { items } : {});
  }
  anularReceta(id: number, motivo: string) {
    return this.http.put<Receta>(`${BASE}/recetas/${id}/anular`, { motivo });
  }
  resumenFarmacia() {
    return this.http.get<ResumenFarmacia>(`${BASE}/farmacia/resumen`);
  }

  // ================================================================
  // [Mejoras] Pagina publica, catalogos, seguros y configuracion
  // ================================================================
  inicioPublico() {
    return this.http.get<InicioPublico>(`${BASE}/publico/inicio`);
  }
  listarEspecialidades(todas = false) {
    return this.http.get<Especialidad[]>(`${BASE}/especialidades`, { params: todas ? { todas: 'true' } : {} });
  }
  crearEspecialidad(data: Partial<Especialidad>) {
    return this.http.post<Especialidad>(`${BASE}/especialidades`, data);
  }
  actualizarEspecialidad(id: number, data: Partial<Especialidad>) {
    return this.http.put<Especialidad>(`${BASE}/especialidades/${id}`, data);
  }
  eliminarEspecialidad(id: number, motivo = '') { // [Eliminacion]
    return this.http.delete<{ eliminada: boolean; desactivada: boolean }>(`${BASE}/especialidades/${id}`, { params: motivo ? { motivo } : {} });
  }
  listarSeguros(todos = false) {
    return this.http.get<Seguro[]>(`${BASE}/seguros`, { params: todos ? { todos: 'true' } : {} });
  }
  crearSeguro(data: Partial<Seguro>) {
    return this.http.post<Seguro>(`${BASE}/seguros`, data);
  }
  actualizarSeguro(id: number, data: Partial<Seguro>) {
    return this.http.put<Seguro>(`${BASE}/seguros/${id}`, data);
  }
  eliminarSeguro(id: number, motivo = '') { // [Eliminacion]
    return this.http.delete<{ eliminado: boolean; desactivado: boolean }>(`${BASE}/seguros/${id}`, { params: motivo ? { motivo } : {} });
  }
  configuracion() {
    return this.http.get<Configuracion>(`${BASE}/configuracion`);
  }
  cambiarMetodoInventario(metodo: MetodoInventario) {
    return this.http.put<{ metodoInventario: MetodoInventario }>(`${BASE}/configuracion/metodo-inventario`, { metodo });
  }
  cambiarPrecioEmergencia(precio: number) {
    return this.http.put<{ precioEmergencia: number }>(`${BASE}/configuracion/precio-emergencia`, { precio });
  }

  // [Disponibilidad] y costo de la consulta
  disponibilidadMedico(idMedico: number, desde?: string, dias = 42) {
    const params: any = { dias };
    if (desde) params.desde = desde;
    return this.http.get<Disponibilidad>(`${BASE}/horarios/medico/${idMedico}/disponibilidad`, { params });
  }
  cotizarCita(idMedico: number, idPaciente: number) {
    return this.http.get<Cobro>(`${BASE}/citas/cotizar`, { params: { idMedico, idPaciente } });
  }

  // [Lotes]
  lotesMedicamento(id: number, agotados = false) {
    return this.http.get<{ medicamento: Medicamento; lotes: Lote[] }>(`${BASE}/medicamentos/${id}/lotes`, {
      params: agotados ? { agotados: 'true' } : {},
    });
  }
  lotesEnRiesgo() {
    return this.http.get<Lote[]>(`${BASE}/medicamentos/lotes-en-riesgo`);
  }
  valuacionInventario() {
    return this.http.get<ValuacionInventario>(`${BASE}/medicamentos/valuacion`);
  }
  entradaLote(id: number, data: { cantidad: number; motivo?: string; codigoLote?: string; fechaVencimiento?: string; costoUnitario?: number; proveedor?: string }) {
    return this.http.post<Medicamento>(`${BASE}/medicamentos/${id}/entrada`, data);
  }
  ajusteLote(id: number, data: { cantidad: number; motivo: string; idLote?: number }) {
    return this.http.post<Medicamento>(`${BASE}/medicamentos/${id}/ajuste`, data);
  }

  // [Emergencias]
  registrarEmergencia(data: any) {
    return this.http.post<Emergencia>(`${BASE}/emergencias`, data);
  }
  // silencioso: para el refresco automatico de la cola (no muestra la barra de carga)
  colaEmergencias(silencioso = false) {
    return this.http.get<Emergencia[]>(`${BASE}/emergencias/cola`, { context: new HttpContext().set(SIN_CARGA, silencioso) });
  }
  historialEmergencias(desde?: string) {
    return this.http.get<Emergencia[]>(`${BASE}/emergencias/historial`, { params: desde ? { desde } : {} });
  }
  resumenEmergencias() {
    return this.http.get<ResumenEmergencias>(`${BASE}/emergencias/resumen`);
  }
  obtenerEmergencia(id: number) {
    return this.http.get<Emergencia>(`${BASE}/emergencias/${id}`);
  }
  cambiarNivelEmergencia(id: number, nivel: NivelTriage) {
    return this.http.put<Emergencia>(`${BASE}/emergencias/${id}/nivel`, { nivel });
  }
  tomarEmergencia(id: number) {
    return this.http.put<Emergencia>(`${BASE}/emergencias/${id}/tomar`, {});
  }
  atenderEmergencia(id: number, data: { diagnostico: string; tratamiento?: string; destino: string; observaciones?: string }) {
    return this.http.put<{ emergencia: Emergencia; idCita: number }>(`${BASE}/emergencias/${id}/atender`, data);
  }
  retirarEmergencia(id: number, motivo?: string) {
    return this.http.put<Emergencia>(`${BASE}/emergencias/${id}/retirar`, { motivo });
  }

  // [Dashboard]
  panelPaciente(idPaciente: number) {
    return this.http.get<PanelPaciente>(`${BASE}/estadisticas/paciente/${idPaciente}`);
  }
  panelMedico(idMedico: number) {
    return this.http.get<PanelMedico>(`${BASE}/estadisticas/medico/${idMedico}`);
  }
  panelRecepcion() {
    return this.http.get<PanelRecepcion>(`${BASE}/estadisticas/recepcion`);
  }

  // ================================================================
  // [Eliminacion] Papelera, bitacora y solicitudes de eliminacion de datos
  // ================================================================
  papelera() {
    return this.http.get<ElementoPapelera[]>(`${BASE}/papelera`);
  }
  bitacoraEliminacion() {
    return this.http.get<RegistroEliminacion[]>(`${BASE}/papelera/bitacora`);
  }
  restaurarElemento(tipo: TipoElemento, id: number) {
    return this.http.put<{ restaurado: boolean; horariosRestaurados: number }>(`${BASE}/papelera/${tipo}/${id}/restaurar`, {});
  }
  eliminarDefinitivo(tipo: TipoElemento, id: number, solicitadoPor: string, motivo: string) {
    return this.http.post<{ resultado: 'eliminado' | 'anonimizado' }>(`${BASE}/papelera/${tipo}/${id}/eliminar-definitivo`, { solicitadoPor, motivo });
  }
  solicitarEliminacion(motivo: string) {
    return this.http.post<SolicitudEliminacion>(`${BASE}/solicitudes-eliminacion`, { motivo });
  }
  misSolicitudesEliminacion() {
    return this.http.get<SolicitudEliminacion[]>(`${BASE}/solicitudes-eliminacion/mias`);
  }
  solicitudesEliminacion() {
    return this.http.get<SolicitudEliminacion[]>(`${BASE}/solicitudes-eliminacion`);
  }
  aprobarSolicitud(id: number, observacion: string) {
    return this.http.put<SolicitudEliminacion>(`${BASE}/solicitudes-eliminacion/${id}/aprobar`, { observacion });
  }
  rechazarSolicitud(id: number, observacion: string) {
    return this.http.put<SolicitudEliminacion>(`${BASE}/solicitudes-eliminacion/${id}/rechazar`, { observacion });
  }
}
