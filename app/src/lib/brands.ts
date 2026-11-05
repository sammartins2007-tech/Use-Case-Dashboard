import { RADAR } from "@/radar.config";
import type { CustomerBrand } from "@/lib/radar-config-type";

export type Brand = CustomerBrand;

const FALLBACK: Brand = { name: "Microsoft", primary: "#0078D4", dark: "#243A5E", logo: RADAR.microsoftLogo };

export const BRANDS: Record<string, Brand> = Object.fromEntries([
  ...RADAR.customers.map((c) => [c.name, c] as const),
  ...(RADAR.internal ? [["Internal", { ...RADAR.internal, name: RADAR.internal.label }] as const] : []),
]);

export function brandOf(account?: string): Brand {
  return BRANDS[account ?? "Internal"] ?? FALLBACK;
}

export const MICROSOFT_LOGO = RADAR.microsoftLogo;
export const INTERNAL_LABEL = RADAR.internal?.label ?? "Internal";
export const SINGLE_CUSTOMER = RADAR.customers.length === 1 && !RADAR.internal ? RADAR.customers[0].name : null;

function lum(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
}

/** The brand colour, deepened just enough to carry white text (WCAG AA 4.5:1). */
export function inkOf(hex: string): string {
  let h = hex;
  for (let i = 0; i < 20 && 1.05 / (lum(h) + 0.05) < 4.5; i++) {
    const n = parseInt(h.replace("#", ""), 16);
    const f = (v: number) => Math.round(v * 0.93);
    h = `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`;
  }
  return h;
}
