import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

// Equivalente al @RestControllerAdvice / GlobalExceptionHandler de Spring
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Errores de validacion de class-validator (equivalente a MethodArgumentNotValidException)
    if (exception instanceof BadRequestException) {
      const body: any = exception.getResponse();
      if (Array.isArray(body?.message)) {
        return response.status(HttpStatus.BAD_REQUEST).json({ errors: body.message });
      }
      return response.status(HttpStatus.BAD_REQUEST).json({ error: body?.message ?? 'Solicitud invalida' });
    }

    // Conflictos de negocio (equivalente a IllegalStateException -> 409)
    if (exception instanceof ConflictException) {
      const body: any = exception.getResponse();
      return response.status(HttpStatus.CONFLICT).json({ error: body?.message ?? 'Conflicto' });
    }

    // Cualquier otra HttpException conocida (NotFound, Forbidden, Unauthorized, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body: any = exception.getResponse();
      const message = typeof body === 'string' ? body : body?.message ?? exception.message;
      return response.status(status).json({ error: message });
    }

    // Error no controlado (equivalente al handler generico -> 500)
    // eslint-disable-next-line no-console
    console.error(exception);
    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: 'Error interno del servidor' });
  }
}
