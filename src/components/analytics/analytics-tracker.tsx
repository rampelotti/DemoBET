"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  trackImportantRoute,
  trackPageView,
  trackSiteVisitOnce,
} from "@/lib/analytics/gtm";

/**
 * Dispara dataLayer.push em pageviews e rotas críticas do App Router.
 *
 * Exemplos empilhados no dataLayer:
 * - { event: 'site_visit' }
 * - { event: 'mvp_page_view', page_path: '/social' }
 * - { event: 'enter_fantasy', fantasy_section: 'hub' }
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
