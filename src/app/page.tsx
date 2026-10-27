import Link from "next/link";

// The front door. Plain on purpose: it says what the site is and points people
// at the three things they can do. Add sections where marked below.

const STEPS = [
  {
    title: "Answer",
    body: "Each task takes a few seconds. Label an image, draw something, rate a picture, tap a spot, take a photo, or fill out a short survey.",
  },
  {
    title: "Earn",
    body: "Every answer earns 1 credit and 1 token. There's also a daily reward, and sometimes a power-up.",
  },
  {
    title: "Post your own",
    body: "Spend credits to post a challenge, then export what people send back as JSON, CSV or TSV. Use tokens to grab models other people have shared.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="leading-none" style={{ fontSize: "clamp(2.8rem, 10vw, 4.4rem)" }}>
        Task Roulette
      </h1>
      <p className="mt-4 text-lg">
        A feed of quick tasks, answered by real people. Do a few for fun, or post one when you
        need data for a model, a study, or anything else.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/feed" className="btn px-6 py-3 text-lg">
          Start answering
        </Link>
        <Link href="/create" className="btn btn-orange px-6 py-3 text-lg">
          Post a challenge
        </Link>
        <Link href="/browse" className="btn btn-ghost px-6 py-3 text-lg">
          Browse challenges
        </Link>
      </div>

      <h2 className="mt-14 mb-4">How it works</h2>
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

      {/* Add more sections here: examples, screenshots, who it's for, FAQ. */}

      <p className="mt-14 text-sm text-black/50 dark:text-white">
        No account needed to answer. Answers can be reused as training data, see the{" "}
        <Link href="/terms" className="underline">
          terms
        </Link>
        .
      </p>
    </div>
  );
}
