import { prisma } from "./db";
import { computeStandings } from "./padel";

const teamSelect = { select: { id: true, player1: true, player2: true } } as const;

export async function getCategoryFull(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      groups: {
        orderBy: { order: "asc" },
        include: {
          teams: { select: { id: true, player1: true, player2: true, seed: true } },
          matches: { orderBy: { position: "asc" }, include: { team1: teamSelect, team2: teamSelect } },
        },
      },
      matches: {
        where: { stage: "KNOCKOUT" },
        orderBy: [{ round: "desc" }, { position: "asc" }],
        include: { team1: teamSelect, team2: teamSelect },
      },
    },
  });
  if (!category) return null;
  const groups = category.groups.map((g) => {
    const byId = new Map(g.teams.map((t) => [t.id, t]));
    const standings = computeStandings(g.teams.map((t) => t.id), g.matches).map((row, i) => ({
      ...row, team: byId.get(row.teamId)!, qualified: i < category.qualifiersPerGroup,
    }));
    return { ...g, standings };
  });
  const rounds = new Map<number, typeof category.matches>();
  for (const m of category.matches) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  }
  return {
    ...category,
    groups,
    knockout: [...rounds.entries()].sort((a, b) => b[0] - a[0]).map(([round, matches]) => ({ round, matches })),
  };
}

export type CategoryFull = NonNullable<Awaited<ReturnType<typeof getCategoryFull>>>;
export type GroupFull = CategoryFull["groups"][number];
export type MatchFull = GroupFull["matches"][number];
