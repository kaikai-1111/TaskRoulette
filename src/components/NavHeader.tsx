import Link from "next/link";

export default function NavHeader() {
  return (
    <header className="flex items-center justify-between border-b border-black/5 dark:border-white/10 px-4 py-3">
      <Link href="/" className="font-bold tracking-tight">
        quicktask
      </Link>
      <nav className="flex gap-4 text-sm font-medium text-black/60 dark:text-white/60">
        <Link href="/" className="hover:text-black dark:hover:text-white">
          Feed
        </Link>
        <Link href="/browse" className="hover:text-black dark:hover:text-white">
          Browse
        </Link>
        <Link href="/create" className="hover:text-black dark:hover:text-white">
          Post
        </Link>
        <Link href="/mine" className="hover:text-black dark:hover:text-white">
          My challenges
        </Link>
        <Link href="/account" className="hover:text-black dark:hover:text-white">
          Account
        </Link>
      </nav>
    </header>
  );
}
