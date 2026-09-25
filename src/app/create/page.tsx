"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createChallenge } from "@/app/actions";
import { ECONOMY } from "@/lib/economy";
import { TEMPLATE_TYPES, type TemplateType } from "@/lib/templates/types";
import { useCredits } from "@/components/CreditsProvider";

const NEEDS_TARGET_LABEL: TemplateType[] = ["BOUNDING_BOX", "POINT"];

const ITEMS_COPY: Record<TemplateType, { label: string; placeholder: string }> = {
  BOUNDING_BOX: {
    label: "Image URLs, one per line",
    placeholder: "https://example.com/cat1.jpg\nhttps://example.com/cat2.jpg",
  },
  POINT: {
    label: "Image URLs, one per line",
    placeholder: "https://example.com/cat1.jpg\nhttps://example.com/cat2.jpg",
  },
  LABELING: {
    label: "Items, one per line",
    placeholder: "That's not a bug, it's a feature.\nI could eat this every day.",
  },
  FREEFORM_DRAWING: {
    label: "Things to draw, one per line",
    placeholder: "a house using only staircases\na cat wearing a tiny hat",
  },
  VIDEO_RECORDING: {
    label: "Things to record, one per line",
    placeholder: "say today's date out loud\nshow us something blue nearby",
  },
};

