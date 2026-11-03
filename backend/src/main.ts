// [Despliegue] Debe ser la primera importacion: fija la zona horaria antes de crear cualquier fecha
import './config/zona-horaria';
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'; // [Interceptores]
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { origenesCors, validarEntorno } from './config/entorno'; // [Despliegue]

/** Crea y configura la aplicacion (igual en tu computadora y en Vercel) */
async function crearApp(): Promise<INestApplication> {
  validarEntorno(); // [Despliegue]
  // [Despliegue] En Vercel un error al arrancar no debe cerrar el proceso: se reporta y se reintenta
  const app = await NestFactory.create(AppModule, { abortOnError: !process.env.VERCEL });

  // Habilita CORS para el frontend Angular (equivalente a CorsConfig/SecurityConfig en Spring)
  // [Despliegue] Los origenes permitidos vienen de CORS_ORIGINS (en desarrollo: http://localhost:4200)
  app.enableCors({
    origin: origenesCors(),
    credentials: true,
  });

  // Valida y transforma automaticamente los DTO de entrada (equivalente a @Valid en Spring)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Manejo global de errores (equivalente a GlobalExceptionHandler)
  app.useGlobalFilters(new AllExceptionsFilter());

  // [Interceptores] Bitacora de peticiones y limite de tiempo de respuesta
  app.useGlobalInterceptors(new LoggingInterceptor(), new TimeoutInterceptor(15000));

  return app;
}

/** Desarrollo (y cualquier servidor normal): levanta el backend en un puerto */
async function bootstrap() {
  const app = await crearApp();
  const port = process.env.PORT || 8080;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`AmatiClinic backend (NestJS) escuchando en http://localhost:${port}`);
}

// [Despliegue] Vercel no usa un puerto: llama a la funcion exportada en cada peticion.
// La aplicacion se crea una sola vez por instancia y se reutiliza en las siguientes peticiones.
// Si falla al crearse (por ejemplo, la base no responde), se vuelve a intentar en la siguiente.
type Manejador = (req: IncomingMessage, res: ServerResponse) => void;
let appVercel: Promise<Manejador> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appVercel) {
    appVercel = crearApp()
      .then(async (app) => {
        await app.init();
        return app.getHttpAdapter().getInstance() as Manejador;
      })
      .catch((e) => {
        appVercel = null;
        throw e;
      });
  }
  const servidor = await appVercel;
  return servidor(req, res);
}

if (!process.env.VERCEL) {
  bootstrap();
}
