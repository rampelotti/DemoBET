"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  trackImportantRoute,
  trackPageView,
  trackSiteVisitOnce,
} from "@/lib/analytics/gtm";

/**
 * Dispara page views e eventos de rota no App Router (client navigations).
 * GTM base (script) vem de `@next/third-parties` no root layout.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackSiteVisitOnce();
  }, []);

  useEffect(() => {
    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;

    trackPageView(path);
    trackImportantRoute(pathname);
  }, [pathname, searchParams]);

  return null;
}
