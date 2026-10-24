import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let host: ArgumentsHost;
  let request: Request;
  let response: Response;
  let getType: jest.Mock;
  let switchToHttp: jest.Mock;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    request = { url: '/api/v1/accounts' } as Request;
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    getType = jest.fn().mockReturnValue('http');
    switchToHttp = jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
      getResponse: jest.fn().mockReturnValue(response),
      getNext: jest.fn(),
    });
    host = {
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToHttp,
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType,
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devuelve un envelope para BadRequestException con mensaje string', () => {
    filter.catch(new BadRequestException('Solicitud inválida.'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Solicitud inválida.',
        error: 'Bad Request',
        path: '/api/v1/accounts',
      }),
    );
  });

  it('preserva el array de mensajes de validación', () => {
    const messages = ['email debe ser válido', 'password es obligatorio'];
    filter.catch(new BadRequestException(messages), host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: messages,
        error: 'Bad Request',
      }),
    );
  });

  it('devuelve el envelope para UnauthorizedException', () => {
    filter.catch(new UnauthorizedException(), host);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      }),
    );
  });

  it('devuelve el envelope para NotFoundException', () => {
    filter.catch(new NotFoundException(), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not Found',
        error: 'Not Found',
      }),
    );
  });

  it('devuelve el envelope para ConflictException', () => {
    filter.catch(new ConflictException(), host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'Conflict',
        error: 'Conflict',
      }),
    );
  });

  it('devuelve el envelope para UnprocessableEntityException', () => {
    filter.catch(new UnprocessableEntityException(), host);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        message: 'Unprocessable Entity',
        error: 'Unprocessable Entity',
      }),
    );
  });

  it('oculta los detalles de errores no controlados', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    filter.catch(new Error('detalle interno'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Error interno del servidor',
        error: 'Internal Server Error',
      }),
    );
  });

  it('registra el mensaje y stack del error no controlado', () => {
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const exception = new Error('detalle interno');

    filter.catch(exception, host);

    expect(loggerError).toHaveBeenCalledWith(
      'Unhandled exception: detalle interno',
      exception.stack,
    );
  });

  it('genera un timestamp ISO 8601 con offset -05:00', () => {
    filter.catch(new BadRequestException(), host);

    const envelope = (response.json as jest.Mock).mock.calls[0][0] as {
      timestamp: string;
    };
    expect(envelope.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-05:00$/);
  });

  it('omite los query params del path', () => {
    request.url = '/api/v1/accounts?foo=bar';
    filter.catch(new BadRequestException(), host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/v1/accounts' }),
    );
  });

  it('relanza excepciones en contextos que no son HTTP', () => {
    const exception = new Error('fallo RPC');
    getType.mockReturnValue('rpc');

    expect(() => filter.catch(exception, host)).toThrow(exception);
    expect(switchToHttp).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
  });
});
