// Lógica pura del torneo: resultados, tablas de zona y cuadro eliminatorio.
// No toca la base de datos, así es fácil de probar.

export type SetScore = [number, number];

export type ParsedResult =
  | { ok: true; sets: SetScore[]; winner: 1 | 2 }
  | { ok: false; error: string };

/** Valida los sets de un partido. Acepta 1 set (pro set) o al mejor de 3. */
export function parseSets(raw: Array<[string, string]>): ParsedResult {
  const sets: SetScore[] = [];
  for (const [a, b] of raw) {
    if (a.trim() === "" && b.trim() === "") continue;
    const x = Number(a);
    const y = Number(b);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x > 99 || y > 99) {
      return { ok: false, error: "Los games deben ser números enteros." };
    }
    if (x === y) return { ok: false, error: `Un set no puede terminar empatado (${x}-${y}).` };
    sets.push([x, y]);
  }
  if (sets.length === 0) return { ok: false, error: "Cargá al menos un set." };
  if (sets.length > 3) return { ok: false, error: "Máximo 3 sets." };

  let w1 = 0;
  let w2 = 0;
  for (let i = 0; i < sets.length; i++) {
    if (sets.length > 1 && (w1 === 2 || w2 === 2)) {
      return { ok: false, error: "El partido ya estaba definido antes del último set." };
    }
    if (sets[i][0] > sets[i][1]) w1++;
    else w2++;
  }
  if (sets.length === 2 && w1 === 1) {
    return { ok: false, error: "Con 1 set por lado falta cargar el tercer set." };
  }
  return { ok: true, sets, winner: w1 > w2 ? 1 : 2 };
}

export function formatSets(sets: unknown): string {
  if (!Array.isArray(sets)) return "";
  return (sets as SetScore[]).map(([a, b]) => `${a}-${b}`).join("  ");
}

// ---------------------------------------------------------------- Zonas

export type StandingRow = {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
  points: number;
};

type MatchLike = {
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  sets: unknown;
  status: string;
};

/**
 * Tabla de posiciones. Partido ganado = 2 puntos, perdido = 1, perdido por W.O. = 0.
 * Desempate: puntos, diferencia de sets, diferencia de games, resultado entre ambos.
 */
export function computeStandings(teamIds: string[], matches: MatchLike[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const id of teamIds) {
    rows.set(id, {
      teamId: id, played: 0, won: 0, lost: 0,
      setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0, points: 0,
    });
  }
  const headToHead = new Map<string, string>(); // "a|b" -> ganador

  for (const m of matches) {
    if (!m.team1Id || !m.team2Id || !m.winnerId) continue;
    if (m.status !== "PLAYED" && m.status !== "WALKOVER") continue;
    const r1 = rows.get(m.team1Id);
    const r2 = rows.get(m.team2Id);
    if (!r1 || !r2) continue;
    const sets = (Array.isArray(m.sets) ? m.sets : []) as SetScore[];
    for (const [a, b] of sets) {
      r1.gamesFor += a; r1.gamesAgainst += b;
      r2.gamesFor += b; r2.gamesAgainst += a;
      if (a > b) { r1.setsFor++; r2.setsAgainst++; } else { r2.setsFor++; r1.setsAgainst++; }
    }
    r1.played++; r2.played++;
    const [win, lose] = m.winnerId === m.team1Id ? [r1, r2] : [r2, r1];
    win.won++; win.points += 2;
    lose.lost++; lose.points += m.status === "WALKOVER" ? 0 : 1;
    headToHead.set(`${m.team1Id}|${m.team2Id}`, m.winnerId);
    headToHead.set(`${m.team2Id}|${m.team1Id}`, m.winnerId);
  }

  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const sd = (b.setsFor - b.setsAgainst) - (a.setsFor - a.setsAgainst);
    if (sd !== 0) return sd;
    const gd = (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst);
    if (gd !== 0) return gd;
    const h = headToHead.get(`${a.teamId}|${b.teamId}`);
    if (h === a.teamId) return -1;
    if (h === b.teamId) return 1;
    return b.gamesFor - a.gamesFor;
  });
}

