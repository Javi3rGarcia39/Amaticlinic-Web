import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs';

// [Interceptores] Si una peticion tarda mas de 15 segundos se corta con 408,
// para que el frontend no quede esperando indefinidamente.
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly ms = 15000) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.ms),
      catchError((err) =>
        err instanceof TimeoutError
          ? throwError(() => new RequestTimeoutException('El servidor tardo demasiado en responder. Intenta de nuevo.'))
          : throwError(() => err),
      ),
    );
  }
}
