"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  changePassword,
  getAccountStats,
  getAccountStatus,
  setAvatarUrl,
  signOut,
  updateDisplayName,
} from "@/app/account/actions";
import CreateAccountForm from "@/components/CreateAccountForm";
import { useIdentity } from "@/components/IdentityProvider";
import { useCredits } from "@/components/CreditsProvider";

type Status = {
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
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
  const router = useRouter();
  const { refresh: refreshIdentity } = useIdentity();
  const { refresh: refreshCredits } = useCredits();
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [stats, setStats] = useState<Stats | undefined>(undefined);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setSavingPassword(true);
    const result = await changePassword(currentPasswordInput, newPasswordInput);
    setSavingPassword(false);
    if (!result.ok) {
      setPasswordError(result.error);
      return;
    }
    setCurrentPasswordInput("");
    setNewPasswordInput("");
    setChangingPassword(false);
    setPasswordChanged(true);
  }

  async function handleSignOut() {
    await signOut();
    refreshIdentity();
    refreshCredits();
    router.push("/");
    router.refresh();
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
    refreshIdentity();
  }

  async function handleAvatarSelected(file: File | undefined) {
    if (!file) return;
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/uploads/image", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Upload failed.");
      const result = await setAvatarUrl(body.url);
      if (!result.ok) throw new Error(result.error);
      setStatus((s) => (s ? { ...s, avatarUrl: body.url } : s));
      refreshIdentity();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Couldn't upload that photo — try again.");
    }
    setUploadingAvatar(false);
  }

  if (status === undefined) {
    return <div className="mx-auto w-full max-w-sm px-4 py-8 text-black/40 dark:text-white">Loading…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Account</h1>
      <p className="text-sm text-black/50 dark:text-white mb-6">
        {status.credits} credits on this device.
      </p>

      {!status.hasAccount ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-black/60 dark:text-white">
            Doing challenges never requires an account. Create one if you want to post
            challenges, or to carry your credits to another device.
          </p>
          <CreateAccountForm
            onCreated={() => {
              getAccountStatus().then((s) => {
                setStatus(s);
                setNameInput(s.displayName ?? "");
              });
              refreshIdentity();
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden disabled:opacity-50"
              title="Change photo"
            >
              {status.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={status.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-blue-600 dark:bg-orange-400 text-white text-xl font-semibold">
                  {(status.displayName ?? status.username ?? "?").trim().charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 text-white text-[10px] font-medium opacity-0 hover:opacity-100 transition">
                {uploadingAvatar ? "Uploading…" : "Change"}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                handleAvatarSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="self-start text-sm text-blue-600 dark:text-blue-400 underline disabled:opacity-40"
              >
                {uploadingAvatar ? "Uploading…" : "Change photo"}
              </button>
              {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
            </div>
          </div>

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
                  <p className="text-sm text-black/50 dark:text-white">
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
            {changingPassword ? (
              <form onSubmit={handleChangePassword} className="flex flex-col gap-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Current password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">New password</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="At least 8 characters"
                    className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2"
                  />
                </label>
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {savingPassword ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPassword(false);
                      setCurrentPasswordInput("");
                      setNewPasswordInput("");
                      setPasswordError(null);
                    }}
                    className="rounded-full border border-black/10 dark:border-white/15 px-4 py-1.5 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                {passwordChanged && <p className="text-sm text-blue-600 dark:text-blue-400">Password changed.</p>}
                <button
                  onClick={() => {
                    setChangingPassword(true);
                    setPasswordChanged(false);
                  }}
                  className="self-start text-sm text-blue-600 dark:text-blue-400 underline"
                >
                  Change password
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-black/40 dark:text-white">
            Signing in on another device?{" "}
            <Link href="/restore" className="underline">
              Sign in there
            </Link>
            .
          </p>

          <button
            onClick={handleSignOut}
            className="self-start text-sm text-red-500 underline"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-black/5 dark:bg-white/10 px-3 py-2 ${wide ? "col-span-2" : ""}`}>
      <p className="text-xs text-black/50 dark:text-white">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
