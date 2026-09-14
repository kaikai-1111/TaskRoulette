import Feed from "@/components/Feed";

export default async function TryChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Feed initialChallengeId={id} />;
}
