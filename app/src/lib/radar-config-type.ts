export interface CustomerBrand {
  /** Exact account value stored in the SharePoint "Account" column. */
  name: string;
  primary: string;
  dark: string;
  /** Bundled image import; omit to show the name as a wordmark. */
  logo?: string;
  /** Optional customer identity for the customer pages (from the customer's public website and brand guidelines). */
  identity?: CustomerIdentity;
}

export interface CustomerIdentity {
  /** The customer's own purpose line or tagline (keep it short). */
  purpose?: string;
  /** One sentence in our own words about what the customer does. */
  about?: string;
  /** Secondary brand colours, used for accents and the colour ribbon. */
  accents?: string[];
  /** Bundled hero image import in the customer's visual world. */
  hero?: string;
  /** Public key figures, e.g. { label: "employees", value: "~8,400" }. */
  facts?: { label: string; value: string }[];
  /** Year or source of the key figures. */
  factsNote?: string;
  website?: string;
}

export interface RadarConfig {
  appTitle: string;
  owner: string;
  team: string;
  tagline: string;
  defaultHourlyRateUSD: number;
  customers: CustomerBrand[];
  internal: (CustomerBrand & { label: string }) | null;
  microsoftLogo?: string;
  /** Customer-facing edition: hides internal views (AI cost meter, feature radar, analysis, evidence). */
  customerEdition?: boolean;
}
