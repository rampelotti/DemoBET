/**
 * Gera slugs legíveis para URLs (ex.: "/jogos/france-spain"), a partir dos
 * nomes dos times de uma partida. Usado na importação (`matches-repository`)
 * e para resolver a rota pública `/jogos/[slug]`.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildMatchSlug(homeTeam: string, awayTeam: string): string {
  return `${slugify(homeTeam)}-x-${slugify(awayTeam)}`;
}
