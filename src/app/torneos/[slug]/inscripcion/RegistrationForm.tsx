"use client";

import { useActionState } from "react";
import { registerTeamAction } from "@/app/actions/registration";
import { FormMessage, SubmitButton } from "@/components/forms";

type Cat = { id: string; name: string; full: boolean; closed: boolean; spots: number | null };

export function RegistrationForm({ categories, defaultCategory, defaultPlayer, defaultPhone }: {
  categories: Cat[]; defaultCategory?: string; defaultPlayer: string; defaultPhone: string;
}) {
  const [state, action] = useActionState(registerTeamAction, undefined);
  const available = categories.filter((c) => !c.full && !c.closed);
  const def = available.find((c) => c.id === defaultCategory)?.id ?? available[0]?.id;

  if (available.length === 0) {
    return <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No quedan cupos disponibles en ninguna categoría.</p>;
  }
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="categoryId">Categoría</label>
        <select id="categoryId" name="categoryId" defaultValue={def} className="input">
          {categories.map((c) => (
            <option key={c.id} value={c.id} disabled={c.full || c.closed}>
              {c.name}
              {c.closed ? " (cerrada)" : c.full ? " (completa)" : c.spots != null ? ` (${c.spots} lugares)` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="player1">Jugador/a 1</label>
          <input id="player1" name="player1" defaultValue={defaultPlayer} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="player2">Jugador/a 2 (compañero/a)</label>
          <input id="player2" name="player2" required className="input" placeholder="Nombre y apellido" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="phone">Teléfono / WhatsApp de contacto</label>
        <input id="phone" name="phone" type="tel" defaultValue={defaultPhone} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Comentarios <span className="font-normal text-slate-400">(opcional)</span></label>
        <textarea id="notes" name="notes" rows={3} className="input" placeholder="Ej.: no podemos jugar el sábado antes de las 14 h" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full" pendingText="Enviando…">Enviar inscripción</SubmitButton>
    </form>
  );
}
