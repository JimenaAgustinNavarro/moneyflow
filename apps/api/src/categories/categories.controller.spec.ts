import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let categoriesService: {
    findAll: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    restore: jest.Mock;
  };

  beforeAll(async () => {
    categoriesService = {
      findAll: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'category-1' }),
      findOne: jest.fn().mockResolvedValue({ id: 'category-1' }),
      update: jest.fn().mockResolvedValue({ id: 'category-1' }),
      remove: jest.fn().mockResolvedValue(undefined),
      restore: jest.fn().mockResolvedValue({ id: 'category-1' }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: categoriesService },
        JwtStrategy,
        Reflector,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string): string => {
              if (key === 'JWT_ACCESS_SECRET') {
                return 'test-access-secret';
              }
              throw new Error(`Configuración requerida ausente: ${key}`);
            },
          },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = moduleRef.get(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    categoriesService.findAll.mockResolvedValue([]);
    categoriesService.create.mockResolvedValue({ id: 'category-1' });
    categoriesService.findOne.mockResolvedValue({ id: 'category-1' });
    categoriesService.update.mockResolvedValue({ id: 'category-1' });
    categoriesService.remove.mockResolvedValue(undefined);
    categoriesService.restore.mockResolvedValue({ id: 'category-1' });
  });

  afterAll(async () => {
    await app.close();
  });

  function authorizationHeader(): string {
    return `Bearer ${jwtService.sign({ sub: 'user-1', email: 'test@example.com' })}`;
  }

  it('GET /categories devuelve { data } y aplica filtros', async () => {
    categoriesService.findAll.mockResolvedValue([{ id: 'category-1' }]);

    await request(app.getHttpServer())
      .get('/categories?type=INCOME&includeDeleted=true')
      .set('Authorization', authorizationHeader())
      .expect(200)
      .expect({ data: [{ id: 'category-1' }] });

    expect(categoriesService.findAll).toHaveBeenCalledWith('user-1', 'INCOME', true);
  });

  it.each(['/categories', '/categories/category-1'])(
    'GET %s sin token devuelve 401',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(401);
    },
  );

  it('GET /categories rechaza filtros inválidos', async () => {
    await request(app.getHttpServer())
      .get('/categories?type=INVALID')
      .set('Authorization', authorizationHeader())
      .expect(400);

    expect(categoriesService.findAll).not.toHaveBeenCalled();
  });

  it('POST /categories valida el DTO y devuelve { data }', async () => {
    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', authorizationHeader())
      .send({ name: 'Mascotas', type: 'EXPENSE', color: '#f59e0b' })
      .expect(201)
      .expect({ data: { id: 'category-1' } });

    expect(categoriesService.create).toHaveBeenCalledWith('user-1', {
      name: 'Mascotas',
      type: 'EXPENSE',
      color: '#f59e0b',
    });
  });

  it('POST /categories rechaza campos no permitidos', async () => {
    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', authorizationHeader())
      .send({ name: 'Mascotas', type: 'EXPENSE', userId: 'user-2' })
      .expect(400);

    expect(categoriesService.create).not.toHaveBeenCalled();
  });

  it('GET /categories/:id devuelve { data }', async () => {
    await request(app.getHttpServer())
      .get('/categories/category-1')
      .set('Authorization', authorizationHeader())
      .expect(200)
      .expect({ data: { id: 'category-1' } });

    expect(categoriesService.findOne).toHaveBeenCalledWith('user-1', 'category-1');
  });

  it('PATCH /categories/:id valida y actualiza la categoría', async () => {
    await request(app.getHttpServer())
      .patch('/categories/category-1')
      .set('Authorization', authorizationHeader())
      .send({ name: 'Alimentos' })
      .expect(200)
      .expect({ data: { id: 'category-1' } });

    expect(categoriesService.update).toHaveBeenCalledWith('user-1', 'category-1', {
      name: 'Alimentos',
    });
  });

  it('PATCH /categories/:id rechaza type y parentId', async () => {
    await request(app.getHttpServer())
      .patch('/categories/category-1')
      .set('Authorization', authorizationHeader())
      .send({ type: 'INCOME' })
      .expect(400);

    expect(categoriesService.update).not.toHaveBeenCalled();
  });

  it('DELETE /categories/:id devuelve 204 sin body', async () => {
    const response = await request(app.getHttpServer())
      .delete('/categories/category-1')
      .set('Authorization', authorizationHeader())
      .expect(204);

    expect(response.text).toBe('');
    expect(categoriesService.remove).toHaveBeenCalledWith('user-1', 'category-1');
  });

  it('POST /categories/:id/restore devuelve { data }', async () => {
    await request(app.getHttpServer())
      .post('/categories/category-1/restore')
      .set('Authorization', authorizationHeader())
      .expect(200)
      .expect({ data: { id: 'category-1' } });

    expect(categoriesService.restore).toHaveBeenCalledWith('user-1', 'category-1');
  });
});
