import Link from "next/link";
import { getMyModels, setMyModelStatus } from "../actions";
import { formatBytes } from "@/lib/models";

export const dynamic = "force-dynamic";

async function toggleStatus(id: string, next: "ACTIVE" | "REMOVED") {
  "use server";
  await setMyModelStatus(id, next);
}

export default async function MyModelsPage() {
  const models = await getMyModels();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My models</h1>
      {models.length === 0 ? (
        <p className="text-black/50 dark:text-white">
          You haven&apos;t uploaded anything yet.{" "}
          <Link href="/models/new" className="text-blue-600 dark:text-blue-400 underline">
            Upload a model
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {models.map((m) => (
            <li key={m.id} className="card">
              <Link
                href={`/models/${m.id}`}
                className="block px-4 pt-3 pb-2 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold break-words min-w-0">{m.name}</span>
                  <span
                    className={`shrink-0 text-xs rounded-full px-2 py-0.5 ${
                      m.status === "REMOVED" ? "bg-red-500/10 text-red-500" : "bg-black/10 dark:bg-white/10"
                    }`}
                  >
                    {m.status.toLowerCase()}
                  </span>
                </div>
                <div className="mt-1 text-sm text-black/50 dark:text-white">
                  .{m.format} · {formatBytes(m.fileSize)} ·{" "}
                  {m.priceTokens === 0 ? "free" : `${m.priceTokens} tokens`} · {m.downloadCount} downloads
                </div>
              </Link>
              <div className="px-4 pb-3 pt-1 text-sm">
                <form action={toggleStatus.bind(null, m.id, m.status === "ACTIVE" ? "REMOVED" : "ACTIVE")}>
                  <button className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
                    {m.status === "ACTIVE" ? "Take down" : "Put back up"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
