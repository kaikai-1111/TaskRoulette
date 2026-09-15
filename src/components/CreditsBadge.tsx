"use client";

import { useCredits } from "@/components/CreditsProvider";

export default function CreditsBadge() {
  const { credits } = useCredits();
  return (
    <span className="shrink-0 whitespace-nowrap text-sm font-medium text-black/60 dark:text-white/60">
      {credits ?? "…"} credits
    </span>
  );
}
