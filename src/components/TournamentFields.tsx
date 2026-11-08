import { toDateInput } from "@/lib/format";

type T = {
  name?: string; description?: string | null; location?: string | null; price?: string | null;
  startDate?: Date | null; endDate?: Date | null;
};

export function TournamentFields({ t = {} }: { t?: T }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">Nombre del torneo</label>
        <input id="name" name="name" required defaultValue={t.name} className="input" placeholder="Ej.: Torneo Apertura 2026" />
      </div>
      <div>
        <label className="label" htmlFor="startDate">Fecha de inicio</label>
        <input id="startDate" name="startDate" type="date" defaultValue={toDateInput(t.startDate)} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="endDate">Fecha de fin</label>
        <input id="endDate" name="endDate" type="date" defaultValue={toDateInput(t.endDate)} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="location">Lugar / club</label>
        <input id="location" name="location" defaultValue={t.location ?? ""} className="input" placeholder="Ej.: Club Los Pinos" />
      </div>
      <div>
        <label className="label" htmlFor="price">Precio de inscripción</label>
        <input id="price" name="price" defaultValue={t.price ?? ""} className="input" placeholder="Ej.: $20.000 por pareja" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">Descripción, premios y reglamento</label>
        <textarea id="description" name="description" rows={4} defaultValue={t.description ?? ""} className="input" />
      </div>
    </div>
  );
}
