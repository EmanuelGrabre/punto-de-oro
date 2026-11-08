import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setUserRoleAction } from "@/app/actions/admin";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

const roles = { ADMIN: "Administrador", ORGANIZER: "Organizador", PLAYER: "Jugador" } as const;

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  return (
    <>
      <h1 className="h-display text-4xl text-court-900">Usuarios</h1>
      <p className="mt-1 text-sm text-slate-500">
        Los <b>organizadores</b> pueden crear y gestionar torneos. Los <b>administradores</b> además pueden cambiar permisos.
      </p>
      <div className="card mt-6 divide-y divide-slate-100">
        {users.map((u) => (
          <div key={u.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="font-semibold">{u.name} {u.id === me.id && <span className="text-xs text-slate-400">(vos)</span>}</div>
              <div className="text-xs text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ""} · desde {fmtDate(u.createdAt)}</div>
            </div>
            {u.id === me.id ? (
              <span className="badge bg-court-100 text-court-800">{roles[u.role]}</span>
            ) : (
              <form action={setUserRoleAction} className="flex gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <select name="role" defaultValue={u.role} className="input w-auto py-1.5 text-sm">
                  {Object.entries(roles).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="btn-ghost btn-sm">Guardar</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
