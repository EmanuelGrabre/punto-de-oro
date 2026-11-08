import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-20 text-center">
      <div className="h-display text-7xl text-court-200">404</div>
      <p className="mt-2 text-slate-600">No encontramos esta página.</p>
      <Link href="/" className="btn-primary mt-6">Volver al inicio</Link>
    </div>
  );
}
