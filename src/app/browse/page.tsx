import Link from "next/link";
import { getTopChallenges } from "@/app/actions";
import { TEMPLATE_TYPES } from "@/lib/templates/types";

const TEMPLATE_LABELS = Object.fromEntries(TEMPLATE_TYPES.map((t) => [t.value, t.label.toLowerCase()]));

// Flat chalk tints (the doodle palette) instead of soft gradients.
const CARD_TINTS = ["#ff2e93", "#ffc400", "#22c55e", "#2b7bff", "#ff8a1f", "#b44bff"];

export default async function BrowsePage() {
  const challenges = await getTopChallenges();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Top challenges</h1>
      <p className="text-sm text-black/50 dark:text-white mb-6">
        The most-answered open challenges right now. Tap one to jump straight in.
      </p>

      {challenges.length === 0 ? (
        <p className="text-black/50 dark:text-white">
          Nothing open yet.{" "}
          <Link href="/create" className="text-blue-600 dark:text-blue-400 underline">
            Post the first challenge
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {challenges.map((c, i) => {
            const pct = c.totalTarget > 0 ? Math.round((c.responseCount / c.totalTarget) * 100) : 0;
            const href = c.isMine ? `/challenges/${c.id}` : `/try/${c.id}`;

            return (
              <Link
                key={c.id}
                href={href}
                className="card group flex flex-col overflow-hidden transition hover:rotate-0"
                style={{ transform: `rotate(${i % 2 === 0 ? -0.7 : 0.6}deg)` }}
              >
                <div
                  className="relative aspect-square w-full flex items-center justify-center overflow-hidden border-b-2 border-[var(--ink-line)]"
                  style={{ background: `color-mix(in srgb, ${CARD_TINTS[i % CARD_TINTS.length]} 16%, transparent)` }}
                >
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <p className="font-display px-3 text-center text-xl leading-snug line-clamp-4">
                      {c.thumbnailText ?? c.prompt}
                    </p>
                  )}
                  <span className="absolute top-1.5 left-1.5 flex gap-1">
                    <span className="tag bg-[#1c1b22] !text-white">
                      {TEMPLATE_LABELS[c.templateType]}
                    </span>
                    {c.purpose === "COLLECTING" && (
                      <span className="tag bg-[#ff8a1f]">
                        collecting
                      </span>
                    )}
                  </span>
                  {c.isMine && (
                    <span className="tag absolute top-1.5 right-1.5 bg-[#ffc400]">
                      yours
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium truncate">{c.prompt}</p>
                  <p className="text-[11px] text-black/40 dark:text-white truncate">by {c.creatorName}</p>
                  {c.totalTarget > 0 && (
                    <div className="mt-1.5 h-1 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-black/40 dark:text-white">
                    {c.totalTarget > 0
                      ? `${c.responseCount} / ${c.totalTarget} responses`
                      : `${c.responseCount} ${c.responseCount === 1 ? "response" : "responses"} · no limit`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
