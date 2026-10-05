"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useIdentity } from "@/components/IdentityProvider";

// Full-page block for banned devices. The real enforcement is server-side
// (getActiveUser and the upload routes) — this just stops a banned visitor
// from being shown an app that will refuse everything they try.
export default function BanGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { identity } = useIdentity();

  if (pathname === "/terms") return <>{children}</>;
  if (identity === null || !identity.isBanned) return <>{children}</>;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-4xl">🔨</p>
      <p className="text-xl font-semibold">You&apos;ve been banned</p>
      {identity.banReason && (
        <p className="max-w-sm rounded-lg bg-black/5 dark:bg-white/10 px-4 py-3 text-sm">
          {identity.banReason}
        </p>
      )}
      <p className="max-w-sm text-sm text-black/50 dark:text-white">
        You can&apos;t answer, post, or upload while banned. If you think this is a mistake,
        contact the person who runs this site.
      </p>
      <Link href="/terms" className="text-xs text-black/40 dark:text-white underline">
        Terms
      </Link>
    </div>
  );
}
