import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { RegistrationForm } from "./RegistrationForm";

export const metadata = { title: "Inscripción" };
export const dynamic = "force-dynamic";

export default async function InscripcionPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { slug } = await params;
  const { cat } = await searchParams;
  const user = await requireUser(`/torneos/${slug}/inscripcion${cat ? `?cat=${cat}` : ""}`);
  const t = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { order: "asc" },
        include: { _count: { select: { teams: { where: { status: { not: "REJECTED" } } } } } },
      },
    },
  });
  if (!t || t.status === "DRAFT") notFound();

  const open = t.status === "REGISTRATION";
  const categories = t.categories.map((c) => ({
    id: c.id,
    name: c.name,
    full: c.maxTeams != null && c._count.teams >= c.maxTeams,
    closed: c.phase !== "REGISTRATION",
    spots: c.maxTeams != null ? Math.max(0, c.maxTeams - c._count.teams) : null,
  }));

  return (
    <div className="container-page flex justify-center py-10">
      <div className="card w-full max-w-xl p-6 sm:p-8">
        <Link href={`/torneos/${t.slug}`} className="text-sm text-court-600 hover:underline">← {t.name}</Link>
        <h1 className="h-display mt-2 text-3xl text-court-900">Inscribir pareja</h1>
        {!open ? (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Las inscripciones de este torneo están cerradas.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              El organizador revisará la inscripción y la confirmará. Podés ver el estado en “Mis inscripciones”.
            </p>
            {t.price && <p className="mt-3 rounded-xl bg-court-50 p-3 text-sm text-court-800">💳 Inscripción: {t.price}</p>}
            <RegistrationForm
              categories={categories}
              defaultCategory={cat}
              defaultPlayer={user.name}
              defaultPhone={user.phone ?? ""}
            />
          </>
        )}
      </div>
    </div>
  );
}
