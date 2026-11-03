import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BotonTemaComponent } from '../../shared/boton-tema.component'; // [ModoOscuro]
import { LogoComponent } from '../../shared/logo.component'; // [Logo]

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BotonTemaComponent, LogoComponent],
  template: `
    <div class="relative min-h-screen flex items-center justify-center bg-primary-dark px-4">
      <div class="absolute top-4 right-4"><app-boton-tema /></div> <!-- [ModoOscuro] -->
      <div class="w-full max-w-md">
        <div class="text-center mb-6">
          <div class="flex justify-center mb-4"><app-logo [tamano]="64" [texto]="false" /></div> <!-- [Logo] -->
          <h1 class="text-2xl font-bold tracking-tight"><span class="text-white">Amati</span><span class="text-accent">Clinic</span></h1>
          <p class="text-white/70 text-sm">Sistema de Gestion de Citas Medicas</p>
        </div>
        <!-- [Landing] -->
        <p *ngIf="volver" class="mb-3 text-sm text-white/90 text-center">Inicia sesion o crea tu cuenta para continuar.</p>

        <div class="card">
          <h2 class="text-lg font-semibold mb-4 text-gray-800">Iniciar sesion</h2>

          <div *ngIf="error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {{ error }}
          </div>

          <form (ngSubmit)="onSubmit()">
            <div class="mb-4">
              <label class="label-field">Correo electronico</label>
              <input class="input-field" type="email" name="correo" [(ngModel)]="correo" required />
            </div>
            <div class="mb-6">
              <label class="label-field">Contrasena</label>
              <input class="input-field" type="password" name="password" [(ngModel)]="password" required />
            </div>
            <button type="submit" class="btn-primary w-full" [disabled]="cargando">
              {{ cargando ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </form>

          <p class="text-sm text-gray-600 text-center mt-5">
            No tienes cuenta?
            <a routerLink="/registro" [queryParams]="volver ? { volver } : {}" class="text-primary font-medium hover:underline">Registrate como paciente</a>
          </p>
        </div>
        <p class="text-center mt-4">
          <a routerLink="/" class="text-sm text-white/80 hover:text-white hover:underline">Volver a la pagina de inicio</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  correo = '';
  password = '';
  get volver() {
    return this.route.snapshot.queryParamMap.get('volver');
  }
  error = '';
  cargando = false;

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  async onSubmit() {
    this.error = '';
    this.cargando = true;
    try {
      const usuario = await this.auth.loginAsync(this.correo, this.password);
      this.router.navigateByUrl(this.destino(usuario.rol));
    } catch (e: any) {
      this.error = e?.error?.error ?? 'Credenciales invalidas';
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
