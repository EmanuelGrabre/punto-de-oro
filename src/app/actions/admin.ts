"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin, requireOrganizer } from "@/lib/auth";
import {
  buildBracket, computeStandings, distributeGroups, parseSets, roundRobin, type Qualifier,
} from "@/lib/padel";
import type { FormState } from "./auth";
import { Prisma, type TournamentStatus, type TeamStatus } from "@prisma/client";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optInt = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const optDate = (f: FormData, k: string) => {
  const v = str(f, k);
  if (!v) return null;
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime()) ? null : d;
};

function slugify(s: string) {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 60) || "torneo";
}

async function revalidateCategory(categoryId: string) {
  const c = await prisma.category.findUnique({ where: { id: categoryId }, include: { tournament: true } });
  if (!c) return;
  revalidatePath(`/torneos/${c.tournament.slug}`);
  revalidatePath(`/admin/torneos/${c.tournamentId}`);
  revalidatePath(`/admin/torneos/${c.tournamentId}/categorias/${c.id}`);
}

// ------------------------------------------------------------- Torneos

export async function createTournamentAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireOrganizer();
  const name = str(form, "name");
  if (name.length < 3) return { error: "Poné un nombre para el torneo." };

  let slug = slugify(name);
  let i = 1;
  while (await prisma.tournament.findUnique({ where: { slug } })) slug = `${slugify(name)}-${++i}`;

  const t = await prisma.tournament.create({
    data: {
      name, slug,
      description: str(form, "description") || null,
      location: str(form, "location") || null,
      price: str(form, "price") || null,
      startDate: optDate(form, "startDate"),
      endDate: optDate(form, "endDate"),
      createdById: user.id,
    },
  });
  // Categorías iniciales (una por línea)
  const cats = str(form, "categories").split(/\n|,/).map((c) => c.trim()).filter(Boolean);
  for (const [order, catName] of cats.entries()) {
    await prisma.category.create({ data: { tournamentId: t.id, name: catName, order } });
  }
  redirect(`/admin/torneos/${t.id}`);
}

export async function updateTournamentAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const id = str(form, "id");
  const name = str(form, "name");
  if (name.length < 3) return { error: "El nombre es muy corto." };
  const t = await prisma.tournament.update({
    where: { id },
    data: {
      name,
      description: str(form, "description") || null,
      location: str(form, "location") || null,
      price: str(form, "price") || null,
      startDate: optDate(form, "startDate"),
      endDate: optDate(form, "endDate"),
    },
  });
  revalidatePath(`/torneos/${t.slug}`);
  revalidatePath(`/admin/torneos/${id}`);
  revalidatePath("/");
  return { ok: "Cambios guardados." };
}

export async function setTournamentStatusAction(form: FormData) {
  await requireOrganizer();
  const id = str(form, "id");
  const status = str(form, "status") as TournamentStatus;
  if (!["DRAFT", "REGISTRATION", "IN_PROGRESS", "FINISHED"].includes(status)) return;
  const t = await prisma.tournament.update({ where: { id }, data: { status } });
  revalidatePath(`/torneos/${t.slug}`);
  revalidatePath(`/admin/torneos/${id}`);
  revalidatePath("/");
}

export async function deleteTournamentAction(form: FormData) {
  await requireOrganizer();
  await prisma.tournament.delete({ where: { id: str(form, "id") } });
  revalidatePath("/");
  redirect("/admin");
}

// ------------------------------------------------------------- Categorías

export async function createCategoryAction(form: FormData) {
  await requireOrganizer();
  const tournamentId = str(form, "tournamentId");
  const name = str(form, "name");
  if (!name) return;
  const order = await prisma.category.count({ where: { tournamentId } });
  await prisma.category.create({
    data: {
      tournamentId, name, order,
      maxTeams: optInt(form, "maxTeams"),
    },
  });
  revalidatePath(`/admin/torneos/${tournamentId}`);
}

