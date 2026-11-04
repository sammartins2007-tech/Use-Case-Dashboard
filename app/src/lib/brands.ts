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
