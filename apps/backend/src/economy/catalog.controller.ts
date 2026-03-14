import { Controller, Get } from '@nestjs/common';
import type { CosmeticItemDto } from 'shared';
import { CosmeticsService } from './cosmetics.service';

@Controller('cosmetics')
export class CatalogController {
  constructor(private readonly cosmeticsService: CosmeticsService) {}

  @Get('catalog')
  async getCatalog(): Promise<CosmeticItemDto[]> {
    return this.cosmeticsService.getCatalog();
  }
}

