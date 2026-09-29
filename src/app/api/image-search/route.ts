import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/identity";

// Wikimedia Commons search — free, no API key, and every result is
// explicitly freely-licensed (CC/public domain), which matters for a
// platform whose ToS turns submissions into training/derived data. Lets a
// creator search e.g. "paperclip" and quickly pull in real photos instead
// of hand-uploading or hosting their own.
const PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface WikimediaPage {
  title: string;
  imageinfo?: { url: string; thumburl?: string; mime: string }[];
}

export async function GET(req: Request) {
  await getCurrentUser(); // requires the anon_token cookie

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing search query." }, { status: 400 });

  const apiUrl = new URL("https://commons.wikimedia.org/w/api.php");
  apiUrl.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: q,
    gsrlimit: "24",
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "400",
    format: "json",
  }).toString();

  let data: { query?: { pages?: Record<string, WikimediaPage> } };
  try {
    const res = await fetch(apiUrl, { headers: { "User-Agent": "TaskRoulette/1.0" } });
    if (!res.ok) throw new Error(`Wikimedia API returned ${res.status}`);
    data = await res.json();
  } catch {
    return NextResponse.json({ error: "Image search is temporarily unavailable." }, { status: 502 });
  }

  const pages = Object.values(data.query?.pages ?? {});
  const results = pages
    .map((p) => p.imageinfo?.[0])
    .filter((info): info is NonNullable<typeof info> => !!info && PHOTO_MIME_TYPES.has(info.mime))
    .map((info) => ({ url: info.url, thumbUrl: info.thumburl ?? info.url }));

  return NextResponse.json({ results });
}
