"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buyModel } from "../actions";
import { useCredits } from "@/components/CreditsProvider";

export default function BuyButton({ modelId, price }: { modelId: string; price: number }) {
  const router = useRouter();
  const { tokens, infiniteTokens: infinite, adjustTokens } = useCredits();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setBusy(true);
    setError(null);
    const result = await buyModel(modelId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    adjustTokens(-result.tokensSpent);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={buy}
        disabled={busy}
        className="btn btn-orange px-6 py-2.5 font-semibold text-white disabled:opacity-40 active:scale-95 transition"
      >
        {busy ? "Buying…" : infinite ? "Get it free (infinite tokens active)" : `Buy for ${price} tokens`}
      </button>
      {!infinite && tokens !== null && tokens < price && (
        <p className="text-xs text-black/50 dark:text-white">
          You have {tokens} tokens. Do challenges or claim your daily reward to earn more.
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
