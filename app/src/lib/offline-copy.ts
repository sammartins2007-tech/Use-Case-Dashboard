/**
 * Builds the full offline copy of one use case in the browser: the pre-built offline viewer
 * (public/offline-viewer.txt from `npm run build:viewer`: the whole app with JS, CSS, fonts and images
 * inlined, no data and no customer configuration) plus a JSON snapshot of that use case and its own
 * account's configuration in `window.__UCX__`. Opened from disk, the copy boots in static mode (see
 * static-boot.ts): same pages, read-only. Works the same from the dev server and the published app.
 */
import { RADAR } from "@/radar.config";
import { UseCasesService, SignalsService, CustomersService, FeatureRadarService } from "@/data/services";
import type { CustomerBrand } from "@/lib/radar-config-type";
import type { UcxConfig, UcxEdition, UcxSnapshot } from "@/lib/static-copy";
import { scrubDeep, scrubText } from "@/lib/link-scrub";

type Row = Record<string, unknown>;
type Result = { success: boolean; data?: unknown; error?: unknown; skipToken?: string };

/** Columns that never leave Microsoft (same list as the customer edition hides). */
const INTERNAL_COLUMNS = ["Analysis", "Evidence", "Sources", "Insights", "LastSignal", "SignalCount", "FinOpsBasis"];
/** Not needed by the pages; dropped from both copies (people, links to other use cases, SharePoint metadata). */
const DROP_COLUMNS = ["RelatedUseCases", "Author", "Editor", "Author#Claims", "Editor#Claims"];
const JSON_KINDS = new Set(["solution", "whatif-case", "whatif-estate"]);
/** The offline viewer, served as a plain file next to the app's index.html (see vite.viewer.config.ts). */
export const VIEWER_FILE = "offline-viewer.txt";
const VIEWER_MARKER = '<meta name="ucx-viewer" content="1" />';
const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", avif: "image/avif" };

const q = (v: string) => v.replace(/'/g, "''");
const isClarify = (s: string) => s.trim().toUpperCase().startsWith("CLARIFY");
const stripClarifyLines = (s: string) => s.split("\n").filter((l) => !isClarify(l)).join("\n");

async function readAll(get: (skipToken?: string) => Promise<Result>): Promise<Row[]> {
  const out: Row[] = [];
  let skipToken: string | undefined;
  for (let i = 0; i < 40; i++) {
    const r = await get(skipToken);
    if (!r.success) throw r.error instanceof Error ? r.error : new Error("The data could not be read");
    out.push(...((r.data ?? []) as Row[]));
    skipToken = r.skipToken?.trim() || undefined;
    if (!skipToken) break;
  }
  return out;
}

function cleanRow(r: Row, drop: string[]): Row {
  const o: Row = {};
  for (const [k, v] of Object.entries(r)) {
    if (k.startsWith("@") || k.startsWith("{") || drop.includes(k)) continue;
    o[k] = v;
  }
  return o;
}

/** Recursively removes CLARIFY questions (internal) from a design document. */
function stripClarify(o: unknown): unknown {
  if (Array.isArray(o)) return o.filter((v) => !(typeof v === "string" && isClarify(v))).map(stripClarify);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, stripClarify(v)]));
  if (typeof o === "string" && o.includes("\n")) return stripClarifyLines(o);
  return o;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (name: string) => new RegExp(`(?<![A-Za-z0-9+/_$])${esc(name)}(?![A-Za-z0-9+/_$])`, "gi");

