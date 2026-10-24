import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorEnvelope {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

function isMessage(value: unknown): value is string | string[] {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((item: unknown) => typeof item === 'string'))
  );
}

function getErrorName(statusCode: number, fallback: string): string {
  const statusName = HttpStatus[statusCode];
  return typeof statusName === 'string'
    ? statusName
        .toLowerCase()
        .split('_')
        .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
        .join(' ')
    : fallback;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        message = responseBody;
        error = getErrorName(statusCode, exception.name.replace(/Exception$/, ''));
      } else {
        const responseMessage =
          'message' in responseBody ? responseBody.message : undefined;
        const responseError = 'error' in responseBody ? responseBody.error : undefined;
        message = isMessage(responseMessage) ? responseMessage : exception.message;
        error =
          typeof responseError === 'string'
            ? responseError
            : getErrorName(statusCode, exception.name.replace(/Exception$/, ''));
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Error interno del servidor';
      error = 'Internal Server Error';

      const details = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`Unhandled exception: ${details}`, stack);
    }

    const now = new Date();
    const offsetMs = -5 * 60 * 60 * 1000;
    const local = new Date(now.getTime() + offsetMs);
    const timestamp = local.toISOString().replace('Z', '-05:00');
    const path = request.url.split('?')[0];

    const envelope: ErrorEnvelope = {
      statusCode,
      message,
      error,
      timestamp,
      path,
    };

    response.status(statusCode).json(envelope);
  }
}
