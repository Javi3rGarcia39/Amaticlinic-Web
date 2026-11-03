import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BotonTemaComponent } from '../../shared/boton-tema.component'; // [ModoOscuro]
import { ApiService } from '../../core/services/api.service';
import { LogoComponent } from '../../shared/logo.component'; // [Logo]

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BotonTemaComponent, LogoComponent],
  template: `
    <div class="relative min-h-screen flex items-center justify-center bg-primary-dark px-4 py-10">
      <div class="absolute top-4 right-4"><app-boton-tema /></div> <!-- [ModoOscuro] -->
      <div class="w-full max-w-md">
        <div class="text-center mb-6">
          <div class="flex justify-center mb-4"><app-logo [tamano]="64" [texto]="false" /></div> <!-- [Logo] -->
          <h1 class="text-white text-2xl font-bold">Crear cuenta de paciente</h1>
        </div>

        <div class="card">
          <div *ngIf="error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {{ error }}
          </div>

          <form (ngSubmit)="onSubmit()">
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label class="label-field">Nombre</label>
                <input class="input-field" name="nombre" [(ngModel)]="form.nombre" required />
              </div>
              <div>
                <label class="label-field">Apellido</label>
                <input class="input-field" name="apellido" [(ngModel)]="form.apellido" required />
              </div>
            </div>
            <div class="mb-4">
              <label class="label-field">Correo electronico</label>
              <input class="input-field" type="email" name="correo" [(ngModel)]="form.correo" required />
            </div>
            <div class="mb-4">
              <label class="label-field">Telefono</label>
              <input class="input-field" name="telefono" [(ngModel)]="form.telefono" />
            </div>
            <div class="mb-6">
              <label class="label-field">Contrasena (minimo 6 caracteres)</label>
              <input class="input-field" type="password" name="password" minlength="6" [(ngModel)]="form.password" required />
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="cargando">
              {{ cargando ? 'Creando cuenta...' : 'Crear cuenta' }}
            </button>
          </form>

          <p class="text-sm text-gray-600 text-center mt-5">
            Ya tienes cuenta?
            <a routerLink="/login" [queryParams]="volver ? { volver } : {}" class="text-primary font-medium hover:underline">Inicia sesion</a>
          </p>
        </div>
        <!-- [Landing] -->
        <p class="text-center mt-4">
          <a routerLink="/" class="text-sm text-white/80 hover:text-white hover:underline">Volver a la pagina de inicio</a>
        </p>
      </div>
    </div>
  `,
})
export class RegistroComponent {
  form = { nombre: '', apellido: '', correo: '', telefono: '', password: '' };
  get volver() {
    return this.route.snapshot.queryParamMap.get('volver');
  }
  error = '';
  cargando = false;

  constructor(private auth: AuthService, private api: ApiService, private router: Router, private route: ActivatedRoute) {}

  async onSubmit() {
    this.error = '';
    this.cargando = true;
    try {
      const usuario = await this.auth.registroAsync(this.form);
      // Crea el perfil de Paciente vinculado al usuario recien creado
      this.router.navigateByUrl(this.destino(usuario.rol));
    } catch (e: any) {
      this.error = e?.error?.error ?? 'No se pudo completar el registro';
    } finally {
      this.cargando = false;
    }
  }

  // [Landing] Si venia de una pagina protegida (por ejemplo "Agendar con este medico"), vuelve ahi
  private destino(rol: string): string {
    const volver = this.route.snapshot.queryParamMap.get('volver');
    return volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : this.auth.homeParaRol(rol);
  }
}
