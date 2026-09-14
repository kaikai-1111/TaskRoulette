export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-4">Terms, in short</h1>
      <p className="mb-4">
        quicktask is a public feed of quick, informal tasks posted by other users. Anyone can post a
        challenge and anyone can answer one — there&apos;s no vetting of prompts or images beyond
        the flag/review process described below.
      </p>
      <p className="mb-4">
        <span className="font-semibold">Submissions become training/derived data.</span> Anything
        you submit as an answer — text, a drawn box, an image reference — may be stored, aggregated,
        exported, and reused (including by the person who posted the challenge, to train or evaluate
        a model) indefinitely. Don&apos;t submit anything you wouldn&apos;t want reused this way.
      </p>
      <p className="mb-4">
        You must be at least 13 years old to use this site. Content is meant to be lighthearted, but
        illegal content, harassment, or anything sexual involving minors is never allowed — use the
        Report button on any challenge, which sends it to review.
      </p>
      <p className="mb-4">
        Credits have no cash value and can&apos;t be bought, sold, or redeemed for money. We can
        adjust balances or remove content at our discretion.
      </p>
      <p className="text-black/50 dark:text-white/50">
        This is a v1 placeholder, not a substitute for real legal review before a public launch.
      </p>
    </div>
  );
}
