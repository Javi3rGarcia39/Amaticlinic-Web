import { Receta } from '../core/models/models';

// [Impresion] Genera la receta con formato de documento medico y la manda a imprimir.
// Se arma en un iframe oculto: no abre ventanas emergentes y no se imprime el resto de la pagina.
// Desde el dialogo de impresion tambien se puede "Guardar como PDF".

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fechaHora(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return esc(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fecha(ymd: string): string {
  const [y, m, d] = (ymd ?? '').slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : esc(ymd);
}

function sinAlergias(a: string | null): boolean {
  return !a || /^\s*(ninguna?|no|n\/a|na|-)\s*$/i.test(a);
}

export function htmlReceta(r: Receta): string {
  const filas = r.detalles
    .map(
      (d, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>
          <strong>${esc(d.medicamento)}</strong>
          <div class="sub">${esc(d.presentacion)} ${esc(d.concentracion ?? '')} · ${esc(d.principioActivo)}</div>
        </td>
        <td>
          ${esc(d.dosis)} ${esc(d.frecuencia)} por ${esc(d.duracionDias)} dia(s)
          ${d.indicaciones ? `<div class="sub">${esc(d.indicaciones)}</div>` : ''}
        </td>
        <td class="cant">${esc(d.cantidad)}</td>
      </tr>`,
    )
    .join('');

  const alergias = sinAlergias(r.alergiasPaciente)
    ? '<span>Ninguna registrada</span>'
    : `<span class="alerta">${esc(r.alergiasPaciente)}</span>`;

  const marca =
    r.estado === 'Anulada'
      ? '<div class="sello">ANULADA</div>'
      : r.vencida
        ? '<div class="sello">VENCIDA</div>'
        : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Receta ${esc(r.codigo)}</title>
<style>
  @page { size: letter; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; font-size: 12.5px; margin: 0; }
  .doc { position: relative; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #028090; padding-bottom: 10px; }
  .logo { display: flex; gap: 10px; align-items: center; }
  .logo svg { width: 42px; height: 42px; flex-shrink: 0; } /* [Logo] */
  .logo h1 span { color: #028090; }
  .logo h1 { margin: 0; font-size: 20px; color: #0B3D3A; }
  .logo p { margin: 2px 0 0; color: #6b7280; font-size: 11px; }
  .codigo { text-align: right; }
  .codigo .t { font-size: 10px; letter-spacing: .08em; color: #6b7280; text-transform: uppercase; }
  .codigo .c { font-family: "Consolas", "Courier New", monospace; font-size: 20px; font-weight: 700; letter-spacing: .06em; color: #0B3D3A; }
  h2 { font-size: 14px; letter-spacing: .1em; text-transform: uppercase; color: #028090; margin: 16px 0 8px; }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; padding: 10px 12px; background: #f3f8f8; border-radius: 6px; }
  .datos b { color: #6b7280; font-weight: 500; }
  .alerta { color: #b91c1c; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1.5px solid #d1d5db; padding: 6px 6px; }
  td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  td.num { width: 22px; color: #6b7280; }
  td.cant, th.cant { text-align: right; width: 70px; }
  .sub { color: #6b7280; font-size: 11px; margin-top: 2px; }
  .rx { font-family: Georgia, serif; font-size: 26px; font-weight: 700; color: #028090; margin: 14px 0 0; }
  .indicaciones { margin-top: 12px; padding: 10px 12px; border-left: 3px solid #02C39A; background: #f9fafb; }
  .firma { margin-top: 70px; display: flex; justify-content: flex-end; }
  .firma div { width: 260px; border-top: 1px solid #374151; text-align: center; padding-top: 6px; }
  .firma small { display: block; color: #6b7280; }
  footer { margin-top: 28px; padding-top: 8px; border-top: 1px dashed #d1d5db; font-size: 10.5px; color: #6b7280; display: flex; justify-content: space-between; }
  .sello { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-18deg); font-size: 72px; font-weight: 800; color: rgba(185, 28, 28, .15); border: 6px solid rgba(185, 28, 28, .15); padding: 4px 24px; pointer-events: none; }
</style>
</head>
<body>
<div class="doc">
  ${marca}
  <header>
    <div class="logo">
      <!-- [Logo] -->
      <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="48" height="48" rx="13" fill="#02C39A"/>
        <path d="M10.5 37.5 L24 11 L37.5 37.5" fill="none" stroke="#0B3D3A" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15.2 29.5 q4.4 -3.6 8.8 0 t8.8 0" fill="none" stroke="#0B3D3A" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M36 7.5v9M31.5 12h9" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
      </svg>
      <div>
        <h1>Amati<span>Clinic</span></h1>
        <p>Clinica medica · Amatitlan, Guatemala</p>
      </div>
    </div>
    <div class="codigo">
      <div class="t">Receta medica</div>
      <div class="c">${esc(r.codigo)}</div>
    </div>
  </header>

  <h2>Datos de la receta</h2>
  <div class="datos">
    <div><b>Paciente:</b> ${esc(r.nombrePaciente)}</div>
    <div><b>Fecha de emision:</b> ${fechaHora(r.fechaEmision)}</div>
    <div><b>Medico:</b> Dr(a). ${esc(r.nombreMedico)}</div>
    <div><b>Valida hasta:</b> ${fecha(r.fechaVencimiento)}</div>
    <div><b>Especialidad:</b> ${esc(r.especialidad)}</div>
    <div><b>Alergias:</b> ${alergias}</div>
  </div>

  <p class="rx">Rx</p>
  <table>
    <thead>
      <tr><th></th><th>Medicamento</th><th>Indicacion</th><th class="cant">Cantidad</th></tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  ${r.indicacionesGenerales ? `<div class="indicaciones"><b>Indicaciones generales:</b> ${esc(r.indicacionesGenerales)}</div>` : ''}

  <div class="firma">
    <div>
      Dr(a). ${esc(r.nombreMedico)}
      <small>${esc(r.especialidad)} · Firma y sello</small>
    </div>
  </div>

  <footer>
    <span>Presente el codigo <b>${esc(r.codigo)}</b> en la farmacia de AmatiClinic para retirar sus medicamentos.</span>
    <span>Estado: ${esc(r.estado)}</span>
  </footer>
</div>
</body>
</html>`;
}

export function imprimirReceta(r: Receta): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(htmlReceta(r));
  doc.close();

  const win = iframe.contentWindow!;
  const limpiar = () => setTimeout(() => iframe.remove(), 500);
  win.onafterprint = limpiar;
  setTimeout(() => {
    win.focus();
    win.print();
  }, 250);
}
