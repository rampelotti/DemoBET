interface CancellableMatch {
  status: string;
  startTime: Date | string;
}

/** A partida é considerada "live" (ou já resolvida) a partir do horário de início. */
export function hasMatchStarted(match: CancellableMatch, now: Date = new Date()): boolean {
  return match.status !== "SCHEDULED" || new Date(match.startTime) <= now;
}

/**
 * "Encerrar aposta": só é permitido enquanto a aposta estiver em aberto e
 * nenhuma das partidas envolvidas tiver começado (mesma regra usada pela
 * ação `cancelBet` no servidor — aqui é só para decidir se o botão aparece).
 */
export function canCancelBet(
  bet: { status: string; selections: { match: CancellableMatch }[] },
  now: Date = new Date()
): boolean {
  if (bet.status !== "OPEN" || bet.selections.length === 0) return false;
  return bet.selections.every((selection) => !hasMatchStarted(selection.match, now));
}
