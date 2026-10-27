"use client";

import { useCallback, useEffect, useState } from "react";
import {
  activatePowerUp,
  buyPowerUp,
  claimDailyAward,
  getRewardsStatus,
  type ClaimResult,
  type RewardsStatus,
} from "@/app/rewards/actions";
import { useCredits } from "@/components/CreditsProvider";
import { POWERUP_LABELS, POWERUP_SHOP, formatDuration } from "@/lib/powerups";

function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function RewardsPage() {
  const { refresh: refreshBalances } = useCredits();
  const [status, setStatus] = useState<RewardsStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getRewardsStatus().then(setStatus);
    refreshBalances();
  }, [refreshBalances]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // The claim window reopens at UTC midnight — flip the button on without a reload.
  useEffect(() => {
    if (status && !status.canClaim && now >= status.nextClaimAt) load();
  }, [now, status, load]);

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    setBusy(key);
    setError(null);
    setMessage(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) setError(res.error ?? "Something went wrong.");
    else if (success) setMessage(success);
    load();
  }

  async function handleClaim() {
    setBusy("claim");
    setError(null);
    setMessage(null);
    const res: ClaimResult = await claimDailyAward();
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
    } else {
      const base = `+${res.amount} ${res.kind === "TOKENS" ? "tokens" : "credits"}`;
      setMessage(
        res.bonus
          ? `${base}, plus a bonus power-up: ${POWERUP_LABELS[res.bonus.kind].name} for ${formatDuration(res.bonus.durationSeconds)}!`
          : base
      );
    }
    load();
  }

  if (!status) {
    return <div className="mx-auto w-full max-w-lg px-4 py-8 text-black/40 dark:text-white">Loading…</div>;
  }

  const actives = [
    { kind: "INFINITE_CREDITS" as const, until: status.freeCreditsUntil },
    { kind: "INFINITE_TOKENS" as const, until: status.freeTokensUntil },
  ].filter((a) => a.until !== null && a.until > now);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Rewards</h1>
        <p className="text-sm text-black/50 dark:text-white">
          You have {status.credits} credits and {status.tokens} tokens. Every answer earns 1 of each.
          Credits pay for posting your own tasks. Tokens buy models.
        </p>
      </div>

      {(message || error) && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            error ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
          }`}
        >
          {error ?? message}
        </p>
      )}

      <section className="card p-4 flex flex-col gap-3">
        <h2 className="font-semibold">Daily award</h2>
        {status.canClaim ? (
          <>
            <p className="text-sm text-black/60 dark:text-white">
              Today&apos;s reward:{" "}
              <span className="font-semibold">
                +{status.nextAmount} {status.nextKind === "TOKENS" ? "tokens" : "credits"}
              </span>
              . Small chance of a bonus power-up too.
            </p>
            <button
              onClick={handleClaim}
              disabled={busy !== null}
              className="self-start btn btn-orange px-6 py-2.5 font-semibold text-white disabled:opacity-40 active:scale-95 transition"
            >
              {busy === "claim" ? "Claiming…" : "Claim"}
            </button>
          </>
        ) : (
          <p className="text-sm text-black/60 dark:text-white">
            Already claimed today. Next one in{" "}
            <span className="font-mono font-semibold">{countdown(status.nextClaimAt - now)}</span>:{" "}
            <span className="font-semibold">
              +{status.nextAmount} {status.nextKind === "TOKENS" ? "tokens" : "credits"}
            </span>
            .
          </p>
        )}
      </section>

      {actives.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Running now</h2>
          {actives.map((a) => (
            <div
              key={a.kind}
              className="flex items-center justify-between rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-semibold">{POWERUP_LABELS[a.kind].name}</span>{" "}
                <span className="text-black/50 dark:text-white">{POWERUP_LABELS[a.kind].blurb}</span>
              </span>
              <span className="font-mono font-semibold shrink-0 ml-3">{countdown(a.until! - now)}</span>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Your power-ups</h2>
        {status.inventory.length === 0 ? (
          <p className="text-sm text-black/40 dark:text-white">
            None yet. They drop from daily awards, or you can buy one below.
          </p>
        ) : (
          status.inventory.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between card px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {POWERUP_LABELS[p.kind].name} · {formatDuration(p.durationSeconds)}
                </p>
                <p className="text-xs text-black/50 dark:text-white">
                  {POWERUP_LABELS[p.kind].blurb} Activating while one is running adds time.
                </p>
              </div>
              <button
                onClick={() => run(p.id, () => activatePowerUp(p.id), `${POWERUP_LABELS[p.kind].name} activated.`)}
                disabled={busy !== null}
                className="shrink-0 ml-3 btn px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy === p.id ? "…" : "Activate"}
              </button>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Power-up shop</h2>
        <p className="text-xs text-black/50 dark:text-white">
          Shop items always cost real balance, even while an infinite power-up is running.
        </p>
        {POWERUP_SHOP.map((item) => {
          const balance = item.currency === "CREDITS" ? status.credits : status.tokens;
          const unit = item.currency === "CREDITS" ? "credits" : "tokens";
          return (
            <div
              key={item.id}
              className="flex items-center justify-between card px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {POWERUP_LABELS[item.kind].name} · {formatDuration(item.durationSeconds)}
                </p>
                <p className="text-xs text-black/50 dark:text-white">{POWERUP_LABELS[item.kind].blurb}</p>
              </div>
              <button
                onClick={() => run(item.id, () => buyPowerUp(item.id), "Added to your power-ups.")}
                disabled={busy !== null || balance < item.price}
                className="shrink-0 ml-3 btn btn-ghost px-4 py-1.5 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
              >
                {busy === item.id ? "…" : `${item.price} ${unit}`}
              </button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
