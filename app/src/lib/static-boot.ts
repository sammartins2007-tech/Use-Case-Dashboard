/**
 * Static mode boot. Imported by main.tsx BEFORE the app graph, so configuration-derived module
 * constants (brands, tabs, navigation) already see the reduced, read-only configuration.
 * Does nothing in the normal app (no `window.__UCX__`).
 *
 * Live read-only app (radar.config `readOnly: true`): reads go to the bound copy lists as usual; every
 * create, update, delete and connector action (AI agent, file save) is refused here, below the UI, so no
 * write path can reach SharePoint even if a control were left visible.
 */
import { RADAR } from "@/radar.config";
import { READ_ONLY_MESSAGE, UCX, type UcxSnapshot, type UcxTable } from "@/lib/static-copy";
import { LIVE_READ_ONLY, LIVE_READ_ONLY_MESSAGE } from "@/lib/read-only";
import { AIConsumptionService, AgentsService, CustomersService, FeatureRadarService, SharePointService, SignalsService, UseCasesService } from "@/data/services";

type Row = Record<string, unknown>;
type Pred = (r: Row) => boolean;

/** Field value for comparisons: choice columns are `{ Value }` objects. */
function fieldOf(r: Row, name: string): unknown {
  const v = r[name];
  return v && typeof v === "object" && "Value" in (v as Row) ? (v as Row).Value : v;
}

/**
 * Minimal OData $filter evaluator for the filters this app sends:
 * `Field eq 'text'`, `Field eq 0`, `ne`, `and`, `or`, `not`, parentheses.
 * Anything it cannot parse matches every row (the callers re-filter client-side).
 */
export function compileFilter(filter?: string): Pred {
  if (!filter?.trim()) return () => true;
  const tokens = filter.match(/'(?:[^']|'')*'|\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  const peek = () => tokens[i]?.toLowerCase();
  const literal = (t: string): string | number | boolean | null => {
    if (t.startsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
    if (t === "true" || t === "false") return t === "true";
    if (t === "null") return null;
    const n = Number(t);
    return Number.isNaN(n) ? t : n;
  };
  const same = (a: unknown, b: string | number | boolean | null) => {
    if (b === null) return a == null || a === "";
    if (typeof b === "number") return a != null && a !== "" && Number(a) === b;
    if (typeof b === "boolean") return a === b;
    return a != null && String(a) === b;
  };
  const primary = (): Pred => {
    if (peek() === "(") {
      i++;
      const p = or();
      if (peek() === ")") i++;
      return p;
    }
    if (peek() === "not") {
      i++;
      const p = primary();
      return (r) => !p(r);
    }
    const field = tokens[i++];
    const op = tokens[i++]?.toLowerCase();
    const raw = tokens[i++];
    if (!field || !op || raw == null) throw new Error("filter");
    const lit = literal(raw);
    if (op === "eq") return (r) => same(fieldOf(r, field), lit);
    if (op === "ne") return (r) => !same(fieldOf(r, field), lit);
    throw new Error("filter");
  };
  const and = (): Pred => {
    let p = primary();
    while (peek() === "and") {
      i++;
      const a = p, b = primary();
      p = (r) => a(r) && b(r);
    }
    return p;
  };
  const or = (): Pred => {
    let p = and();
    while (peek() === "or") {
      i++;
      const a = p, b = and();
      p = (r) => a(r) || b(r);
    }
    return p;
  };
  try {
    return or();
  } catch {
    return () => true;
  }
}

const refused = () => ({ success: false, error: new Error(READ_ONLY_MESSAGE) });

function staticClient(snap: UcxSnapshot) {
  const rows = (table: string) => (snap.tables[table as UcxTable] ?? []) as Row[];
  return {
    async retrieveRecordAsync(table: string, id: string) {
      const r = rows(table).find((x) => String(x.ID) === String(id));
      return r ? { success: true, data: r } : { success: false, error: new Error("Not in this offline copy") };
    },
    async retrieveMultipleRecordsAsync(table: string, options?: { filter?: string }) {
      return { success: true, data: rows(table).filter(compileFilter(options?.filter)) };
    },
    async createRecordAsync() {
      return refused();
    },
    async updateRecordAsync() {
      return refused();
    },
    async deleteRecordAsync() {
      throw new Error(READ_ONLY_MESSAGE);
    },
    async executeAsync() {
      return { success: false, error: new Error("AI is not available in a read-only copy.") };
    },
  };
}

if (UCX) {
  const client = staticClient(UCX);
  for (const svc of [UseCasesService, SignalsService, CustomersService, FeatureRadarService, AIConsumptionService, AgentsService]) {
    (svc as unknown as { client: unknown }).client = client;
  }
  const cfg = UCX.config;
  if (cfg) {
    // The offline viewer is built without any customer configuration: the snapshot brings its own account's.
    Object.assign(RADAR, { appTitle: cfg.appTitle, owner: cfg.owner, team: cfg.team, tagline: cfg.tagline, defaultHourlyRateUSD: cfg.defaultHourlyRateUSD });
    RADAR.customers.splice(0, RADAR.customers.length, ...cfg.customers);
    RADAR.internal = cfg.internal ? { ...cfg.internal, logo: cfg.internal.logo || RADAR.microsoftLogo } : null;
  } else {
    const account = UCX.account;
    const mine = RADAR.customers.filter((c) => c.name === account);
    RADAR.customers.splice(0, RADAR.customers.length, ...mine);
    if (mine.length) RADAR.internal = null;
  }
  RADAR.customerEdition = UCX.edition === "customer";
  // A one-use-case copy opens on that use case; a whole-account copy (empty id) opens on the welcome page.
  if (UCX.id && (!location.hash || location.hash === "#" || location.hash === "#/")) {
    history.replaceState(null, "", `#/use-case/${encodeURIComponent(UCX.id)}`);
  }
  document.title = UCX.id ? `${UCX.account ?? "Internal"} · ${UCX.title}` : RADAR.appTitle;
}

type Client = Record<string, (...a: unknown[]) => Promise<unknown>>;

/** Wraps a service's data client: reads pass through, writes and actions are refused. */
function readOnlyClient(inner: Client) {
  const refuse = () => {
    console.warn(`[read-only] write refused: ${LIVE_READ_ONLY_MESSAGE}`);
    return Promise.resolve({ success: false, error: new Error(LIVE_READ_ONLY_MESSAGE) });
  };
  return {
    retrieveRecordAsync: (...a: unknown[]) => inner.retrieveRecordAsync(...a),
    retrieveMultipleRecordsAsync: (...a: unknown[]) => inner.retrieveMultipleRecordsAsync(...a),
    createRecordAsync: refuse,
    updateRecordAsync: refuse,
    deleteRecordAsync: () => Promise.reject(new Error(LIVE_READ_ONLY_MESSAGE)),
    executeAsync: refuse,
  };
}

if (!UCX && LIVE_READ_ONLY) {
  for (const svc of [UseCasesService, SignalsService, CustomersService, FeatureRadarService, AIConsumptionService, AgentsService, SharePointService]) {
    const holder = svc as unknown as { client?: Client };
    if (holder.client) holder.client = readOnlyClient(holder.client) as unknown as Client;
  }
  document.title = RADAR.appTitle;
}
