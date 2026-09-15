"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getMyCredits } from "@/app/actions";

interface CreditsContextValue {
  credits: number | null; // null = not loaded yet
  refresh: () => void;
  adjust: (delta: number) => void;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

// Single source of truth for the visitor's credit balance, so the nav tally
// and every page that earns/spends credits (Feed, Post) stay in sync without
// each independently fetching and drifting from one another.
export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState<number | null>(null);

  const refresh = useCallback(() => {
    getMyCredits().then(setCredits);
  }, []);

  const adjust = useCallback((delta: number) => {
    setCredits((c) => (c === null ? c : c + delta));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CreditsContext.Provider value={{ credits, refresh, adjust }}>{children}</CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within CreditsProvider");
  return ctx;
}
