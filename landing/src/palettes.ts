// Hand-tuned palettes for MeshGradient backgrounds on featured cards.
// Each entry is a 4-color set; we pick by slug hash so a given example
// always renders with the same palette (stable across reloads).

export const PALETTES: string[][] = [
  ["#a5b4fc", "#c4b5fd", "#f5d0fe", "#fbcfe8"], // soft violet (matches OpenAI cookbook hero cards)
  ["#fde68a", "#fdba74", "#fda4af", "#f9a8d4"], // peach → rose
  ["#a7f3d0", "#67e8f9", "#bae6fd", "#c7d2fe"], // mint → sky
  ["#fef3c7", "#fbcfe8", "#e9d5ff", "#bae6fd"], // butter → lilac
  ["#fecaca", "#fbcfe8", "#ddd6fe", "#a5b4fc"], // blush → indigo
  ["#bbf7d0", "#bae6fd", "#c4b5fd", "#fbcfe8"], // green → pink
  ["#fef9c3", "#fde68a", "#fcd34d", "#fbbf24"], // sunshine
  ["#cffafe", "#a5f3fc", "#a5b4fc", "#c4b5fd"], // ice → violet
];

export function pickPalette(seed: string): string[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(h) % PALETTES.length]!;
}
