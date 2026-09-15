"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flagContent, getFeedItemForChallenge, getNextFeedItem, submitAnswer } from "@/app/actions";
import type { FeedItem } from "@/lib/templates/types";
import { CAPTURE_COMPONENTS } from "@/components/templates/registry";
import { useCredits } from "@/components/CreditsProvider";

type Feedback = {
  creditsEarned: number;
  itemResponseCount: number;
  targetResponsesPerItem: number;
};

export default function Feed({ initialChallengeId }: { initialChallengeId?: string }) {
  const [item, setItem] = useState<FeedItem | null | undefined>(undefined); // undefined = loading
  const { adjust } = useCredits();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [streak, setStreak] = useState(0);
  const [reporting, setReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [targeted, setTargeted] = useState(!!initialChallengeId);
  const startedAtRef = useRef<number>(0);

  const loadNext = useCallback(async () => {
    setItem(undefined);
    setFeedback(null);
    setError(null);
    setReporting(false);
    setReportSent(false);
    setTargeted(false);
    const next = await getNextFeedItem();
    setItem(next);
    startedAtRef.current = Date.now();
    setTimeLeft(next?.timeLimitSeconds ?? 0);
  }, []);

  useEffect(() => {
    async function loadFirst() {
      setItem(undefined);
      setError(null);
      const next = initialChallengeId
        ? await getFeedItemForChallenge(initialChallengeId)
        : await getNextFeedItem();
      setItem(next);
      startedAtRef.current = Date.now();
      setTimeLeft(next?.timeLimitSeconds ?? 0);
    }
    loadFirst();
    // Only the very first load should target a specific challenge — Next/Skip
    // after that fall back to the normal random feed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown; auto-skip to the next item when time runs out. Video recording
  // manages its own internal timer (consent + record + review + upload can
  // easily run past a normal answer window) so it opts out of this one.
  useEffect(() => {
    if (!item) return;
    if (item.templateType === "VIDEO_RECORDING") return;
    if (timeLeft <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadNext();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [item, timeLeft, loadNext]);

  async function handleSubmit(answer: unknown) {
    if (!item) return;
    const timeTakenMs = Date.now() - startedAtRef.current;
    const result = await submitAnswer({
      itemId: item.itemId,
      challengeId: item.challengeId,
      answer,
      timeTakenMs,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFeedback({
      creditsEarned: result.creditsEarned,
      itemResponseCount: result.itemResponseCount,
      targetResponsesPerItem: result.targetResponsesPerItem,
    });
    setStreak((s) => s + 1);
    adjust(result.creditsEarned);
  }

  if (item === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-black/40 dark:text-white/40">
        Loading…
      </div>
    );
  }

  if (item === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-xl font-medium">
          {targeted ? "Can't jump into that one." : "You're all caught up."}
        </p>
        <p className="text-black/50 dark:text-white/50">
          {targeted
            ? "It's already full, it's yours, or you've already answered it."
            : "No open challenges right now — post one and be the first in line."}
        </p>
        {targeted && (
          <button
            onClick={loadNext}
            className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-6 py-3 font-semibold active:scale-95 transition"
          >
            Browse the feed instead
          </button>
        )}
        <a
          href="/create"
          className="rounded-full bg-orange-500 hover:bg-orange-600 px-6 py-3 font-semibold text-white active:scale-95 transition"
        >
          Post a challenge
        </a>
      </div>
    );
  }

  if (feedback) {
    const pct = Math.round((feedback.itemResponseCount / feedback.targetResponsesPerItem) * 100);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-4xl">✅</p>
        <p className="text-xl font-semibold">+{feedback.creditsEarned} credit</p>
        <p className="text-black/50 dark:text-white/50">
          You&apos;re response #{feedback.itemResponseCount} of {feedback.targetResponsesPerItem} on this one ({pct}%
          full)
        </p>
        {streak > 1 && <p className="text-sm text-orange-500 font-medium">🔥 {streak} in a row</p>}
        <button
          onClick={loadNext}
          className="mt-2 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-6 py-3 font-semibold active:scale-95 transition"
        >
          Next
        </button>
      </div>
    );
  }

  const Capture = CAPTURE_COMPONENTS[item.templateType];

  async function sendReport(reason: string) {
    if (!item) return;
    await flagContent({ targetType: "CHALLENGE", targetId: item.challengeId, reason });
    setReporting(false);
    setReportSent(true);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex items-center justify-between px-4 py-2 text-sm">
        <span className="font-medium">
          {item.templateType === "VIDEO_RECORDING" ? "" : `${timeLeft}s`}
        </span>
        <div className="flex items-center gap-3">
          {reportSent ? (
            <span className="text-xs text-blue-600 dark:text-blue-400">Reported</span>
          ) : (
            <button
              onClick={() => setReporting((r) => !r)}
              className="text-black/30 dark:text-white/30 hover:text-red-500 text-xs underline underline-offset-2"
            >
              Report
            </button>
          )}
        </div>
        {reporting && (
          <div className="absolute right-4 top-full mt-1 z-10 w-56 rounded-lg border border-black/10 dark:border-white/15 bg-white dark:bg-black shadow-lg p-2 flex flex-col gap-1">
            <p className="px-2 pt-1 pb-2 text-xs text-black/50 dark:text-white/50">What&apos;s wrong with this?</p>
            {["Inappropriate", "Broken / confusing", "Spam"].map((reason) => (
              <button
                key={reason}
                onClick={() => sendReport(reason)}
                className="rounded px-2 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                {reason}
              </button>
            ))}
            <button
              onClick={() => setReporting(false)}
              className="rounded px-2 py-1.5 text-left text-sm text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      {item.templateType !== "VIDEO_RECORDING" && (
        <div className="h-1 w-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full bg-blue-500 transition-[width] duration-1000 ease-linear"
            style={{ width: `${(timeLeft / item.timeLimitSeconds) * 100}%` }}
          />
        </div>
      )}
      {error && (
        <p className="mx-4 mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
      )}
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <Capture item={item} onSubmit={handleSubmit} />
      </div>
      <div className="flex justify-center pb-6">
        <button
          onClick={loadNext}
          className="text-sm text-black/40 dark:text-white/40 underline underline-offset-2"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
