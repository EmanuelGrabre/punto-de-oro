"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { FormState } from "./auth";

export async function registerTeamAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tenés que iniciar sesión para inscribirte." };

  const categoryId = String(form.get("categoryId") ?? "");
  const player1 = String(form.get("player1") ?? "").trim();
  const player2 = String(form.get("player2") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();

  if (!categoryId) return { error: "Elegí una categoría." };
  if (player1.length < 3 || player2.length < 3) return { error: "Completá el nombre de ambos jugadores." };
  if (phone.length < 6) return { error: "Dejá un teléfono de contacto." };

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { tournament: true, _count: { select: { teams: { where: { status: { not: "REJECTED" } } } } } },
  });
  if (!category || category.tournament.status !== "REGISTRATION" || category.phase !== "REGISTRATION") {
    return { error: "Las inscripciones para esta categoría están cerradas." };
  }
  if (category.maxTeams && category._count.teams >= category.maxTeams) {
    return { error: "La categoría ya alcanzó el cupo máximo de parejas." };
  }
  const already = await prisma.team.findFirst({
    where: { categoryId, registeredById: user.id, status: { not: "REJECTED" } },
  });
  if (already) return { error: "Ya inscribiste una pareja en esta categoría." };

  await prisma.team.create({
    data: {
      categoryId, player1, player2, phone, email: user.email,
      notes: notes || null, registeredById: user.id,
    },
  });
  revalidatePath(`/torneos/${category.tournament.slug}`);
  redirect("/mis-inscripciones?ok=1");
}

export async function cancelRegistrationAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const teamId = String(form.get("teamId") ?? "");
  const team = await prisma.team.findUnique({ where: { id: teamId }, include: { category: true } });
  if (!team || team.registeredById !== user.id || team.category.phase !== "REGISTRATION") return;
  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath("/mis-inscripciones");
}
