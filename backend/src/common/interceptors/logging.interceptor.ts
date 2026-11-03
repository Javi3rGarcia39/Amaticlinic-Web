import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

// [Interceptores] Registra cada peticion: metodo, ruta, codigo de respuesta, tiempo y usuario.
// Ejemplo en consola:  GET /api/citas 200 - 12 ms - recepcion@amaticlinic.com
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const inicio = Date.now();
    const usuario = () => req.user?.correo ?? 'anonimo';

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - inicio} ms - ${usuario()}`),
        error: (err) =>
          this.logger.warn(
            `${req.method} ${req.originalUrl} ${err?.status ?? 500} - ${Date.now() - inicio} ms - ${usuario()} - ${err?.message ?? err}`,
          ),
      }),
    );
  }
}