export default function CreatePage() {
  const router = useRouter();
  const [templateType, setTemplateType] = useState<TemplateType>("LABELING");
  const [category, setCategory] = useState<"FUN" | "PRETRAINING">("FUN");
  const [prompt, setPrompt] = useState("");
  const [targetLabel, setTargetLabel] = useState(""); // BOUNDING_BOX / POINT only
  const [optionsInput, setOptionsInput] = useState(""); // LABELING only, comma-separated; blank = free text
  const [mediaMode, setMediaMode] = useState<"image" | "text">("image"); // LABELING only
  const [maxDurationSeconds, setMaxDurationSeconds] = useState<number>(ECONOMY.DEFAULT_VIDEO_SECONDS);
  const [itemsRaw, setItemsRaw] = useState("");
  const [targetResponsesPerItem, setTargetResponsesPerItem] = useState<number>(
    ECONOMY.DEFAULT_TARGET_RESPONSES_PER_ITEM
  );
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(ECONOMY.DEFAULT_TIME_LIMIT_SECONDS);
  const { credits, adjust } = useCredits();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const usesImageItems =
    templateType === "BOUNDING_BOX" || templateType === "POINT" || (templateType === "LABELING" && mediaMode === "image");

  const items = useMemo(
    () =>
      itemsRaw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    [itemsRaw]
  );

  const totalCost = ECONOMY.CHALLENGE_POST_COST;
  const canAfford = credits === null || credits >= totalCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let config: unknown;
    if (NEEDS_TARGET_LABEL.includes(templateType)) {
      config = { targetLabel };
    } else if (templateType === "LABELING") {
      config = {
        options: optionsInput.trim() ? optionsInput.split(",").map((o) => o.trim()).filter(Boolean) : null,
      };
    } else if (templateType === "FREEFORM_DRAWING") {
      config = {};
    } else {
      config = { maxDurationSeconds };
    }

    const challengeItems = usesImageItems
      ? items.map((mediaUrl) => ({ mediaUrl }))
      : items.map((textContent) => ({ textContent }));

    setSubmitting(true);
    const result = await createChallenge({
      templateType,
      category,
      prompt,
      config,
      timeLimitSeconds,
      targetResponsesPerItem,
      items: challengeItems,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    adjust(-totalCost);
    router.push(`/challenges/${result.challengeId}`);
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const urls: string[] = [];
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const res = await fetch("/api/uploads/image", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Upload failed");
        urls.push(body.url);
      } catch {
        failures.push(file.name);
      }
    }
    setUploading(false);
    if (urls.length > 0) {
      setItemsRaw((prev) => (prev.trim() ? `${prev.trim()}\n${urls.join("\n")}` : urls.join("\n")));
    }
    if (failures.length > 0) {
      setError(`Couldn't upload: ${failures.join(", ")}`);
    }
  }

  const itemsCopy = ITEMS_COPY[templateType];

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Post a challenge</h1>
      <p className="text-sm text-black/50 dark:text-white/50 mb-6">
        {credits === null ? "…" : `You have ${credits} credits.`} Posting a challenge costs a flat{" "}
        {ECONOMY.CHALLENGE_POST_COST} credits, no matter how many items or responses you ask for.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Task type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEMPLATE_TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setTemplateType(t.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  templateType === t.value
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-black/10 dark:border-white/15"
                }`}
              >
                <div className="font-semibold">{t.label}</div>
                <div className="text-black/50 dark:text-white/50 text-xs">{t.blurb}</div>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Prompt / title</span>
          <input
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              NEEDS_TARGET_LABEL.includes(templateType)
                ? "e.g. Cats in weird places"
                : templateType === "FREEFORM_DRAWING"
                  ? "e.g. Draw it"
                  : templateType === "VIDEO_RECORDING"
                    ? "e.g. Show us your setup"
                    : "e.g. Is this a good pun?"
            }
            className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
          />
        </label>

        {NEEDS_TARGET_LABEL.includes(templateType) && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {templateType === "BOUNDING_BOX" ? "What should doers draw a box around?" : "What should doers tap on?"}
            </span>
            <input
              required
              value={targetLabel}
              onChange={(e) => setTargetLabel(e.target.value)}
              placeholder="the cat"
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            />
          </label>
        )}

        {templateType === "LABELING" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Answer options (comma-separated, optional)</span>
            <input
              value={optionsInput}
              onChange={(e) => setOptionsInput(e.target.value)}
              placeholder="Leave blank for free-text answers, e.g.: yes, no, unclear"
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            />
          </label>
        )}

        {templateType === "VIDEO_RECORDING" && (
          <div className="rounded-lg bg-amber-400/10 border border-amber-400/30 px-3 py-2 text-xs text-black/60 dark:text-white/60">
            Doers see an explicit camera-consent screen before recording, and must confirm they&apos;re
            13+ (on top of the site-wide age gate). Clips are hard-capped below.
          </div>
        )}

        {templateType === "VIDEO_RECORDING" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Max recording length</span>
            <select
              value={maxDurationSeconds}
              onChange={(e) => setMaxDurationSeconds(Number(e.target.value))}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            >
              {Array.from(
                { length: ECONOMY.MAX_VIDEO_SECONDS - ECONOMY.MIN_VIDEO_SECONDS + 1 },
                (_, i) => ECONOMY.MIN_VIDEO_SECONDS + i
              ).map((s) => (
                <option key={s} value={s}>
                  {s}s
                </option>
              ))}
            </select>
          </label>
        )}

        {templateType === "LABELING" && (
          <fieldset className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Items are</label>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setMediaMode("image")}
                className={`rounded-full px-3 py-1 border ${
                  mediaMode === "image" ? "border-blue-500 bg-blue-500/10" : "border-black/10 dark:border-white/15"
                }`}
              >
                Images
              </button>
              <button
                type="button"
                onClick={() => setMediaMode("text")}
                className={`rounded-full px-3 py-1 border ${
                  mediaMode === "text" ? "border-blue-500 bg-blue-500/10" : "border-black/10 dark:border-white/15"
                }`}
              >
                Text snippets
              </button>
            </div>
          </fieldset>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            {usesImageItems ? "Images — upload files or paste URLs, one per line" : itemsCopy.label}
          </span>
          {usesImageItems && (
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={uploading}
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  e.target.value = "";
                }}
                className="flex-1 text-sm text-black/60 dark:text-white/60 file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-50"
              />
              {uploading && <span className="text-xs text-black/40 dark:text-white/40">Uploading…</span>}
            </div>
          )}
          <textarea
            required
            rows={5}
            value={itemsRaw}
            onChange={(e) => setItemsRaw(e.target.value)}
            placeholder={itemsCopy.placeholder}
            className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 font-mono text-sm"
          />
          <span className="text-xs text-black/40 dark:text-white/40">{items.length} item(s)</span>
        </label>

        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium">Responses needed per item</span>
            <input
              type="number"
              min={ECONOMY.MIN_TARGET_RESPONSES_PER_ITEM}
              max={ECONOMY.MAX_TARGET_RESPONSES_PER_ITEM}
              value={targetResponsesPerItem}
              onChange={(e) => setTargetResponsesPerItem(Number(e.target.value))}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium">Time limit (seconds)</span>
            <select
              value={timeLimitSeconds}
              onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
            >
              {[15, 30, 60].map((s) => (
                <option key={s} value={s}>
                  {s}s
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={category === "PRETRAINING"}
            onChange={(e) => setCategory(e.target.checked ? "PRETRAINING" : "FUN")}
          />
          This is for training my own model (vs. just for fun)
        </label>

        <div className="rounded-lg bg-black/5 dark:bg-white/10 px-3 py-2 text-sm flex justify-between">
          <span>Total cost</span>
          <span className={!canAfford ? "text-red-500 font-semibold" : "font-semibold"}>
            {totalCost} credits
          </span>
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || uploading || items.length === 0 || !canAfford}
          className="rounded-full bg-orange-500 hover:bg-orange-600 px-6 py-3 font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition"
        >
          {submitting ? "Posting…" : `Post for ${totalCost} credits`}
        </button>
      </form>
    </div>
  );
}
