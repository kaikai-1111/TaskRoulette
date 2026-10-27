import Link from "next/link";

// The front door. Plain on purpose: what the site is, then the two ways to use
// it. Add more sections where marked below.

const STEPS = [
  {
    title: "Post a task",
    body: "Say what you need: labels, drawings, ratings, photos, a short survey. Set how many answers you want. Posting costs 5 credits.",
  },
  {
    title: "Strangers answer it",
    body: "Your task goes into a feed that people flip through, a few seconds each. You don't find them, pay them, or talk to them.",
  },
  {
    title: "Take the data",
    body: "Export it as JSON, CSV, TSV or JSON Lines. It comes from random people on the internet, so expect some of it to be junk and plan for that.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="leading-none" style={{ fontSize: "clamp(2.8rem, 10vw, 4.4rem)" }}>
        Task Roulette
      </h1>
      <p className="mt-4 text-lg">
        Need a pile of labeled images, drawings, ratings or survey answers? Outsource it to random
        people on the internet. Post a task, and strangers do it for you.
      </p>
      <p className="mt-3 text-lg">
        Or be one of the strangers. Answer quick tasks, earn credits, and spend them on tasks of
        your own.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/create" className="btn btn-orange px-6 py-3 text-lg">
          Post a task
        </Link>
        <Link href="/feed" className="btn px-6 py-3 text-lg">
          Answer some
        </Link>
        <Link href="/browse" className="btn btn-ghost px-6 py-3 text-lg">
          See what&apos;s out there
        </Link>
      </div>

      <h2 className="mt-14 mb-4">If you need data</h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card p-4">
            <p className="font-display text-xl">
              {i + 1}. {s.title}
            </p>
            <p className="mt-1 text-sm text-black/70 dark:text-white">{s.body}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 mb-2">If you&apos;re just here to answer</h2>
      <p>
        Every answer earns you 1 credit and 1 token. There&apos;s a daily reward too, and now and then
        a power-up. Credits pay for your own tasks. Tokens buy models other people uploaded.
      </p>

      {/* Add more sections here: examples, screenshots, who it's for, FAQ. */}

      <p className="mt-14 text-sm text-black/50 dark:text-white">
        You don&apos;t need an account to answer. What you submit can be reused as training data,
        details are in the{" "}
        <Link href="/terms" className="underline">
          terms
        </Link>
        .
      </p>
    </div>
  );
}
