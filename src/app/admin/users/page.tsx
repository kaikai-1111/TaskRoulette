import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { getUsers } from "@/app/admin/actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const { q } = await searchParams;
  const users = await getUsers(q);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="text-black/50 dark:text-white underline">
            Moderation queue
          </Link>
          <Link href="/admin/challenges" className="text-black/50 dark:text-white underline">
            All challenges
          </Link>
          <Link href="/admin/admins" className="text-black/50 dark:text-white underline">
            Admins
          </Link>
        </div>
      </div>

      <form className="flex gap-2 mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search username, name, or email"
          className="flex-1 rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-4 py-1.5 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      {users.length === 0 ? (
        <p className="text-black/50 dark:text-white">No accounts{q ? " match that search" : " yet"}.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-black/10 dark:border-white/15 px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  @{u.username}
                </Link>
                {u.isAdmin && (
                  <span className="ml-2 text-xs rounded-full px-2 py-0.5 bg-orange-500/20 text-orange-600 dark:text-orange-400">
                    admin
                  </span>
                )}
                <p className="text-xs text-black/50 dark:text-white truncate">
                  {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : "no name on file yet"} ·{" "}
                  {u.email}
                </p>
              </div>
              <span className="shrink-0 text-xs text-black/40 dark:text-white">
                {new Date(u.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
