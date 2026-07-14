import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { SessionProvider } from "@/components/providers/session-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DemoScore — Apostas simuladas com Coins",
    template: "%s · DemoScore",
  },
  description:
    "Aposte em partidas reais usando Coins, sem dinheiro de verdade. Modo simulação 100% gratuito.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
