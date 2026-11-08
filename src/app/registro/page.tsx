import Link from "next/link";
import { prisma } from "@/lib/db";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Crear cuenta" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const first = (await prisma.user.count()) === 0;
  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="h-display text-3xl text-court-900">Crear cuenta</h1>
        {first ? (
          <p className="mt-2 rounded-xl bg-court-50 p-3 text-sm text-court-800">
            Esta es la primera cuenta del sitio: tendrá permisos de <b>administrador</b>.
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Con tu cuenta podés inscribir parejas y seguir tus partidos.</p>
        )}
        <RegisterForm next={next ?? "/"} />
        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tenés cuenta?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-court-600 hover:underline">Ingresá</Link>
        </p>
      </div>
    </div>
  );
}
