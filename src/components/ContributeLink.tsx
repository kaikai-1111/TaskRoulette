import Link from "next/link";

// Sits just under the header on every page, top right.
export default function ContributeLink() {
  return (
    <div className="flex justify-end px-4 pt-1.5">
      <Link
        href="/draw"
        className="font-display text-right text-base leading-tight text-blue-600 dark:text-blue-400 underline decoration-wavy decoration-1 underline-offset-4 hover:opacity-80"
      >
        Contribute your own drawing to be displayed in the background
      </Link>
    </div>
  );
}