export async function updateCategoryAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const id = str(form, "id");
  const name = str(form, "name");
  const groupSize = optInt(form, "groupSize") ?? 3;
  const qualifiersPerGroup = optInt(form, "qualifiersPerGroup") ?? 2;
  if (!name) return { error: "La categoría necesita un nombre." };
  if (groupSize < 2 || groupSize > 8) return { error: "El tamaño de zona debe estar entre 2 y 8." };
  if (qualifiersPerGroup >= groupSize + 1) return { error: "No pueden clasificar más parejas de las que hay en la zona." };
  await prisma.category.update({
    where: { id },
    data: { name, groupSize, qualifiersPerGroup, maxTeams: optInt(form, "maxTeams") },
  });
  await revalidateCategory(id);
  return { ok: "Categoría guardada." };
}

export async function deleteCategoryAction(form: FormData) {
  await requireOrganizer();
  const c = await prisma.category.delete({ where: { id: str(form, "id") } });
  revalidatePath(`/admin/torneos/${c.tournamentId}`);
  redirect(`/admin/torneos/${c.tournamentId}`);
}

// ------------------------------------------------------------- Parejas

export async function addTeamAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const categoryId = str(form, "categoryId");
  const player1 = str(form, "player1");
  const player2 = str(form, "player2");
  if (!player1 || !player2) return { error: "Completá ambos jugadores." };
  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat || cat.phase !== "REGISTRATION") return { error: "Las zonas ya fueron armadas." };
  await prisma.team.create({
    data: {
      categoryId, player1, player2,
      phone: str(form, "phone") || null,
      seed: optInt(form, "seed"),
      status: "CONFIRMED",
    },
  });
  await revalidateCategory(categoryId);
  return { ok: `Pareja ${player1} / ${player2} agregada.` };
}

export async function setTeamStatusAction(form: FormData) {
  await requireOrganizer();
  const status = str(form, "status") as TeamStatus;
  if (!["PENDING", "CONFIRMED", "REJECTED"].includes(status)) return;
  const team = await prisma.team.update({ where: { id: str(form, "teamId") }, data: { status } });
  await revalidateCategory(team.categoryId);
}

export async function setTeamSeedAction(form: FormData) {
  await requireOrganizer();
  const team = await prisma.team.update({
    where: { id: str(form, "teamId") },
    data: { seed: optInt(form, "seed") },
  });
  await revalidateCategory(team.categoryId);
}

export async function deleteTeamAction(form: FormData) {
  await requireOrganizer();
  const team = await prisma.team.findUnique({ where: { id: str(form, "teamId") }, include: { category: true } });
  if (!team || team.category.phase !== "REGISTRATION") return;
  await prisma.team.delete({ where: { id: team.id } });
  await revalidateCategory(team.categoryId);
}

// ------------------------------------------------------------- Zonas

export async function generateGroupsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const categoryId = str(form, "categoryId");
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { teams: { where: { status: "CONFIRMED" } } },
  });
  if (!cat) return { error: "Categoría inexistente." };
  if (cat.phase !== "REGISTRATION") return { error: "Las zonas ya están armadas." };
  if (cat.teams.length < 2) return { error: "Se necesitan al menos 2 parejas confirmadas." };

  const groups = distributeGroups(cat.teams, cat.groupSize);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  await prisma.$transaction(async (tx) => {
    for (const [i, teams] of groups.entries()) {
      const g = await tx.group.create({
        data: { categoryId, name: `Zona ${letters[i] ?? i + 1}`, order: i },
      });
      await tx.team.updateMany({ where: { id: { in: teams.map((t) => t.id) } }, data: { groupId: g.id } });
      const pairs = roundRobin(teams.map((t) => t.id));
      await tx.match.createMany({
        data: pairs.map(([a, b], position) => ({
          categoryId, stage: "GROUP" as const, groupId: g.id, position, team1Id: a, team2Id: b,
        })),
      });
    }
    await tx.category.update({ where: { id: categoryId }, data: { phase: "GROUPS" } });
  });
  await revalidateCategory(categoryId);
  return { ok: `Se armaron ${groups.length} zonas.` };
}

export async function resetGroupsAction(form: FormData) {
  await requireOrganizer();
  const categoryId = str(form, "categoryId");
  await prisma.$transaction([
    prisma.match.deleteMany({ where: { categoryId } }),
    prisma.team.updateMany({ where: { categoryId }, data: { groupId: null } }),
    prisma.group.deleteMany({ where: { categoryId } }),
    prisma.category.update({ where: { id: categoryId }, data: { phase: "REGISTRATION" } }),
  ]);
  await revalidateCategory(categoryId);
}

