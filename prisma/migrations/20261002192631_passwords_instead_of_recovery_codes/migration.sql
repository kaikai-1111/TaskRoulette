-- AlterTable
ALTER TABLE "User" DROP COLUMN "recoveryCodeHash",
                   ADD COLUMN     "passwordHash" TEXT;
