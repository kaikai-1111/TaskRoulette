"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, submitName } from "@/app/account/actions";
import { useIdentity } from "@/components/IdentityProvider";
import { useCredits } from "@/components/CreditsProvider";

// Accounts created before first/last name was collected can't use the app
// until they submit one. Only applies to accounts — anonymous visitors never
// see it. /admin and /terms are exempt, same as AgeGate, so an admin who
// hasn't filled this in yet isn't locked out of moderating.
export default function NameGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { identity, refresh: refreshIdentity } = useIdentity();
  const { refresh: refreshCredits } = useCredits();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bypass = pathname?.startsWith("/admin") || pathname === "/terms";
  if (bypass) return <>{children}</>;
  if (identity === null) return <div className="flex flex-1" />;
  if (!identity.hasAccount || identity.hasName) return <>{children}</>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await submitName(firstName, lastName);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refreshIdentity();
  }

  async function handleSignOut() {
    await signOut();
    refreshIdentity();
    refreshCredits();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 gap-4">
      <p className="text-xl font-semibold text-center">One more thing</p>
      <p className="max-w-xs text-center text-sm text-black/60 dark:text-white">
        We now ask every account for a first and last name. It&apos;s only visible to you and admins,
        never to other users.
      </p>
      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          required
          autoComplete="given-name"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
        />
        <input
          required
          autoComplete="family-name"
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-2.5 font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </form>
      <button onClick={handleSignOut} className="text-sm text-black/40 dark:text-white underline">
        Sign out instead
      </button>
    </div>
  );
}
