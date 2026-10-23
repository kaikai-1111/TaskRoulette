"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMyModel, type ModelSummary } from "../actions";
import { ECONOMY } from "@/lib/economy";

export default function EditModelForm({ model }: { model: ModelSummary }) {
  const router = useRouter();
  const [name, setName] = useState(model.name);
  const [description, setDescription] = useState(model.description);
  const [price, setPrice] = useState(String(model.priceTokens));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const result = await updateMyModel(model.id, { name, description, priceTokens: Number(price) });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mt-10 flex flex-col gap-3 border-t border-black/10 dark:border-white/15 pt-6">
      <h2 className="font-semibold">Edit your model</h2>
      <input
        required
        maxLength={ECONOMY.MAX_MODEL_NAME_CHARS}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
      />
      <textarea
        rows={4}
        maxLength={ECONOMY.MAX_MODEL_DESCRIPTION_CHARS}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Price in tokens</span>
        <input
          type="number"
          min={0}
          max={ECONOMY.MAX_MODEL_PRICE_TOKENS}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
        />
        <span className="text-xs text-black/40 dark:text-white">Doesn&apos;t affect people who already bought it.</span>
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {saved && <p className="text-sm text-blue-600 dark:text-blue-400">Saved.</p>}
      <button
        type="submit"
        disabled={busy}
        className="self-start btn px-5 py-2 font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
