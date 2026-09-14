-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('BOUNDING_BOX', 'POINT', 'LABELING', 'FREEFORM_DRAWING', 'VIDEO_RECORDING');

-- CreateEnum
CREATE TYPE "ChallengeCategory" AS ENUM ('FUN', 'PRETRAINING');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FLAGGED', 'REMOVED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('APPROVED', 'FLAGGED', 'REMOVED');

-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('SIGNUP_BONUS', 'EARN_SUBMISSION', 'SPEND_CHALLENGE_POST', 'REFUND_UNUSED_ITEMS', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "FlagTargetType" AS ENUM ('CHALLENGE', 'SUBMISSION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "anonToken" TEXT NOT NULL,
    "displayName" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "recoveryCodeHash" TEXT,
    "ageAttested" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "templateType" "TemplateType" NOT NULL,
    "category" "ChallengeCategory" NOT NULL DEFAULT 'FUN',
    "prompt" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "timeLimitSeconds" INTEGER NOT NULL DEFAULT 30,
    "targetResponsesPerItem" INTEGER NOT NULL DEFAULT 10,
    "creditCostPerResponse" INTEGER NOT NULL DEFAULT 1,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeItem" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "mediaUrl" TEXT,
    "textContent" TEXT,
    "responseCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChallengeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'APPROVED',
    "timeTakenMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "relatedChallengeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "targetType" "FlagTargetType" NOT NULL,
    "challengeId" TEXT,
    "submissionId" TEXT,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_anonToken_key" ON "User"("anonToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Challenge_status_templateType_idx" ON "Challenge"("status", "templateType");

-- CreateIndex
CREATE INDEX "ChallengeItem_challengeId_idx" ON "ChallengeItem"("challengeId");

-- CreateIndex
CREATE INDEX "Submission_challengeId_idx" ON "Submission"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_itemId_submitterId_key" ON "Submission"("itemId", "submitterId");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CreateIndex
CREATE INDEX "Flag_resolved_idx" ON "Flag"("resolved");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeItem" ADD CONSTRAINT "ChallengeItem_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChallengeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
