"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { claimAccount, getAccountStatus } from "@/app/account/actions";

export default function AccountPage() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [credits, setCredits] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAccountStatus().then((s) => {
      setEmail(s.email);
      setCredits(s.credits);
      if (s.email) setEmailInput(s.email);
    });
  }, []);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await claimAccount(emailInput);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRecoveryCode(result.recoveryCode);
    setEmail(emailInput.trim().toLowerCase());
    setShowForm(false);
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Account</h1>
      <p className="text-sm text-black/50 dark:text-white/50 mb-6">
        {credits === null ? "…" : `${credits} credits on this device.`}
      </p>

      {recoveryCode ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Save this recovery code somewhere safe — it&apos;s shown{" "}
            <span className="font-semibold">only once</span>. Use it with your email on{" "}
            <Link href="/restore" className="text-emerald-500 underline">
              /restore
            </Link>{" "}
            to bring your credits to another device.
          </p>
          <div className="rounded-lg bg-black/5 dark:bg-white/10 px-4 py-3 text-center font-mono text-lg tracking-wide select-all">
            {recoveryCode}
          </div>
        </div>
      ) : email === undefined ? (
        <p className="text-black/40 dark:text-white/40">Loading…</p>
      ) : email && !showForm ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Claimed as <span className="font-medium">{email}</span>.
          </p>
          <p className="text-sm text-black/50 dark:text-white/50">
            Lost your recovery code? Generating a new one invalidates the old code.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="self-start text-sm text-emerald-500 underline"
          >
            Generate a new recovery code
          </button>
        </div>
      ) : (
        <form onSubmit={handleClaim} className="flex flex-col gap-3">
          <p className="text-sm text-black/60 dark:text-white/60">
            Your credits currently live in this browser only. Claim them with an email so you can
            recover them on another device.
          </p>
          <input
            type="email"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="you@example.com"
            className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "Claiming…" : email ? "Generate new code" : "Claim account"}
          </button>
          <p className="text-xs text-black/40 dark:text-white/40">
            This isn&apos;t email-verified — anyone with the recovery code we show you next can use
            it. Already claimed on another device?{" "}
            <Link href="/restore" className="underline">
              Restore it here
            </Link>
            .
          </p>
        </form>
      )}
    </div>
  );
}
