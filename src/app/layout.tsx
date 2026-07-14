import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";

import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";
import { SessionProvider } from "@/components/providers/session-provider";
import { GA_MEASUREMENT_ID, GTM_ID } from "@/lib/analytics/gtm";

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
      <GoogleTagManager gtmId={GTM_ID} />
      <body className="font-sans">
        <SessionProvider>
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          {children}
        </SessionProvider>
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
      </body>
    </html>
  );
}
