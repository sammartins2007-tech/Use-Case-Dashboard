import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Customers_704f56Service } from "../../generated/services/Customers_704f56Service";

/**
 * Content store: every use-case-specific design, image, what-if and wave plan lives in SharePoint
 * (the radar's Customers list, rows tagged with DocKind). Nothing use-case specific is bundled in the app.
 *
 * One document = (DocKind, DocRef, DocVersion), split into DocChunks rows ordered by DocSeq.
 * DocStatus: Current (shown) · Proposed (redesign awaiting review) · Requested (redesign asked for) · Rejected · Archived.
 */
export type DocKind = "solution" | "image" | "waveplan" | "whatif-estate" | "whatif-case" | "request" | "playbook";
export type DocStatus = "Current" | "Proposed" | "Requested" | "Rejected" | "Archived";

export interface DocRow {
  id: number;
  kind: string;
  ref: string;
  seq: number;
  chunks: number;
  body: string;
  status: DocStatus;
  version: number;
  route?: string;
  reason?: string;
  origin?: string;
  modified?: string;
}

export interface DocMeta {
  kind: string;
  ref: string;
  status: DocStatus;
  version: number;
  route?: string;
  reason?: string;
  origin?: string;
  modified?: string;
  rowIds: number[];
}

export interface Doc<T> extends DocMeta {
  data: T;
}

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const q = (v: string) => v.replace(/'/g, "''");
const PAGE = 500;
const META_FIELDS = ["ID", "Title", "DocKind", "DocRef", "DocSeq", "DocChunks", "DocStatus", "DocVersion", "DocRoute", "DocReason", "DocOrigin", "Modified"];

function toRow(r: Raw): DocRow {
  return {
    id: num(r.ID),
    kind: str(r.DocKind),
    ref: str(r.DocRef),
    seq: num(r.DocSeq),
    chunks: num(r.DocChunks) || 1,
    body: str(r.DocBody),
    status: (str(r.DocStatus) || "Current") as DocStatus,
    version: num(r.DocVersion) || 1,
    route: str(r.DocRoute) || undefined,
    reason: str(r.DocReason) || undefined,
    origin: str(r.DocOrigin) || undefined,
    modified: str(r.Modified) || undefined,
  };
}

/** Reads every row matching an OData filter, following pages. */
async function readRows(filter: string, select?: string[]): Promise<DocRow[]> {
  const out: DocRow[] = [];
  let skipToken: string | undefined;
  for (let i = 0; i < 40; i++) {
    const result = await Customers_704f56Service.getAll({ filter, top: PAGE, skipToken, ...(select ? { select } : {}) });
    if (!result.success) {
      console.error("connector error", result.error);
      throw result.error;
    }
    out.push(...((result.data ?? []) as unknown as Raw[]).map(toRow));
    skipToken = result.skipToken?.trim() || undefined;
    if (!skipToken) break;
  }
  return out;
}

const STATUS_RANK: Record<string, number> = { Current: 0, Proposed: 1, Requested: 2, Rejected: 3, Archived: 4 };

/** Groups rows into documents (one per kind/ref/version/status), newest version first. */
export function groupDocs(rows: DocRow[]): DocMeta[] {
  const m = new Map<string, DocMeta>();
  for (const r of rows) {
    if (!r.kind || !r.ref) continue;
    const k = `${r.kind}|${r.ref}|${r.version}|${r.status}`;
    const d = m.get(k) ?? { kind: r.kind, ref: r.ref, status: r.status, version: r.version, route: r.route, reason: r.reason, origin: r.origin, modified: r.modified, rowIds: [] };
    d.rowIds.push(r.id);
    if (r.seq === 0) Object.assign(d, { route: r.route ?? d.route, reason: r.reason ?? d.reason, origin: r.origin ?? d.origin, modified: r.modified ?? d.modified });
    m.set(k, d);
  }
  return [...m.values()].sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) || b.version - a.version);
}

function assemble(rows: DocRow[]): string | null {
  const sorted = [...rows].sort((a, b) => a.seq - b.seq);
  const need = sorted[0]?.chunks ?? 1;
  if (sorted.length < need) return null; // incomplete upload: never show half a design
  return sorted.map((r) => r.body).join("");
}

function build<T>(kind: string, rows: DocRow[], parse: boolean): Doc<T>[] {
  return groupDocs(rows).flatMap((meta) => {
    const text = assemble(rows.filter((r) => r.kind === meta.kind && r.ref === meta.ref && r.version === meta.version && r.status === meta.status));
    if (text == null) return [];
    if (!parse) return [{ ...meta, data: text as unknown as T }];
    try {
      return [{ ...meta, data: JSON.parse(text) as T }];
    } catch {
      console.error(`content ${kind}/${meta.ref} v${meta.version} is not valid JSON`);
      return [];
    }
  });
}

export interface DocSet<T> {
  current?: Doc<T>;
  proposed?: Doc<T>;
  history: DocMeta[];
}

