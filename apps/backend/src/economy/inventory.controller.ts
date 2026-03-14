import { Body, Controller, Get, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Session } from '../auth/session.decorator';
import type { AuthSessionPayload, PlayerInventoryDto, CosmeticSlot } from 'shared';
import { CosmeticsService } from './cosmetics.service';

interface EquipCosmeticDto {
  slot: CosmeticSlot;
  itemId: string;
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly cosmeticsService: CosmeticsService) {}

  @Get('inventory')
  async getInventory(@Session() session: AuthSessionPayload): Promise<PlayerInventoryDto> {
    return this.cosmeticsService.getInventory(session.userId);
  }

  @Post('inventory/equip')
  async equip(
    @Session() session: AuthSessionPayload,
    @Body() dto: EquipCosmeticDto,
  ): Promise<PlayerInventoryDto> {
    if (!dto.slot || !dto.itemId) {
      throw new BadRequestException('slot and itemId are required');
    }
    return this.cosmeticsService.equipItem(session.userId, dto.slot, dto.itemId);
  }
}

