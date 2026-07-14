/**
 * Helpers de analytics via Google Tag Manager + GA4 (gtag).
 * Eventos enxutos para validar o MVP (aquisição, ativação, retenção, uso core).
 */

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-532TPKJ7";
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-CGV712XCF0";

type DataLayerObject = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerObject[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function pushDataLayer(payload: DataLayerObject) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

/** Evento GTM/GA4 padronizado (dataLayer + gtag quando disponível). */
export function trackEvent(event: string, params?: DataLayerObject) {
  pushDataLayer({
    event,
    ...params,
  });

  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

const SESSION_VISIT_KEY = "demoscore_session_visit";

/**
 * Conta 1 visita de sessão por aba/navegador (sessionStorage).
 * Complementa page_view para métrica “quantas vezes a pessoa entrou no site”.
 */
export function trackSiteVisitOnce() {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(SESSION_VISIT_KEY)) return;
    sessionStorage.setItem(SESSION_VISIT_KEY, "1");
    trackEvent("site_visit", {
      event_category: "acquisition",
      event_label: "session_start",
    });
  } catch {
    // sessionStorage pode falhar em modo privado restrito
    trackEvent("site_visit", {
      event_category: "acquisition",
      event_label: "session_start_fallback",
    });
  }
}

export function trackPageView(path: string, title?: string) {
  trackEvent("mvp_page_view", {
    event_category: "engagement",
    page_path: path,
    page_title: title ?? document.title,
  });
}

/** Mapeia rotas importantes → eventos de negócio do MVP. */
export function trackImportantRoute(path: string) {
  if (path === "/" || path === "") {
    trackEvent("view_home", { event_category: "engagement" });
    return;
  }

  if (path.startsWith("/social")) {
    trackEvent("enter_fantasy", {
      event_category: "activation",
      page_path: path,
      fantasy_section: path.replace(/^\/social\/?/, "") || "hub",
    });

    if (path.startsWith("/social/ranking")) {
      trackEvent("view_fantasy_ranking", { event_category: "engagement" });
    } else if (path.startsWith("/social/amigos")) {
      trackEvent("view_fantasy_friends", { event_category: "engagement" });
    } else if (path.startsWith("/social/grupos")) {
      trackEvent("view_fantasy_groups", { event_category: "engagement" });
    }
    return;
  }

  if (path.startsWith("/jogos/")) {
    trackEvent("view_match", {
      event_category: "activation",
      match_slug: path.replace("/jogos/", ""),
    });
    return;
  }

  if (path === "/register") {
    trackEvent("view_register", { event_category: "acquisition" });
    return;
  }

  if (path === "/login") {
    trackEvent("view_login", { event_category: "acquisition" });
    return;
  }

  if (path === "/meus-palpites") {
    trackEvent("view_my_bets", { event_category: "retention" });
    return;
  }

  if (path.startsWith("/dashboard/desempenho")) {
    trackEvent("view_performance", { event_category: "retention" });
    return;
  }

  if (path === "/dashboard") {
    trackEvent("view_dashboard", { event_category: "retention" });
    return;
  }
}

export function trackSignUp() {
  trackEvent("sign_up", {
    event_category: "acquisition",
    method: "credentials",
  });
}

export function trackLogin() {
  trackEvent("login", {
    event_category: "acquisition",
    method: "credentials",
  });
}

export function trackCtaClick(ctaId: string, ctaLabel: string) {
  trackEvent("cta_click", {
    event_category: "acquisition",
    cta_id: ctaId,
    cta_label: ctaLabel,
  });
}

export function trackAddToSlip(params: {
  matchId: string;
  marketType?: string;
  oddValue: number;
}) {
  trackEvent("add_to_betslip", {
    event_category: "activation",
    match_id: params.matchId,
    market_type: params.marketType,
    odd_value: params.oddValue,
  });
}

export function trackPlaceBet(params: {
  selectionsCount: number;
  totalStake: number;
  groupCount: number;
}) {
  trackEvent("place_bet", {
    event_category: "activation",
    selections_count: params.selectionsCount,
    total_stake: params.totalStake,
    group_count: params.groupCount,
  });
}
