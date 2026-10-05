import { NextResponse } from "next/server";
import { getChallengeResults } from "@/app/actions";
import { surveyToCsv } from "@/lib/templates/survey";
import type { SurveyConfig } from "@/lib/templates/types";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challenge = await getChallengeResults(id);
  if (!challenge) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Survey creators usually want a spreadsheet: one row per respondent.
  if (challenge.templateType === "SURVEY" && new URL(req.url).searchParams.get("format") === "csv") {
    const csv = surveyToCsv(
      JSON.parse(challenge.config) as SurveyConfig,
      challenge.items.flatMap((i) => i.submissions.map((s) => ({ answer: s.answer, createdAt: s.createdAt })))
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="survey-${challenge.id}.csv"`,
      },
    });
  }

  const payload = {
    id: challenge.id,
    prompt: challenge.prompt,
    templateType: challenge.templateType,
    category: challenge.category,
    purpose: challenge.purpose,
    config: JSON.parse(challenge.config),
    status: challenge.status,
    items: challenge.items.map((item) => ({
      id: item.id,
      mediaUrl: item.mediaUrl,
      textContent: item.textContent,
      submissions: item.submissions.map((s) => ({
        answer: JSON.parse(s.answer),
        timeTakenMs: s.timeTakenMs,
        createdAt: s.createdAt,
      })),
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="challenge-${challenge.id}.json"`,
    },
  });
}
