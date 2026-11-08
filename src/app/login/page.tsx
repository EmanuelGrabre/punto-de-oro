import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="h-display text-3xl text-court-900">Ingresar</h1>
        <p className="mt-1 text-sm text-slate-500">Accedé para inscribirte o administrar torneos.</p>
        <LoginForm next={next ?? "/"} />
        <p className="mt-6 text-center text-sm text-slate-500">
          ¿No tenés cuenta?{" "}
          <Link href={`/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-court-600 hover:underline">
            Creala acá
          </Link>
        </p>
      </div>
    </div>
  );
}
