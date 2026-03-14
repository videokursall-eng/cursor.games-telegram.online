CREATE TABLE "StoreOffer" (
  "id"          VARCHAR(64) PRIMARY KEY,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT NOW(),

  "code"        VARCHAR(64) NOT NULL UNIQUE,
  "itemId"      VARCHAR(64) NOT NULL,
  "priceSoft"   INTEGER,
  "priceStars"  INTEGER,
  "currencyType" VARCHAR(16) NOT NULL DEFAULT 'soft',
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "startsAt"    TIMESTAMP,
  "endsAt"      TIMESTAMP
);

CREATE INDEX "StoreOffer_itemId_idx" ON "StoreOffer" ("itemId");
CREATE INDEX "StoreOffer_isActive_idx" ON "StoreOffer" ("isActive");

