import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import MobileNavMenu from "@/components/MobileNavMenu";
import CreditsBadge from "@/components/CreditsBadge";

export default function NavHeader() {
  return (
    <header className="flex items-center gap-3 border-b border-black/5 dark:border-white/10 px-4 py-3">
      <Link
        href="/"
        className="shrink-0 font-bold tracking-tight text-blue-600 dark:text-blue-400 whitespace-nowrap"
      >
        Task Roulette
      </Link>
      <nav className="hidden sm:flex flex-1 items-center gap-4 text-sm font-medium whitespace-nowrap text-black/60 dark:text-white/60">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
          Feed
        </Link>
        <Link href="/browse" className="hover:text-blue-600 dark:hover:text-blue-400">
          Browse
        </Link>
        <Link href="/create" className="hover:text-blue-600 dark:hover:text-blue-400">
          Post
        </Link>
        <Link href="/mine" className="hover:text-blue-600 dark:hover:text-blue-400">
          My challenges
        </Link>
        <Link href="/account" className="hover:text-blue-600 dark:hover:text-blue-400">
          Account
        </Link>
      </nav>
      <div className="flex flex-1 sm:flex-none items-center justify-end gap-3">
        <CreditsBadge />
        <ThemeToggle />
        <MobileNavMenu />
      </div>
    </header>
  );
}
