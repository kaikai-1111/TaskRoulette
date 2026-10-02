"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getAccountStatus } from "@/app/account/actions";

interface Identity {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  hasAccount: boolean;
}

interface IdentityContextValue {
  identity: Identity | null; // null = not loaded yet
  refresh: () => void;
}

const IdentityContext = createContext<IdentityContextValue | null>(null);

// Mirrors CreditsProvider — one fetch shared between the nav badge and the
// account page, with refresh() so a profile edit on /account shows up in
// the nav immediately instead of waiting for that component to remount.
export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);

  const refresh = useCallback(() => {
    getAccountStatus().then((s) =>
      setIdentity({
        displayName: s.displayName,
        username: s.username,
        avatarUrl: s.avatarUrl,
        hasAccount: s.hasAccount,
      })
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <IdentityContext.Provider value={{ identity, refresh }}>{children}</IdentityContext.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used within IdentityProvider");
  return ctx;
}
