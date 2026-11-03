import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { CargaService } from '../services/carga.service';

// Las peticiones que se repiten solas (por ejemplo, refrescar la cola de emergencias)
// pueden marcarse con este token para no mostrar la barra de carga cada vez.
export const SIN_CARGA = new HttpContextToken<boolean>(() => false);

// [Interceptores] 2) Muestra la barra de carga mientras haya peticiones en curso
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SIN_CARGA)) return next(req);
  const carga = inject(CargaService);
  carga.iniciar();
  return next(req).pipe(finalize(() => carga.terminar()));
};
