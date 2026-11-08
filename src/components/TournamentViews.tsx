import { formatSets, roundName, type SetScore } from "@/lib/padel";
import { fmtDateTime, teamName } from "@/lib/format";
import type { CategoryFull, GroupFull, MatchFull } from "@/lib/queries";

type T = { id: string; player1: string; player2: string } | null;

export function TeamLabel({ team, short = false }: { team: T; short?: boolean }) {
  if (!team) return <span className="italic text-slate-400">A definir</span>;
  if (!short) return <>{teamName(team)}</>;
  const last = (n: string) => n.trim().split(/\s+/).slice(-1)[0];
  return <span title={teamName(team)}>{last(team.player1)} / {last(team.player2)}</span>;
}

export function GroupTable({ group }: { group: GroupFull }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2 font-semibold">#</th>
            <th className="py-2 pr-2 font-semibold">Pareja</th>
            <th className="px-1 py-2 text-center font-semibold" title="Partidos jugados">PJ</th>
            <th className="px-1 py-2 text-center font-semibold" title="Ganados">PG</th>
            <th className="px-1 py-2 text-center font-semibold" title="Diferencia de sets">DS</th>
            <th className="px-1 py-2 text-center font-semibold" title="Diferencia de games">DG</th>
            <th className="py-2 pl-1 text-center font-semibold" title="Puntos">Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.standings.map((r, i) => (
            <tr key={r.teamId} className="border-t border-slate-100">
              <td className="py-2 pr-2">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${r.qualified ? "bg-ball text-court-950" : "bg-slate-100 text-slate-500"}`}>
                  {i + 1}
                </span>
              </td>
              <td className="py-2 pr-2 font-medium">{teamName(r.team)}</td>
              <td className="px-1 py-2 text-center tabular-nums">{r.played}</td>
              <td className="px-1 py-2 text-center tabular-nums">{r.won}</td>
              <td className="px-1 py-2 text-center tabular-nums">{signed(r.setsFor - r.setsAgainst)}</td>
              <td className="px-1 py-2 text-center tabular-nums">{signed(r.gamesFor - r.gamesAgainst)}</td>
              <td className="py-2 pl-1 text-center font-bold tabular-nums">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function MatchLine({ match }: { match: MatchFull }) {
  const done = match.status === "PLAYED" || match.status === "WALKOVER";
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:gap-3">
      <div className="flex-1">
        <span className={match.winnerId === match.team1Id && done ? "font-semibold" : ""}><TeamLabel team={match.team1} /></span>
        <span className="mx-2 text-xs text-slate-400">vs</span>
        <span className={match.winnerId === match.team2Id && done ? "font-semibold" : ""}><TeamLabel team={match.team2} /></span>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {match.court && <span>{match.court}</span>}
        {match.scheduledAt && !done && <span>{fmtDateTime(match.scheduledAt)}</span>}
        {done && (
          <span className="font-mono text-sm font-semibold text-slate-900">
            {match.status === "WALKOVER" ? "W.O." : formatSets(match.sets)}
          </span>
        )}
      </div>
    </div>
  );
}

export function GroupCard({ group, showMatches = true }: { group: GroupFull; showMatches?: boolean }) {
  return (
    <div className="card p-4 sm:p-5">
      <h3 className="h-display mb-2 text-xl text-court-800">{group.name}</h3>
      <GroupTable group={group} />
      {showMatches && group.matches.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Partidos</div>
          {group.matches.map((m) => <MatchLine key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}

function BracketTeamRow({ team, sets, side, winner, played }: {
  team: T; sets: SetScore[]; side: 0 | 1; winner: boolean; played: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${winner ? "bg-court-50 font-semibold text-court-900" : ""}`}>
      <span className="min-w-0 flex-1 truncate text-sm"><TeamLabel team={team} short /></span>
      {played && sets.map((s, i) => (
        <span key={i} className={`w-5 text-center font-mono text-sm tabular-nums ${s[side] > s[1 - side] ? "text-slate-900" : "text-slate-400"}`}>
          {s[side]}
        </span>
      ))}
      {winner && <span className="h-2 w-2 rounded-full bg-ball-dark" aria-label="ganador" />}
    </div>
  );
}

export function Bracket({ knockout }: { knockout: CategoryFull["knockout"] }) {
  if (knockout.length === 0) return null;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-6">
        {knockout.map(({ round, matches }) => (
          <div key={round} className="flex w-60 flex-col">
            <div className="h-display mb-3 text-center text-sm text-slate-500">{roundName(round)}</div>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {matches.map((m) => {
                const played = m.status === "PLAYED" || m.status === "WALKOVER";
                const sets = (Array.isArray(m.sets) ? m.sets : []) as SetScore[];
                if (m.status === "BYE") {
                  const t = m.team1 ?? m.team2;
                  return (
                    <div key={m.id} className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-3 py-2 text-sm text-slate-500">
                      <TeamLabel team={t} short /> <span className="text-xs">· pase libre</span>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${round === 2 ? "border-ball-dark ring-2 ring-ball" : "border-slate-200"}`}>
                    <BracketTeamRow team={m.team1} sets={sets} side={0} played={played} winner={played && m.winnerId === m.team1Id} />
                    <div className="border-t border-slate-100" />
                    <BracketTeamRow team={m.team2} sets={sets} side={1} played={played} winner={played && m.winnerId === m.team2Id} />
                    {(m.status === "WALKOVER" || (!played && (m.scheduledAt || m.court))) && (
                      <div className="border-t border-slate-100 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                        {m.status === "WALKOVER" ? "Ganó por W.O." : [m.court, fmtDateTime(m.scheduledAt)].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Champion({ category }: { category: CategoryFull }) {
  const final = category.knockout.find((k) => k.round === 2)?.matches[0];
  if (!final?.winnerId) return null;
  const champ = final.winnerId === final.team1Id ? final.team1 : final.team2;
  return (
    <div className="card flex items-center gap-4 border-ball-dark bg-gradient-to-r from-court-900 to-court-700 p-5 text-white">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ball text-3xl">🏆</div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-ball">Campeones · {category.name}</div>
        <div className="h-display text-2xl sm:text-3xl">{teamName(champ)}</div>
      </div>
    </div>
  );
}
