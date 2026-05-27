/**
 * Tiny color helpers for deriving shades in JS (charts, dynamic accents, etc.).
 * For CSS, prefer `color-mix(in oklab, var(--x) N%, #000 | #fff | transparent)`
 * — the token file derives --primary-hover/soft/glow that way.
 */

type RGB = [number, number, number];

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function parseHex(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => clamp(Math.round(x)).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Linear blend of two hex colors. `amount` = weight of `b` (0–1). */
export function mix(a: string, b: string, amount: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex([
    r1 + (r2 - r1) * amount,
    g1 + (g2 - g1) * amount,
    b1 + (b2 - b1) * amount,
  ]);
}

/** Lighten toward white by `amount` (0–1). */
export function lighten(hex: string, amount = 0.1): string {
  return mix(hex, "#ffffff", amount);
}

/** Darken toward black by `amount` (0–1). */
export function darken(hex: string, amount = 0.1): string {
  return mix(hex, "#000000", amount);
}

/** Same color as an rgba() string with the given alpha (0–1). */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
