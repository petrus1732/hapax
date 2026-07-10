export function normalizePlayerSearchTerm(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}

export function normalizePublicPlayerId(value: unknown) {
  return String(value ?? '')
    .trim()
    .slice(0, 120);
}

export function publicPlayerDisplayName(player: { name?: string | null; id?: string | null }) {
  return player.name?.trim() || (player.id ? `Player ${player.id.slice(0, 8)}` : 'Unknown player');
}
