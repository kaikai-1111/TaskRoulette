-- CreateEnum
CREATE TYPE "TokenReason" AS ENUM ('EARN_SUBMISSION', 'DAILY_AWARD', 'MODEL_PURCHASE', 'MODEL_SALE', 'SHOP_PURCHASE', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "PowerUpKind" AS ENUM ('INFINITE_CREDITS', 'INFINITE_TOKENS');

-- CreateEnum
CREATE TYPE "PowerUpSource" AS ENUM ('DAILY', 'SHOP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditReason" ADD VALUE 'DAILY_AWARD';
ALTER TYPE "CreditReason" ADD VALUE 'SHOP_PURCHASE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyClaimCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "freeCreditsUntil" TIMESTAMP(3),
ADD COLUMN     "freeTokensUntil" TIMESTAMP(3),
ADD COLUMN     "lastDailyClaimAt" TIMESTAMP(3),
ADD COLUMN     "tokens" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "TokenReason" NOT NULL,
    "relatedModelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MlModel" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "priceTokens" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ModelStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MlModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelPurchase" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "PowerUpKind" NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "source" "PowerUpSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PowerUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenTransaction_userId_createdAt_idx" ON "TokenTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MlModel_status_createdAt_idx" ON "MlModel"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModelPurchase_modelId_userId_key" ON "ModelPurchase"("modelId", "userId");

-- CreateIndex
CREATE INDEX "PowerUp_userId_usedAt_idx" ON "PowerUp"("userId", "usedAt");

-- AddForeignKey
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MlModel" ADD CONSTRAINT "MlModel_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPurchase" ADD CONSTRAINT "ModelPurchase_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "MlModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelPurchase" ADD CONSTRAINT "ModelPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PowerUp" ADD CONSTRAINT "PowerUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
