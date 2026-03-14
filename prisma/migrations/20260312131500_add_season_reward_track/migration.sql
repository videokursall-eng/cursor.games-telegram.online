CREATE TABLE "RewardTrackItem" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "seasonId"       UUID         NOT NULL,
  "level"          INTEGER      NOT NULL,
  "rewardType"     VARCHAR(16)  NOT NULL,
  "amountSoft"     INTEGER,
  "cosmeticItemId" VARCHAR(64),
  "badgeCode"      VARCHAR(64),
  CONSTRAINT "RewardTrackItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RewardTrackItem_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "Season"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RewardTrackItem_seasonId_level_key" UNIQUE ("seasonId","level")
);

CREATE INDEX "RewardTrackItem_seasonId_idx" ON "RewardTrackItem"("seasonId");

CREATE TABLE "SeasonRewardClaim" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId"    UUID        NOT NULL,
  "seasonId"  UUID        NOT NULL,
  "rewardId"  UUID        NOT NULL,
  CONSTRAINT "SeasonRewardClaim_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeasonRewardClaim_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SeasonRewardClaim_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "Season"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SeasonRewardClaim_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "RewardTrackItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SeasonRewardClaim_userId_seasonId_rewardId_key" UNIQUE ("userId","seasonId","rewardId")
);

CREATE INDEX "SeasonRewardClaim_userId_seasonId_idx" ON "SeasonRewardClaim"("userId","seasonId");

