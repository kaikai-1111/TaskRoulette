import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, unlink } from "fs/promises";
import { once } from "events";
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/identity";
import { isAdmin } from "@/lib/admin";
import { ECONOMY } from "@/lib/economy";
import { ALLOWED_MODEL_EXTENSIONS, extensionOf, isAllowedModelFile } from "@/lib/models";
import { LOCAL_MODEL_DIR, localPathFor, usingBlob } from "@/lib/model-storage";

async function uploader() {
  const user = await getCurrentUser();
  if (user.isBanned) return { error: "This account has been banned.", status: 403 as const };
  // Same bar as posting a challenge: an account, or an admin.
  if (!(user.email && user.username) && !(await isAdmin())) {
    return { error: "Create an account to upload a model.", status: 403 as const };
  }
  return { user };
}

// Tells the upload form which path to take and what's allowed.
export async function GET() {
  const u = await uploader();
  if ("error" in u) return NextResponse.json({ error: u.error }, { status: u.status });
  return NextResponse.json({
    mode: usingBlob() ? "blob" : "local",
    maxBytes: ECONOMY.MAX_MODEL_BYTES,
    prefix: `models/${u.user.id}/`,
    extensions: ALLOWED_MODEL_EXTENSIONS,
  });
}

export async function POST(req: Request) {
  const u = await uploader();
  if ("error" in u) return NextResponse.json({ error: u.error }, { status: u.status });
  const { user } = u;

  // --- Vercel Blob: the browser uploads straight to storage; this route only
  // hands out a short-lived, tightly scoped token (and gets a completion ping).
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    if (!usingBlob()) return NextResponse.json({ error: "Blob storage isn't configured." }, { status: 400 });
    try {
      const result = await handleUpload({
        body: (await req.json()) as HandleUploadBody,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          if (!pathname.startsWith(`models/${user.id}/`) || !isAllowedModelFile(pathname)) {
            throw new Error("That file isn't allowed.");
          }
          return {
            maximumSizeInBytes: ECONOMY.MAX_MODEL_BYTES,
            addRandomSuffix: true, // the URL is the only secret protecting a paid file
          };
        },
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  // --- Local dev: the raw file is the request body; stream it to disk,
  // enforcing the size cap as bytes arrive rather than trusting a header.
  if (usingBlob()) {
    return NextResponse.json({ error: "Use direct upload." }, { status: 400 });
  }
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!isAllowedModelFile(name)) {
    return NextResponse.json({ error: "That file type isn't allowed." }, { status: 400 });
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > ECONOMY.MAX_MODEL_BYTES) {
    return NextResponse.json({ error: "That file is too large." }, { status: 413 });
  }
  if (!req.body) return NextResponse.json({ error: "Empty file." }, { status: 400 });

  const key = `${user.id}_${randomUUID()}.${extensionOf(name)}`;
  const filePath = localPathFor(key);
  if (!filePath) return NextResponse.json({ error: "That file type isn't allowed." }, { status: 400 });
  await mkdir(LOCAL_MODEL_DIR, { recursive: true });
  const out = createWriteStream(filePath);
  const reader = req.body.getReader();
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > ECONOMY.MAX_MODEL_BYTES) throw new Error("TOO_LARGE");
      if (!out.write(value)) await once(out, "drain");
    }
    await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())));
  } catch (err) {
    out.destroy();
    await unlink(filePath).catch(() => {});
    const tooLarge = (err as Error).message === "TOO_LARGE";
    return NextResponse.json(
      { error: tooLarge ? "That file is too large." : "Upload failed." },
      { status: tooLarge ? 413 : 500 }
    );
  }
  if (size === 0) {
    await unlink(filePath).catch(() => {});
    return NextResponse.json({ error: "Empty file." }, { status: 400 });
  }
  return NextResponse.json({ ref: `local:${key}`, size });
}
