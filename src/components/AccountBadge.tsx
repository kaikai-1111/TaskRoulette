"use client";

import Link from "next/link";
import { useIdentity } from "@/components/IdentityProvider";
import { initialOf } from "@/lib/display-name";

export default function AccountBadge() {
  const { identity } = useIdentity();
  const name = identity?.displayName ?? identity?.username ?? null;

  return (
    <Link href="/account" className="flex shrink-0 items-center gap-1.5 group">
      {identity?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={identity.avatarUrl}
          alt=""
          className="h-6 w-6 rounded-full object-cover border border-black/10 dark:border-white/15"
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 dark:bg-orange-400 text-white text-xs font-semibold">
          {initialOf(name)}
        </span>
      )}
      {name && (
        <span className="hidden md:inline text-sm text-black/60 dark:text-white group-hover:underline whitespace-nowrap max-w-[10rem] truncate">
          {name}
        </span>
      )}
    </Link>
  );
}
