import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { getAllChallenges, setChallengeStatusAction } from "@/app/admin/actions";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-400/20 text-emerald-500",
  COMPLETED: "bg-black/10 dark:bg-white/10",
  FLAGGED: "bg-amber-400/20 text-amber-600",
  REMOVED: "bg-red-500/10 text-red-500",
};

export default async function AdminChallengesPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const challenges = await getAllChallenges();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All challenges</h1>
        <Link href="/admin" className="text-sm text-black/50 dark:text-white/50 underline">
          Moderation queue
        </Link>
      </div>

      {challenges.length === 0 ? (
        <p className="text-black/50 dark:text-white/50">No challenges yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {challenges.map((c) => {
            const totalTarget = c.items.length * c.targetResponsesPerItem;
            return (
              <li
                key={c.id}
                className="rounded-lg border border-black/10 dark:border-white/15 p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{c.prompt}</span>
                    <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[c.status]}`}>
                      {c.status.toLowerCase()}
                    </span>
                    {c._count.flags > 0 && (
                      <span className="shrink-0 text-xs rounded-full px-2 py-0.5 bg-amber-400/20 text-amber-600">
                        {c._count.flags} flag{c._count.flags > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {c.templateType.toLowerCase()} · {c.category.toLowerCase()} ·{" "}
                    {c._count.submissions} / {totalTarget} responses · {c.items.length} item(s) · by{" "}
                    {c.creator.displayName ?? c.creator.email ?? c.creator.id.slice(0, 8)} ·{" "}
                    {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <Link
                    href={`/challenges/${c.id}`}
                    className="rounded-full border border-black/10 dark:border-white/15 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    View
                  </Link>
                  {c.status === "REMOVED" ? (
                    <form action={setChallengeStatusAction.bind(null, c.id, "ACTIVE")}>
                      <button className="rounded-full border border-emerald-500/30 text-emerald-500 px-3 py-1.5 hover:bg-emerald-500/10">
                        Reactivate
                      </button>
                    </form>
                  ) : (
                    <form action={setChallengeStatusAction.bind(null, c.id, "REMOVED")}>
                      <button className="rounded-full border border-red-500/30 text-red-500 px-3 py-1.5 hover:bg-red-500/10">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
