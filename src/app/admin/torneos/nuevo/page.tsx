import { createTournamentAction } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { TournamentFields } from "@/components/TournamentFields";

export const metadata = { title: "Nuevo torneo" };

export default function NewTournament() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h-display text-4xl text-court-900">Nuevo torneo</h1>
      <ActionForm action={createTournamentAction} className="card mt-6 space-y-5 p-6">
        <TournamentFields />
        <div>
          <label className="label" htmlFor="categories">Categorías (una por línea)</label>
          <textarea id="categories" name="categories" rows={4} className="input" placeholder={"Masculino 4ta\nMasculino 6ta\nFemenino 5ta\nMixto"} />
          <p className="mt-1 text-xs text-slate-500">Podés agregar o cambiar categorías después.</p>
        </div>
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          El torneo se crea como <b>borrador</b> (no visible al público). Cuando esté listo, abrí las inscripciones.
        </p>
        <SubmitButton pendingText="Creando…">Crear torneo</SubmitButton>
      </ActionForm>
    </div>
  );
}
