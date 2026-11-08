import Link from "next/link";
import { getCurrentUser, isOrganizer } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "./Logo";

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-30 bg-court-900 text-white">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-display text-2xl font-extrabold uppercase tracking-tight">
            Punto <span className="text-ball">de Oro</span>
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
          <Link href="/" className="hidden rounded-lg px-3 py-2 text-court-100 hover:bg-white/10 sm:block">Torneos</Link>
          {user && (
            <Link href="/mis-inscripciones" className="hidden rounded-lg px-3 py-2 text-court-100 hover:bg-white/10 sm:block">
              Mis inscripciones
            </Link>
          )}
          {isOrganizer(user) && (
            <Link href="/admin" className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20">Panel</Link>
          )}
          {user ? (
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ball text-sm font-bold text-court-950">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </summary>
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="font-semibold text-slate-900">{user.name}</div>
                  <div className="truncate text-xs text-slate-500">{user.email}</div>
                </div>
                <Link href="/mis-inscripciones" className="block px-4 py-2.5 hover:bg-slate-50">Mis inscripciones</Link>
                <form action={logoutAction}>
                  <button className="w-full px-4 py-2.5 text-left hover:bg-slate-50">Cerrar sesión</button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-court-100 hover:bg-white/10">Ingresar</Link>
              <Link href="/registro" className="btn-ball btn-sm">Crear cuenta</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
