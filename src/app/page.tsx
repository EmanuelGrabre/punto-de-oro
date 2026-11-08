import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtRange, tournamentStatus } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [tournaments, userCount, user] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: { not: "DRAFT" } },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      include: { categories: { select: { id: true, name: true, _count: { select: { teams: { where: { status: "CONFIRMED" } } } } } } },
    }),
    prisma.user.count(),
    getCurrentUser(),
  ]);
  const order = { REGISTRATION: 0, IN_PROGRESS: 1, FINISHED: 2, DRAFT: 3 } as const;
  tournaments.sort((a, b) => order[a.status] - order[b.status]);

  return (
    <>
      <section className="relative overflow-hidden bg-court-900 text-white">
        <CourtLines />
        <div className="container-page relative py-14 sm:py-20">
          <span className="badge bg-ball text-court-950">Torneos de pádel</span>
          <h1 className="h-display mt-4 max-w-2xl text-5xl leading-none sm:text-7xl">
            Jugá. Competí. <span className="text-ball">Seguí cada punto.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-court-100">
            Inscribí a tu pareja, mirá las zonas, los horarios y el cuadro en vivo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#torneos" className="btn-ball">Ver torneos</a>
            {!user && <Link href="/registro" className="btn border border-white/30 text-white hover:bg-white/10">Crear cuenta</Link>}
          </div>
        </div>
      </section>

      <div className="container-page py-10" id="torneos">
        {userCount === 0 && (
          <div className="card mb-8 border-court-200 bg-court-50 p-5">
            <h2 className="font-semibold text-court-900">👋 Configuración inicial</h2>
            <p className="mt-1 text-sm text-court-800">
              Todavía no hay cuentas. La primera cuenta que se cree será la <b>administradora</b> del sitio.
            </p>
            <Link href="/registro" className="btn-primary mt-3">Crear cuenta de administrador</Link>
          </div>
        )}

        <h2 className="h-display mb-5 text-3xl text-court-900">Torneos</h2>
        {tournaments.length === 0 ? (
          <div className="card p-10 text-center text-slate-500">Todavía no hay torneos publicados.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => {
              const st = tournamentStatus[t.status];
              const teams = t.categories.reduce((n, c) => n + c._count.teams, 0);
              return (
                <Link key={t.id} href={`/torneos/${t.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative h-24 bg-gradient-to-br from-court-700 to-court-900">
                    <CourtLines small />
                    <span className={`badge absolute left-4 top-4 ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="h-display text-2xl leading-tight text-slate-900 group-hover:text-court-700">{t.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{fmtRange(t.startDate, t.endDate)}</p>
                    {t.location && <p className="text-sm text-slate-500">📍 {t.location}</p>}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {t.categories.map((c) => (
                        <span key={c.id} className="badge bg-slate-100 text-slate-700">{c.name}</span>
                      ))}
                    </div>
                    <div className="mt-auto pt-4 text-xs text-slate-500">{teams} parejas confirmadas</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function CourtLines({ small = false }: { small?: boolean }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" preserveAspectRatio="none" viewBox="0 0 200 100" aria-hidden>
      <rect x="10" y="10" width="180" height="80" fill="none" stroke="white" strokeWidth={small ? 1.2 : 0.6} />
      <line x1="100" y1="5" x2="100" y2="95" stroke="white" strokeWidth={small ? 2 : 1} />
      <line x1="40" y1="10" x2="40" y2="90" stroke="white" strokeWidth={small ? 1.2 : 0.6} />
      <line x1="160" y1="10" x2="160" y2="90" stroke="white" strokeWidth={small ? 1.2 : 0.6} />
      <line x1="40" y1="50" x2="160" y2="50" stroke="white" strokeWidth={small ? 1.2 : 0.6} />
    </svg>
  );
}
