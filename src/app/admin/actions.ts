"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { adminLogout, attemptAdminLogin, isAdmin } from "@/lib/admin";

async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function adminLoginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const password = String(formData.get("password") ?? "");
  const ok = await attemptAdminLogin(password);
  if (!ok) return { error: "Wrong password." };
  redirect("/admin");
}

export async function adminLogoutAction() {
  await adminLogout();
  redirect("/admin/login");
}

export async function getOpenFlags() {
  await requireAdmin();
  return prisma.flag.findMany({
    where: { resolved: false },
    include: {
      challenge: { include: { creator: true } },
      submission: { include: { submitter: true, challenge: true } },
      reporter: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function resolveFlagAction(flagId: string) {
  await requireAdmin();
  await prisma.flag.update({ where: { id: flagId }, data: { resolved: true } });
  revalidatePath("/admin");
}

export async function removeChallengeAction(challengeId: string) {
  await requireAdmin();
  await prisma.$transaction([
    prisma.challenge.update({ where: { id: challengeId }, data: { status: "REMOVED" } }),
    prisma.flag.updateMany({ where: { challengeId }, data: { resolved: true } }),
  ]);
  revalidatePath("/admin");
}

export async function getAllChallenges() {
  await requireAdmin();
  return prisma.challenge.findMany({
    include: {
      creator: true,
      items: { select: { id: true, responseCount: true } },
      _count: { select: { submissions: true, flags: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function setChallengeStatusAction(challengeId: string, status: "ACTIVE" | "REMOVED") {
  await requireAdmin();
  await prisma.challenge.update({ where: { id: challengeId }, data: { status } });
  revalidatePath("/admin/challenges");
}

export async function getAdmins() {
  await requireAdmin();
  return prisma.user.findMany({
    where: { isAdmin: true },
    select: { id: true, username: true, displayName: true, email: true },
    orderBy: { username: "asc" },
  });
}

export async function grantAdminAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!username) return { error: "Enter a username." };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { error: `No account with username "${username}".` };
  if (user.isAdmin) return { error: `@${username} is already an admin.` };

  await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
  revalidatePath("/admin/admins");
  return null;
}

export async function revokeAdminAction(userId: string) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { isAdmin: false } });
  revalidatePath("/admin/admins");
}

export async function removeSubmissionAction(submissionId: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const submission = await tx.submission.findUniqueOrThrow({ where: { id: submissionId } });
    if (submission.status !== "REMOVED") {
      await tx.submission.update({ where: { id: submissionId }, data: { status: "REMOVED" } });
      // Free up the slot this bad submission was occupying, and reopen the
      // challenge if it had auto-completed on the strength of that submission.
      await tx.challengeItem.update({
        where: { id: submission.itemId },
        data: { responseCount: { decrement: 1 } },
      });
      await tx.challenge.updateMany({
        where: { id: submission.challengeId, status: "COMPLETED" },
        data: { status: "ACTIVE" },
      });
    }
    await tx.flag.updateMany({ where: { submissionId }, data: { resolved: true } });
  });
  revalidatePath("/admin");
}
