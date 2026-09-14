import { notFound } from "next/navigation";
import { getChallengeResults } from "@/app/actions";
import { drawingStrokes, formatAnswerSummary, videoAnswerUrl } from "@/lib/templates/format";
import type { TemplateType } from "@/lib/templates/types";

export default async function ChallengeResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await getChallengeResults(id);
  if (!challenge) notFound();

  const totalSubmissions = challenge.items.reduce((sum, i) => sum + i.submissions.length, 0);
  const totalTarget = challenge.items.length * challenge.targetResponsesPerItem;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-2xl font-bold">{challenge.prompt}</h1>
        <span
          className={`shrink-0 text-xs rounded-full px-2 py-1 ${
            challenge.status === "COMPLETED"
              ? "bg-blue-400/20 text-blue-600 dark:text-blue-400"
              : "bg-black/10 dark:bg-white/10"
          }`}
        >
          {challenge.status.toLowerCase()}
        </span>
      </div>
      <p className="text-sm text-black/50 dark:text-white/50 mb-6">
        {totalSubmissions} / {totalTarget} responses · {challenge.templateType.toLowerCase()} ·{" "}
        {challenge.items.length} item(s)
      </p>

      <a
        href={`/api/challenges/${challenge.id}/export`}
        className="inline-block mb-6 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-5 py-2.5 text-sm font-semibold active:scale-95 transition"
      >
        Export JSON
      </a>

      <div className="flex flex-col gap-4">
        {challenge.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-black/10 dark:border-white/15 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-black/50 dark:text-white/50 truncate max-w-xs">
                {item.mediaUrl ?? item.textContent}
              </span>
              <span className="text-xs text-black/40 dark:text-white/40 shrink-0">
                {item.submissions.length} / {challenge.targetResponsesPerItem}
              </span>
            </div>
            {item.mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.mediaUrl} alt="" className="max-h-40 rounded mb-3" />
            )}
            {item.submissions.length === 0 ? (
              <p className="text-sm text-black/40 dark:text-white/40">No responses yet.</p>
            ) : challenge.templateType === "FREEFORM_DRAWING" ? (
              <div className="flex flex-wrap gap-2">
                {item.submissions.map((s) => (
                  <DrawingThumb key={s.id} raw={s.answer} title={new Date(s.createdAt).toLocaleString()} />
                ))}
              </div>
            ) : challenge.templateType === "VIDEO_RECORDING" ? (
              <div className="flex flex-wrap gap-2">
                {item.submissions.map((s) => {
                  const url = videoAnswerUrl(s.answer);
                  return url ? (
                    <video key={s.id} src={url} controls playsInline className="h-32 rounded bg-black" />
                  ) : (
                    <span key={s.id} className="text-xs text-red-500">
                      broken recording
                    </span>
                  );
                })}
              </div>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {item.submissions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded bg-black/5 dark:bg-white/10 px-2 py-1 text-xs font-mono"
                    title={new Date(s.createdAt).toLocaleString()}
                  >
                    {formatAnswerSummary(challenge.templateType as TemplateType, s.answer)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DrawingThumb({ raw, title }: { raw: string; title: string }) {
  const strokes = drawingStrokes(raw);
  if (!strokes) return <span className="text-xs text-red-500">broken sketch</span>;
  return (
    <svg
      viewBox="0 0 100 100"
      aria-label={title}
      className="h-20 w-20 rounded border border-black/10 dark:border-white/15 bg-white"
    >
      {strokes.map((stroke, i) => (
        <polyline
          key={i}
          points={stroke.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")}
          fill="none"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
