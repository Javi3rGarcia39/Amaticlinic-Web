import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BotonTemaComponent } from '../../shared/boton-tema.component'; // [ModoOscuro]
import { DiaSemana, InicioPublico } from '../../core/models/models';
import { LogoComponent } from '../../shared/logo.component'; // [Logo]

type MedicoPublico = InicioPublico['medicos'][number];

const DIAS: { dia: DiaSemana; corto: string }[] = [
  { dia: 'Lunes', corto: 'Lun' },
  { dia: 'Martes', corto: 'Mar' },
  { dia: 'Miercoles', corto: 'Mie' },
  { dia: 'Jueves', corto: 'Jue' },
  { dia: 'Viernes', corto: 'Vie' },
  { dia: 'Sabado', corto: 'Sab' },
  { dia: 'Domingo', corto: 'Dom' },
];

// [Landing] Pagina publica de inicio: especialidades con precio, dias de atencion de cada medico,
// seguros con convenio y como funciona la atencion de emergencias. Los datos vienen de /api/publico/inicio.
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, BotonTemaComponent, LogoComponent],
  template: `
    <!-- Encabezado -->
    <header class="bg-primary-dark text-white">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <a routerLink="/" class="flex items-center gap-2 shrink-0" aria-label="AmatiClinic, inicio">
          <app-logo [tamano]="34" /> <!-- [Logo] -->
        </a>
        <nav class="hidden md:flex items-center gap-1 text-sm" aria-label="Secciones">
          <a href="#especialidades" class="px-3 py-1.5 rounded-md hover:bg-white/10">Especialidades</a>
          <a href="#medicos" class="px-3 py-1.5 rounded-md hover:bg-white/10">Medicos</a>
          <a href="#seguros" class="px-3 py-1.5 rounded-md hover:bg-white/10">Seguros</a>
          <a href="#emergencias" class="px-3 py-1.5 rounded-md hover:bg-white/10">Emergencias</a>
        </nav>
        <div class="flex items-center gap-2 text-sm">
          <app-boton-tema /> <!-- [ModoOscuro] -->
          <ng-container *ngIf="auth.user() as u; else invitado">
            <a [routerLink]="auth.homeParaRol(u.rol)" class="px-3 py-1.5 rounded-md bg-accent text-primary-dark font-semibold hover:bg-white">Ir a mi panel</a>
          </ng-container>
          <ng-template #invitado>
            <a routerLink="/login" class="px-3 py-1.5 rounded-md hover:bg-white/10">Iniciar sesion</a>
            <a routerLink="/registro" class="hidden sm:inline-block px-3 py-1.5 rounded-md bg-accent text-primary-dark font-semibold hover:bg-white">Crear cuenta</a>
          </ng-template>
        </div>
      </div>
    </header>

    <main>
      <!-- Hero: lo que el visitante viene a averiguar, quien atiende y cuando -->
      <section class="bg-primary-dark text-white">
        <div class="max-w-6xl mx-auto px-4 pt-10 pb-16 lg:pt-16 lg:pb-20 grid gap-10 lg:grid-cols-[1fr_1.1fr] items-center">
          <div class="min-w-0">
            <h1 class="text-[2.1rem] sm:text-5xl font-bold leading-[1.08] tracking-tight max-w-xl">
              Consulta con especialistas en Amatitlan sin hacer fila
            </h1>
            <p class="mt-5 text-lg text-white/80 max-w-lg leading-relaxed">
              Elige la especialidad, mira que dias atiende cada medico y reserva tu horario en linea.
              Si tienes seguro con convenio, el descuento se aplica al agendar.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <a [routerLink]="rutaAgendar()" class="inline-flex items-center px-5 py-3 rounded-lg bg-accent text-primary-dark font-semibold hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                Agendar una cita
              </a>
              <a href="#especialidades" class="inline-flex items-center px-5 py-3 rounded-lg border border-white/30 hover:bg-white/10">
                Ver especialidades y precios
              </a>
            </div>
            <p *ngIf="datos() as d" class="mt-8 text-sm text-white/60">
              {{ d.estadisticas.medicos }} medicos en {{ d.estadisticas.especialidades }} especialidades.
              Emergencias todos los dias, sin cita.
            </p>
          </div>

          <!-- Semana de atencion -->
          <div class="min-w-0 rounded-2xl bg-white text-gray-800 p-4 sm:p-6 shadow-2xl shadow-black/20">
            <div class="flex items-baseline justify-between gap-3 mb-4">
              <h2 class="text-lg font-semibold">Quien atiende cada dia</h2>
              <span class="hidden sm:inline text-xs text-gray-500">Toca un medico para reservar</span>
            </div>
            <p *ngIf="cargando()" class="text-sm text-gray-500 py-10 text-center">Cargando horarios...</p>
            <p *ngIf="error()" class="text-sm text-red-700 py-10 text-center">{{ error() }}</p>
            <div *ngIf="datos()" class="overflow-x-auto -mx-1 px-1">
              <table class="w-full text-sm border-separate border-spacing-y-1">
                <caption class="sr-only">Dias de atencion de cada medico</caption>
                <thead>
                  <tr class="text-xs text-gray-500">
                    <th scope="col" class="text-left font-medium pb-1">Medico</th>
                    <th scope="col" *ngFor="let d of diasVisibles()" class="font-medium pb-1 w-8 sm:w-11 text-center">{{ d.corto }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of medicosSemana()" class="group">
                    <th scope="row" class="text-left font-normal pr-3 py-1">
                      <a [routerLink]="rutaAgendar()" [queryParams]="{ idMedico: m.id }" class="block rounded-md -ml-2 px-2 py-1 group-hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                        <span class="block font-medium text-gray-900 leading-tight text-[13px] sm:text-sm">Dr(a). {{ m.nombre }} {{ m.apellido }}</span>
                        <span class="block text-xs text-gray-500">{{ m.especialidad }}</span>
                      </a>
                    </th>
                    <td *ngFor="let d of diasVisibles()" class="text-center">
                      <span *ngIf="horarioDe(m, d.dia) as h; else libre" class="inline-block w-6 sm:w-9 h-7 rounded-md bg-accent/90"
                            [title]="d.dia + ': ' + h.horaInicio + ' a ' + h.horaFin" [attr.aria-label]="d.dia + ' de ' + h.horaInicio + ' a ' + h.horaFin"></span>
                      <ng-template #libre><span class="inline-block w-6 sm:w-9 h-7 rounded-md bg-gray-100" [attr.aria-label]="'No atiende el ' + d.dia"></span></ng-template>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p class="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <span class="inline-block w-3 h-3 rounded-sm bg-accent/90"></span> Atiende ese dia
                <span class="inline-block w-3 h-3 rounded-sm bg-gray-100 ml-3"></span> No atiende
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Especialidades y precios -->
      <section id="especialidades" class="max-w-6xl mx-auto px-4 py-16 scroll-mt-4">
        <div class="max-w-2xl">
          <h2 class="text-3xl font-bold text-gray-900 tracking-tight">Especialidades y precios</h2>
          <p class="mt-2 text-gray-600">El precio es por consulta. Con seguro con convenio pagas menos; el total exacto aparece antes de confirmar la cita.</p>
        </div>
        <div class="mt-8 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div *ngFor="let e of datos()?.especialidades" class="grid grid-cols-[1fr_auto] sm:grid-cols-[14rem_1fr_7rem_6rem] gap-x-6 gap-y-1 px-5 py-4 items-baseline">
            <h3 class="font-semibold text-gray-900">{{ e.nombre }}</h3>
            <p class="order-3 sm:order-none col-span-2 sm:col-span-1 text-sm text-gray-600">{{ e.descripcion || 'Consulta de la especialidad.' }}</p>
            <p class="hidden sm:block text-sm text-gray-500">{{ e.medicos }} {{ e.medicos === 1 ? 'medico' : 'medicos' }}</p>
            <p class="text-right font-semibold text-primary-dark tabular-nums">{{ e.precioConsulta > 0 ? ('Q' + (e.precioConsulta | number: '1.2-2')) : 'Consultar' }}</p>
          </div>
        </div>
      </section>

      <!-- Pasos (es una secuencia real) -->
      <section class="bg-white border-y border-gray-200">
        <div class="max-w-6xl mx-auto px-4 py-16">
          <h2 class="text-3xl font-bold text-gray-900 tracking-tight">Asi reservas tu cita</h2>
          <ol class="mt-8 grid gap-8 md:grid-cols-3">
            <li class="flex gap-4">
              <span class="shrink-0 w-9 h-9 rounded-full border-2 border-primary text-primary font-bold flex items-center justify-center">1</span>
              <div>
                <h3 class="font-semibold text-gray-900">Crea tu cuenta</h3>
                <p class="mt-1 text-sm text-gray-600 leading-relaxed">Solo necesitas tu nombre, correo y telefono. Si tienes seguro, recepcion lo registra con tu numero de poliza.</p>
              </div>
            </li>
            <li class="flex gap-4">
              <span class="shrink-0 w-9 h-9 rounded-full border-2 border-primary text-primary font-bold flex items-center justify-center">2</span>
              <div>
                <h3 class="font-semibold text-gray-900">Elige medico, dia y hora</h3>
                <p class="mt-1 text-sm text-gray-600 leading-relaxed">El calendario solo muestra los dias que atiende el medico y los horarios que siguen libres.</p>
              </div>
            </li>
            <li class="flex gap-4">
              <span class="shrink-0 w-9 h-9 rounded-full border-2 border-primary text-primary font-bold flex items-center justify-center">3</span>
              <div>
                <h3 class="font-semibold text-gray-900">Confirma y llega a tu hora</h3>
                <p class="mt-1 text-sm text-gray-600 leading-relaxed">Antes de confirmar ves el costo con tu descuento. Despues de la consulta, tu receta queda lista en farmacia.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- Medicos -->
      <section id="medicos" class="max-w-6xl mx-auto px-4 py-16 scroll-mt-4">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div class="max-w-2xl">
            <h2 class="text-3xl font-bold text-gray-900 tracking-tight">Nuestros medicos</h2>
            <p class="mt-2 text-gray-600">Cada uno con sus dias y horario de consulta.</p>
          </div>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por especialidad">
            <button type="button" class="px-3 py-1.5 rounded-full text-sm border"
                    [ngClass]="filtro() === null ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-primary'"
                    [attr.aria-pressed]="filtro() === null" (click)="filtro.set(null)">Todas</button>
            <button type="button" *ngFor="let e of especialidadesConMedicos()" class="px-3 py-1.5 rounded-full text-sm border"
                    [ngClass]="filtro() === e.id ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-primary'"
                    [attr.aria-pressed]="filtro() === e.id" (click)="filtro.set(e.id)">{{ e.nombre }}</button>
          </div>
        </div>

        <ul class="mt-8 grid gap-4 md:grid-cols-2">
          <li *ngFor="let m of medicosFiltrados()" class="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-semibold text-gray-900">Dr(a). {{ m.nombre }} {{ m.apellido }}</h3>
                <p class="text-sm text-primary">{{ m.especialidad }}</p>
              </div>
              <p class="text-right text-sm shrink-0">
                <span class="font-semibold text-gray-900">{{ m.rating | number: '1.1-1' }}</span>
                <span class="text-gray-500"> de 5</span>
              </p>
            </div>
            <p *ngIf="m.descripcion" class="mt-3 text-sm text-gray-600 leading-relaxed">{{ m.descripcion }}</p>
            <p class="mt-2 text-sm text-gray-500">
              {{ m.anosExperiencia }} anos de experiencia<ng-container *ngIf="m.consultorio">, {{ m.consultorio }}</ng-container>.
            </p>
            <div class="mt-4 flex flex-wrap gap-1.5" [attr.aria-label]="'Dias de atencion de ' + m.nombre">
              <span *ngFor="let t of resumenDias(m)" class="text-xs px-2 py-1 rounded-md bg-accent/15 text-primary-dark">{{ t }}</span>
              <span *ngIf="!m.dias.length" class="text-xs text-gray-500">Sin horario publicado</span>
            </div>
            <div class="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 mt-auto">
              <span class="text-sm text-gray-600">Consulta <strong class="text-gray-900">Q{{ m.precioConsulta | number: '1.2-2' }}</strong></span>
              <a [routerLink]="rutaAgendar()" [queryParams]="{ idMedico: m.id }" class="btn-primary text-sm">Agendar con este medico</a>
            </div>
          </li>
        </ul>
      </section>

      <!-- Seguros -->
      <section id="seguros" class="bg-white border-y border-gray-200 scroll-mt-4">
        <div class="max-w-6xl mx-auto px-4 py-16 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 class="text-3xl font-bold text-gray-900 tracking-tight">Seguros con convenio</h2>
            <p class="mt-2 text-gray-600 leading-relaxed">
              Si tu seguro esta en la lista, presenta tu poliza en recepcion una sola vez. Desde ese momento
              el descuento se aplica solo en tus consultas y en los medicamentos de farmacia.
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-gray-500 border-b border-gray-200">
                  <th scope="col" class="py-2 pr-4 font-medium">Seguro</th>
                  <th scope="col" class="py-2 pr-4 font-medium text-right">En consultas</th>
                  <th scope="col" class="py-2 font-medium text-right">En medicamentos</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of datos()?.seguros" class="border-b border-gray-100 last:border-0">
                  <th scope="row" class="py-3 pr-4 text-left font-medium text-gray-900">{{ s.nombre }}</th>
                  <td class="py-3 pr-4 text-right tabular-nums">{{ s.descuentoConsulta }}% menos</td>
                  <td class="py-3 text-right tabular-nums">{{ s.descuentoMedicamentos }}% menos</td>
                </tr>
              </tbody>
            </table>
            <p *ngIf="datos() && !datos()!.seguros.length" class="text-sm text-gray-500 py-4">Aun no hay convenios registrados.</p>
          </div>
        </div>
      </section>

      <!-- Emergencias -->
      <section id="emergencias" class="bg-primary-dark text-white scroll-mt-4">
        <div class="max-w-6xl mx-auto px-4 py-16 grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <h2 class="text-3xl font-bold tracking-tight">Si es una emergencia, ven directo</h2>
            <p class="mt-3 text-white/80 leading-relaxed max-w-lg">
              No necesitas cita. Al llegar, recepcion toma tus signos vitales y te asigna una prioridad.
              Se atiende primero a quien esta mas grave, no a quien llego primero.
            </p>
            <p *ngIf="datos() as d" class="mt-4 text-white/80">
              La atencion de emergencia cuesta <strong class="text-white">Q{{ d.precioEmergencia | number: '1.2-2' }}</strong>; si tienes seguro con convenio se aplica tu descuento.
            </p>
            <p class="mt-6 text-sm text-white/60">Si la persona no respira o esta inconsciente, llama primero a los bomberos al 122 o 123.</p>
          </div>
          <ol class="space-y-3" aria-label="Niveles de prioridad">
            <li class="flex items-center gap-4 rounded-lg bg-white/5 px-4 py-3">
              <span class="w-4 h-10 rounded bg-red-600 shrink-0"></span>
              <div><p class="font-semibold">Inmediato</p><p class="text-sm text-white/70">Riesgo para la vida. Se atiende al llegar.</p></div>
            </li>
            <li class="flex items-center gap-4 rounded-lg bg-white/5 px-4 py-3">
              <span class="w-4 h-10 rounded bg-orange-500 shrink-0"></span>
              <div><p class="font-semibold">Muy urgente</p><p class="text-sm text-white/70">Dolor intenso o fiebre muy alta. Antes de 10 minutos.</p></div>
            </li>
            <li class="flex items-center gap-4 rounded-lg bg-white/5 px-4 py-3">
              <span class="w-4 h-10 rounded bg-yellow-400 shrink-0"></span>
              <div><p class="font-semibold">Urgente</p><p class="text-sm text-white/70">Heridas o dolor moderado. Antes de 1 hora.</p></div>
            </li>
            <li class="flex items-center gap-4 rounded-lg bg-white/5 px-4 py-3">
              <span class="w-4 h-10 rounded bg-green-500 shrink-0"></span>
              <div><p class="font-semibold">Menos urgente</p><p class="text-sm text-white/70">Molestias leves. Antes de 2 horas.</p></div>
            </li>
          </ol>
        </div>
      </section>
    </main>

    <footer class="bg-white border-t border-gray-200">
      <div class="max-w-6xl mx-auto px-4 py-10 grid gap-6 sm:grid-cols-3 text-sm text-gray-600">
        <div>
          <app-logo [tamano]="28" fondo="claro" /> <!-- [Logo] -->
          <p class="mt-2">Amatitlan, Guatemala</p>
        </div>
        <div>
          <p class="font-semibold text-gray-900">Horario</p>
          <p class="mt-1">Consultas segun el horario de cada medico. Emergencias todos los dias.</p>
        </div>
        <div>
          <p class="font-semibold text-gray-900">Tu cuenta</p>
          <p class="mt-1">
            <a routerLink="/login" class="text-primary hover:underline">Iniciar sesion</a> o
            <a routerLink="/registro" class="text-primary hover:underline">crear una cuenta de paciente</a>.
          </p>
        </div>
      </div>
    </footer>
  `,
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  datos = signal<InicioPublico | null>(null);
  cargando = signal(true);
  error = signal('');
  filtro = signal<number | null>(null);

  // Domingo solo aparece si algun medico atiende ese dia
  diasVisibles = computed(() => {
    const d = this.datos();
    const domingo = d?.medicos.some((m) => m.dias.some((h) => h.dia === 'Domingo'));
    return DIAS.filter((x) => x.dia !== 'Domingo' || domingo);
  });

  medicosSemana = computed(() =>
    [...(this.datos()?.medicos ?? [])].sort((a, b) => a.especialidad.localeCompare(b.especialidad)).slice(0, 8),
  );

  especialidadesConMedicos = computed(() => (this.datos()?.especialidades ?? []).filter((e) => e.medicos > 0));

  medicosFiltrados = computed(() => {
    const f = this.filtro();
    const lista = this.datos()?.medicos ?? [];
    return f === null ? lista : lista.filter((m) => m.idEspecialidad === f);
  });

  ngOnInit() {
    this.api.inicioPublico().subscribe({
      next: (d) => {
        this.datos.set(d);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudieron cargar los horarios. Intenta recargar la pagina.');
      },
    });
  }

  /** Paciente con sesion: va directo a agendar. Sin sesion: el guard lo manda a iniciar sesion y regresa. */
  rutaAgendar(): string {
    const u = this.auth.user();
    if (u && u.rol !== 'Paciente') return this.auth.homeParaRol(u.rol);
    return '/paciente/agendar';
  }

  horarioDe(m: MedicoPublico, dia: DiaSemana) {
    return m.dias.find((h) => h.dia === dia) ?? null;
  }

  /** Agrupa dias seguidos con el mismo horario: "Lun a Vie 08:00-16:00" */
  resumenDias(m: MedicoPublico): string[] {
    const orden = DIAS.map((d) => d.dia);
    const dias = [...m.dias].sort((a, b) => orden.indexOf(a.dia) - orden.indexOf(b.dia));
    const grupos: { desde: DiaSemana; hasta: DiaSemana; horario: string; ultimo: number }[] = [];
    for (const h of dias) {
      const horario = `${h.horaInicio}-${h.horaFin}`;
      const idx = orden.indexOf(h.dia);
      const g = grupos[grupos.length - 1];
      if (g && g.horario === horario && g.ultimo === idx - 1) {
        g.hasta = h.dia;
        g.ultimo = idx;
      } else {
        grupos.push({ desde: h.dia, hasta: h.dia, horario, ultimo: idx });
      }
    }
    return grupos.map((g) => {
      const rango = g.desde === g.hasta ? this.corto(g.desde) : `${this.corto(g.desde)} a ${this.corto(g.hasta)}`;
      return `${rango} ${g.horario}`;
    });
  }

  corto(dia: DiaSemana) {
    return DIAS.find((d) => d.dia === dia)?.corto ?? dia;
  }
}