/** Reparte las parejas en zonas. Los cabezas de serie se distribuyen primero (en zig-zag). */
export function distributeGroups<T extends { id: string; seed: number | null }>(
  teams: T[],
  groupSize: number,
  random: () => number = Math.random,
): T[][] {
  const n = teams.length;
  const size = Math.max(2, groupSize);
  const numGroups = Math.max(1, Math.floor(n / size));
  const base = Math.floor(n / numGroups);
  const extra = n % numGroups;
  const capacity = Array.from({ length: numGroups }, (_, i) => base + (i < extra ? 1 : 0));

  const seeded = teams.filter((t) => t.seed != null).sort((a, b) => a.seed! - b.seed!);
  const unseeded = shuffle(teams.filter((t) => t.seed == null), random);
  const groups: T[][] = Array.from({ length: numGroups }, () => []);

  // zig-zag: A B C D D C B A A B ...
  let idx = 0;
  let dir = 1;
  for (const team of [...seeded, ...unseeded]) {
    let guard = 0;
    while (groups[idx].length >= capacity[idx] && guard++ < numGroups * 2) {
      [idx, dir] = step(idx, dir, numGroups);
    }
    groups[idx].push(team);
    [idx, dir] = step(idx, dir, numGroups);
  }
  return groups;
}

function step(idx: number, dir: number, n: number): [number, number] {
  if (n === 1) return [0, 1];
  const next = idx + dir;
  if (next >= n) return [n - 1, -1];
  if (next < 0) return [0, 1];
  return [next, dir];
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Todos contra todos, ordenado por fechas (método del círculo). */
export function roundRobin(ids: string[]): Array<[string, string]> {
  const list: Array<string | null> = [...ids];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const out: Array<[string, string]> = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a && b) out.push([a, b]);
    }
    list.splice(1, 0, list.pop()!);
  }
  return out;
}

// ---------------------------------------------------------------- Cuadro

export function roundName(round: number): string {
  switch (round) {
    case 2: return "Final";
    case 4: return "Semifinales";
    case 8: return "Cuartos de final";
    case 16: return "Octavos de final";
    case 32: return "Dieciseisavos de final";
    case 64: return "Treintaidosavos de final";
    default: return `Ronda de ${round}`;
  }
}

export function nextPow2(n: number) {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

/** Orden estándar de cabezas de serie para un cuadro de tamaño n: 1 v n, etc. */
export function seedPositions(n: number): number[] {
  let order = [1];
  while (order.length < n) {
    const size = order.length * 2;
    order = order.flatMap((s) => [s, size + 1 - s]);
  }
  return order;
}

export type Qualifier = { teamId: string; group: number; place: number };

/**
 * Arma la primera ronda del cuadro. Devuelve un array de tamaño potencia de 2
 * con el id de pareja en cada lugar o null (= pase libre / BYE).
 * Los 1° de zona son cabezas de serie; luego se reacomoda dentro de cada nivel
 * para que parejas de la misma zona se crucen lo más tarde posible.
 */
export function buildBracket(qualifiers: Qualifier[]): Array<string | null> {
  const ordered = [...qualifiers].sort((a, b) => a.place - b.place || a.group - b.group);
  const size = nextPow2(ordered.length);
  const positions = seedPositions(size);
  const slots: Array<Qualifier | null> = positions.map((seed) => ordered[seed - 1] ?? null);

  const levels = Math.log2(size);
  const cost = () => {
    let c = 0;
    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) {
        const a = slots[i];
        const b = slots[j];
        if (!a || !b || a.group !== b.group) continue;
        const meetRound = Math.floor(Math.log2(i ^ j)) + 1; // 1 = primera ronda
        c += 2 ** (levels - meetRound);
      }
    }
    return c;
  };

  let current = cost();
  let improved = true;
  let guard = 0;
  while (improved && current > 0 && guard++ < 200) {
    improved = false;
    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) {
        const a = slots[i];
        const b = slots[j];
        if (!a || !b || a.place !== b.place || a.place === 1) continue;
        slots[i] = b; slots[j] = a;
        const c = cost();
        if (c < current) { current = c; improved = true; }
        else { slots[i] = a; slots[j] = b; }
      }
    }
  }
  return slots.map((s) => s?.teamId ?? null);
}
