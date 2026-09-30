-- CreateEnum
CREATE TYPE "ChallengePurpose" AS ENUM ('ANNOTATING', 'COLLECTING');

-- AlterEnum
ALTER TYPE "TemplateType" ADD VALUE 'PHOTO_CAPTURE';

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "purpose" "ChallengePurpose" NOT NULL DEFAULT 'ANNOTATING';
