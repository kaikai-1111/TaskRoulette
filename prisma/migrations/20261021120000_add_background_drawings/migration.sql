-- CreateEnum
CREATE TYPE "DrawingStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'REMOVED');

-- CreateTable
CREATE TABLE "BackgroundDrawing" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "strokes" TEXT NOT NULL,
    "status" "DrawingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackgroundDrawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingReport" (
    "id" TEXT NOT NULL,
    "drawingId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackgroundDrawing_status_createdAt_idx" ON "BackgroundDrawing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BackgroundDrawing_creatorId_idx" ON "BackgroundDrawing"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingReport_drawingId_reporterId_key" ON "DrawingReport"("drawingId", "reporterId");

-- AddForeignKey
ALTER TABLE "BackgroundDrawing" ADD CONSTRAINT "BackgroundDrawing_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingReport" ADD CONSTRAINT "DrawingReport_drawingId_fkey" FOREIGN KEY ("drawingId") REFERENCES "BackgroundDrawing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingReport" ADD CONSTRAINT "DrawingReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

