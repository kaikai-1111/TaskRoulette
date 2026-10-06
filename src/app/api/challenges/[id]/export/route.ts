import { NextResponse } from "next/server";
import { getChallengeResults } from "@/app/actions";
import { buildExport, EXPORT_FORMATS, parseExportFormat } from "@/lib/export";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);

  const format = parseExportFormat(url.searchParams.get("format"));
  if (!format) {
    return NextResponse.json(
      { error: `Unknown format. Use one of: ${EXPORT_FORMATS.map((f) => f.id).join(", ")}.` },
      { status: 400 }
    );
  }

  const challenge = await getChallengeResults(id);
  if (!challenge) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { body, filename, mime } = buildExport(challenge, format, url.origin);
  return new NextResponse(body, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
