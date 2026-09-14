"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreAccount } from "@/app/account/actions";

export default function RestorePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await restoreAccount(email, code);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Restore account</h1>
      <p className="text-sm text-black/50 dark:text-white/50 mb-6">
        Bring a claimed account&apos;s credits to this device. This replaces this browser&apos;s
        current credit balance.
      </p>
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
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Recovery code"
          className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 font-mono"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 font-semibold disabled:opacity-40"
        >
          {submitting ? "Restoring…" : "Restore"}
        </button>
      </form>
    </div>
  );
}
