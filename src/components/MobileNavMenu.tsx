"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/", label: "Feed" },
  { href: "/browse", label: "Browse" },
  { href: "/create", label: "Post" },
  { href: "/mine", label: "My challenges" },
  { href: "/account", label: "Account" },
];

export default function MobileNavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center text-black/60 dark:text-white/60"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          {open ? (
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <nav className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black shadow-lg py-1 flex flex-col text-sm font-medium">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