/** Cambia una pareja de zona (solo si ninguna de las dos zonas tiene resultados cargados). */
export async function moveTeamAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const teamId = str(form, "teamId");
  const toGroupId = str(form, "groupId");
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team?.groupId || team.groupId === toGroupId) return undefined;
  const fromGroupId = team.groupId;
  const played = await prisma.match.count({
    where: { groupId: { in: [fromGroupId, toGroupId] }, status: { in: ["PLAYED", "WALKOVER"] } },
  });
  if (played > 0) return { error: "No se puede mover: alguna de las zonas ya tiene resultados cargados." };

  await prisma.$transaction(async (tx) => {
    await tx.team.update({ where: { id: teamId }, data: { groupId: toGroupId } });
    for (const gid of [fromGroupId, toGroupId]) {
      await tx.match.deleteMany({ where: { groupId: gid } });
      const ids = (await tx.team.findMany({ where: { groupId: gid }, orderBy: { createdAt: "asc" } })).map((t) => t.id);
      await tx.match.createMany({
        data: roundRobin(ids).map(([a, b], position) => ({
          categoryId: team.categoryId, stage: "GROUP" as const, groupId: gid, position, team1Id: a, team2Id: b,
        })),
      });
    }
  });
  await revalidateCategory(team.categoryId);
  return { ok: "Pareja movida." };
}

// ------------------------------------------------------------- Resultados

export async function saveResultAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const matchId = str(form, "matchId");
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { category: true } });
  if (!match || !match.team1Id || !match.team2Id) return { error: "Partido no disponible." };

  const walkover = str(form, "walkover"); // "", "1" o "2" (= pareja que NO se presentó)
  let sets: [number, number][];
  let winnerId: string;
  let status: "PLAYED" | "WALKOVER";
  if (walkover === "1" || walkover === "2") {
    winnerId = walkover === "1" ? match.team2Id : match.team1Id;
    sets = walkover === "1" ? [[0, 6], [0, 6]] : [[6, 0], [6, 0]];
    status = "WALKOVER";
  } else {
    const parsed = parseSets([0, 1, 2].map((i) => [str(form, `s${i}a`), str(form, `s${i}b`)]));
    if (!parsed.ok) return { error: parsed.error };
    sets = parsed.sets;
    winnerId = parsed.winner === 1 ? match.team1Id : match.team2Id;
    status = "PLAYED";
  }

  if (match.stage === "KNOCKOUT") {
    const err = await propagateWinner(match, winnerId);
    if (err) return { error: err };
  }
  await prisma.match.update({ where: { id: matchId }, data: { sets, winnerId, status } });
  if (match.stage === "KNOCKOUT" && match.round === 2) {
    await prisma.category.update({ where: { id: match.categoryId }, data: { phase: "FINISHED" } });
  }
  await revalidateCategory(match.categoryId);
  return { ok: "Resultado guardado." };
}

export async function clearResultAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const match = await prisma.match.findUnique({ where: { id: str(form, "matchId") } });
  if (!match) return { error: "Partido no encontrado." };
  if (match.stage === "KNOCKOUT") {
    const err = await propagateWinner(match, null);
    if (err) return { error: err };
    if (match.round === 2) {
      await prisma.category.update({ where: { id: match.categoryId }, data: { phase: "KNOCKOUT" } });
    }
  }
  await prisma.match.update({
    where: { id: match.id },
    data: { sets: Prisma.DbNull, winnerId: null, status: "PENDING" },
  });
  await revalidateCategory(match.categoryId);
  return { ok: "Resultado borrado." };
}

export async function scheduleMatchAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const match = await prisma.match.update({
    where: { id: str(form, "matchId") },
    data: { scheduledAt: optDate(form, "scheduledAt"), court: str(form, "court") || null },
  });
  await revalidateCategory(match.categoryId);
  return { ok: "Horario guardado." };
}

