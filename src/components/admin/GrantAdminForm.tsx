"use client";

import { useActionState } from "react";
import { grantAdminAction } from "@/app/admin/actions";

export default function GrantAdminForm() {
  const [state, formAction, pending] = useActionState(grantAdminAction, null);

  return (
    <form action={formAction} className="flex gap-2">
      <input
        type="text"
        name="username"
        placeholder="username"
        required
        className="flex-1 rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Adding…" : "Make admin"}
      </button>
      {state?.error && <p className="text-sm text-red-500 self-center">{state.error}</p>}
    </form>
  );
}
