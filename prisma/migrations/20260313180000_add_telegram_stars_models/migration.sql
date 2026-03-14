CREATE TABLE "TelegramStarsProduct" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "code" VARCHAR(64) NOT NULL UNIQUE,
  "title" VARCHAR(128) NOT NULL,
  "description" VARCHAR(512),
  "amountStars" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "StarsPurchaseIntent" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "status" VARCHAR(16) NOT NULL,
  "provider" VARCHAR(32) NOT NULL,
  "externalId" VARCHAR(128),
  "amountStars" INTEGER NOT NULL,
  "rawPayload" JSONB,
  CONSTRAINT "StarsPurchaseIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StarsPurchaseIntent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TelegramStarsProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "StarsPurchaseIntent_userId_idx" ON "StarsPurchaseIntent"("userId");
CREATE INDEX "StarsPurchaseIntent_productId_idx" ON "StarsPurchaseIntent"("productId");
CREATE INDEX "StarsPurchaseIntent_status_idx" ON "StarsPurchaseIntent"("status");

CREATE TABLE "StarsFulfillmentLog" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "purchaseIntentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rewardType" VARCHAR(32) NOT NULL,
  "rewardPayload" JSONB NOT NULL,
  "status" VARCHAR(16) NOT NULL,
  CONSTRAINT "StarsFulfillmentLog_purchaseIntentId_fkey" FOREIGN KEY ("purchaseIntentId") REFERENCES "StarsPurchaseIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StarsFulfillmentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "StarsFulfillmentLog_purchaseIntentId_idx" ON "StarsFulfillmentLog"("purchaseIntentId");
CREATE INDEX "StarsFulfillmentLog_userId_idx" ON "StarsFulfillmentLog"("userId");

