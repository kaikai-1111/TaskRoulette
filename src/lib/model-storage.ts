import "server-only";
import path from "path";
import { stat } from "fs/promises";

// Where model files live. With BLOB_READ_WRITE_TOKEN set (production) they go
// to Vercel Blob via direct browser uploads, since serverless request bodies
// are capped at a few MB. Without it (local dev) they're written under
// .data/models — deliberately NOT under public/, so a paid file can't be
// fetched by URL; it can only come out through the download route.
export const usingBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export const LOCAL_MODEL_DIR = path.join(process.cwd(), ".data", "models");

// Keys are "<userId>_<uuid>.<ext>". The strict shape also blocks path traversal.
const LOCAL_KEY = /^[A-Za-z0-9]+_[0-9a-f-]{36}\.[a-z0-9]{1,10}$/;

export function localPathFor(key: string): string | null {
  return LOCAL_KEY.test(key) ? path.join(LOCAL_MODEL_DIR, key) : null;
}

export async function localFileSize(key: string): Promise<number | null> {
  const p = localPathFor(key);
  if (!p) return null;
  try {
    return (await stat(p)).size;
  } catch {
    return null;
  }
}

export const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
