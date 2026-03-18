import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { AdminOffersService } from './admin-offers.service';
import type { CurrencyCode, StoreOfferDto } from 'shared';
import { Session } from '../auth/session.decorator';
import type { AuthSessionPayload } from 'shared';
import { AdminAuditService } from '../admin/admin-audit.service';

interface UpsertOfferDto {
  code: string;
  itemId: string;
  priceSoft?: number | null;
  priceStars?: number | null;
  currencyType: CurrencyCode;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

@Controller('admin/offers')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminOffersController {
  constructor(
    private readonly offers: AdminOffersService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  list(): Promise<StoreOfferDto[]> {
    return this.offers.list();
  }

  @Post()
  async create(@Session() session: AuthSessionPayload, @Body() dto: UpsertOfferDto): Promise<StoreOfferDto> {
    const created = await this.offers.create({
      code: dto.code,
      itemId: dto.itemId,
      priceSoft: dto.priceSoft ?? null,
      priceStars: dto.priceStars ?? null,
      currencyType: dto.currencyType ?? 'soft',
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      startsAt: dto.startsAt ?? null,
      endsAt: dto.endsAt ?? null,
    });
    await this.audit.log({
      admin: session,
      action: 'offer_create',
      targetType: 'StoreOffer',
      targetId: created.id,
      success: true,
      reason: undefined,
      payload: dto,
    });
    return created;
  }

  @Patch(':id')
  async update(
    @Session() session: AuthSessionPayload,
    @Param('id') id: string,
    @Body() dto: Partial<UpsertOfferDto>,
  ): Promise<StoreOfferDto> {
    const updated = await this.offers.update(id, {
      code: dto.code,
      itemId: dto.itemId,
      priceSoft: dto.priceSoft,
      priceStars: dto.priceStars,
      currencyType: dto.currencyType ?? undefined,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
    });
    await this.audit.log({
      admin: session,
      action: 'offer_update',
      targetType: 'StoreOffer',
      targetId: id,
      success: true,
      reason: undefined,
      payload: dto,
    });
    return updated;
  }

  @Patch(':id/activate')
  async activate(@Session() session: AuthSessionPayload, @Param('id') id: string): Promise<StoreOfferDto> {
    const updated = await this.offers.setActive(id, true);
    await this.audit.log({
      admin: session,
      action: 'offer_activate',
      targetType: 'StoreOffer',
      targetId: id,
      success: true,
      reason: null,
      payload: null,
    });
    return updated;
  }

  @Patch(':id/deactivate')
  async deactivate(@Session() session: AuthSessionPayload, @Param('id') id: string): Promise<StoreOfferDto> {
    const updated = await this.offers.setActive(id, false);
    await this.audit.log({
      admin: session,
      action: 'offer_deactivate',
      targetType: 'StoreOffer',
      targetId: id,
      success: true,
      reason: null,
      payload: null,
    });
    return updated;
  }
}