/** Pasa al ganador a la siguiente ronda. Devuelve un mensaje si no se puede. */
async function propagateWinner(
  match: { categoryId: string; round: number; position: number },
  winnerId: string | null,
): Promise<string | null> {
  if (match.round <= 2) return null;
  const next = await prisma.match.findFirst({
    where: {
      categoryId: match.categoryId, stage: "KNOCKOUT",
      round: match.round / 2, position: Math.floor(match.position / 2),
    },
  });
  if (!next) return null;
  if (next.status === "PLAYED" || next.status === "WALKOVER") {
    return "El partido siguiente ya tiene resultado. Borralo primero para poder cambiar este.";
  }
  const slot = match.position % 2 === 0 ? "team1Id" : "team2Id";
  await prisma.match.update({ where: { id: next.id }, data: { [slot]: winnerId } });
  return null;
}

// ------------------------------------------------------------- Cuadro eliminatorio

export async function generateBracketAction(_: FormState, form: FormData): Promise<FormState> {
  await requireOrganizer();
  const categoryId = str(form, "categoryId");
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      groups: { orderBy: { order: "asc" }, include: { teams: true, matches: true } },
    },
  });
  if (!cat || cat.phase !== "GROUPS") return { error: "La categoría no está en fase de zonas." };
  const pending = cat.groups.flatMap((g) => g.matches).filter((m) => m.status === "PENDING").length;
  if (pending > 0 && str(form, "force") !== "1") {
    return { error: `Faltan ${pending} partidos de zona por jugar.` };
  }

  const qualifiers: Qualifier[] = [];
  for (const [gi, g] of cat.groups.entries()) {
    const table = computeStandings(g.teams.map((t) => t.id), g.matches);
    table.slice(0, cat.qualifiersPerGroup).forEach((row, place) => {
      qualifiers.push({ teamId: row.teamId, group: gi, place: place + 1 });
    });
  }
  if (qualifiers.length < 2) return { error: "Se necesitan al menos 2 parejas clasificadas." };

  const slots = buildBracket(qualifiers);
  const size = slots.length;

  await prisma.$transaction(async (tx) => {
    await tx.match.deleteMany({ where: { categoryId, stage: "KNOCKOUT" } });
    for (let round = size; round >= 2; round /= 2) {
      await tx.match.createMany({
        data: Array.from({ length: round / 2 }, (_, position) => ({
          categoryId, stage: "KNOCKOUT" as const, round, position,
          team1Id: round === size ? slots[position * 2] : null,
          team2Id: round === size ? slots[position * 2 + 1] : null,
        })),
      });
    }
    // Pases libres (BYE): el que no tiene rival avanza directo
    const firstRound = await tx.match.findMany({ where: { categoryId, stage: "KNOCKOUT", round: size } });
    for (const m of firstRound) {
      const lone = m.team1Id && !m.team2Id ? m.team1Id : !m.team1Id && m.team2Id ? m.team2Id : null;
      if (!lone) continue;
      await tx.match.update({ where: { id: m.id }, data: { status: "BYE", winnerId: lone } });
      if (size > 2) {
        await tx.match.updateMany({
          where: { categoryId, stage: "KNOCKOUT", round: size / 2, position: Math.floor(m.position / 2) },
          data: m.position % 2 === 0 ? { team1Id: lone } : { team2Id: lone },
        });
      }
    }
    await tx.category.update({ where: { id: categoryId }, data: { phase: "KNOCKOUT" } });
  });
  await revalidateCategory(categoryId);
  return { ok: "Cuadro eliminatorio generado." };
}

export async function resetBracketAction(form: FormData) {
  await requireOrganizer();
  const categoryId = str(form, "categoryId");
  await prisma.$transaction([
    prisma.match.deleteMany({ where: { categoryId, stage: "KNOCKOUT" } }),
    prisma.category.update({ where: { id: categoryId }, data: { phase: "GROUPS" } }),
  ]);
  await revalidateCategory(categoryId);
}

// ------------------------------------------------------------- Usuarios

export async function setUserRoleAction(form: FormData) {
  const me = await requireAdmin();
  const userId = str(form, "userId");
  const role = str(form, "role");
  if (userId === me.id || !["ADMIN", "ORGANIZER", "PLAYER"].includes(role)) return;
  await prisma.user.update({ where: { id: userId }, data: { role: role as "ADMIN" | "ORGANIZER" | "PLAYER" } });
  revalidatePath("/admin/usuarios");
}
