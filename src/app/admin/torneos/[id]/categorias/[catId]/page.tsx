import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCategoryFull, type MatchFull } from "@/lib/queries";
import { fmtDateTime, phaseLabel, teamName, teamStatus, toDateTimeInput } from "@/lib/format";
import { roundName } from "@/lib/padel";
import {
  addTeamAction, deleteCategoryAction, deleteTeamAction, generateBracketAction, generateGroupsAction,
  moveTeamAction, resetBracketAction, resetGroupsAction, setTeamSeedAction, setTeamStatusAction,
  updateCategoryAction,
} from "@/app/actions/admin";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { MatchEditor } from "@/components/MatchEditor";
import { Bracket, GroupTable } from "@/components/TournamentViews";

export const dynamic = "force-dynamic";

function editorProps(m: MatchFull) {
  return {
    id: m.id, status: m.status, sets: m.sets, winnerId: m.winnerId,
    team1: m.team1, team2: m.team2, team1Id: m.team1Id, team2Id: m.team2Id,
    court: m.court, scheduledAtInput: toDateTimeInput(m.scheduledAt), scheduledLabel: fmtDateTime(m.scheduledAt),
  };
}

export default async function AdminCategory({ params }: { params: Promise<{ id: string; catId: string }> }) {
  const { id, catId } = await params;
  const category = await getCategoryFull(catId);
  if (!category || category.tournamentId !== id) notFound();
  const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id } });
  const teams = await prisma.team.findMany({
    where: { categoryId: catId },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: { registeredBy: { select: { name: true } } },
  });
  const confirmed = teams.filter((t) => t.status === "CONFIRMED");
  const pendingGroupMatches = category.groups.flatMap((g) => g.matches).filter((m) => m.status === "PENDING").length;
  const numGroups = Math.max(1, Math.floor(confirmed.length / category.groupSize));
  const phase = category.phase;

  const stepIndex = { REGISTRATION: 0, GROUPS: 1, KNOCKOUT: 2, FINISHED: 3 }[phase];

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/torneos/${id}`} className="text-sm text-court-600 hover:underline">← {tournament.name}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="h-display text-4xl text-court-900">{category.name}</h1>
          <span className="badge bg-court-100 text-court-800">{phaseLabel[phase]}</span>
        </div>
        <ol className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {["1. Inscripción de parejas", "2. Fase de zonas", "3. Eliminación directa", "4. Campeón"].map((s, i) => (
            <li key={s} className={`rounded-lg px-3 py-2 font-semibold ${i < stepIndex ? "bg-court-100 text-court-800" : i === stepIndex ? "bg-court-600 text-white" : "bg-slate-100 text-slate-500"}`}>
              {s}
            </li>
          ))}
        </ol>
      </div>

      {/* ---------------------------------------------------- Configuración */}
      <details className="card p-5" open={phase === "REGISTRATION" && teams.length === 0}>
        <summary className="cursor-pointer font-semibold">⚙️ Configuración de la categoría</summary>
        <ActionForm action={updateCategoryAction} className="mt-4 grid gap-4 sm:grid-cols-4">
          <input type="hidden" name="id" value={category.id} />
          <div className="sm:col-span-4">
            <label className="label">Nombre</label>
            <input name="name" defaultValue={category.name} className="input" required />
          </div>
          <div>
            <label className="label">Parejas por zona</label>
            <input name="groupSize" type="number" min={2} max={8} defaultValue={category.groupSize} className="input" disabled={phase !== "REGISTRATION"} />
            {phase !== "REGISTRATION" && <input type="hidden" name="groupSize" value={category.groupSize} />}
          </div>
          <div>
            <label className="label">Clasifican por zona</label>
            <input name="qualifiersPerGroup" type="number" min={1} max={8} defaultValue={category.qualifiersPerGroup} className="input" disabled={phase === "KNOCKOUT" || phase === "FINISHED"} />
            {(phase === "KNOCKOUT" || phase === "FINISHED") && <input type="hidden" name="qualifiersPerGroup" value={category.qualifiersPerGroup} />}
          </div>
          <div>
            <label className="label">Cupo máximo</label>
            <input name="maxTeams" type="number" min={2} defaultValue={category.maxTeams ?? ""} className="input" placeholder="Sin límite" />
          </div>
          <div className="flex items-end"><SubmitButton className="btn-primary w-full">Guardar</SubmitButton></div>
        </ActionForm>
        <p className="mt-3 text-xs text-slate-500">
          Si la cantidad de parejas no es múltiplo exacto, algunas zonas tendrán una pareja más (ej.: con zonas de 3 y 10 parejas → una zona de 4 y dos de 3).
        </p>
        {phase === "REGISTRATION" && (
          <form action={deleteCategoryAction} className="mt-4 border-t border-slate-100 pt-4">
            <input type="hidden" name="id" value={category.id} />
            <ConfirmButton message="¿Eliminar esta categoría y todas sus parejas?">Eliminar categoría</ConfirmButton>
          </form>
        )}
      </details>

      {/* ---------------------------------------------------- Parejas */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="h-display text-2xl text-court-900">Parejas</h2>
          <span className="text-sm text-slate-500">
            {confirmed.length} confirmadas · {teams.filter((t) => t.status === "PENDING").length} pendientes
            {category.maxTeams ? ` · cupo ${category.maxTeams}` : ""}
          </span>
        </div>
        <div className="card mt-3 divide-y divide-slate-100">
          {teams.length === 0 && <p className="p-5 text-sm text-slate-500">Aún no hay parejas inscriptas.</p>}
          {teams.map((t) => {
            const st = teamStatus[t.status];
            const wa = t.phone?.replace(/\D/g, "");
            return (
              <div key={t.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{teamName(t)}</span>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {t.seed && <span className="badge bg-ball text-court-950">Cabeza de serie {t.seed}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t.phone && (
                      <a href={`https://wa.me/${wa}`} target="_blank" className="text-court-600 hover:underline">📱 {t.phone}</a>
                    )}
                    {t.email && <span className="ml-2">{t.email}</span>}
                    {t.registeredBy && <span className="ml-2">· inscripta por {t.registeredBy.name}</span>}
                  </div>
                  {t.notes && <div className="mt-1 text-xs italic text-slate-600">“{t.notes}”</div>}
                </div>
                {phase === "REGISTRATION" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={setTeamSeedAction} className="flex items-center gap-1">
                      <input type="hidden" name="teamId" value={t.id} />
                      <input name="seed" type="number" min={1} defaultValue={t.seed ?? ""} placeholder="Serie" className="input w-20 px-2 py-1.5 text-xs" title="Cabeza de serie (1 = mejor). Dejar vacío si no es cabeza de serie." />
                      <button className="btn-ghost btn-sm">OK</button>
                    </form>
                    {t.status !== "CONFIRMED" && (
                      <form action={setTeamStatusAction}>
                        <input type="hidden" name="teamId" value={t.id} />
                        <input type="hidden" name="status" value="CONFIRMED" />
                        <button className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700">Confirmar</button>
                      </form>
                    )}
                    {t.status !== "REJECTED" && (
                      <form action={setTeamStatusAction}>
                        <input type="hidden" name="teamId" value={t.id} />
                        <input type="hidden" name="status" value="REJECTED" />
                        <button className="btn-ghost btn-sm">Rechazar</button>
                      </form>
                    )}
                    <form action={deleteTeamAction}>
                      <input type="hidden" name="teamId" value={t.id} />
                      <ConfirmButton message={`¿Eliminar a ${teamName(t)}?`}>Eliminar</ConfirmButton>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {phase === "REGISTRATION" && (
          <ActionForm action={addTeamAction} resetOnOk className="card mt-3 grid gap-3 p-4 sm:grid-cols-5 sm:items-end">
            <input type="hidden" name="categoryId" value={category.id} />
            <div className="sm:col-span-5 text-sm font-semibold text-slate-700">Agregar pareja manualmente (queda confirmada)</div>
            <input name="player1" required placeholder="Jugador/a 1" className="input" />
            <input name="player2" required placeholder="Jugador/a 2" className="input" />
            <input name="phone" placeholder="Teléfono" className="input" />
            <input name="seed" type="number" min={1} placeholder="Serie (opcional)" className="input" />
            <SubmitButton className="btn-ghost">+ Agregar</SubmitButton>
          </ActionForm>
        )}
      </section>

      {/* ---------------------------------------------------- Armar zonas */}
      {phase === "REGISTRATION" && (
        <section className="card border-court-200 bg-court-50 p-5">
          <h2 className="font-semibold text-court-900">Armar las zonas</h2>
          <p className="mt-1 text-sm text-court-800">
            Con {confirmed.length} parejas confirmadas y zonas de {category.groupSize} se armarán{" "}
            <b>{confirmed.length >= 2 ? numGroups : 0} zonas</b>. Los cabezas de serie van a zonas distintas; el resto se sortea.
            Solo entran las parejas <b>confirmadas</b>.
          </p>
          <ActionForm action={generateGroupsAction} className="mt-3" confirm="¿Armar las zonas ahora? Después ya no se podrán inscribir más parejas en esta categoría.">
            <input type="hidden" name="categoryId" value={category.id} />
            <SubmitButton className="btn-primary" pendingText="Sorteando…">🎲 Sortear y armar zonas</SubmitButton>
          </ActionForm>
        </section>
      )}

      {/* ---------------------------------------------------- Zonas */}
      {category.groups.length > 0 && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="h-display text-2xl text-court-900">Zonas</h2>
            {phase === "GROUPS" && (
              <form action={resetGroupsAction}>
                <input type="hidden" name="categoryId" value={category.id} />
                <ConfirmButton message="¿Deshacer las zonas? Se borran todos los partidos y resultados de zona.">Deshacer zonas</ConfirmButton>
              </form>
            )}
          </div>
          <div className="mt-3 grid gap-5 xl:grid-cols-2">
            {category.groups.map((g) => (
              <div key={g.id} className="card p-4 sm:p-5">
                <h3 className="h-display text-xl text-court-800">{g.name}</h3>
                <GroupTable group={g} />
                <div className="mt-4 space-y-2">
                  {g.matches.map((m) => <MatchEditor key={m.id} match={editorProps(m)} />)}
                </div>
                {phase === "GROUPS" && category.groups.length > 1 && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-xs text-slate-500">Mover una pareja a otra zona</summary>
                    <ActionForm action={moveTeamAction} className="mt-2 flex flex-wrap gap-2">
                      <select name="teamId" className="input w-auto text-xs">
                        {g.teams.map((t) => <option key={t.id} value={t.id}>{teamName(t)}</option>)}
                      </select>
                      <select name="groupId" className="input w-auto text-xs">
                        {category.groups.filter((o) => o.id !== g.id).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      <SubmitButton className="btn-ghost btn-sm">Mover</SubmitButton>
                    </ActionForm>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- Generar cuadro */}
      {phase === "GROUPS" && (
        <section className="card border-court-200 bg-court-50 p-5">
          <h2 className="font-semibold text-court-900">Generar el cuadro eliminatorio</h2>
          <p className="mt-1 text-sm text-court-800">
            Clasifican los {category.qualifiersPerGroup} primeros de cada zona ({category.groups.length * category.qualifiersPerGroup} parejas).
            Los 1° de zona son cabezas de serie y reciben los pases libres si hacen falta; parejas de la misma zona quedan separadas en el cuadro.
          </p>
          {pendingGroupMatches > 0 && (
            <p className="mt-2 text-sm font-medium text-amber-700">⚠️ Faltan {pendingGroupMatches} partidos de zona por jugar.</p>
          )}
          <ActionForm action={generateBracketAction} className="mt-3 space-y-2">
            <input type="hidden" name="categoryId" value={category.id} />
            {pendingGroupMatches > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="force" value="1" /> Generar igual con las posiciones actuales
              </label>
            )}
            <SubmitButton className="btn-primary" pendingText="Generando…">🏆 Generar cuadro</SubmitButton>
          </ActionForm>
        </section>
      )}

      {/* ---------------------------------------------------- Eliminación */}
      {category.knockout.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="h-display text-2xl text-court-900">Cuadro eliminatorio</h2>
            <form action={resetBracketAction}>
              <input type="hidden" name="categoryId" value={category.id} />
              <ConfirmButton message="¿Borrar el cuadro y todos sus resultados? Las zonas se mantienen.">Deshacer cuadro</ConfirmButton>
            </form>
          </div>
          <div className="card p-4 sm:p-6"><Bracket knockout={category.knockout} /></div>
          {category.knockout.map(({ round, matches }) => (
            <div key={round}>
              <h3 className="h-display mb-2 text-lg text-slate-600">{roundName(round)}</h3>
              <div className="grid gap-2 lg:grid-cols-2">
                {matches.map((m) => <MatchEditor key={m.id} match={editorProps(m)} />)}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
