import { NextResponse } from "next/server";
import { getChallengeResults } from "@/app/actions";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challenge = await getChallengeResults(id);
  if (!challenge) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const payload = {
    id: challenge.id,
    prompt: challenge.prompt,
    templateType: challenge.templateType,
    category: challenge.category,
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
