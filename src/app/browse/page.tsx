import Link from "next/link";
import { getTopChallenges } from "@/app/actions";
import { TEMPLATE_TYPES } from "@/lib/templates/types";

const TEMPLATE_LABELS = Object.fromEntries(TEMPLATE_TYPES.map((t) => [t.value, t.label.toLowerCase()]));

const CARD_GRADIENTS = [
  "from-emerald-400/30 to-cyan-400/30",
  "from-fuchsia-400/30 to-orange-400/30",
  "from-indigo-400/30 to-emerald-400/30",
  "from-amber-400/30 to-pink-400/30",
];

export default async function BrowsePage() {
  const challenges = await getTopChallenges();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Top challenges</h1>
      <p className="text-sm text-black/50 dark:text-white/50 mb-6">
        The most-answered open challenges right now. Tap one to jump straight in.
      </p>

      {challenges.length === 0 ? (
        <p className="text-black/50 dark:text-white/50">
          Nothing open yet.{" "}
          <Link href="/create" className="text-emerald-500 underline">
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
                className="group flex flex-col rounded-xl border border-black/10 dark:border-white/15 overflow-hidden hover:shadow-md transition"
              >
                <div
                  className={`relative aspect-square w-full bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} flex items-center justify-center overflow-hidden`}
                >
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <p className="px-3 text-center text-sm italic text-black/60 dark:text-white/70 line-clamp-4">
                      &ldquo;{c.thumbnailText ?? c.prompt}&rdquo;
                    </p>
                  )}
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-black/60 text-white text-[10px] px-2 py-0.5 backdrop-blur">
                    {TEMPLATE_LABELS[c.templateType]}
                  </span>
                  {c.isMine && (
                    <span className="absolute top-1.5 right-1.5 rounded-full bg-emerald-500 text-white text-[10px] px-2 py-0.5">
                      yours
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium truncate">{c.prompt}</p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">
                    {c.responseCount} / {c.totalTarget} responses
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
