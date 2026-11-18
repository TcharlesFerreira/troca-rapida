import type { Metadata } from "next";
import { Barlow_Condensed, Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const titulo = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-titulo", display: "swap" });
const corpo = Source_Sans_3({ subsets: ["latin"], variable: "--font-corpo", display: "swap" });
const placa = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-placa", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Troca Rápida", template: "%s | Troca Rápida" },
  description: "Gestão de oficina: ordens de serviço, histórico por placa e trocas de óleo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${corpo.variable} ${placa.variable}`}>
      <body>
        <a
          href="#conteudo"
          className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
