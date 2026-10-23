import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { strokesToPath, cleanStrokes } from "@/lib/drawing";
import { DOODLE_COLORS, isDoodleColor } from "@/lib/doodle-colors";
import { startOfUtcDay } from "@/lib/powerups";
import { banDrawingArtistAction, getDrawingsForAdmin, setDrawingStatusAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminDrawingsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const drawings = await getDrawingsForAdmin();
  const dayStart = startOfUtcDay(new Date()).getTime();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Background drawings</h1>
        <Link href="/admin" className="text-sm text-black/50 dark:text-white underline">
          Back to moderation
        </Link>
      </div>
      <p className="mb-6 text-sm text-black/50 dark:text-white">
        Newest 150, every status. Only today&apos;s (UTC) active drawings are shown to visitors. Flagged ones were
        hidden after enough reports.
      </p>
      {drawings.length === 0 ? (
        <p className="text-black/50 dark:text-white">No drawings yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {drawings.map((d) => {
            const strokes = cleanStrokes(JSON.parse(d.strokes));
            const live = d.status === "ACTIVE" && d.createdAt.getTime() >= dayStart;
            return (
              <li key={d.id} className="flex flex-col gap-2 card p-2">
                <div className="aspect-square overflow-hidden rounded bg-[#1e293b]">
                  {strokes && isDoodleColor(d.color) && (
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                      <path
                        d={strokesToPath(strokes)}
                        fill="none"
                        stroke={DOODLE_COLORS[d.color]}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-black/50 dark:text-white">
                  <span
                    className={`mr-1 rounded-full px-2 py-0.5 ${
                      d.status === "ACTIVE"
                        ? "bg-blue-400/20 text-blue-600 dark:text-blue-400"
                        : d.status === "FLAGGED"
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                          : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {d.status.toLowerCase()}
                  </span>
                  {live ? "showing" : d.status === "ACTIVE" ? "expired" : ""}
                  <div className="mt-1">
                    {d._count.reports} report(s) · {d.createdAt.toLocaleString()}
                  </div>
                  <div>
                    by{" "}
                    <Link href={`/admin/users/${d.creator.id}`} className="underline">
                      {d.creator.username ?? d.creator.id.slice(0, 8)}
                    </Link>
                    {d.creator.isBanned && <span className="ml-1 text-red-500">(banned)</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  {d.status === "REMOVED" ? (
                    <form action={setDrawingStatusAction.bind(null, d.id, "ACTIVE")}>
                      <button className="text-blue-600 dark:text-blue-400 underline">Restore</button>
                    </form>
                  ) : (
                    <>
                      {d.status === "FLAGGED" && (
                        <form action={setDrawingStatusAction.bind(null, d.id, "ACTIVE")}>
                          <button className="text-blue-600 dark:text-blue-400 underline">Approve</button>
                        </form>
                      )}
                      <form action={setDrawingStatusAction.bind(null, d.id, "REMOVED")}>
                        <button className="text-red-500 underline">Remove</button>
                      </form>
                    </>
                  )}
                  {!d.creator.isBanned && !d.creator.isAdmin && (
                    <form action={banDrawingArtistAction.bind(null, d.id)}>
                      <button className="text-red-500 underline">Ban artist</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
