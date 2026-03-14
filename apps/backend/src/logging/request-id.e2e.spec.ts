import { Test } from '@nestjs/testing';
import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import * as request from 'supertest';
import { LoggingModule } from './logging.module';
import { RequestIdMiddleware } from './request-id.middleware';

@Controller()
class TestHealthController {
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}

@Module({
  imports: [LoggingModule],
  controllers: [TestHealthController],
  providers: [RequestIdMiddleware],
})
class TestAppModule {}

describe('RequestIdMiddleware e2e', () => {
  let app: INestApplication;
  let middleware: RequestIdMiddleware;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    middleware = moduleRef.get(RequestIdMiddleware);
    app.use(middleware.use.bind(middleware));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates request and correlation ids when not provided', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    const requestId = res.header['x-request-id'];
    const correlationId = res.header['x-correlation-id'];

    expect(requestId).toBeDefined();
    expect(String(requestId).length).toBeGreaterThan(0);
    expect(correlationId).toBeDefined();
    expect(correlationId).toBe(requestId);
  });

  it('respects externally provided request and correlation ids', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', 'client-req-1')
      .set('X-Correlation-Id', 'client-corr-1')
      .expect(200);

    expect(res.header['x-request-id']).toBe('client-req-1');
    expect(res.header['x-correlation-id']).toBe('client-corr-1');
  });
});

