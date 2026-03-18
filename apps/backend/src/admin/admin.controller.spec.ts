import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [AdminGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminController);
  });

  it('returns ok for admin root', async () => {
    const result = await controller.getAdminRoot();
    expect(result).toEqual({ ok: true });
  });
});

