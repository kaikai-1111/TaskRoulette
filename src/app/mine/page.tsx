import Link from "next/link";
import { getMyChallenges } from "@/app/actions";

export default async function MyChallengesPage() {
  const challenges = await getMyChallenges();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My challenges</h1>
      {challenges.length === 0 ? (
        <p className="text-black/50 dark:text-white/50">
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
              <li key={c.id}>
                <Link
                  href={`/challenges/${c.id}`}
                  className="block rounded-lg border border-black/10 dark:border-white/15 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.prompt}</span>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 ${
                        c.status === "COMPLETED"
                          ? "bg-blue-400/20 text-blue-600 dark:text-blue-400"
                          : "bg-black/10 dark:bg-white/10"
                      }`}
                    >
                      {c.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="text-sm text-black/50 dark:text-white/50 mt-1">
                    {c._count.submissions} / {totalTarget} responses · {c.templateType.toLowerCase()}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
