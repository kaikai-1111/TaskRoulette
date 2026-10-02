"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createChallenge,
  getMyChallengeForEdit,
  getRemixSource,
  setMyChallengeStatus,
  updateMyChallenge,
  type EditableChallenge,
  type RemixSource,
} from "@/app/actions";
import { getAccountStatus } from "@/app/account/actions";
import { ECONOMY } from "@/lib/economy";
import { TEMPLATE_TYPES, type TemplateType } from "@/lib/templates/types";
import { useCredits } from "@/components/CreditsProvider";
import CreateAccountForm from "@/components/CreateAccountForm";
import ImageSearch from "@/components/ImageSearch";

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
  PHOTO_CAPTURE: {
    label: "Things to photograph, one per line",
    placeholder: "your desk right now\na plant near you",
  },
};

// Purpose is an independent, creator-overridable tag (annotating existing
// data vs. contributing new data) — this just picks a sensible starting
// point whenever the task type changes.
const COLLECTING_TEMPLATE_TYPES: TemplateType[] = ["VIDEO_RECORDING", "PHOTO_CAPTURE"];
function defaultPurposeFor(t: TemplateType): "ANNOTATING" | "COLLECTING" {
  return COLLECTING_TEMPLATE_TYPES.includes(t) ? "COLLECTING" : "ANNOTATING";
}

function usesImageItemsFor(templateType: TemplateType, mediaMode: "image" | "text"): boolean {
  return templateType === "BOUNDING_BOX" || templateType === "POINT" || (templateType === "LABELING" && mediaMode === "image");
}

type Source = Pick<
  RemixSource,
  "templateType" | "prompt" | "category" | "purpose" | "config" | "timeLimitSeconds" | "targetResponsesPerItem" | "items"
>;

export default function CreatePage() {
  return (
    <Suspense
      fallback={<div className="mx-auto w-full max-w-lg px-4 py-8 text-black/40 dark:text-white">Loading…</div>}
    >
      <CreatePageInner />
    </Suspense>
  );
}

function CreatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const remixId = searchParams.get("remix");

  const [templateType, setTemplateType] = useState<TemplateType>("LABELING");
  const [category, setCategory] = useState<"FUN" | "PRETRAINING">("FUN");
  const [purpose, setPurpose] = useState<"ANNOTATING" | "COLLECTING">(defaultPurposeFor("LABELING"));
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
  const [noTimeLimit, setNoTimeLimit] = useState(false);
  const { credits, adjust } = useCredits();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null); // null = loading
  const [isAdmin, setIsAdmin] = useState(false);

  // Edit/remix mode
  const [loadingSource, setLoadingSource] = useState(!!editId || !!remixId);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [editChallengeId, setEditChallengeId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [challengeStatus, setChallengeStatus] = useState<EditableChallenge["status"] | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [remixedFromPrompt, setRemixedFromPrompt] = useState<string | null>(null);

  useEffect(() => {
    getAccountStatus().then((s) => {
      setHasAccount(s.hasAccount);
      setIsAdmin(s.canPostWithoutAccount);
    });
  }, []);

  useEffect(() => {
    function applySource(src: Source) {
      setTemplateType(src.templateType);
      setPrompt(src.prompt);
      setCategory(src.category);
      setPurpose(src.purpose);
      setTargetResponsesPerItem(src.targetResponsesPerItem);
      if (src.timeLimitSeconds === ECONOMY.NO_TIME_LIMIT) {
        setNoTimeLimit(true);
      } else {
        setNoTimeLimit(false);
        setTimeLimitSeconds(src.timeLimitSeconds);
      }

      const config = src.config as Record<string, unknown>;
      if (src.templateType === "BOUNDING_BOX" || src.templateType === "POINT") {
        setTargetLabel(typeof config.targetLabel === "string" ? config.targetLabel : "");
      } else if (src.templateType === "LABELING") {
        const options = config.options;
        setOptionsInput(Array.isArray(options) ? options.join(", ") : "");
      } else if (src.templateType === "VIDEO_RECORDING") {
        setMaxDurationSeconds(
          typeof config.maxDurationSeconds === "number" ? config.maxDurationSeconds : ECONOMY.DEFAULT_VIDEO_SECONDS
        );
      }

      const srcUsesImages =
        src.templateType === "BOUNDING_BOX" ||
        src.templateType === "POINT" ||
        (src.templateType === "LABELING" && src.items.some((i) => i.mediaUrl));
      if (src.templateType === "LABELING") setMediaMode(srcUsesImages ? "image" : "text");
      setItemsRaw(src.items.map((i) => (srcUsesImages ? i.mediaUrl : i.textContent) ?? "").filter(Boolean).join("\n"));
    }

    if (editId) {
      getMyChallengeForEdit(editId).then((c) => {
        if (!c) {
          setSourceError("Can't edit this challenge — it may not be yours.");
          setLoadingSource(false);
          return;
        }
        applySource(c);
        setEditChallengeId(c.id);
        setLocked(c.locked);
        setChallengeStatus(c.status);
        setLoadingSource(false);
      });
    } else if (remixId) {
      getRemixSource(remixId).then((src) => {
        if (!src) {
          setSourceError("Can't remix that challenge right now — it may have been taken down.");
          setLoadingSource(false);
          return;
        }
        applySource(src);
        setRemixedFromPrompt(src.prompt);
        setLoadingSource(false);
      });
    }
    // Only ever run once, on whichever query param this page loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, remixId]);

  const usesImageItems = usesImageItemsFor(templateType, mediaMode);
  const fieldsLocked = !!editChallengeId && locked;

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
    } else if (templateType === "FREEFORM_DRAWING" || templateType === "PHOTO_CAPTURE") {
      config = {};
    } else {
      config = { maxDurationSeconds };
    }

    const challengeItems = usesImageItems
      ? items.map((mediaUrl) => ({ mediaUrl }))
      : items.map((textContent) => ({ textContent }));
    const resolvedTimeLimit = noTimeLimit ? ECONOMY.NO_TIME_LIMIT : timeLimitSeconds;

    setSubmitting(true);

    if (editChallengeId) {
      const result = await updateMyChallenge(editChallengeId, {
        timeLimitSeconds: resolvedTimeLimit,
        targetResponsesPerItem,
        ...(fieldsLocked ? {} : { prompt, category, purpose, config, items: challengeItems }),
      });
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/challenges/${editChallengeId}`);
      return;
    }

    const result = await createChallenge({
      templateType,
      category,
      purpose,
      prompt,
      config,
      timeLimitSeconds: resolvedTimeLimit,
      targetResponsesPerItem,
      items: challengeItems,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      if (result.needsAccount) setHasAccount(false);
      return;
    }
    adjust(-totalCost);
    router.push(`/challenges/${result.challengeId}`);
  }

  async function handleToggleStatus() {
    if (!editChallengeId || !challengeStatus) return;
    const next = challengeStatus === "REMOVED" ? "ACTIVE" : "REMOVED";
    setStatusSaving(true);
    const result = await setMyChallengeStatus(editChallengeId, next);
    setStatusSaving(false);
    if (result.ok) setChallengeStatus(next);
  }

  function appendItems(urls: string[]) {
    if (urls.length === 0) return;
    setItemsRaw((prev) => (prev.trim() ? `${prev.trim()}\n${urls.join("\n")}` : urls.join("\n")));
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
    appendItems(urls);
    if (failures.length > 0) {
      setError(`Couldn't upload: ${failures.join(", ")}`);
    }
  }

  const itemsCopy = ITEMS_COPY[templateType];

  if (loadingSource || hasAccount === null) {
    return <div className="mx-auto w-full max-w-lg px-4 py-8 text-black/40 dark:text-white">Loading…</div>;
  }

  if (sourceError) {
    return (
      <div className="mx-auto w-full max-w-sm px-4 py-8">
        <p className="text-sm text-red-500">{sourceError}</p>
      </div>
    );
  }

  if (!editChallengeId && !hasAccount && !isAdmin) {
    return (
      <div className="mx-auto w-full max-w-sm px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Create an account to post</h1>
        <p className="text-sm text-black/50 dark:text-white mb-6">
          Doing challenges never requires this — only posting one does, so there&apos;s a real
          identity behind the data you collect.
        </p>
        <CreateAccountForm onCreated={() => setHasAccount(true)} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">{editChallengeId ? "Edit challenge" : "Post a challenge"}</h1>
      {editChallengeId ? (
        <p className="text-sm text-black/50 dark:text-white mb-6">
          {fieldsLocked
            ? "This challenge already has responses, so its task type, prompt, config, and items are locked. Responses needed, time limit, and take-down stay editable."
            : "No responses yet — everything below is still editable."}
        </p>
      ) : (
        <p className="text-sm text-black/50 dark:text-white mb-6">
          {credits === null ? "…" : `You have ${credits} credits.`} Posting a challenge costs a flat{" "}
          {ECONOMY.CHALLENGE_POST_COST} credits, no matter how many items or responses you ask for.
        </p>
      )}

      {remixedFromPrompt && (
        <div className="mb-5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-black/60 dark:text-white">
          Remixing &ldquo;{remixedFromPrompt}&rdquo; — edit anything below before posting your own copy.
        </div>
      )}

      {editChallengeId && challengeStatus && (
        <div className="mb-5 flex items-center justify-between rounded-lg bg-black/5 dark:bg-white/10 px-3 py-2 text-sm">
          <span>
            Status: <span className="font-semibold">{challengeStatus.toLowerCase()}</span>
          </span>
          {(challengeStatus === "ACTIVE" || challengeStatus === "REMOVED") && (
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={statusSaving}
              className={`text-sm underline disabled:opacity-40 ${
                challengeStatus === "REMOVED" ? "text-blue-600 dark:text-blue-400" : "text-red-500"
              }`}
            >
              {statusSaving ? "Saving…" : challengeStatus === "REMOVED" ? "Reactivate" : "Take down"}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <fieldset disabled={fieldsLocked} className="flex flex-col gap-1.5 disabled:opacity-50">
          <label className="text-sm font-medium">Task type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TEMPLATE_TYPES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => {
                  setTemplateType(t.value);
                  setPurpose(defaultPurposeFor(t.value));
                }}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  templateType === t.value
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-black/10 dark:border-white/15"
                }`}
              >
                <div className="font-semibold">{t.label}</div>
                <div className="text-black/50 dark:text-white text-xs">{t.blurb}</div>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Prompt / title</span>
          <input
            required
            disabled={fieldsLocked}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              NEEDS_TARGET_LABEL.includes(templateType)
                ? "e.g. Cats in weird places"
                : templateType === "FREEFORM_DRAWING"
                  ? "e.g. Draw it"
                  : templateType === "VIDEO_RECORDING"
                    ? "e.g. Show us your setup"
                    : templateType === "PHOTO_CAPTURE"
                      ? "e.g. Show us what's on your desk"
                      : "e.g. Is this a good pun?"
            }
            className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 disabled:opacity-50"
          />
        </label>

        {NEEDS_TARGET_LABEL.includes(templateType) && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {templateType === "BOUNDING_BOX" ? "What should doers draw a box around?" : "What should doers tap on?"}
            </span>
            <input
              required
              disabled={fieldsLocked}
              value={targetLabel}
              onChange={(e) => setTargetLabel(e.target.value)}
              placeholder="the cat"
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 disabled:opacity-50"
            />
          </label>
        )}

        {templateType === "LABELING" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Answer options (comma-separated, optional)</span>
            <input
              disabled={fieldsLocked}
              value={optionsInput}
              onChange={(e) => setOptionsInput(e.target.value)}
              placeholder="Leave blank for free-text answers, e.g.: yes, no, unclear"
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 disabled:opacity-50"
            />
          </label>
        )}

        {templateType === "VIDEO_RECORDING" && (
          <div className="rounded-lg bg-amber-400/10 border border-amber-400/30 px-3 py-2 text-xs text-black/60 dark:text-white">
            Doers see an explicit camera-consent screen before recording, and must confirm they&apos;re
            13+ (on top of the site-wide age gate). Clips are hard-capped below.
          </div>
        )}

        {templateType === "VIDEO_RECORDING" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Max recording length</span>
            <select
              disabled={fieldsLocked}
              value={maxDurationSeconds}
              onChange={(e) => setMaxDurationSeconds(Number(e.target.value))}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 disabled:opacity-50"
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

        {templateType === "PHOTO_CAPTURE" && (
          <div className="rounded-lg bg-amber-400/10 border border-amber-400/30 px-3 py-2 text-xs text-black/60 dark:text-white">
            Doers see an explicit camera-consent screen before taking a photo. Each item below is a
            separate thing to photograph — doers take one photo per item, not a batch.
          </div>
        )}

        {templateType === "LABELING" && (
          <fieldset disabled={fieldsLocked} className="flex flex-col gap-1.5 disabled:opacity-50">
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
          {usesImageItems && !fieldsLocked && (
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
                className="flex-1 text-sm text-black/60 dark:text-white file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-50"
              />
              {uploading && <span className="text-xs text-black/40 dark:text-white">Uploading…</span>}
            </div>
          )}
          {usesImageItems && !fieldsLocked && <ImageSearch onAdd={appendItems} />}
          <textarea
            required
            disabled={fieldsLocked}
            rows={5}
            value={itemsRaw}
            onChange={(e) => setItemsRaw(e.target.value)}
            placeholder={itemsCopy.placeholder}
            className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 font-mono text-sm disabled:opacity-50"
          />
          <span className="text-xs text-black/40 dark:text-white">{items.length} item(s)</span>
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
            <input
              type="number"
              min={ECONOMY.MIN_TIME_LIMIT_SECONDS}
              max={ECONOMY.MAX_TIME_LIMIT_SECONDS}
              value={timeLimitSeconds}
              disabled={noTimeLimit}
              onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 disabled:opacity-40"
            />
            <label className="flex items-center gap-1.5 text-xs text-black/50 dark:text-white">
              <input
                type="checkbox"
                checked={noTimeLimit}
                onChange={(e) => setNoTimeLimit(e.target.checked)}
              />
              No limit
            </label>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={fieldsLocked}
            checked={category === "PRETRAINING"}
            onChange={(e) => setCategory(e.target.checked ? "PRETRAINING" : "FUN")}
            className="disabled:opacity-50"
          />
          This is for training my own model (vs. just for fun)
        </label>

        <fieldset disabled={fieldsLocked} className="flex flex-col gap-1.5 disabled:opacity-50">
          <label className="text-sm font-medium">This challenge is</label>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setPurpose("ANNOTATING")}
              className={`rounded-full px-3 py-1 border ${
                purpose === "ANNOTATING" ? "border-blue-500 bg-blue-500/10" : "border-black/10 dark:border-white/15"
              }`}
            >
              Annotating
            </button>
            <button
              type="button"
              onClick={() => setPurpose("COLLECTING")}
              className={`rounded-full px-3 py-1 border ${
                purpose === "COLLECTING" ? "border-blue-500 bg-blue-500/10" : "border-black/10 dark:border-white/15"
              }`}
            >
              Collecting
            </button>
          </div>
          <span className="text-xs text-black/40 dark:text-white">
            {purpose === "ANNOTATING"
              ? "Doers label or mark up data you've already supplied."
              : "Doers contribute new data (photos, video, ...) rather than annotate existing data."}
          </span>
        </fieldset>

        {!editChallengeId && (
          <div className="rounded-lg bg-black/5 dark:bg-white/10 px-3 py-2 text-sm flex justify-between">
            <span>Total cost</span>
            <span className={!canAfford ? "text-red-500 font-semibold" : "font-semibold"}>
              {totalCost} credits
            </span>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || uploading || items.length === 0 || (!editChallengeId && !canAfford)}
          className="rounded-full bg-orange-500 hover:bg-orange-600 px-6 py-3 font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition"
        >
          {submitting
            ? editChallengeId
              ? "Saving…"
              : "Posting…"
            : editChallengeId
              ? "Save changes"
              : `Post for ${totalCost} credits`}
        </button>
      </form>
    </div>
  );
}
