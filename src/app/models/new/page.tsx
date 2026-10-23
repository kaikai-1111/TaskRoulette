"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { createModel } from "../actions";
import { ECONOMY } from "@/lib/economy";
import { ALLOWED_MODEL_EXTENSIONS, PICKLE_FORMATS, extensionOf, formatBytes, isAllowedModelFile } from "@/lib/models";

interface UploadConfig {
  mode: "blob" | "local";
  maxBytes: number;
  prefix: string;
}

function uploadLocal(file: File, onProgress: (pct: number) => void): Promise<{ ref: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/models/upload?name=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { ref?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.ref) resolve({ ref: body.ref });
      else reject(new Error(body.error ?? "Upload failed."));
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(file);
  });
}

export default function NewModelPage() {
  const router = useRouter();
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAccount, setNeedsAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/models/upload")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Can't upload right now.");
        setConfig(body);
      })
      .catch((e: Error) => setConfigError(e.message));
  }, []);

  const maxBytes = config?.maxBytes ?? ECONOMY.MAX_MODEL_BYTES;

  function pickFile(f: File | null) {
    setError(null);
    if (f && !isAllowedModelFile(f.name)) {
      setError(`.${extensionOf(f.name) || "?"} isn't an allowed type. Allowed: ${ALLOWED_MODEL_EXTENSIONS.join(", ")}.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (f && f.size > maxBytes) {
      setError(`That file is ${formatBytes(f.size)}; the limit is ${formatBytes(maxBytes)}.`);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(f);
    if (f && !name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !config) return;
    setError(null);
    setNeedsAccount(false);
    const priceTokens = Number(price);
    if (!Number.isInteger(priceTokens) || priceTokens < 0 || priceTokens > ECONOMY.MAX_MODEL_PRICE_TOKENS) {
      setError(`Price must be a whole number from 0 to ${ECONOMY.MAX_MODEL_PRICE_TOKENS}.`);
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      let ref: string;
      if (config.mode === "blob") {
        const blob = await upload(`${config.prefix}${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/models/upload",
          multipart: true,
          onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
        });
        ref = blob.url;
      } else {
        ref = (await uploadLocal(file, setProgress)).ref;
      }
      const result = await createModel({ name, description, priceTokens, fileName: file.name, fileRef: ref });
      if (!result.ok) {
        setError(result.error);
        setNeedsAccount(!!result.needsAccount);
        return;
      }
      router.push(`/models/${result.id}`);
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const ext = file ? extensionOf(file.name) : "";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Upload a model</h1>
      <p className="mb-6 text-sm text-black/50 dark:text-white">
        .pth is the usual choice, but other formats are fine. Up to {formatBytes(maxBytes)}.
      </p>
      {configError ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {configError}{" "}
          {configError.includes("account") && (
            <Link href="/account" className="underline">
              Create one
            </Link>
          )}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">File</span>
            <input
              ref={fileInput}
              type="file"
              required
              accept={ALLOWED_MODEL_EXTENSIONS.map((x) => `.${x}`).join(",")}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {file && (
              <span className="text-xs text-black/40 dark:text-white">
                {file.name} · {formatBytes(file.size)}
              </span>
            )}
          </label>
          {PICKLE_FORMATS.has(ext) && (
            <p className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">
              .{ext} files are often Python pickles, which can run code when loaded. We never open uploads, but
              people who download it will be warned. Consider .safetensors if you can.
            </p>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Name</span>
            <input
              required
              maxLength={ECONOMY.MAX_MODEL_NAME_CHARS}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Description</span>
            <textarea
              rows={5}
              maxLength={ECONOMY.MAX_MODEL_DESCRIPTION_CHARS}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What it does, what it was trained on, how to load it…"
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Price in tokens</span>
            <input
              type="number"
              min={0}
              max={ECONOMY.MAX_MODEL_PRICE_TOKENS}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            />
            <span className="text-xs text-black/40 dark:text-white">
              0 makes it free. Buyers pay once and keep it; the tokens go to you.
            </span>
          </label>
          {error && (
            <p className="text-sm text-red-500">
              {error}{" "}
              {needsAccount && (
                <Link href="/account" className="underline">
                  Create an account
                </Link>
              )}
            </p>
          )}
          {progress !== null && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-full bg-blue-500 transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !file || !config}
            className="btn px-6 py-2.5 font-semibold text-white disabled:opacity-40"
          >
            {busy ? (progress !== null ? `Uploading… ${progress}%` : "Saving…") : "Upload"}
          </button>
        </form>
      )}
    </div>
  );
}
