import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// [Logo] Logo de AmatiClinic.
// El icono es una "A" con forma de volcan (Pacaya), cruzada por una ola (el lago de Amatitlan)
// y una cruz medica arriba a la derecha. Colores de la marca: #02C39A, #0B3D3A y #028090.
//   <app-logo />                        icono + nombre, para fondos oscuros (barra superior)
//   <app-logo fondo="claro" />          nombre en verde oscuro, para fondos claros
//   <app-logo [tamano]="56" [texto]="false" />   solo el icono
// Los mismos dibujos estan en src/assets/logo (SVG y PNG) para documentos y presentaciones.
@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  // El elemento <app-logo> se comporta como caja flexible para quedar centrado con el texto de la barra
  host: { class: 'inline-flex shrink-0' },
  template: `
    <span class="inline-flex items-center gap-2.5 select-none">
      <svg [attr.width]="tamano" [attr.height]="tamano" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"
           class="shrink-0" [attr.aria-hidden]="texto ? 'true' : null" [attr.role]="texto ? null : 'img'"
           [attr.aria-label]="texto ? null : 'AmatiClinic'">
        <rect width="48" height="48" rx="13" fill="#02C39A" />
        <path d="M10.5 37.5 L24 11 L37.5 37.5" fill="none" stroke="#0B3D3A" stroke-width="5.2"
              stroke-linecap="round" stroke-linejoin="round" />
        <path d="M15.2 29.5 q4.4 -3.6 8.8 0 t8.8 0" fill="none" stroke="#0B3D3A" stroke-width="3.4" stroke-linecap="round" />
        <path d="M36 7.5v9M31.5 12h9" stroke="#fff" stroke-width="3.2" stroke-linecap="round" />
      </svg>
      <span *ngIf="texto" class="leading-none tracking-tight" [style.font-size.px]="tamano * 0.6">
        <span class="font-bold" [ngClass]="fondo === 'oscuro' ? 'text-white' : 'text-primary-dark'">Amati</span><span
              class="font-semibold" [ngClass]="fondo === 'oscuro' ? 'text-accent' : 'text-primary'">Clinic</span>
      </span>
    </span>
  `,
})
export class LogoComponent {
  @Input() tamano = 32;
  @Input() texto = true;
  @Input() fondo: 'oscuro' | 'claro' = 'oscuro';
}
