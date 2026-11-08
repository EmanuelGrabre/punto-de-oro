import Link from "next/link";
import { requireOrganizer } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOrganizer();
  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page flex items-center gap-1 overflow-x-auto py-2 text-sm font-medium">
          <span className="mr-3 text-xs font-bold uppercase tracking-widest text-slate-400">Panel</span>
          <Link href="/admin" className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">Torneos</Link>
          {user.role === "ADMIN" && (
            <Link href="/admin/usuarios" className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">Usuarios</Link>
          )}
          <Link href="/admin/ayuda" className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">Cómo funciona</Link>
        </div>
      </div>
      <div className="container-page py-8">{children}</div>
    </div>
  );
}
