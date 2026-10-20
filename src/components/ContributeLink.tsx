import Link from "next/link";

// Sits just under the header on every page, top right.
export default function ContributeLink() {
  return (
    <div className="flex justify-end px-4 pt-1.5">
      <Link
        href="/draw"
        className="text-right text-xs text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:opacity-80"
      >
        Contribute your own drawing to be displayed in the background
      </Link>
    </div>
  );
}
