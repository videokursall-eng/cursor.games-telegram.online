import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { StructuredLoggerService } from './structured-logger.service';
import { RequestContextService } from './request-context.service';

describe('StructuredLoggerService', () => {
  let logger: StructuredLoggerService;
  let ctx: RequestContextService;
  const originalLog = console.log;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestContextService, StructuredLoggerService],
    }).compile();

    ctx = module.get(RequestContextService);
    logger = module.get(StructuredLoggerService);
    // eslint-disable-next-line no-console
    console.log = jest.fn();
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    console.log = originalLog;
  });

  it('emits structured JSON with basic fields', () => {
    logger.info('user logged in', {
      service: 'AuthController',
      userId: 'u1',
      requestId: 'req-123',
      token: 'should_not_be_logged',
      initData: 'should_not_be_logged_either',
      extra: 'value',
    });

    // eslint-disable-next-line no-console
    expect(console.log).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line no-console
    const arg = (console.log as jest.Mock).mock.calls[0][0] as string;
    const parsed = JSON.parse(arg);

    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('user logged in');
    expect(parsed.service).toBe('AuthController');
    expect(parsed.userId).toBe('u1');
    expect(parsed.requestId).toBe('req-123');
    expect(parsed.extra).toBe('value');
    expect(parsed.token).toBeUndefined();
    expect(parsed.initData).toBeUndefined();
    expect(typeof parsed.timestamp).toBe('string');
  });

  it('injects requestId from RequestContextService when not provided explicitly', () => {
    // eslint-disable-next-line no-console
    (console.log as jest.Mock).mockClear();

    ctx.run({ requestId: 'ctx-req-1' }, () => {
      logger.info('test_in_context', {});
    });

    // eslint-disable-next-line no-console
    const arg = (console.log as jest.Mock).mock.calls[0][0] as string;
    const parsed = JSON.parse(arg);
    expect(parsed.requestId).toBe('ctx-req-1');
  });
});

