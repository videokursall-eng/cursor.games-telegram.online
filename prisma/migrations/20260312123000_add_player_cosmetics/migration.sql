-- Player-owned cosmetic items (inventory)
CREATE TABLE "PlayerCosmeticItem" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId"     UUID        NOT NULL,
  "itemId"     VARCHAR(64) NOT NULL,
  "source"     VARCHAR(32) NOT NULL,
  "tag"        VARCHAR(64),
  CONSTRAINT "PlayerCosmeticItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlayerCosmeticItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlayerCosmeticItem_userId_itemId_key" UNIQUE ("userId", "itemId")
);

CREATE INDEX "PlayerCosmeticItem_userId_idx" ON "PlayerCosmeticItem"("userId");

-- Equipped cosmetics per slot
CREATE TABLE "PlayerEquippedCosmetic" (
  "id"     UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID        NOT NULL,
  "slot"   VARCHAR(32) NOT NULL,
  "itemId" VARCHAR(64) NOT NULL,
  CONSTRAINT "PlayerEquippedCosmetic_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlayerEquippedCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlayerEquippedCosmetic_userId_slot_key" UNIQUE ("userId", "slot")
);

CREATE INDEX "PlayerEquippedCosmetic_userId_idx" ON "PlayerEquippedCosmetic"("userId");

