"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/app/account/actions";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useIdentity } from "@/components/IdentityProvider";
import { useCredits } from "@/components/CreditsProvider";

export default function RestorePage() {
  const router = useRouter();
  const { refresh: refreshIdentity } = useIdentity();
  const { refresh: refreshCredits } = useCredits();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function goHome() {
    refreshIdentity();
    refreshCredits();
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    goHome();
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Sign in</h1>
      <p className="text-sm text-black/50 dark:text-white mb-6">
        Bring a claimed account&apos;s credits to this device. This replaces this browser&apos;s
        current credit balance.
      </p>

      {!!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <>
          <GoogleSignInButton onSuccess={goHome} />
          <div className="flex items-center gap-3 text-xs text-black/40 dark:text-white my-4">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
            or use your password
            <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-6 py-2.5 font-semibold disabled:opacity-40"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
