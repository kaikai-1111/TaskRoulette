"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { attestAge, getAgeAttested } from "@/app/account/actions";

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [attested, setAttested] = useState<boolean | undefined>(undefined);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const bypass = pathname?.startsWith("/admin") || pathname === "/terms";

  useEffect(() => {
    if (bypass) return;
    getAgeAttested().then(setAttested);
  }, [bypass]);

  if (bypass || attested === true) return <>{children}</>;

  if (attested === undefined) {
    return <div className="flex flex-1" />;
  }

  async function handleContinue() {
    setSubmitting(true);
    await attestAge();
    setSubmitting(false);
    setAttested(true);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center gap-4">
      <p className="text-xl font-semibold">Before you jump in</p>
      <label className="flex items-start gap-2 max-w-xs text-left text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1"
        />
        <span>
          I&apos;m 13 or older and agree that my submissions may be used as training/derived data,
          per the{" "}
          <Link href="/terms" className="underline">
            terms
          </Link>
          .
        </span>
      </label>
      <button
        onClick={handleContinue}
        disabled={!checked || submitting}
        className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition"
      >
        {submitting ? "…" : "Continue"}
      </button>
    </div>
  );
}
