"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMyBalances } from "@/app/actions";

interface CreditsContextValue {
  credits: number | null; // null = not loaded yet
  tokens: number | null;
  // Epoch ms while an infinite-spending power-up is running, else null.
  freeCreditsUntil: number | null;
  freeTokensUntil: number | null;
  // True only while that power-up is actually running (flips off on expiry by itself).
  infiniteCredits: boolean;
  infiniteTokens: boolean;
  refresh: () => void;
  adjust: (delta: number) => void;
  adjustTokens: (delta: number) => void;
}

// Whether `until` (epoch ms) is still in the future, kept current without
// reading the clock during render: set when it changes, cleared at expiry.
function useActiveUntil(until: number | null): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const ms = until === null ? 0 : until - Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(ms > 0);
    if (ms <= 0) return;
    const t = setTimeout(() => setActive(false), ms);
    return () => clearTimeout(t);
  }, [until]);
  return active;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

// Single source of truth for the visitor's balances (credits, tokens and
// any running power-up), so the nav tally and every page that earns/spends
// (Feed, Post, Models, Rewards) stay in sync instead of drifting apart.
export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [freeCreditsUntil, setFreeCreditsUntil] = useState<number | null>(null);
  const [freeTokensUntil, setFreeTokensUntil] = useState<number | null>(null);

  const infiniteCredits = useActiveUntil(freeCreditsUntil);
  const infiniteTokens = useActiveUntil(freeTokensUntil);

  const refresh = useCallback(() => {
    getMyBalances().then((b) => {
      setCredits(b.credits);
      setTokens(b.tokens);
      setFreeCreditsUntil(b.freeCreditsUntil);
      setFreeTokensUntil(b.freeTokensUntil);
    });
  }, []);

  const adjust = useCallback((delta: number) => {
    setCredits((c) => (c === null ? c : c + delta));
  }, []);

  const adjustTokens = useCallback((delta: number) => {
    setTokens((t) => (t === null ? t : t + delta));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CreditsContext.Provider
      value={{
        credits,
        tokens,
        freeCreditsUntil,
        freeTokensUntil,
        infiniteCredits,
        infiniteTokens,
        refresh,
        adjust,
        adjustTokens,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within CreditsProvider");
  return ctx;
}