/** Reads one document (all its versions): the current one, a pending proposal and the history. */
export async function fetchDoc<T>(kind: DocKind, ref: string, parse = true): Promise<DocSet<T>> {
  const rows = (await readRows(`DocKind eq '${q(kind)}' and DocRef eq '${q(ref)}'`)).filter((r) => r.kind === kind && r.ref === ref);
  const docs = build<T>(kind, rows.filter((r) => r.status === "Current" || r.status === "Proposed"), parse);
  const metas = groupDocs(rows);
  return {
    current: docs.find((d) => d.status === "Current"),
    proposed: docs.find((d) => d.status === "Proposed"),
    history: metas.filter((d) => d.status === "Archived" || d.status === "Rejected"),
  };
}

export function useDoc<T>(kind: DocKind, ref?: string, parse = true) {
  return useQuery({
    queryKey: ["doc", kind, ref],
    enabled: Boolean(ref),
    staleTime: 5 * 60_000,
    queryFn: () => fetchDoc<T>(kind, String(ref), parse),
  });
}

/** Every current document of a kind (for small kinds such as what-if). */
export function useDocsOfKind<T>(kind: DocKind) {
  return useQuery({
    queryKey: ["docs", kind],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Record<string, T>> => {
      const rows = (await readRows(`DocKind eq '${q(kind)}' and DocStatus eq 'Current'`)).filter((r) => r.kind === kind && r.status === "Current");
      return Object.fromEntries(build<T>(kind, rows, true).filter((d) => d.status === "Current").map((d) => [d.ref, d.data]));
    },
  });
}

export interface ContentIndex {
  /** Refs with a current document, per kind. */
  has: (kind: DocKind, ref?: string | number) => boolean;
  meta: (kind: DocKind, ref?: string | number) => { current?: DocMeta; proposed?: DocMeta; requested?: DocMeta };
  all: DocMeta[];
}

/** Light index of all content (no bodies): which use cases have a design, pending proposals and requests. */
export function useContentIndex() {
  const qr = useQuery({
    queryKey: ["contentIndex"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DocMeta[]> => {
      const rows = await readRows("DocSeq eq 0", META_FIELDS);
      return groupDocs(rows.filter((r) => r.kind && r.kind !== "customer" && r.seq === 0));
    },
  });
  const all = qr.data ?? [];
  const index: ContentIndex = {
    all,
    has: (kind, ref) => ref != null && all.some((d) => d.kind === kind && d.ref === String(ref) && d.status === "Current"),
    meta: (kind, ref) => {
      const mine = all.filter((d) => d.kind === kind && d.ref === String(ref));
      return {
        current: mine.find((d) => d.status === "Current"),
        proposed: mine.find((d) => d.status === "Proposed"),
        requested: all.find((d) => d.kind === "request" && d.ref === `${kind}:${ref}` && d.status === "Requested"),
      };
    },
  };
  return { ...qr, index };
}

async function setStatus(ids: number[], status: DocStatus) {
  for (const id of ids) {
    const r = await Customers_704f56Service.update(String(id), { DocStatus: status } as never);
    if (!r.success) {
      console.error("connector error", r.error);
      throw r.error;
    }
  }
}

async function rowIdsOf(kind: string, ref: string, status: DocStatus, version?: number) {
  const rows = await readRows(`DocKind eq '${q(kind)}' and DocRef eq '${q(ref)}' and DocStatus eq '${status}'`, ["ID", "DocKind", "DocRef", "DocStatus", "DocVersion", "DocSeq"]);
  return rows.filter((r) => r.kind === kind && r.ref === ref && r.status === status && (version == null || r.version === version)).map((r) => r.id);
}

/** Accept, reject or request a redesign. People decide; the refresh only proposes. */
export function useContentActions(kind: DocKind, ref: string) {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["doc", kind, ref] });
    void qc.invalidateQueries({ queryKey: ["contentIndex"] });
  };
  const accept = useMutation({
    mutationFn: async (proposedVersion: number) => {
      const proposed = await rowIdsOf(kind, ref, "Proposed", proposedVersion);
      if (!proposed.length) throw new Error("The proposal is no longer there.");
      await setStatus(await rowIdsOf(kind, ref, "Current"), "Archived");
      await setStatus(proposed, "Current");
      await setStatus(await rowIdsOf("request", `${kind}:${ref}`, "Requested"), "Archived");
    },
    onSuccess: done,
  });
  const reject = useMutation({
    mutationFn: async (proposedVersion: number) => setStatus(await rowIdsOf(kind, ref, "Proposed", proposedVersion), "Rejected"),
    onSuccess: done,
  });
  const restore = useMutation({
    mutationFn: async (version: number) => {
      const old = await rowIdsOf(kind, ref, "Archived", version);
      if (!old.length) throw new Error("That version is no longer there.");
      await setStatus(await rowIdsOf(kind, ref, "Current"), "Archived");
      await setStatus(old, "Current");
    },
    onSuccess: done,
  });
  const request = useMutation({
    mutationFn: async ({ route, reason }: { route: string; reason: string }) => {
      const r = await Customers_704f56Service.create({
        Title: `request ${kind} ${ref}`,
        DocKind: "request",
        DocRef: `${kind}:${ref}`,
        DocSeq: 0,
        DocChunks: 1,
        DocBody: "",
        DocStatus: "Requested",
        DocVersion: 1,
        DocRoute: route,
        DocReason: reason,
        DocOrigin: "Asked in the app",
      } as never);
      if (!r.success) {
        console.error("connector error", r.error);
        throw r.error;
      }
    },
    onSuccess: done,
  });
  return { accept, reject, restore, request };
}
