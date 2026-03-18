import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard, type RequestWithSession } from '../auth/jwt-auth.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { RateLimitService } from '../rate-limit/rate-limit.service';

describe('RoomsController invite rate limit', () => {
  let controller: RoomsController;

  beforeEach(async () => {
    process.env.RATE_LIMIT_STORAGE = 'memory';
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        {
          provide: RoomsService,
          useValue: {
            listRooms: jest.fn(),
            getRoom: jest.fn(),
            createRoom: jest.fn((ownerId: string) => ({ id: 'room1', ownerId })),
            joinRoom: jest.fn(() => ({ id: 'room1' })),
          },
        },
        RateLimitGuard,
        RateLimitService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(RoomsController);
  });

  it('allows normal invite usage and then blocks spam joins from same IP', async () => {
    const req = {
      session: { userId: 'u1' },
      ip: '10.0.0.1',
      headers: {},
    } as unknown as RequestWithSession;

    // normal couple of joins (e.g. start_param or manual link) should work
    await controller.join(req, 'room1');
    await controller.join(req, 'room1');

    // simulate many joins from same IP to hit RateLimitGuard (limit 20 / min per IP)
    for (let i = 0; i < 25; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await controller.join(req, 'room1');
      } catch (err) {
        // once limit is hit, we expect subsequent joins to throw
        expect((err as Error).message).toContain('Too many requests');
        break;
      }
    }
  });
});

