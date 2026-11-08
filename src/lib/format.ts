const TZ = "America/Argentina/Buenos_Aires";

export function fmtDate(d: Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "";
  return new Intl.DateTimeFormat("es-AR", { timeZone: TZ, ...opts }).format(d);
}

export function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export function fmtRange(a: Date | null, b: Date | null) {
  if (!a) return "Fecha a confirmar";
  if (!b || fmtDate(a) === fmtDate(b)) return fmtDate(a, { weekday: "long", day: "numeric", month: "long" });
  return `${fmtDate(a, { day: "numeric", month: "short" })} al ${fmtDate(b, { day: "numeric", month: "short", year: "numeric" })}`;
}

/** Valor para <input type="date"> */
export function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Valor para <input type="datetime-local"> en hora de Argentina */
export function toDateTimeInput(d: Date | null | undefined) {
  if (!d) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

export const tournamentStatus: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Borrador", cls: "bg-slate-100 text-slate-600" },
  REGISTRATION: { label: "Inscripciones abiertas", cls: "bg-ball text-court-950" },
  IN_PROGRESS: { label: "En juego", cls: "bg-court-600 text-white" },
  FINISHED: { label: "Finalizado", cls: "bg-slate-800 text-white" },
};

export const phaseLabel: Record<string, string> = {
  REGISTRATION: "Inscripción",
  GROUPS: "Fase de zonas",
  KNOCKOUT: "Eliminación directa",
  FINISHED: "Finalizada",
};

export const teamStatus: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmada", cls: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rechazada", cls: "bg-red-100 text-red-700" },
};

export function teamName(t: { player1: string; player2: string } | null | undefined) {
  return t ? `${t.player1} / ${t.player2}` : "";
}
