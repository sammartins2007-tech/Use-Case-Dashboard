/**
 * AI Use Case Radar — instance configuration.
 * Copy this file to src/radar.config.ts and fill it in. It is the ONLY file (plus the logos in
 * src/assets/logos/) that differs between instances. Everything else is shared kit code.
 *
 * Logos: put a PNG per customer in src/assets/logos/ and import it below. Without a logo the
 * customer name is shown as a wordmark in its brand colour.
 */
import microsoft from "@/assets/logos/microsoft.png";
// import contoso from "@/assets/logos/contoso.png";
import type { RadarConfig } from "@/lib/radar-config-type";

export const RADAR: RadarConfig = {
  appTitle: "AI Use Case Radar",
  owner: "Your Name",
  team: "Your team",
  tagline: "Your team · AI Business Solutions",
  defaultHourlyRateUSD: 50,
  customers: [
    // name = the exact value used in the SharePoint "Account" column
    { name: "Contoso", primary: "#0F6CBD", dark: "#0A2E4F" /* , logo: contoso */ },
    { name: "Fabrikam", primary: "#B4009E", dark: "#4B0042" },
  ],
  /** Bucket for account-team work not tied to one customer; set to null to hide it. */
  internal: { name: "Internal", label: "Your team", primary: "#0078D4", dark: "#243A5E", logo: microsoft },
  microsoftLogo: microsoft,
  /** The radar's SharePoint site URL. Offline copies and PDFs are saved to its "Documents > Offline copies"
   *  folder; leave it out and the app only downloads them to the computer. */
  siteUrl: "https://contoso.sharepoint.com/sites/ai-use-case-radar",
  /** Read-only customer app (optional/read-only-customer-app): true hides every edit, AI call, file write and
   *  the Evidence tab. Keep it false (or remove it) in the owner's own app. */
  // readOnly: true,
};
