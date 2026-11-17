/**
 * Read-only offline copy of one use case.
 *
 * The "…" menu on a use case page fetches the pre-built offline viewer (public/offline-viewer.txt,
 * `npm run build:viewer`) and inserts a JSON snapshot of that use case as `window.__UCX__`. When the
 * snapshot is present at boot the app runs in static mode: reads come from the snapshot, writes and AI
 * calls are refused, the router uses the URL hash (the file is opened from disk) and the configuration
 * (own account only, logo and hero as data URIs) comes from `config`.
 */
import type { CustomerBrand, RadarConfig } from "@/lib/radar-config-type";

export type UcxEdition = "internal" | "customer";

/** The configuration an offline copy carries: neutral fields plus the use case's own account only. */
export interface UcxConfig {
  appTitle: string;
  owner: string;
  team: string;
  tagline: string;
  defaultHourlyRateUSD: number;
  customers: CustomerBrand[];
  /** Set only for an "Internal" use case; its logo is the viewer's Microsoft logo. */
  internal: RadarConfig["internal"];
}

export type UcxTable = "usecases_704f56" | "signals_704f56" | "customers_704f56" | "featureradar_704f56" | "aiconsumption_704f56";

export interface UcxSnapshot {
  v: 1;
  edition: UcxEdition;
  /** The use case the copy opens on; empty for a whole-account copy (opens on the welcome page). */
  id: string;
  account?: string;
  title: string;
  /** ISO timestamp of the export. */
  createdAt: string;
  config?: UcxConfig;
  tables: Partial<Record<UcxTable, Record<string, unknown>[]>>;
}

function readSnapshot(): UcxSnapshot | null {
  if (typeof window === "undefined") return null;
  const s = (window as unknown as { __UCX__?: UcxSnapshot }).__UCX__;
  return s && typeof s === "object" && s.v === 1 && s.tables ? s : null;
}

export const UCX: UcxSnapshot | null = readSnapshot();
export const IS_STATIC = UCX !== null;
export const READ_ONLY_MESSAGE = "This is a read-only copy.";
