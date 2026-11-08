import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtRange, tournamentStatus } from "@/lib/format";

export const metadata = { title: "Panel" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      categories: {
        select: {
          id: true,
          _count: { select: { teams: true } },
          teams: { where: { status: "PENDING" }, select: { id: true } },
        },
      },
    },
  });
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-4xl text-court-900">Mis torneos</h1>
        <Link href="/admin/torneos/nuevo" className="btn-primary">+ Nuevo torneo</Link>
      </div>
      {tournaments.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-slate-600">Todavía no creaste ningún torneo.</p>
          <Link href="/admin/torneos/nuevo" className="btn-primary mt-4">Crear mi primer torneo</Link>
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-slate-100">
          {tournaments.map((t) => {
            const st = tournamentStatus[t.status];
            const total = t.categories.reduce((n, c) => n + c._count.teams, 0);
            const pending = t.categories.reduce((n, c) => n + c.teams.length, 0);
            return (
              <Link key={t.id} href={`/admin/torneos/${t.id}`} className="flex flex-col gap-2 p-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:p-5">
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{t.name}</div>
                  <div className="text-sm text-slate-500">{fmtRange(t.startDate, t.endDate)} · {t.categories.length} categorías · {total} parejas</div>
                </div>
                <div className="flex items-center gap-2">
                  {pending > 0 && <span className="badge bg-amber-100 text-amber-800">{pending} por revisar</span>}
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
