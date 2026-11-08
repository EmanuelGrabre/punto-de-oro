export const metadata = { title: "Cómo funciona" };

const steps = [
  ["Creá el torneo", "Desde “Mis torneos” → “Nuevo torneo”. Cargá fechas, lugar, precio y las categorías. Se crea como borrador."],
  ["Configurá cada categoría", "Entrá a cada categoría y elegí cuántas parejas por zona (ej. 3) y cuántas clasifican (ej. 2). Opcional: cupo máximo."],
  ["Abrí las inscripciones", "En el torneo, marcá “Inscripciones abiertas”. Compartí el enlace de la página pública: los jugadores crean su cuenta e inscriben su pareja."],
  ["Revisá las inscripciones", "Cada pareja llega como “Pendiente”. Confirmala (por ejemplo, cuando paga) o rechazala. También podés agregar parejas a mano y marcar cabezas de serie."],
  ["Armá las zonas", "Cuando cierren las inscripciones, pasá el torneo a “En juego” y en cada categoría tocá “Sortear y armar zonas”. Se crean todos los partidos automáticamente."],
  ["Cargá horarios y resultados", "En cada partido podés poner día, hora y cancha, y cargar el resultado por sets o un W.O. Las tablas se actualizan solas."],
  ["Generá el cuadro", "Terminadas las zonas, tocá “Generar cuadro”. Se arma la llave (dieciseisavos, octavos, cuartos…) con los clasificados y pases libres si hacen falta."],
  ["Hasta la final", "Al cargar cada resultado del cuadro, el ganador avanza solo. Al cargar la final aparece el campeón en la página pública. 🏆"],
];

export default function Help() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="h-display text-4xl text-court-900">Cómo funciona</h1>
      <ol className="mt-6 space-y-3">
        {steps.map(([title, text], i) => (
          <li key={title} className="card flex gap-4 p-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ball font-display text-lg font-bold text-court-950">{i + 1}</span>
            <div>
              <div className="font-semibold text-slate-900">{title}</div>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="card mt-6 p-5 text-sm text-slate-600">
        <b>Tabla de zona:</b> partido ganado = 2 puntos, perdido = 1, perdido por W.O. = 0.
        Desempate: diferencia de sets, diferencia de games y resultado entre ambas parejas.
      </div>
    </div>
  );
}
