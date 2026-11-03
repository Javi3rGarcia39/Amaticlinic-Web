import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../services/notificacion.service';

// [Interceptores] 3) Manejo central de errores HTTP:
//  - Unifica el mensaje: el backend responde { error } o { errors: [...] } (validaciones);
//    aqui siempre queda en error.error.error para que cada pantalla lo muestre igual.
//  - 0 (sin conexion), 401 (sesion vencida), 403, 408 y 5xx se avisan con un toast.
//  - 400 y 409 (reglas de negocio) se dejan a cada pantalla, que los muestra junto al formulario.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const avisos = inject(NotificacionService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const cuerpo = error.error && typeof error.error === 'object' ? error.error : null;
      if (cuerpo && !cuerpo.error && Array.isArray(cuerpo.errors)) cuerpo.error = cuerpo.errors.join('. ');
      const mensaje: string | undefined = cuerpo?.error;
      const esLogin = req.url.includes('/auth/login') || req.url.includes('/auth/registro');

      switch (true) {
        case error.status === 0:
          avisos.error('No se pudo conectar con el servidor. Revisa que el backend este encendido.');
          break;
        case error.status === 401 && !esLogin:
          if (auth.isAuthenticated()) {
            auth.logout();
            avisos.mostrar('Tu sesion vencio. Inicia sesion de nuevo.', 'info');
          }
          router.navigate(['/login'], { queryParams: { volver: router.url } });
          break;
        case error.status === 403:
          avisos.error(mensaje ?? 'No tienes permiso para realizar esta accion.');
          break;
        case error.status === 408:
          avisos.error(mensaje ?? 'El servidor tardo demasiado en responder. Intenta de nuevo.');
          break;
        case error.status >= 500:
          avisos.error('Ocurrio un error en el servidor. Intenta de nuevo en unos segundos.');
          break;
      }
      return throwError(() => error);
    }),
  );
};
