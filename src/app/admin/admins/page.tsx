import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { getAdmins, revokeAdminAction } from "@/app/admin/actions";
import GrantAdminForm from "@/components/admin/GrantAdminForm";

export default async function AdminAdminsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const admins = await getAdmins();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admins</h1>
        <Link href="/admin" className="text-sm text-black/50 dark:text-white underline">
          Moderation queue
        </Link>
      </div>

      <p className="text-sm text-black/50 dark:text-white mb-4">
        Enter the username of an existing account to grant it full admin access (moderation,
        posting without an account, and this page) — no password to share. They don&apos;t need
        to do anything on their end; it takes effect on their next action.
      </p>
      <GrantAdminForm />

      <ul className="flex flex-col gap-2 mt-6">
        {admins.length === 0 ? (
          <p className="text-sm text-black/40 dark:text-white">
            No account-based admins yet — only the shared ADMIN_PASSWORD.
          </p>
        ) : (
          admins.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-black/10 dark:border-white/15 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{a.displayName ?? a.username}</p>
                <p className="text-xs text-black/50 dark:text-white">
                  @{a.username} · {a.email}
                </p>
              </div>
              <form action={revokeAdminAction.bind(null, a.id)}>
                <button type="submit" className="text-sm text-red-500 underline">
                  Revoke
                </button>
              </form>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
