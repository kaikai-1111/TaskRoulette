import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { formatAnswerSummary } from "@/lib/templates/format";
import {
  adminLogoutAction,
  getOpenFlags,
  removeChallengeAction,
  removeSubmissionAction,
  resolveFlagAction,
} from "@/app/admin/actions";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const flags = await getOpenFlags();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Moderation queue</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/challenges" className="text-black/50 dark:text-white/50 underline">
            All challenges
          </Link>
          <form action={adminLogoutAction}>
            <button className="text-black/50 dark:text-white/50 underline">Log out</button>
          </form>
        </div>
      </div>

      {flags.length === 0 ? (
        <p className="text-black/50 dark:text-white/50">No open flags. All clear.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {flags.map((flag) => (
            <li key={flag.id} className="rounded-lg border border-black/10 dark:border-white/15 p-4">
              <div className="flex items-center justify-between text-xs text-black/40 dark:text-white/40 mb-2">
                <span>{flag.targetType}</span>
                <span>{new Date(flag.createdAt).toLocaleString()}</span>
              </div>

              <p className="text-sm mb-3">
                <span className="font-medium">Reason:</span> {flag.reason}
              </p>

              {flag.challenge && (
                <div className="rounded bg-black/5 dark:bg-white/10 p-3 mb-3 text-sm">
                  <p className="font-medium">{flag.challenge.prompt}</p>
                  <p className="text-black/50 dark:text-white/50 text-xs mt-1">
                    {flag.challenge.templateType.toLowerCase()} · status {flag.challenge.status.toLowerCase()} ·
                    posted by {flag.challenge.creator.displayName ?? flag.challenge.creator.id.slice(0, 8)}
                  </p>
                </div>
              )}

              {flag.submission && (
                <div className="rounded bg-black/5 dark:bg-white/10 p-3 mb-3 text-sm">
                  <p className="font-medium">{flag.submission.challenge.prompt}</p>
                  <p className="text-black/70 dark:text-white/70 font-mono text-xs mt-1">
                    answer: {formatAnswerSummary(flag.submission.challenge.templateType, flag.submission.answer)}
                  </p>
                  <p className="text-black/50 dark:text-white/50 text-xs mt-1">
                    status {flag.submission.status.toLowerCase()} · submitted by{" "}
                    {flag.submission.submitter.displayName ?? flag.submission.submitter.id.slice(0, 8)}
                  </p>
                </div>
              )}

              <div className="flex gap-2 text-sm">
                <form action={resolveFlagAction.bind(null, flag.id)}>
                  <button className="rounded-full border border-black/10 dark:border-white/15 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                    Dismiss flag
                  </button>
                </form>
                {flag.challenge && flag.challenge.status !== "REMOVED" && (
                  <form action={removeChallengeAction.bind(null, flag.challenge.id)}>
                    <button className="rounded-full border border-red-500/30 text-red-500 px-3 py-1.5 hover:bg-red-500/10">
                      Remove challenge
                    </button>
                  </form>
                )}
                {flag.submission && flag.submission.status !== "REMOVED" && (
                  <form action={removeSubmissionAction.bind(null, flag.submission.id)}>
                    <button className="rounded-full border border-red-500/30 text-red-500 px-3 py-1.5 hover:bg-red-500/10">
                      Remove submission
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
