import Link from "next/link";
import { getMyChallenges, setMyChallengeStatus } from "@/app/actions";

async function toggleChallengeStatus(challengeId: string, nextStatus: "ACTIVE" | "REMOVED") {
  "use server";
  await setMyChallengeStatus(challengeId, nextStatus);
}

export default async function MyChallengesPage() {
  const challenges = await getMyChallenges();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My challenges</h1>
      {challenges.length === 0 ? (
        <p className="text-black/50 dark:text-white">
          You haven&apos;t posted anything yet.{" "}
          <Link href="/create" className="text-blue-600 dark:text-blue-400 underline">
            Post your first challenge
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {challenges.map((c) => {
            const totalTarget = c.items.length * c.targetResponsesPerItem;
            return (
              <li key={c.id} className="rounded-lg border border-black/10 dark:border-white/15">
                <Link
                  href={`/challenges/${c.id}`}
                  className="block px-4 pt-3 pb-2 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.prompt}</span>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 ${
                        c.status === "COMPLETED"
                          ? "bg-blue-400/20 text-blue-600 dark:text-blue-400"
                          : c.status === "REMOVED"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-black/10 dark:bg-white/10"
                      }`}
                    >
                      {c.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="text-sm text-black/50 dark:text-white mt-1">
                    {c._count.submissions} / {totalTarget} responses · {c.templateType.toLowerCase()} ·{" "}
                    {c.purpose.toLowerCase()}
                  </div>
                </Link>
                <div className="flex gap-3 px-4 pb-3 pt-1 text-sm">
                  <Link
                    href={`/create?edit=${c.id}`}
                    className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
                  >
                    Edit
                  </Link>
                  <form
                    action={toggleChallengeStatus.bind(
                      null,
                      c.id,
                      c.status === "REMOVED" ? "ACTIVE" : "REMOVED"
                    )}
                  >
                    <button
                      type="submit"
                      className={`underline underline-offset-2 ${
                        c.status === "REMOVED" ? "text-blue-600 dark:text-blue-400" : "text-red-500"
                      }`}
                    >
                      {c.status === "REMOVED" ? "Reactivate" : "Take down"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
