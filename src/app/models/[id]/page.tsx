import Link from "next/link";
import { notFound } from "next/navigation";
import { getModel } from "../actions";
import BuyButton from "./BuyButton";
import EditModelForm from "./EditModelForm";
import { PICKLE_FORMATS, formatBytes } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getModel(id);
  if (!m) notFound();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <Link href="/models" className="text-sm text-black/50 dark:text-white underline underline-offset-2">
        ← All models
      </Link>
      <h1 className="mt-3 text-2xl font-bold break-words">{m.name}</h1>
      <p className="mt-1 text-sm text-black/50 dark:text-white">
        by {m.creatorName} · .{m.format} · {formatBytes(m.fileSize)} · {m.downloadCount} downloads
        {m.status === "REMOVED" && <span className="ml-2 text-red-500">(taken down)</span>}
      </p>
      {m.description && <p className="mt-4 whitespace-pre-wrap break-words text-sm">{m.description}</p>}

      {PICKLE_FORMATS.has(m.format) && (
        <p className="mt-4 rounded-lg bg-orange-500/10 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">
          Heads up: .{m.format} files are often Python pickles, which can run arbitrary code when you load them.
          Only load models from people you trust, ideally in a sandbox or with a safe loader (e.g.{" "}
          <code>torch.load(..., weights_only=True)</code>).
        </p>
      )}

      <div className="mt-6">
        {m.canDownload ? (
          <a
            href={`/api/models/${m.id}/download`}
            className="inline-block btn px-6 py-2.5 font-semibold text-white"
          >
            Download
          </a>
        ) : (
          <BuyButton modelId={m.id} price={m.priceTokens} />
        )}
        {m.priceTokens > 0 && m.canDownload && !m.isMine && (
          <p className="mt-2 text-xs text-black/40 dark:text-white">You own this model.</p>
        )}
      </div>

      {m.isMine && <EditModelForm model={m} />}
    </div>
  );
}
