export interface CustomerBrand {
  /** Exact account value stored in the SharePoint "Account" column. */
  name: string;
  primary: string;
  dark: string;
  /** Bundled image import; omit to show the name as a wordmark. */
  logo?: string;
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
}
