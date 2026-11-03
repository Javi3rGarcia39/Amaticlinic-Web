import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginResponse, UsuarioSesion } from '../models/models';

const STORAGE_KEY = 'amaticlinic_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Signal reactivo con el usuario autenticado (o null)
  user = signal<UsuarioSesion | null>(this.cargarDeStorage());

  constructor(private http: HttpClient, private router: Router) {}

  private cargarDeStorage(): UsuarioSesion | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private guardar(resp: LoginResponse) {
    const usuario: UsuarioSesion = {
      id: resp.idUsuario,
      nombre: resp.nombre,
      apellido: resp.apellido,
      correo: resp.correo,
      rol: resp.rol,
      idPerfil: resp.idPerfil,
      token: resp.token,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
    this.user.set(usuario);
    return usuario;
  }

  login(correo: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { correo, password })
      .subscribe();
  }

  async loginAsync(correo: string, password: string): Promise<UsuarioSesion> {
    const resp = await this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { correo, password })
      .toPromise();
    return this.guardar(resp as LoginResponse);
  }

  async registroAsync(data: {
    nombre: string;
    apellido: string;
    correo: string;
    telefono?: string;
    password: string;
  }): Promise<UsuarioSesion> {
    const resp = await this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/registro`, {
        ...data,
        tipoUsuario: 'Paciente',
      })
      .toPromise();
    return this.guardar(resp as LoginResponse);
  }

  logout() {
    localStorage.removeItem(STORAGE_KEY);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.user()?.token ?? null;
  }

  isAuthenticated(): boolean {
    return !!this.user();
  }

  homeParaRol(rol: string): string {
    switch (rol) {
      case 'Paciente':
        return '/paciente/dashboard';
      case 'Medico':
        return '/medico/dashboard';
      case 'Recepcionista':
        return '/recepcionista/dashboard';
      case 'Farmaceutico': // [Farmacia]
        return '/farmacia/dashboard';
      default:
        return '/login';
    }
  }
}
