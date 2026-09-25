"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAccountStats,
  getAccountStatus,
  regenerateRecoveryCode,
  updateDisplayName,
} from "@/app/account/actions";
import CreateAccountForm from "@/components/CreateAccountForm";

type Status = {
  email: string | null;
  username: string | null;
  displayName: string | null;
  credits: number;
  hasAccount: boolean;
};

type Stats = {
  challengesPosted: number;
  submissionsGiven: number;
  creditsEarned: number;
  creditsSpent: number;
  memberSince: Date;
};

export default function AccountPage() {
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [stats, setStats] = useState<Stats | undefined>(undefined);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    setRegenerating(true);
    const result = await regenerateRecoveryCode();
    setRegenerating(false);
    if (result.ok) setNewRecoveryCode(result.recoveryCode);
  }

  useEffect(() => {
    getAccountStatus().then((s) => {
      setStatus(s);
      setNameInput(s.displayName ?? "");
    });
    getAccountStats().then(setStats);
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);
    setSavingName(true);
    const result = await updateDisplayName(nameInput);
    setSavingName(false);
    if (!result.ok) {
      setNameError(result.error);
      return;
    }
    setStatus((s) => (s ? { ...s, displayName: nameInput.trim() } : s));
    setEditingName(false);
  }

  if (status === undefined) {
    return <div className="mx-auto w-full max-w-sm px-4 py-8 text-black/40 dark:text-white/40">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Account</h1>
      <p className="text-sm text-black/50 dark:text-white/50 mb-6">
        {status.credits} credits on this device.
      </p>

      {!status.hasAccount ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-black/60 dark:text-white/60">
            Doing challenges never requires an account. Create one if you want to post
            challenges, or to carry your credits to another device.
          </p>
          <CreateAccountForm
            onCreated={() =>
              setStatus((s) => (s ? { ...s, hasAccount: true } : s))
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            {editingName ? (
              <form onSubmit={handleSaveName} className="flex flex-col gap-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Display name</span>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
                  />
                </label>
                {nameError && <p className="text-sm text-red-500">{nameError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingName}
                    className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {savingName ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(false);
                      setNameInput(status.displayName ?? "");
                      setNameError(null);
                    }}
                    className="rounded-full border border-black/10 dark:border-white/15 px-4 py-1.5 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{status.displayName}</p>
                  <p className="text-sm text-black/50 dark:text-white/50">
                    @{status.username} · {status.email}
                  </p>
                </div>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 underline shrink-0"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Challenges posted" value={stats.challengesPosted} />
              <Stat label="Responses given" value={stats.submissionsGiven} />
              <Stat label="Credits earned" value={stats.creditsEarned} />
              <Stat label="Credits spent" value={stats.creditsSpent} />
              <Stat
                label="Member since"
                value={new Date(stats.memberSince).toLocaleDateString()}
                wide
              />
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-black/10 dark:border-white/15 pt-4">
            {newRecoveryCode ? (
              <>
                <p className="text-sm">
                  Save this recovery code somewhere safe — it&apos;s shown{" "}
                  <span className="font-semibold">only once</span>.
                </p>
                <div className="rounded-lg bg-black/5 dark:bg-white/10 px-4 py-3 text-center font-mono text-lg tracking-wide select-all">
                  {newRecoveryCode}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-black/50 dark:text-white/50">
                  Lost your recovery code? Generating a new one invalidates the old code.
                </p>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="self-start text-sm text-blue-600 dark:text-blue-400 underline disabled:opacity-40"
                >
                  {regenerating ? "Generating…" : "Generate a new recovery code"}
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-black/40 dark:text-white/40">
            Signing in on another device?{" "}
            <Link href="/restore" className="underline">
              Restore your account there
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-black/5 dark:bg-white/10 px-3 py-2 ${wide ? "col-span-2" : ""}`}>
      <p className="text-xs text-black/50 dark:text-white/50">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
