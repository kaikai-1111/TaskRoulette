"use client";

import { useActionState } from "react";
import { banUserAction } from "@/app/admin/actions";

export default function BanUserForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(banUserAction.bind(null, userId), null);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        name="reason"
        rows={2}
        maxLength={500}
        placeholder="Reason (shown to the banned user)"
        className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="removeChallenges" defaultChecked />
        Also take down their active challenges
      </label>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-red-500 hover:bg-red-600 px-5 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Banning…" : "🔨 Ban hammer"}
      </button>
    </form>
  );
}
