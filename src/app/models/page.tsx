import Link from "next/link";
import { listModels } from "./actions";
import { formatBytes } from "@/lib/models";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const models = await listModels();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Models</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/models/mine" className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
            My models
          </Link>
          <Link
            href="/models/new"
            className="btn px-4 py-2 font-semibold text-white"
          >
            Upload a model
          </Link>
        </div>
      </div>
      <p className="mb-6 text-sm text-black/50 dark:text-white">
        Models other people uploaded. Free ones are free. Paid ones cost tokens, which you get by answering tasks
        and claiming rewards, and the tokens go to whoever uploaded the model.
      </p>
      {models.length === 0 ? (
        <p className="text-black/50 dark:text-white">No models yet. Upload the first one.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {models.map((m) => (
            <li key={m.id}>
              <Link
                href={`/models/${m.id}`}
                className="block card px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold break-words min-w-0">{m.name}</span>
                  <span
                    className={`shrink-0 text-xs rounded-full px-2 py-0.5 ${
                      m.priceTokens === 0
                        ? "bg-blue-400/20 text-blue-600 dark:text-blue-400"
                        : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                    }`}
                  >
                    {m.priceTokens === 0
                      ? "Free"
                      : m.canDownload
                        ? "Owned"
                        : `${m.priceTokens} tokens`}
                  </span>
                </div>
                {m.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-black/60 dark:text-white break-words">
                    {m.description}
                  </p>
                )}
                <div className="mt-1 text-xs text-black/40 dark:text-white">
                  .{m.format} · {formatBytes(m.fileSize)} · by {m.creatorName} · {m.downloadCount} downloads
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
