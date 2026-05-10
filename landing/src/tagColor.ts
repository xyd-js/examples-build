// Stable color class derived from tag string. Returns one of color-1..color-7.
const PALETTE = 7;

export function tagColorClass(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) | 0;
  const idx = (Math.abs(h) % PALETTE) + 1;
  return `color-${idx}`;
}
