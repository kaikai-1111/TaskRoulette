import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/identity";
import { ECONOMY } from "@/lib/economy";

// Cloud storage (Vercel Blob) when configured — required in production, since
// a deployed instance's local disk is ephemeral/not shared across instances.
// Falls back to local disk so `npm run dev` works without a Blob token.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "recordings");

export async function POST(req: Request) {
  await getCurrentUser(); // requires the anon_token cookie; also lazily provisions the user row

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("video/")) {
    return NextResponse.json({ error: "Expected a video upload." }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "Empty recording." }, { status: 400 });
  }
  if (buf.byteLength > ECONOMY.MAX_VIDEO_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Recording is too large." }, { status: 413 });
  }

  const ext = contentType.includes("mp4") ? "mp4" : "webm";
  const filename = `${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`recordings/${filename}`, buf, {
      access: "public",
      contentType,
    });
    return NextResponse.json({ url: blob.url });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buf);
  return NextResponse.json({ url: `/uploads/recordings/${filename}` });
}
