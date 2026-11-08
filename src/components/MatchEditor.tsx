"use client";

import { useState } from "react";
import { clearResultAction, saveResultAction, scheduleMatchAction } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "./forms";

type Team = { id: string; player1: string; player2: string } | null;
type Props = {
  match: {
    id: string; status: string; sets: unknown; winnerId: string | null;
    team1: Team; team2: Team; team1Id: string | null; team2Id: string | null;
    court: string | null; scheduledAtInput: string; scheduledLabel: string;
  };
};

const name = (t: Team) => (t ? `${t.player1} / ${t.player2}` : "A definir");

export function MatchEditor({ match }: Props) {
  const [mode, setMode] = useState<"none" | "result" | "schedule">("none");
  const done = match.status === "PLAYED" || match.status === "WALKOVER";
  const sets = (Array.isArray(match.sets) ? match.sets : []) as [number, number][];
  const ready = !!match.team1 && !!match.team2;

  if (match.status === "BYE") {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
        {name(match.team1 ?? match.team2)} · pase libre
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${done ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 text-sm">
          <div className={match.winnerId && match.winnerId === match.team1Id ? "font-semibold" : ""}>{name(match.team1)}</div>
          <div className={match.winnerId && match.winnerId === match.team2Id ? "font-semibold" : ""}>{name(match.team2)}</div>
          {(match.court || match.scheduledLabel) && (
            <div className="mt-1 text-xs text-slate-500">{[match.court, match.scheduledLabel].filter(Boolean).join(" · ")}</div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {done && (
            <span className="rounded-lg bg-court-50 px-2 py-1 font-mono text-sm font-semibold text-court-900">
              {match.status === "WALKOVER" ? "W.O." : sets.map((s) => s.join("-")).join("  ")}
            </span>
          )}
          {ready && (
            <button type="button" className={done ? "btn-ghost btn-sm" : "btn-primary btn-sm"} onClick={() => setMode(mode === "result" ? "none" : "result")}>
              {done ? "Editar" : "Cargar resultado"}
            </button>
          )}
          <button type="button" className="btn-ghost btn-sm" onClick={() => setMode(mode === "schedule" ? "none" : "schedule")}>
            Horario
          </button>
        </div>
      </div>

      {mode === "result" && ready && (
        <div className="border-t border-slate-200 p-3">
          <ActionForm action={saveResultAction} className="space-y-3">
            <input type="hidden" name="matchId" value={match.id} />
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th />
                    <th className="px-1 font-medium">Set 1</th>
                    <th className="px-1 font-medium">Set 2</th>
                    <th className="px-1 font-medium">Set 3</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1].map((side) => (
                    <tr key={side}>
                      <td className="max-w-40 truncate pr-2 text-xs">{name(side === 0 ? match.team1 : match.team2)}</td>
                      {[0, 1, 2].map((i) => (
                        <td key={i} className="p-1">
                          <input
                            name={`s${i}${side === 0 ? "a" : "b"}`}
                            inputMode="numeric"
                            defaultValue={sets[i]?.[side] ?? ""}
                            className="input w-14 px-2 text-center"
                            aria-label={`Set ${i + 1} ${name(side === 0 ? match.team1 : match.team2)}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">El 3er set puede ser super tie-break (ej. 10-8). Para un set único, cargá solo el Set 1.</p>
            <div className="flex flex-wrap items-center gap-2">
              <select name="walkover" className="input w-auto text-xs" defaultValue="">
                <option value="">Partido jugado</option>
                <option value="1">W.O.: no se presentó {name(match.team1)}</option>
                <option value="2">W.O.: no se presentó {name(match.team2)}</option>
              </select>
              <SubmitButton className="btn-primary btn-sm">Guardar resultado</SubmitButton>
            </div>
          </ActionForm>
          {done && (
            <ActionForm action={clearResultAction} className="mt-2" confirm="¿Borrar el resultado de este partido?">
              <input type="hidden" name="matchId" value={match.id} />
              <SubmitButton className="btn-danger btn-sm">Borrar resultado</SubmitButton>
            </ActionForm>
          )}
        </div>
      )}

      {mode === "schedule" && (
        <div className="border-t border-slate-200 p-3">
          <ActionForm action={scheduleMatchAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="matchId" value={match.id} />
            <div>
              <label className="label text-xs">Día y hora</label>
              <input type="datetime-local" name="scheduledAt" defaultValue={match.scheduledAtInput} className="input w-auto" />
            </div>
            <div>
              <label className="label text-xs">Cancha</label>
              <input name="court" defaultValue={match.court ?? ""} className="input w-32" placeholder="Cancha 1" />
            </div>
            <SubmitButton className="btn-primary btn-sm">Guardar</SubmitButton>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
