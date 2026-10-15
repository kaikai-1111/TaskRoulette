import { createReadStream } from "fs";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/identity";
import { isAdmin } from "@/lib/admin";
import { localFileSize, localPathFor } from "@/lib/model-storage";

function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

// The only way a model file leaves the server: checks the caller is entitled
// to it (free, their own, bought, or an admin), counts the download, then
// streams the file (dev disk) or redirects to the storage URL (Blob).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (user.isBanned) return NextResponse.json({ error: "This account has been banned." }, { status: 403 });

  const model = await prisma.mlModel.findUnique({ where: { id } });
  const admin = await isAdmin();
  const isOwner = !!model && model.creatorId === user.id;
  if (!model || (model.status !== "ACTIVE" && !isOwner && !admin)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (model.priceTokens > 0 && !isOwner && !admin) {
    const bought = await prisma.modelPurchase.findUnique({
      where: { modelId_userId: { modelId: model.id, userId: user.id } },
    });
    if (!bought) {
      return NextResponse.json({ error: "Buy this model to download it." }, { status: 402 });
    }
  }

  await prisma.mlModel.update({ where: { id: model.id }, data: { downloadCount: { increment: 1 } } });

  if (model.fileUrl.startsWith("local:")) {
    const key = model.fileUrl.slice("local:".length);
    const filePath = localPathFor(key);
    const size = await localFileSize(key);
    if (!filePath || size === null) return NextResponse.json({ error: "File is missing." }, { status: 410 });
    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(size),
        "Content-Disposition": contentDisposition(model.fileName),
      },
    });
  }

  const target = new URL(model.fileUrl);
  target.searchParams.set("download", "1");
  return NextResponse.redirect(target.toString(), 302);
}
