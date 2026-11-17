/**
 * Configuration compiled into the offline viewer (public/offline-viewer.txt, built by `npm run build:viewer`).
 * Deliberately neutral: no customer names or logos. An offline copy brings its own account's
 * configuration (name, colours, logo and hero as data URIs) in `window.__UCX__.config`; static-boot.ts
 * applies it before the app starts. vite.viewer.config.ts swaps this file in for `@/radar.config`.
 */
import microsoft from "@/assets/logos/microsoft.png";
import type { RadarConfig } from "@/lib/radar-config-type";

export const RADAR: RadarConfig = {
  appTitle: "AI Use Case Radar",
  owner: "",
  team: "",
  tagline: "",
  defaultHourlyRateUSD: 50,
  customers: [],
  internal: null,
  microsoftLogo: microsoft,
};
