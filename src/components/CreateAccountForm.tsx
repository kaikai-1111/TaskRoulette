"use client";

import { useState } from "react";
import Link from "next/link";
import { createAccount } from "@/app/account/actions";
import { USERNAME_HINT } from "@/lib/username";

export default function CreateAccountForm({
  onCreated,
  continueLabel = "Done",
}: {
  onCreated?: () => void;
  continueLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await createAccount({ email, username, displayName });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRecoveryCode(result.recoveryCode);
  }

  if (recoveryCode) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          Save this recovery code somewhere safe — it&apos;s shown{" "}
          <span className="font-semibold">only once</span>. Use it with your email on{" "}
          <Link href="/restore" className="text-blue-600 dark:text-blue-400 underline">
            /restore
          </Link>{" "}
          to sign in on another device.
        </p>
        <div className="rounded-lg bg-black/5 dark:bg-white/10 px-4 py-3 text-center font-mono text-lg tracking-wide select-all">
          {recoveryCode}
        </div>
        <button
          onClick={() => onCreated?.()}
          className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-2.5 font-semibold text-white self-start"
        >
          {continueLabel}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Username</span>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="pigeon_watch"
          className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
        />
        <span className="text-xs text-black/40 dark:text-white/40">{USERNAME_HINT}</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Display name</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Defaults to your username"
          className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-2.5 font-semibold text-white disabled:opacity-40"
      >
        {submitting ? "Creating…" : "Create account"}
      </button>
      <p className="text-xs text-black/40 dark:text-white/40">
        No password — you&apos;ll get a one-time recovery code instead. One account per email.
        Already have one?{" "}
        <Link href="/restore" className="underline">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
