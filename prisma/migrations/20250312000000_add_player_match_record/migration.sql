-- CreateEnum
CREATE TYPE "MatchOutcome" AS ENUM ('WIN', 'LOSS', 'DRAW');

-- CreateTable
CREATE TABLE "PlayerMatchRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "matchId" VARCHAR(64) NOT NULL,
    "mode" VARCHAR(16) NOT NULL,
    "outcome" "MatchOutcome" NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "finishedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PlayerMatchRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerMatchRecord_userId_idx" ON "PlayerMatchRecord"("userId");

-- CreateIndex
CREATE INDEX "PlayerMatchRecord_userId_finishedAt_idx" ON "PlayerMatchRecord"("userId", "finishedAt");

-- AddForeignKey
ALTER TABLE "PlayerMatchRecord" ADD CONSTRAINT "PlayerMatchRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
