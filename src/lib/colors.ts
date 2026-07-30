// Curated, minimal accent palette. Sentiments get one color each, assigned
// automatically (round-robin by creation order) so the UI stays restrained
// instead of a rainbow of user-picked chaos.
export const SENTIMENT_PALETTE = [
  "#8b7bff", // violet
  "#ff6b8b", // rose
  "#ffb648", // amber
  "#37d39b", // emerald
  "#4bb8ff", // sky
  "#ff7a59", // coral
  "#c07bff", // purple
  "#5ad1c8", // teal
];

/** Pick the next unused palette color; fall back to hashing the label. */
export function pickSentimentColor(usedColors: string[], label: string): string {
  const free = SENTIMENT_PALETTE.find((c) => !usedColors.includes(c));
  if (free) return free;
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return SENTIMENT_PALETTE[Math.abs(hash) % SENTIMENT_PALETTE.length];
}

/** Translucent version of an accent color for thin fills / bars. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
