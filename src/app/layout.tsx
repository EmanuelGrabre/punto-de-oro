import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { Header } from "@/components/Header";
import "./globals.css";

const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-barlow" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Punto de Oro · Torneos de pádel", template: "%s · Punto de Oro" },
  description: "Inscripciones, zonas, resultados y cuadros de torneos de pádel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${barlow.variable} ${inter.variable}`}>
      <body className="min-h-screen font-sans antialiased flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-slate-200 bg-white">
          <div className="container-page flex flex-col gap-1 py-6 text-sm text-slate-500 sm:flex-row sm:justify-between">
            <span><span className="font-display font-bold uppercase text-court-700">Punto de Oro</span> · Torneos de pádel</span>
            <span>Inscripciones, zonas y cuadros en un solo lugar</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
