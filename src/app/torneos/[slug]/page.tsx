import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, isOrganizer } from "@/lib/auth";
import { getCategoryFull } from "@/lib/queries";
import { fmtRange, phaseLabel, teamName, tournamentStatus } from "@/lib/format";
import { Bracket, Champion, GroupCard } from "@/components/TournamentViews";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const t = await prisma.tournament.findUnique({ where: { slug: (await params).slug }, select: { name: true } });
  return { title: t?.name ?? "Torneo" };
}

export default async function TournamentPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cat?: string; vista?: string }>;
}) {
  const { slug } = await params;
  const { cat, vista } = await searchParams;
  const user = await getCurrentUser();
  const t = await prisma.tournament.findUnique({
    where: { slug },
    include: { categories: { orderBy: { order: "asc" } } },
  });
  if (!t || (t.status === "DRAFT" && !isOrganizer(user))) notFound();

  const active = t.categories.find((c) => c.id === cat) ?? t.categories[0];
  const category = active ? await getCategoryFull(active.id) : null;
  const st = tournamentStatus[t.status];
  const hasBracket = (category?.knockout.length ?? 0) > 0;
  const view = vista === "zonas" || !hasBracket ? "zonas" : "cuadro";

  const confirmedTeams = category
    ? await prisma.team.findMany({
        where: { categoryId: category.id, status: "CONFIRMED" },
        orderBy: { createdAt: "asc" },
        select: { id: true, player1: true, player2: true },
      })
    : [];
  const pendingCount = category
    ? await prisma.team.count({ where: { categoryId: category.id, status: "PENDING" } })
    : 0;

  return (
    <>
      <section className="bg-court-900 text-white">
        <div className="container-page py-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${st.cls}`}>{st.label}</span>
            {isOrganizer(user) && (
              <Link href={`/admin/torneos/${t.id}`} className="badge bg-white/10 text-white hover:bg-white/20">✎ Administrar</Link>
            )}
          </div>
          <h1 className="h-display mt-3 text-4xl sm:text-6xl">{t.name}</h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-court-100">
            <span>📅 {fmtRange(t.startDate, t.endDate)}</span>
            {t.location && <span>📍 {t.location}</span>}
            {t.price && <span>💳 {t.price}</span>}
          </div>
          {t.description && <p className="mt-4 max-w-3xl whitespace-pre-line text-court-100">{t.description}</p>}
          {t.status === "REGISTRATION" && (
            <Link href={`/torneos/${t.slug}/inscripcion${active ? `?cat=${active.id}` : ""}`} className="btn-ball mt-6">
              Inscribir pareja
            </Link>
          )}
        </div>
      </section>

      <div className="container-page py-8">
        {t.categories.length === 0 ? (
          <div className="card p-10 text-center text-slate-500">Este torneo todavía no tiene categorías.</div>
        ) : (
          <>
            <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {t.categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/torneos/${t.slug}?cat=${c.id}`}
                  className={`tab ${c.id === active?.id ? "bg-court-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>

            {category && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="h-display text-3xl text-court-900">{category.name}</h2>
                    <p className="text-sm text-slate-500">
                      {phaseLabel[category.phase]} · {confirmedTeams.length} parejas
                      {category.maxTeams ? ` (cupo ${category.maxTeams})` : ""}
                    </p>
                  </div>
                  {hasBracket && (
                    <div className="flex rounded-full bg-white p-1 ring-1 ring-slate-200">
                      {(["cuadro", "zonas"] as const).map((v) => (
                        <Link
                          key={v}
                          href={`/torneos/${t.slug}?cat=${category.id}&vista=${v}`}
                          className={`tab py-1.5 ${view === v ? "bg-court-900 text-white" : "text-slate-600"}`}
                        >
                          {v === "cuadro" ? "Cuadro" : "Zonas"}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <Champion category={category} />

                {category.phase === "REGISTRATION" ? (
                  <div className="card p-5">
                    <h3 className="font-semibold">Parejas inscriptas</h3>
                    {pendingCount > 0 && (
                      <p className="mt-1 text-xs text-slate-500">{pendingCount} inscripción(es) esperando confirmación del organizador.</p>
                    )}
                    {confirmedTeams.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">Todavía no hay parejas confirmadas.</p>
                    ) : (
                      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                        {confirmedTeams.map((team, i) => (
                          <li key={team.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                            <span className="w-6 text-right font-mono text-xs text-slate-400">{i + 1}</span>
                            {teamName(team)}
                          </li>
                        ))}
                      </ol>
                    )}
                    <p className="mt-4 text-sm text-slate-500">Las zonas se publican cuando cierran las inscripciones.</p>
                  </div>
                ) : view === "cuadro" ? (
                  <div className="card p-4 sm:p-6"><Bracket knockout={category.knockout} /></div>
                ) : (
                  <>
                    <p className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="inline-block h-3 w-3 rounded-full bg-ball" /> Clasifican los {category.qualifiersPerGroup} primeros de cada zona
                    </p>
                    <div className="grid gap-5 lg:grid-cols-2">
                      {category.groups.map((g) => <GroupCard key={g.id} group={g} />)}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
