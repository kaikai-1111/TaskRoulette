import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { getUserDetail, unbanUserAction } from "@/app/admin/actions";
import BanUserForm from "@/components/admin/BanUserForm";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  const fullName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{user.username ? `@${user.username}` : `Anonymous ${user.id.slice(0, 8)}`}</h1>
        <Link href="/admin/users" className="text-sm text-black/50 dark:text-white underline">
          All users
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 dark:bg-orange-400 text-white text-xl font-semibold">
            {(user.username ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="font-semibold">{fullName ?? <span className="text-black/40 dark:text-white">No name on file yet</span>}</p>
          <p className="text-sm text-black/50 dark:text-white">
            Display name: {user.displayName ?? "—"}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 mb-6 text-sm">
        <Detail label="Email" value={user.email ?? "—"} wide />
        <Detail label="Joined" value={new Date(user.createdAt).toLocaleString()} wide />
        <Detail label="Credits" value={String(user.credits)} />
        <Detail label="Role" value={user.isAdmin ? "Admin" : "Member"} />
        <Detail label="Challenges posted" value={String(user._count.challenges)} />
        <Detail label="Responses given" value={String(user._count.submissions)} />
        <Detail label="Sign-in methods" value={[user.hasPassword && "Password", user.hasGoogle && "Google"].filter(Boolean).join(", ") || "None"} />
        <Detail label="Age attested" value={user.ageAttested ? "Yes" : "No"} />
      </dl>

      <div className="mb-6 rounded-lg border border-black/10 dark:border-white/15 p-4">
        {user.isBanned ? (
          <>
            <p className="text-sm font-semibold text-red-500">
              Banned {user.bannedAt ? `on ${new Date(user.bannedAt).toLocaleDateString()}` : ""}
            </p>
            {user.banReason && <p className="mt-1 text-sm">&ldquo;{user.banReason}&rdquo;</p>}
            <p className="mt-1 text-xs text-black/50 dark:text-white">
              Unbanning lifts the block but doesn&apos;t reactivate challenges taken down with it.
            </p>
            <form action={unbanUserAction.bind(null, user.id)} className="mt-3">
              <button
                type="submit"
                className="rounded-full border border-black/10 dark:border-white/15 px-4 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              >
                Lift ban
              </button>
            </form>
          </>
        ) : user.isAdmin ? (
          <p className="text-sm text-black/50 dark:text-white">
            Admins can&apos;t be banned — revoke admin access on the Admins page first.
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm font-semibold">Ban this user</p>
            <p className="mb-3 text-xs text-black/50 dark:text-white">
              Blocks answering, posting, uploads and sign-in for this account/device. A new
              device or account can evade it, so it&apos;s a deterrent, not a wall.
            </p>
            <BanUserForm userId={user.id} />
          </>
        )}
      </div>

      <h2 className="text-sm font-semibold mb-2">Recent challenges</h2>
      {user.challenges.length === 0 ? (
        <p className="text-sm text-black/40 dark:text-white">None posted.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {user.challenges.map((c) => (
            <li key={c.id}>
              <Link
                href={`/challenges/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-black/10 dark:border-white/15 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="truncate">{c.prompt}</span>
                <span className="shrink-0 ml-3 text-xs text-black/40 dark:text-white">
                  {c.templateType.toLowerCase()} · {c.status.toLowerCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-black/5 dark:bg-white/10 px-3 py-2 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs text-black/50 dark:text-white">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}
