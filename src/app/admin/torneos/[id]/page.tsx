import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { phaseLabel, tournamentStatus } from "@/lib/format";
import {
  createCategoryAction, deleteTournamentAction, setTournamentStatusAction, updateTournamentAction,
} from "@/app/actions/admin";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { TournamentFields } from "@/components/TournamentFields";

export const dynamic = "force-dynamic";

const steps = [
  { status: "DRAFT", label: "Borrador", help: "Solo lo ven los organizadores." },
  { status: "REGISTRATION", label: "Inscripciones abiertas", help: "Público. Los jugadores pueden inscribirse." },
  { status: "IN_PROGRESS", label: "En juego", help: "Inscripciones cerradas. Se juegan zonas y cuadro." },
  { status: "FINISHED", label: "Finalizado", help: "Torneo terminado." },
] as const;

export default async function AdminTournament({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: {
      categories: {
        orderBy: { order: "asc" },
        include: {
          teams: { select: { status: true } },
          groups: { select: { id: true } },
        },
      },
    },
  });
  if (!t) notFound();
  const st = tournamentStatus[t.status];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-court-600 hover:underline">← Mis torneos</Link>
          <h1 className="h-display mt-1 text-4xl text-court-900">{t.name}</h1>
          <span className={`badge mt-1 ${st.cls}`}>{st.label}</span>
        </div>
        <Link href={`/torneos/${t.slug}`} className="btn-ghost" target="_blank">Ver página pública ↗</Link>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold text-slate-900">Estado del torneo</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {steps.map((s) => (
            <form key={s.status} action={setTournamentStatusAction}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="status" value={s.status} />
              <button
                className={`h-full w-full rounded-xl border p-3 text-left transition ${t.status === s.status ? "border-court-600 bg-court-50 ring-2 ring-court-100" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="mt-0.5 text-xs text-slate-500">{s.help}</div>
              </button>
            </form>
          ))}
        </div>
      </section>

      <section>
        <h2 className="h-display text-2xl text-court-900">Categorías</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {t.categories.map((c) => {
            const confirmed = c.teams.filter((x) => x.status === "CONFIRMED").length;
            const pending = c.teams.filter((x) => x.status === "PENDING").length;
            return (
              <Link key={c.id} href={`/admin/torneos/${t.id}/categorias/${c.id}`} className="card p-5 transition hover:border-court-500 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <span className="badge bg-slate-100 text-slate-600">{phaseLabel[c.phase]}</span>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  {confirmed} confirmadas{c.maxTeams ? ` de ${c.maxTeams}` : ""}
                  {pending > 0 && <span className="ml-2 badge bg-amber-100 text-amber-800">{pending} por revisar</span>}
                </div>
                <div className="mt-3 text-sm font-semibold text-court-600">Gestionar →</div>
              </Link>
            );
          })}
          <form action={createCategoryAction} className="card flex flex-col gap-2 border-dashed p-5">
            <input type="hidden" name="tournamentId" value={t.id} />
            <div className="text-sm font-semibold text-slate-700">Agregar categoría</div>
            <input name="name" required className="input" placeholder="Ej.: Masculino 5ta" />
            <input name="maxTeams" type="number" min={2} className="input" placeholder="Cupo máximo (opcional)" />
            <SubmitButton className="btn-ghost">+ Agregar</SubmitButton>
          </form>
        </div>
      </section>

      <section>
        <h2 className="h-display text-2xl text-court-900">Datos del torneo</h2>
        <ActionForm action={updateTournamentAction} className="card mt-3 space-y-5 p-6">
          <input type="hidden" name="id" value={t.id} />
          <TournamentFields t={t} />
          <SubmitButton>Guardar cambios</SubmitButton>
        </ActionForm>
      </section>

      <section className="card border-red-200 p-5">
        <h2 className="font-semibold text-red-700">Zona peligrosa</h2>
        <p className="mt-1 text-sm text-slate-600">Eliminar el torneo borra todas sus categorías, parejas y resultados.</p>
        <form action={deleteTournamentAction} className="mt-3">
          <input type="hidden" name="id" value={t.id} />
          <ConfirmButton message={`¿Eliminar definitivamente "${t.name}"? No se puede deshacer.`}>Eliminar torneo</ConfirmButton>
        </form>
      </section>
    </div>
  );
}
