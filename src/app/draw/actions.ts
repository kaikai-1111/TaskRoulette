"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getCurrentUser } from "@/lib/identity";
import { DRAWING, cleanStrokes, type Strokes } from "@/lib/drawing";
import { isDoodleColor, type DoodleColor } from "@/lib/doodle-colors";
import { startOfUtcDay } from "@/lib/powerups";

export interface BackgroundDrawingData {
  id: string;
  color: DoodleColor;
  strokes: Strokes;
}

export interface GalleryDrawing extends BackgroundDrawingData {
  mine: boolean;
  reported: boolean;
}

// The set resets daily: only drawings made since the last UTC midnight count.
// Older rows stay in the database for moderation history but are never shown.
const todayWhere = () => ({ createdAt: { gte: startOfUtcDay(new Date()) } });

function parse(row: { id: string; color: string; strokes: string }): BackgroundDrawingData | null {
  const strokes = cleanStrokes(JSON.parse(row.strokes));
  return strokes && isDoodleColor(row.color) ? { id: row.id, color: row.color, strokes } : null;
}

export async function submitDrawing(input: {
  color: string;
  strokes: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getActiveUser(); // banned visitors can't add to the background
  if (!isDoodleColor(input.color)) return { ok: false, error: "Pick one of the colors." };
  const strokes = cleanStrokes(input.strokes);
  if (!strokes) return { ok: false, error: "That doesn't look like a drawing. Try again." };

  // No cap on how many a person can make — just no faster than a human could.
  const last = await prisma.backgroundDrawing.findFirst({
    where: { creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last && Date.now() - last.createdAt.getTime() < DRAWING.MIN_GAP_MS) {
    return { ok: false, error: "Give it a few seconds between drawings." };
  }

  await prisma.backgroundDrawing.create({
    data: { creatorId: user.id, color: input.color, strokes: JSON.stringify(strokes) },
  });
  revalidatePath("/draw");
  return { ok: true };
}

// A random handful of today's drawings for the background. Needs no identity.
export async function getBackgroundDrawings(): Promise<BackgroundDrawingData[]> {
  const rows = await prisma.backgroundDrawing.findMany({
    where: { status: "ACTIVE", ...todayWhere() },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, color: true, strokes: true },
  });
  // Fisher–Yates, then keep a handful, so a busy day still rotates through everyone.
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows
    .slice(0, DRAWING.SHOWN_ON_BACKGROUND)
    .map(parse)
    .filter((d): d is BackgroundDrawingData => d !== null);
}

// Today's drawings, newest first, for browsing and reporting on /draw.
export async function getTodaysGallery(): Promise<GalleryDrawing[]> {
  const user = await getCurrentUser();
  const rows = await prisma.backgroundDrawing.findMany({
    where: { status: "ACTIVE", ...todayWhere() },
    orderBy: { createdAt: "desc" },
    take: DRAWING.GALLERY_SIZE,
    select: { id: true, color: true, strokes: true, creatorId: true, reports: { where: { reporterId: user.id }, select: { id: true } } },
  });
  return rows.flatMap((r) => {
    const d = parse(r);
    return d ? [{ ...d, mine: r.creatorId === user.id, reported: r.reports.length > 0 }] : [];
  });
}

export async function reportDrawing(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getActiveUser();
  const drawing = await prisma.backgroundDrawing.findUnique({ where: { id } });
  if (!drawing || drawing.status === "REMOVED") return { ok: false, error: "That drawing is gone." };
  if (drawing.creatorId === user.id) return { ok: false, error: "That's your own drawing." };

  try {
    await prisma.drawingReport.create({ data: { drawingId: id, reporterId: user.id } });
  } catch (err) {
    if ((err as { code?: string }).code !== "P2002") throw err; // already reported: fine
  }
  const reports = await prisma.drawingReport.count({ where: { drawingId: id } });
  if (reports >= DRAWING.REPORTS_TO_HIDE) {
    await prisma.backgroundDrawing.updateMany({ where: { id, status: "ACTIVE" }, data: { status: "FLAGGED" } });
  }
  revalidatePath("/draw");
  return { ok: true };
}
