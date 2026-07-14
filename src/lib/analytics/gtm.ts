/**
 * Google Tag Manager + GA4 — empilha eventos no `dataLayer` para o GTM ler.
 *
 * Padrão usado em todos os eventos:
 *   window.dataLayer = window.dataLayer || [];
 *   window.dataLayer.push({ event: '...', ...params });
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

/** Inicializa e faz `dataLayer.push` (único ponto de escrita no dataLayer). */
export function pushDataLayer(payload: DataLayerObject) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

/**
 * Dispara um evento customizado no GTM.
 * Ex.: dataLayer.push({ event: 'enter_fantasy', event_category: 'activation' })
 */
export function trackEvent(event: string, params: DataLayerObject = {}) {
  pushDataLayer({
    event,
    ...params,
  });

  // Espelha no gtag/GA4 quando o snippet já carregou.
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

const SESSION_VISIT_KEY = "demoscore_session_visit";

/** 1× por sessão de navegador — “quantas vezes a pessoa entrou no site”. */
export function trackSiteVisitOnce() {
  if (typeof window === "undefined") return;

  try {
    if (sessionStorage.getItem(SESSION_VISIT_KEY)) return;
    sessionStorage.setItem(SESSION_VISIT_KEY, "1");
  } catch {
    // segue mesmo sem sessionStorage
  }

  // dataLayer.push({ event: 'site_visit', ... })
  trackEvent("site_visit", {
    event_category: "acquisition",
    event_label: "session_start",
  });
}

/** Pageview virtual (App Router / SPA). */
export function trackPageView(path: string, title?: string) {
  const pageTitle = title ?? (typeof document !== "undefined" ? document.title : path);

  // dataLayer.push({ event: 'mvp_page_view', page_path, page_title })
  trackEvent("mvp_page_view", {
    event_category: "engagement",
    page_path: path,
    page_title: pageTitle,
  });

  // Formato comum de SPA no GTM
  // dataLayer.push({ event: 'virtualPageView', pageUrl, pageTitle })
  trackEvent("virtualPageView", {
    pageUrl: path,
    pageTitle,
  });
}

/** Rotas importantes do MVP → eventos de negócio. */
export function trackImportantRoute(path: string) {
  if (path === "/" || path === "") {
    // dataLayer.push({ event: 'view_home' })
    trackEvent("view_home", { event_category: "engagement", page_path: path });
    return;
  }

  if (path.startsWith("/social")) {
    const fantasySection = path.replace(/^\/social\/?/, "") || "hub";

    // dataLayer.push({ event: 'enter_fantasy', fantasy_section })
    trackEvent("enter_fantasy", {
      event_category: "activation",
      page_path: path,
      fantasy_section: fantasySection,
    });

    if (path.startsWith("/social/ranking")) {
      trackEvent("view_fantasy_ranking", { event_category: "engagement", page_path: path });
    } else if (path.startsWith("/social/amigos")) {
      trackEvent("view_fantasy_friends", { event_category: "engagement", page_path: path });
    } else if (path.startsWith("/social/grupos")) {
      trackEvent("view_fantasy_groups", { event_category: "engagement", page_path: path });
    } else if (path === "/social") {
      trackEvent("view_fantasy_hub", { event_category: "engagement", page_path: path });
    }
    return;
  }

  if (path.startsWith("/jogos/")) {
    // dataLayer.push({ event: 'view_match', match_slug })
    trackEvent("view_match", {
      event_category: "activation",
      page_path: path,
      match_slug: path.replace("/jogos/", ""),
    });
    return;
  }

  if (path === "/register") {
    trackEvent("view_register", { event_category: "acquisition", page_path: path });
    return;
  }

  if (path === "/login") {
    trackEvent("view_login", { event_category: "acquisition", page_path: path });
    return;
  }

  if (path === "/meus-palpites") {
    trackEvent("view_my_bets", { event_category: "retention", page_path: path });
    return;
  }

  if (path.startsWith("/dashboard/desempenho")) {
    trackEvent("view_performance", { event_category: "retention", page_path: path });
    return;
  }

  if (path === "/dashboard") {
    trackEvent("view_dashboard", { event_category: "retention", page_path: path });
    return;
  }
}

export function trackSignUp() {
  // dataLayer.push({ event: 'sign_up', method: 'credentials' })
  trackEvent("sign_up", {
    event_category: "acquisition",
    method: "credentials",
  });
}

export function trackLogin() {
  // dataLayer.push({ event: 'login', method: 'credentials' })
  trackEvent("login", {
    event_category: "acquisition",
    method: "credentials",
  });
}

export function trackCtaClick(ctaId: string, ctaLabel: string) {
  // dataLayer.push({ event: 'cta_click', cta_id, cta_label })
  trackEvent("cta_click", {
    event_category: "acquisition",
    cta_id: ctaId,
    cta_label: ctaLabel,
  });
}

export function trackNavClick(navId: string, navLabel: string, href: string) {
  // dataLayer.push({ event: 'nav_click', nav_id, nav_label, href })
  trackEvent("nav_click", {
    event_category: "engagement",
    nav_id: navId,
    nav_label: navLabel,
    href,
  });
}

export function trackAddToSlip(params: {
  matchId: string;
  marketType?: string;
  oddValue: number;
}) {
  // dataLayer.push({ event: 'add_to_betslip', match_id, odd_value })
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
  // dataLayer.push({ event: 'place_bet', selections_count, total_stake })
  trackEvent("place_bet", {
    event_category: "activation",
    selections_count: params.selectionsCount,
    total_stake: params.totalStake,
    group_count: params.groupCount,
  });
}
