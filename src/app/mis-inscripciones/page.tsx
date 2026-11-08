import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { teamStatus, fmtRange, teamName } from "@/lib/format";
import { cancelRegistrationAction } from "@/app/actions/registration";
import { ConfirmButton } from "@/components/forms";

export const metadata = { title: "Mis inscripciones" };
export const dynamic = "force-dynamic";

export default async function MisInscripciones({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const user = await requireUser("/mis-inscripciones");
  const { ok } = await searchParams;
  const teams = await prisma.team.findMany({
    where: { registeredById: user.id },
    orderBy: { createdAt: "desc" },
    include: { category: { include: { tournament: true } }, group: true },
  });
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="h-display text-4xl text-court-900">Mis inscripciones</h1>
      {ok && (
        <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          ✅ ¡Inscripción enviada! El organizador la revisará y te avisará.
        </p>
      )}
      {teams.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-slate-500">
          Todavía no inscribiste ninguna pareja. <Link href="/" className="font-semibold text-court-600">Ver torneos</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {teams.map((t) => {
            const st = teamStatus[t.status];
            const tour = t.category.tournament;
            return (
              <div key={t.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <Link href={`/torneos/${tour.slug}?cat=${t.categoryId}`} className="h-display text-xl text-slate-900 hover:text-court-700">
                    {tour.name}
                  </Link>
                  <div className="text-sm text-slate-500">{t.category.name} · {fmtRange(tour.startDate, tour.endDate)}</div>
                  <div className="mt-1 text-sm font-medium">{teamName(t)}</div>
                  {t.group && <div className="mt-1 text-sm text-court-700">Jugás en la {t.group.name}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                  {t.category.phase === "REGISTRATION" && (
                    <form action={cancelRegistrationAction}>
                      <input type="hidden" name="teamId" value={t.id} />
                      <ConfirmButton message="¿Seguro que querés cancelar esta inscripción?">Cancelar</ConfirmButton>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
