CREATE TABLE "CosmeticCatalogItem" (
  "id"          VARCHAR(64)  NOT NULL,
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "code"        VARCHAR(64)  NOT NULL,
  "slot"        VARCHAR(32)  NOT NULL,
  "title"       VARCHAR(128) NOT NULL,
  "description" VARCHAR(512),
  "icon"        VARCHAR(256),
  "rarity"      VARCHAR(16)  NOT NULL,
  "priceSoft"   INTEGER,
  "priceStars"  INTEGER,
  "isExclusive" BOOLEAN      NOT NULL DEFAULT FALSE,
  "isLimited"   BOOLEAN      NOT NULL DEFAULT FALSE,
  "isActive"    BOOLEAN      NOT NULL DEFAULT TRUE,
  "seasonId"    VARCHAR(64),
  CONSTRAINT "CosmeticCatalogItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CosmeticCatalogItem_code_key" UNIQUE ("code")
);

