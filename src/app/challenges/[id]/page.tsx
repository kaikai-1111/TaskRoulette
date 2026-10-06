import { notFound } from "next/navigation";
import { getChallengeResults } from "@/app/actions";
import { drawingStrokes, formatAnswerSummary, photoAnswerUrl, videoAnswerUrl } from "@/lib/templates/format";
import { aggregateSurvey, type QuestionResult } from "@/lib/templates/survey";
import { summarizeRatings } from "@/lib/templates/rating";
import type { RatingConfig, SurveyConfig, TemplateType } from "@/lib/templates/types";

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
      <p className="text-sm text-black/50 dark:text-white mb-6">
        {totalSubmissions} / {totalTarget} responses · {challenge.templateType.toLowerCase()} ·{" "}
        {challenge.purpose.toLowerCase()} · {challenge.items.length} item(s)
      </p>

      <a
        href={`/api/challenges/${challenge.id}/export`}
        className="inline-block mb-6 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white px-5 py-2.5 text-sm font-semibold active:scale-95 transition"
      >
        Export JSON
      </a>
      {challenge.templateType === "SURVEY" && (
        <a
          href={`/api/challenges/${challenge.id}/export?format=csv`}
          className="inline-block mb-6 ml-2 rounded-full border border-black/10 dark:border-white/15 px-5 py-2.5 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition"
        >
          Export CSV
        </a>
      )}

      {challenge.templateType === "SURVEY" ? (
        <SurveyResults
          results={aggregateSurvey(
            JSON.parse(challenge.config) as SurveyConfig,
            challenge.items.flatMap((i) => i.submissions.map((s) => s.answer))
          )}
          respondents={totalSubmissions}
        />
      ) : (
      <div className="flex flex-col gap-4">
        {challenge.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-black/10 dark:border-white/15 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-black/50 dark:text-white truncate max-w-xs">
                {item.mediaUrl ?? item.textContent}
              </span>
              <span className="text-xs text-black/40 dark:text-white shrink-0">
                {item.submissions.length} / {challenge.targetResponsesPerItem}
              </span>
            </div>
            {item.mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.mediaUrl} alt="" className="max-h-40 rounded mb-3" />
            )}
            {item.submissions.length === 0 ? (
              <p className="text-sm text-black/40 dark:text-white">No responses yet.</p>
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
            ) : challenge.templateType === "RATING" ? (
              <RatingResults
                summary={summarizeRatings(
                  JSON.parse(challenge.config) as RatingConfig,
                  item.submissions.map((s) => s.answer)
                )}
              />
            ) : challenge.templateType === "PHOTO_CAPTURE" ? (
              <div className="flex flex-wrap gap-2">
                {item.submissions.map((s) => {
                  const url = photoAnswerUrl(s.answer);
                  return url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={s.id} src={url} alt="" className="h-32 rounded object-cover" />
                  ) : (
                    <span key={s.id} className="text-xs text-red-500">
                      broken photo
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
      )}
    </div>
  );
}

function RatingResults({ summary }: { summary: ReturnType<typeof summarizeRatings> }) {
  const max = Math.max(1, ...summary.distribution.map((d) => d.count));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        <span className="text-2xl font-semibold tabular-nums">
          {summary.average === null ? "—" : summary.average.toFixed(2)}
        </span>{" "}
        <span className="text-black/50 dark:text-white">
          average from {summary.count} rating{summary.count === 1 ? "" : "s"}
        </span>
      </p>
      <ul className="flex flex-col gap-1">
        {summary.distribution.map((d) => (
          <li key={d.value} className="flex items-center gap-2 text-xs">
            <span className="w-6 text-right tabular-nums">{d.value}</span>
            <div className="h-1.5 flex-1 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${(d.count / max) * 100}%` }} />
            </div>
            <span className="w-6 tabular-nums text-black/50 dark:text-white">{d.count}</span>
          </li>
        ))}
      </ul>
      {summary.comments.length > 0 && (
        <ul className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
          {summary.comments.map((c, i) => (
            <li key={i} className="rounded bg-black/5 dark:bg-white/10 px-2 py-1 text-sm whitespace-pre-wrap">
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SurveyResults({ results, respondents }: { results: QuestionResult[]; respondents: number }) {
  if (respondents === 0) {
    return <p className="text-sm text-black/40 dark:text-white">No responses yet.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {results.map((r, i) => {
        const max = Math.max(1, ...(r.counts ?? []).map((c) => c.count));
        return (
          <div key={r.question.id} className="rounded-lg border border-black/10 dark:border-white/15 p-4">
            <p className="font-medium text-sm">
              {i + 1}. {r.question.text}
            </p>
            <p className="mb-3 text-xs text-black/40 dark:text-white">
              {r.answered} of {respondents} answered
              {r.average !== undefined && ` · average ${r.average.toFixed(2)} / ${r.question.scaleMax ?? 5}`}
            </p>

            {r.counts && (
              <ul className="flex flex-col gap-1.5">
                {r.counts.map((c) => (
                  <li key={c.label} className="text-xs">
                    <div className="flex justify-between">
                      <span className="truncate pr-2">{c.label}</span>
                      <span className="text-black/50 dark:text-white">
                        {c.count}
                        {r.answered > 0 && ` (${Math.round((c.count / r.answered) * 100)}%)`}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${(c.count / max) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {r.texts && (
              <ul className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                {r.texts.length === 0 && <li className="text-xs text-black/40 dark:text-white">No answers.</li>}
                {r.texts.map((t, n) => (
                  <li key={n} className="rounded bg-black/5 dark:bg-white/10 px-2 py-1 text-sm whitespace-pre-wrap">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
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
