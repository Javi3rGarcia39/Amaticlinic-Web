import { Medicamento } from './entities/medicamento.entity';
import { Receta } from './entities/receta.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { fechaLocal } from './farmacia.utils';
import { LoteMedicamento } from './entities/lote-medicamento.entity';
import { LotesService } from './lotes.service';

// [Farmacia] Formas de respuesta (DTO de salida) de la API de farmacia

export function toMedicamentoResponse(m: Medicamento) {
  return {
    id: m.id,
    nombre: m.nombre,
    principioActivo: m.principioActivo,
    presentacion: m.presentacion,
    concentracion: m.concentracion,
    stock: m.stock,
    stockMinimo: m.stockMinimo,
    stockBajo: m.stock <= m.stockMinimo,
    precio: Number(m.precio),
    requiereReceta: m.requiereReceta,
    activo: m.activo,
  };
}

export function toRecetaResponse(r: Receta) {
  return {
    id: r.id,
    codigo: r.codigo,
    idCita: r.cita?.id,
    fechaCita: r.cita?.fecha,
    idPaciente: r.paciente.id,
    nombrePaciente: `${r.paciente.usuario.nombre} ${r.paciente.usuario.apellido}`,
    alergiasPaciente: r.paciente.alergias || null,
    idMedico: r.medico.id,
    nombreMedico: `${r.medico.usuario.nombre} ${r.medico.usuario.apellido}`,
    especialidad: r.medico.especialidad,
    fechaEmision: r.fechaEmision,
    fechaVencimiento: r.fechaVencimiento,
    vencida: r.fechaVencimiento < fechaLocal() && r.estado !== 'Despachada' && r.estado !== 'Anulada',
    estado: r.estado,
    indicacionesGenerales: r.indicacionesGenerales,
    // [Seguros] Cobro de lo despachado
    subtotal: Number(r.subtotal ?? 0),
    porcentajeDescuento: Number(r.porcentajeDescuento ?? 0),
    montoDescuento: Number(r.montoDescuento ?? 0),
    total: Number(r.total ?? 0),
    seguroAplicado: r.seguroAplicado ?? null,
    seguroPaciente: r.paciente.seguro?.activo ? r.paciente.seguro.nombre : null,
    descuentoMedicamentosPaciente: r.paciente.seguro?.activo ? Number(r.paciente.seguro.descuentoMedicamentos) : 0,
    detalles: (r.detalles || [])
      .sort((a, b) => a.id - b.id)
      .map((d) => ({
        id: d.id,
        idMedicamento: d.medicamento.id,
        medicamento: d.medicamento.nombre,
        principioActivo: d.medicamento.principioActivo,
        presentacion: d.medicamento.presentacion,
        concentracion: d.medicamento.concentracion,
        stockDisponible: d.medicamento.stock,
        dosis: d.dosis,
        frecuencia: d.frecuencia,
        duracionDias: d.duracionDias,
        cantidad: d.cantidad,
        cantidadDespachada: d.cantidadDespachada,
        pendiente: d.cantidad - d.cantidadDespachada,
        indicaciones: d.indicaciones,
        precioUnitario: Number(d.medicamento.precio), // [Seguros]
      })),
  };
}

export function toMovimientoResponse(m: MovimientoInventario) {
  return {
    id: m.id,
    fecha: m.fecha,
    tipo: m.tipo,
    idMedicamento: m.medicamento?.id,
    medicamento: m.medicamento?.nombre,
    cantidad: m.cantidad,
    stockResultante: m.stockResultante,
    motivo: m.motivo,
    codigoReceta: m.receta?.codigo ?? null,
    usuario: m.usuario ? `${m.usuario.nombre} ${m.usuario.apellido}` : null,
    // [Lotes] [Seguros]
    codigoLote: m.lote?.codigo ?? null,
    costoUnitario: m.costoUnitario !== null && m.costoUnitario !== undefined ? Number(m.costoUnitario) : null,
    precioUnitario: m.precioUnitario !== null && m.precioUnitario !== undefined ? Number(m.precioUnitario) : null,
    descuentoPorcentaje: Number(m.descuentoPorcentaje ?? 0),
    montoVenta: m.montoVenta !== null && m.montoVenta !== undefined ? Number(m.montoVenta) : null,
  };
}

// [Lotes]
export function toLoteResponse(l: LoteMedicamento) {
  return {
    id: l.id,
    idMedicamento: l.medicamento?.id,
    medicamento: l.medicamento?.nombre,
    codigo: l.codigo,
    fechaIngreso: l.fechaIngreso,
    fechaVencimiento: l.fechaVencimiento,
    costoUnitario: Number(l.costoUnitario),
    cantidadInicial: l.cantidadInicial,
    cantidadDisponible: l.cantidadDisponible,
    valor: Math.round(l.cantidadDisponible * Number(l.costoUnitario) * 100) / 100,
    proveedor: l.proveedor,
    estado: LotesService.estadoLote(l),
  };
}
