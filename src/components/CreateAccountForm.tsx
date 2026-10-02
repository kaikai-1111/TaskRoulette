"use client";

import { useState } from "react";
import Link from "next/link";
import { createAccount } from "@/app/account/actions";
import { USERNAME_HINT } from "@/lib/username";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function CreateAccountForm({ onCreated }: { onCreated?: () => void }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await createAccount({ email, username, displayName, firstName, lastName, password });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreated?.();
  }

  return (
    <div className="flex flex-col gap-4">
      {!!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <>
          <GoogleSignInButton onSuccess={() => onCreated?.()} />
          <div className="flex items-center gap-3 text-xs text-black/40 dark:text-white">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
            or
            <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium">First name</span>
            <input
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium">Last name</span>
            <input
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            />
          </label>
        </div>
        <p className="-mt-1 text-xs text-black/40 dark:text-white">
          Your real name is only visible to admins, never to other users.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Username</span>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="pigeon_watch"
            className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
          />
          <span className="text-xs text-black/40 dark:text-white">{USERNAME_HINT}</span>
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
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
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
        <p className="text-xs text-black/40 dark:text-white">
          One account per email. Already have one?{" "}
          <Link href="/restore" className="underline">
            Sign in
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