function redact<T>(o: T, names: string[]): T {
  if (!names.length) return o;
  const res = names.map(wordRe);
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return res.reduce((s, re) => s.replace(re, "another company"), v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(o) as T;
}

/** Reads everything the use case pages show for one use case, in the connector's own row shape. */
async function snapshotOf(id: string, edition: UcxEdition): Promise<UcxSnapshot> {
  const customer = edition === "customer";
  const ucRes = (await UseCasesService.get(id)) as Result;
  if (!ucRes.success || !ucRes.data) throw new Error("The use case could not be read");
  const uc = ucRes.data as Row;
  const title = String(uc.Title ?? "");
  const accountRaw = uc.Account as { Value?: string } | string | undefined;
  const account = typeof accountRaw === "string" ? accountRaw : accountRaw?.Value || undefined;

  const signals = customer ? [] : await readAll((skipToken) => SignalsService.getAll({ filter: `UseCaseRef eq '${q(title)}'`, top: 500, skipToken }) as Promise<Result>);
  const settings = (await readAll((skipToken) => CustomersService.getAll({ filter: "DocKind eq 'customer'", top: 500, skipToken }) as Promise<Result>)).filter(
    (r) => String(r.Title ?? "") === (account ?? "Internal"),
  );
  let docs = await readAll((skipToken) => CustomersService.getAll({ filter: `DocRef eq '${q(id)}' and DocStatus eq 'Current'`, top: 500, skipToken }) as Promise<Result>);
  docs = docs.filter((r) => String(r.DocRef ?? "") === id && String(r.DocStatus ?? "") === "Current" && r.DocKind !== "customer");

  // A "what if Microsoft?" case points at the customer's platform document (keyed by its name).
  const assemble = (kind: string, rows: Row[]) => {
    const byVersion = new Map<string, Row[]>();
    for (const r of rows.filter((x) => x.DocKind === kind)) {
      const k = String(r.DocVersion ?? 1);
      byVersion.set(k, [...(byVersion.get(k) ?? []), r]);
    }
    return [...byVersion.values()].map((rs) => {
      rs.sort((a, b) => Number(a.DocSeq ?? 0) - Number(b.DocSeq ?? 0));
      return { rows: rs, text: rs.map((r) => String(r.DocBody ?? "")).join("") };
    });
  };
  for (const { text } of assemble("whatif-case", docs)) {
    try {
      const estate = (JSON.parse(text) as { estate?: string }).estate;
      if (estate) {
        const rows = await readAll((skipToken) => CustomersService.getAll({ filter: `DocKind eq 'whatif-estate' and DocRef eq '${q(estate)}' and DocStatus eq 'Current'`, top: 500, skipToken }) as Promise<Result>);
        docs.push(...rows.filter((r) => r.DocKind === "whatif-estate" && String(r.DocRef ?? "") === estate && String(r.DocStatus ?? "") === "Current"));
      }
    } catch {
      /* not valid JSON: the page would not show it either */
    }
  }

  // Re-assemble every document as one chunk: CLARIFY questions removed (customer copy) and internal links removed (both).
  const kept: Row[] = [];
  for (const kind of new Set(docs.map((d) => String(d.DocKind ?? "")))) {
    if (kind === "image") {
      kept.push(...docs.filter((d) => d.DocKind === kind).map((d) => ({ ...scrubDeep({ ...d, DocBody: "" }), DocBody: d.DocBody })));
      continue;
    }
    for (const { rows, text } of assemble(kind, docs)) {
      let body: string;
      try {
        const doc = JSON.parse(text) as unknown;
        body = JSON.stringify(scrubDeep(customer && JSON_KINDS.has(kind) ? stripClarify(doc) : doc));
      } catch {
        body = scrubText(customer ? stripClarifyLines(text) : text);
      }
      kept.push({ ...scrubDeep({ ...rows[0], DocBody: "" }), DocSeq: 0, DocChunks: 1, DocBody: body });
    }
  }
  docs = kept;

  const features = customer
    ? []
    : (await readAll((skipToken) => FeatureRadarService.getAll({ top: 500, skipToken }) as Promise<Result>)).filter((f) => String(f.RelevantUseCases ?? "").includes(title));

  let ucRow = cleanRow(uc, customer ? [...DROP_COLUMNS, ...INTERNAL_COLUMNS] : DROP_COLUMNS);
  if (customer && typeof ucRow.OpenQuestions === "string") ucRow.OpenQuestions = stripClarifyLines(ucRow.OpenQuestions);
  ucRow = scrubDeep(ucRow);
  let customers = [...scrubDeep(settings), ...docs].map((r) => cleanRow(r, DROP_COLUMNS));
  if (customer) {
    const others = RADAR.customers.map((c) => c.name).filter((n) => n !== account);
    ucRow = redact(ucRow, others);
    customers = customers.map((r) => (r.DocKind === "image" ? r : redact(r, others)));
  }
  return {
    v: 1,
    edition,
    id,
    account,
    title,
    createdAt: new Date().toISOString(),
    config: await configOf(account),
    tables: {
      usecases_704f56: [ucRow],
      signals_704f56: scrubDeep(signals.map((r) => cleanRow(r, DROP_COLUMNS))),
      customers_704f56: customers,
      featureradar_704f56: scrubDeep(features.map((r) => cleanRow(r, DROP_COLUMNS))),
      aiconsumption_704f56: [],
    },
  };
}

function base64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** A file the copy needs (the viewer, the account's logo) could not be read: names the URL and every attempt. */
export class OfflineCopyAssetError extends Error {
  readonly url: string;
  readonly reason: string;
  constructor(url: string, reason: string) {
    super(`Could not read ${url} — ${reason}`);
    this.name = "OfflineCopyAssetError";
    this.url = url;
    this.reason = reason;
  }
}

const cspViolations: string[] = [];
if (typeof document !== "undefined") {
  document.addEventListener("securitypolicyviolation", (e) => cspViolations.push(`CSP ${e.effectiveDirective || e.violatedDirective} blocked ${e.blockedURI}`));
}

/** Fetches a same-origin file, trying same-origin, then include, then no credentials; the error lists every attempt. */
async function fetchAsset(url: string, check?: (r: Response) => Promise<string | null>): Promise<Response> {
  const tries: string[] = [];
  for (const credentials of ["same-origin", "include", "omit"] as RequestCredentials[]) {
    const before = cspViolations.length;
    try {
      const r = await fetch(url, { credentials, cache: "no-cache" });
      if (r.ok) {
        const bad = check ? await check(r.clone()) : null;
        if (!bad) return r;
        tries.push(`${credentials}: HTTP ${r.status} but ${bad}`);
        continue;
      }
      tries.push(`${credentials}: HTTP ${r.status}${r.statusText ? ` ${r.statusText}` : ""}`);
    } catch (e) {
      await new Promise((res) => setTimeout(res, 0));
      const csp = cspViolations.slice(before).join(", ");
      tries.push(`${credentials}: ${csp || (e instanceof Error ? `${e.name}: ${e.message}` : String(e))}`);
    }
  }
  throw new OfflineCopyAssetError(url, tries.join("; "));
}

/**
 * Where the viewer may be, most likely first: the app's base URL (absolute in the dev server), next to the
 * built bundle (`assets/..`), the router base, then the document base. All same-origin.
 */
export function viewerUrls(): string[] {
  const out: string[] = [];
  const add = (u: () => string) => {
    try {
      const href = u();
      if (/^https?:/i.test(href) && !out.includes(href)) out.push(href);
    } catch {
      /* not a usable base */
    }
  };
  const base = import.meta.env.BASE_URL || "./";
  if (base.startsWith("/")) add(() => new URL(`${base.replace(/\/?$/, "/")}${VIEWER_FILE}`, location.origin).href);
  // A built app runs from <base>/assets/index-<hash>.js: the viewer sits next to index.html.
  add(() => {
    const here = new URL(import.meta.url);
    if (!/\/assets\/[^/]+$/.test(here.pathname)) throw new Error("not a built bundle");
    return new URL(`../${VIEWER_FILE}`, here).href;
  });
  const first = location.pathname.split("/").filter(Boolean)[0];
  add(() => new URL(VIEWER_FILE, document.baseURI).href);
  if (first) add(() => new URL(`/${first}/${VIEWER_FILE}`, location.origin).href);
  add(() => new URL(`/${VIEWER_FILE}`, location.origin).href);
  return out;
}

/** The viewer's text; the error names the first (expected) URL with every attempt on every URL. */
async function fetchViewer(): Promise<string> {
  const urls = viewerUrls();
  const notViewer = async (r: Response) => ((await r.text()).includes(VIEWER_MARKER) ? null : "the file is not the offline viewer");
  const failures: OfflineCopyAssetError[] = [];
  for (const url of urls) {
    try {
      return await (await fetchAsset(url, notViewer)).text();
    } catch (e) {
      if (e instanceof OfflineCopyAssetError) failures.push(e);
      else throw e;
    }
  }
  console.error("[offline copy] the offline viewer could not be read", { urls, failures: failures.map((f) => f.message), page: location.href, moduleUrl: import.meta.url, base: import.meta.env.BASE_URL });
  const head = failures[0];
  if (!head) throw new OfflineCopyAssetError(VIEWER_FILE, "no same-origin http(s) location could be derived for it");
  const more = failures.slice(1).map((f) => `${f.url}: ${f.reason}`);
  throw new OfflineCopyAssetError(head.url, [head.reason, ...more].join(" | "));
}

/** Image URL -> data URI (a data URI is kept as it is). */
async function dataUri(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const abs = new URL(url, document.baseURI).href;
  const r = await fetchAsset(abs);
  const ext = new URL(abs).pathname.split(".").pop()?.toLowerCase() ?? "";
  const type = MIME[ext] ?? (r.headers.get("content-type")?.split(";")[0] || "application/octet-stream");
  return `data:${type};base64,${base64(await r.arrayBuffer())}`;
}

/** Only the use case's own account, with its logo and hero image embedded; no other customer. */
async function configOf(account: string | undefined): Promise<UcxConfig> {
  const own = account ? RADAR.customers.find((c) => c.name === account) : undefined;
  const brand = async (b: CustomerBrand): Promise<CustomerBrand> => ({
    ...b,
    logo: b.logo ? await dataUri(b.logo) : undefined,
    identity: b.identity ? { ...b.identity, hero: b.identity.hero ? await dataUri(b.identity.hero) : undefined } : undefined,
  });
  const internal = !own && RADAR.internal ? { ...RADAR.internal, logo: undefined } : null;
  return {
    appTitle: RADAR.appTitle,
    owner: RADAR.owner,
    team: RADAR.team,
    tagline: RADAR.tagline,
    defaultHourlyRateUSD: RADAR.defaultHourlyRateUSD,
    customers: own ? [await brand(own)] : [],
    internal,
  };
}

/** `</script` and the line separators that would end or break the inline script. */
export function scriptJson(v: unknown): string {
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/** The viewer with the snapshot inserted right before its module script, and the page title set. */
export function assembleCopy(viewer: string, snap: UcxSnapshot): string {
  const at = viewer.indexOf('<script type="module"');
  if (at < 0) throw new Error("The offline viewer has no app script: run npm run build:viewer and publish again");
  const pageTitle = `${snap.account ?? "Internal"} · ${snap.title} (${snap.edition} copy)`.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"));
  const head = viewer.slice(0, at).replace(/<title>[\s\S]*?<\/title>/, () => `<title>${pageTitle}</title>`);
  return `${head}<script>window.__UCX__=${scriptJson(snap)};</script>\n${viewer.slice(at)}`;
}

/** Local date as YYYY-MM-DD. */
export const fileDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** `<Account>-<id>-<Title>-<kind>-<YYYY-MM-DD>` (no extension), safe for SharePoint and every file system. */
export function downloadStem(account: string | undefined, id: string | number, title: string, kind: string, date = new Date()) {
  const part = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${part(account || "Internal") || "Internal"}-${id}-${part(part(title).slice(0, 60))}-${kind}-${fileDate(date)}`;
}

export function offlineCopyName(account: string | undefined, id: string, title: string, edition: UcxEdition, date = new Date()) {
  return `${downloadStem(account, id, title, edition, date)}.html`;
}

/** Builds the offline copy as UTF-8 bytes (nothing is saved yet: see saveToSharePoint / saveOfflineCopy). */
export async function buildOfflineCopy(id: number | string, edition: UcxEdition, onStep: (msg: string) => void = () => {}): Promise<{ name: string; blob: Blob; bytes: Uint8Array }> {
  onStep("Loading the offline viewer…");
  const viewer = await fetchViewer();
  onStep("Reading the use case…");
  const snap = await snapshotOf(String(id), edition);
  onStep("Writing the file…");
  const html = assembleCopy(viewer, snap);
  const name = offlineCopyName(snap.account, snap.id, snap.title, edition);
  const bytes = new TextEncoder().encode(html);
  return { name, bytes, blob: new Blob([bytes], { type: "text/html;charset=utf-8" }) };
}

/**
 * Saves a built copy. Browsers refuse a download from an embedded app once the click that started it is
 * more than a few seconds old, so call this from a click (or while that click is still recent).
 */
export function saveOfflineCopy(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** True while the click that started the build still allows a download without another click. */
export const clickStillActive = () => (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive === true;
