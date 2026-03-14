-- Create Season table
CREATE TABLE "Season" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "code"       VARCHAR(32)  NOT NULL,
  "name"       VARCHAR(128) NOT NULL,
  "startsAt"   TIMESTAMPTZ  NOT NULL,
  "endsAt"     TIMESTAMPTZ,
  "isActive"   BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Season_code_key" UNIQUE ("code")
);

-- Create SeasonProgress table
CREATE TABLE "SeasonProgress" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId"           UUID        NOT NULL,
  "seasonId"         UUID        NOT NULL,
  "xp"               INTEGER     NOT NULL DEFAULT 0,
  "level"            INTEGER     NOT NULL DEFAULT 1,
  "claimedRewardIds" TEXT,
  CONSTRAINT "SeasonProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeasonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SeasonProgress_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SeasonProgress_userId_seasonId_key" UNIQUE ("userId", "seasonId")
);

CREATE INDEX "SeasonProgress_seasonId_idx" ON "SeasonProgress"("seasonId");

-- Create SeasonMatchReward table
CREATE TABLE "SeasonMatchReward" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "userId"    UUID        NOT NULL,
  "seasonId"  UUID        NOT NULL,
  "matchId"   VARCHAR(64) NOT NULL,
  CONSTRAINT "SeasonMatchReward_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeasonMatchReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SeasonMatchReward_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SeasonMatchReward_userId_seasonId_matchId_key" UNIQUE ("userId", "seasonId", "matchId")
);

CREATE INDEX "SeasonMatchReward_seasonId_idx" ON "SeasonMatchReward"("seasonId");

