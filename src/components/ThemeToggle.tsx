"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | null; // null = follow system
type Resolved = "light" | "dark";

function resolveTheme(theme: Theme): Resolved {
  if (theme) return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Always applies one explicit class (never neither) — every dark: Tailwind
// utility in the app is keyed off .dark being present on an ancestor
// (see the custom-variant in globals.css), which a bare "follow system"
// state with no class at all would silently fail to match.
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolveTheme(theme));
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("theme");
  return stored === "light" || stored === "dark" ? stored : null;
}

export default function ThemeToggle() {
  // Lazy initializer runs synchronously on mount (not in an effect), and is
  // guarded for SSR where localStorage doesn't exist — matches what the
  // blocking <script> in layout.tsx already applied to the DOM, so there's
  // no flash of the wrong icon after hydration.
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defensive — the blocking init script in layout.tsx should already have
    // applied this, but re-asserting here is cheap and idempotent.
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // In "Auto" mode, keep tracking the OS preference live instead of freezing
  // whatever it resolved to at mount/toggle time.
  useEffect(() => {
    if (theme !== null) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(null);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  function cycle() {
    // system -> light -> dark -> system
    const next: Theme = theme === null ? "light" : theme === "light" ? "dark" : null;
    setTheme(next);
    applyTheme(next);
    if (next) localStorage.setItem("theme", next);
    else localStorage.removeItem("theme");
  }

  if (!mounted) return <div className="h-6 w-6" aria-hidden />;

  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Auto";

  return (
    <button
      onClick={cycle}
      title={`Theme: ${label} (click to change)`}
      className="flex h-6 w-6 items-center justify-center rounded-full text-black/50 hover:text-black dark:text-white dark:hover:text-white transition"
    >
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : theme === "dark" ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 20h8M12 17v3" />
        </svg>
      )}
    </button>
  );
}
