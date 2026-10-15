"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCredits } from "@/components/CreditsProvider";

// "∞" while an infinite power-up is running (it flips back on its own when
// the timer runs out — the 1s tick just re-renders against Date.now()).
export default function CreditsBadge() {
  const { credits, tokens, freeCreditsUntil, freeTokensUntil, refresh } = useCredits();
  const [now, setNow] = useState(() => Date.now());

  const anyActive = [freeCreditsUntil, freeTokensUntil].some((u) => u !== null && u > now);
  useEffect(() => {
    if (!anyActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [anyActive]);

  // Once a timer lapses, re-sync with the server rather than trusting the clock.
  const expired = [freeCreditsUntil, freeTokensUntil].some((u) => u !== null && u <= now);
  useEffect(() => {
    if (expired) refresh();
  }, [expired, refresh]);

  const infC = freeCreditsUntil !== null && freeCreditsUntil > now;
  const infT = freeTokensUntil !== null && freeTokensUntil > now;

  return (
    <Link
      href="/rewards"
      className="shrink-0 whitespace-nowrap text-sm font-medium text-black/60 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
      title="Credits and tokens — open Rewards"
    >
      <span className={infC ? "text-orange-500 font-semibold" : ""}>{infC ? "∞" : (credits ?? "…")} credits</span>
      <span className="mx-1 text-black/30 dark:text-white/40">·</span>
      <span className={infT ? "text-orange-500 font-semibold" : ""}>{infT ? "∞" : (tokens ?? "…")} tokens</span>
    </Link>
  );
}
