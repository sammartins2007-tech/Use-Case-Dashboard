"""
customer_copy.py — sync one customer's READ-ONLY copy lists from the radar's master lists.

Usage (RunScript): args {"account": "Contoso"}            sync + verify one account
                   args {"account": "ALL"}            every account in the master config row (DocKind=config, DocRef=readonly-apps)
                   args {"account": "Contoso", "verify_only": true}
                   args {"account": "Contoso", "dry": true}   compute the plan, write nothing
                   args {"account": "Contoso", "hard_delete": true}  delete orphans (DeleteListItem asks for approval)
                   instead of retiring them as tombstones (default, unattended-safe)

Copies (same site, lists "<List>-<SUFFIX>", SUFFIX = account letters/digits, e.g. CONTOSO):
  UseCases-<S>     every master UseCases row with Account = <account> and Discarded != true
  Signals-<S>      kept EMPTY: evidence is internal and stays in the owner's app (rows left from older
                   versions are retired as tombstones)
  FeatureRadar-<S> master FeatureRadar rows whose RelevantUseCases mention one of those titles;
                   RelevantUseCases is reduced to those titles only
  Customers-<S>    the account's DocKind=customer settings row
                   + DocStatus=Current solution / image / whatif-case rows whose DocRef is a copied use case id
                   + Current waveplan rows whose DocRef starts with "<slug(account)>-"
                   + Current whatif-estate rows referenced by a copied what-if case
                   (playbook rows are not read by the app, so none are copied)
Every copy row has SourceId = the master item id. Ids are REMAPPED to the copy's own item ids:
  Customers DocRef (solution/image/whatif-case) and the ids in UseCases.RelatedUseCases point at copy
  UseCases item ids, so the app code reads the copy exactly as it reads the master.
Sync is idempotent: create missing, patch changed fields (cleared fields set to null), retire orphans
(no SourceId, SourceId no longer selected, duplicates) by turning them into tombstones (SourceId 0,
fields cleared, Title "(removed by sync)"; the app skips SourceId 0 rows) that the next new row reuses. The master lists are only ever READ: every write
URL is checked against the copy list ids and the run aborts otherwise.
Editions (one line per copy in the master config row DocKind=config, DocRef=readonly-apps):
  "<Account> | lists ... | ..."                                   team edition on the master site (evidence-free)
  "<Account> | edition customer | site <https site URL> | ..."   CUSTOMER edition on a SEPARATE site (for guests):
      everything of the team edition, plus: no FeatureRadar rows; use case fields in CUSTOMER_FIELDS blanked;
      "CLARIFY:" lines removed; design JSON cleaned (internal keys removed, CLARIFY questions removed, source
      lists reduced to public web links, internal Microsoft 365 links removed) and re-chunked.
Column schema: copied from the master's column definitions (new master columns are added to the copy on
the next run); Account choices are reduced to the one account so no other customer name is in the copy.
"""
from aether_tools import tools, set_result, log, args
import json, re, time, os

SITE = "{{SITE_GRAPH_ID}}"
MASTER = {
    "UseCases": "{{LIST_USECASES}}",
    "Signals": "{{LIST_SIGNALS}}",
    "FeatureRadar": "{{LIST_FEATURES}}",
    "Customers": "{{LIST_CUSTOMERS}}",
}
MASTER_IDS = set(MASTER.values()) | {"{{LIST_AI}}"}
ORDER = ["UseCases", "Signals", "FeatureRadar", "Customers"]
TARGET = {"site": SITE, "edition": "team"}  # set per copy by run_one
# Customer edition (guests): internal judgement, sizing and source trail never leave Microsoft.
CUSTOMER_FIELDS = ("Analysis", "Insights", "Decision", "Confidence", "Readiness", "ClassificationConfidence",
                   "ClassificationWhy", "ClassificationNext", "SizingBasis", "Flag", "FeatureUnlock", "DiscardReason",
                   "MonthlyCostEUR", "MonthlyValueEUR", "FinOpsBasis")
DESIGN_DROP_KEYS = {"board", "routeCheck", "finops", "evidence", "ledger"}
DESIGN_BLANK_KEYS = {"source", "voiceSource", "sourceNote"}
INTERNAL_LINK = re.compile(r"https?://[^\s\"')\]]*(sharepoint\.com|teams\.microsoft\.com|teams\.cloud\.microsoft|outlook\.office|outlook\.cloud\.microsoft|office\.com|1drv\.ms|sharepoint-df\.com)[^\s\"')\]]*", re.I)
EVIDENCE_FIELDS = ("Evidence", "Sources", "LastSignal", "SignalCount")
SKIP_COLS = {"ContentType", "Attachments"}
ID_KINDS = {"solution", "image", "whatif-case"}
COPY_KINDS = ID_KINDS | {"waveplan", "whatif-estate"}


def load(p):
    if hasattr(p, "payload"):
        p = p.payload
    for _ in range(5):
        try:
            if isinstance(p, str):
                try:
                    p = json.loads(p)
                except Exception:
                    return {"raw": p}
            if isinstance(p, dict) and p.get("file_path") and "value" not in p and "responses" not in p and "id" not in p:
                p = json.load(open("/mnt/workspace/" + p["file_path"]))
            return p
        except OSError:
            time.sleep(3)
    return p


def get(path, qp=None, what="read"):
    for attempt in range(4):
        p = load(tools.graph.QueryGraph(path=path, query_params=qp or {}, description=what))
        if isinstance(p, dict) and ("value" in p or "id" in p):
            return p
        time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"read failed {path}: {str(p)[:300]}")


def read_all(list_id, what, site=None):
    rows, path, qp = [], f"/sites/{site or SITE}/lists/{list_id}/items", {"$expand": "fields", "$top": "200"}
    while True:
        p = get(path, qp, what)
        for x in p.get("value", []):
            f = x["fields"]
            f["id"] = x["id"]
            rows.append(f)
        nl = p.get("@odata.nextLink")
        if not nl:
            return rows
        path, qp = nl.split("graph.microsoft.com/v1.0")[-1], {}


def suffix(account):
    return re.sub(r"[^A-Za-z0-9]", "", account)


def slug(s):
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


def writable(cols):
    return [c for c in cols if not c.get("readOnly") and c["name"] not in SKIP_COLS and not c.get("hidden")]


def coldef(c, account):
    d = {"name": c["name"], "displayName": c.get("displayName") or c["name"], "description": c.get("description") or ""}
    for t in ("text", "choice", "number", "dateTime", "boolean", "currency"):
        if t in c:
            d[t] = dict(c[t])
    if "choice" in d and c["name"] == "Account":
        d["choice"]["choices"] = [account]
    return d


def ensure_lists(account, master_cols, dry):
    sfx = suffix(account)
    T = TARGET["site"]
    existing = {l["displayName"]: l["id"] for l in get(f"/sites/{T}/lists", {"$select": "id,displayName", "$top": "500"}, "list site lists")["value"]}
    ids, created, added = {}, [], []
    for k in ORDER:
        name = f"{k}-{sfx}"
        cols = [coldef(c, account) for c in writable(master_cols[k]) if c["name"] != "Title"]
        cols.append({"name": "SourceId", "displayName": "SourceId", "description": "Master item id (set by customer_copy.py)", "number": {"decimalPlaces": "none"}, "indexed": True})
        if name not in existing:
            if dry:
                ids[k] = None
                continue
            body = {"displayName": name, "description": f"Read-only {account} {TARGET['edition']}-edition copy of {k}-704f56, synced by customer_copy.py. Do not edit: the next sync overwrites it.", "columns": cols, "list": {"template": "genericList"}}
            p = load(tools.graph_deferred.CallGraph(method="POST", path=f"/sites/{T}/lists", body=body, description=f"Create the {name} copy list"))
            if not (isinstance(p, dict) and p.get("id")):
                raise RuntimeError(f"create {name} failed: {str(p)[:400]}")
            ids[k] = p["id"]
            created.append(name)
        else:
            ids[k] = existing[name]
            have = {c["name"] for c in get(f"/sites/{T}/lists/{ids[k]}/columns", {"$top": "500"}, f"read {name} columns")["value"]}
            for c in cols:
                if c["name"] not in have and not dry:
                    p = load(tools.graph_deferred.CallGraph(method="POST", path=f"/sites/{T}/lists/{ids[k]}/columns", body=c, description=f"Add column {c['name']} to {name}"))
                    if not (isinstance(p, dict) and p.get("id")):
                        raise RuntimeError(f"add column {c['name']} to {name} failed: {str(p)[:300]}")
                    added.append(f"{name}.{c['name']}")
        if ids[k] in MASTER_IDS:
            raise RuntimeError(f"copy list {name} resolves to a master list id; refusing")
    return ids, created, added


def norm(v, typ):
    if v is None or v == "":
        return False if typ == "boolean" else None
    if typ in ("number", "currency"):
        try:
            return float(v)
        except Exception:
            return v
    if typ == "boolean":
        return bool(v)
    return v


def coltypes(cols):
    out = {}
    for c in cols:
        for t in ("text", "choice", "number", "dateTime", "boolean", "currency"):
            if t in c:
                out[c["name"]] = t
    return out


def doc_text(rows):
    rows = sorted(rows, key=lambda r: float(r.get("DocSeq") or 0))
    return "".join(r.get("DocBody") or "" for r in rows)


def remap_related(s, idmap):
    """Point use case ids at the copy's ids; drop references to use cases outside this account's copy."""
    if not s:
        return s
    out = []
    for line in s.split("\n"):
        m = re.match(r"^(\s*)(\d+)(\s*\|.*)$", line)
        if m:
            if m.group(2) in idmap:
                out.append(f"{m.group(1)}{idmap[m.group(2)]}{m.group(3)}")
            continue
        parts = []
        for p in re.split(r";\s*", line):
            n = re.match(r"^(\d+)(\s.*)$", p)
            if n:
                if n.group(1) in idmap:
                    parts.append(idmap[n.group(1)] + n.group(2))
            else:
                parts.append(p)
        out.append("; ".join(x for x in parts if x != "") if len(parts) > 1 or parts else "")
    return "\n".join(out)


def scrub_text(v):
    if isinstance(v, str):
        v = INTERNAL_LINK.sub("", v)
        if "CLARIFY:" in v:
            v = "\n".join(l for l in v.split("\n") if "CLARIFY:" not in l)
    return v


def clean_design(o):
    """Customer edition: remove internal design parts, keep the structure the app renders."""
    if isinstance(o, dict):
        out = {}
        for k, v in o.items():
            if k in DESIGN_DROP_KEYS:
                continue
            if k in DESIGN_BLANK_KEYS and isinstance(v, str):
                out[k] = ""
                continue
            if k == "sources" and isinstance(v, list):
                keep = []
                for x in v:
                    t = json.dumps(x) if not isinstance(x, str) else x
                    if re.search(r"https?://", t) and not INTERNAL_LINK.search(t):
                        keep.append(x)
                out[k] = keep
                continue
            if k == "openQuestions" and isinstance(v, list):
                out[k] = [clean_design(x) for x in v if "CLARIFY" not in json.dumps(x)]
                continue
            out[k] = clean_design(v)
        return out
    if isinstance(o, list):
        return [clean_design(x) for x in o]
    return scrub_text(o)


CHUNK = 30000
MAX_CHUNK = 60000
# Use case ids embedded INSIDE design documents (every edition): key -> how the value holds ids.
ID_LIST_KEYS = {"useCases", "members", "dependants", "dependsOn"}   # lists of use case ids (non-ids kept as is)


def remap_doc_ids(o, kind, idmap, parent=None, top=True):
    """Point every master use case id inside a design document at the copy's id. Ids that are not in this
    copy (another account, discarded) are dropped from lists; an unmapped scalar id is kept as is."""
    def is_id(x):
        return isinstance(x, (str, int)) and not isinstance(x, bool) and re.fullmatch(r"\d+", str(x)) is not None
    def conv(x):
        y = idmap.get(str(x))
        return None if y is None else (y if isinstance(x, str) else int(y))
    if isinstance(o, dict):
        out = {}
        for k, v in o.items():
            if k in ID_LIST_KEYS and isinstance(v, list):
                out[k] = [conv(x) if is_id(x) and conv(x) is not None else x for x in v if not (is_id(x) and idmap and conv(x) is None)]
            elif k == "id" and is_id(v) and ((kind == "solution" and top) or (kind == "waveplan" and parent == "schedule")):
                out[k] = conv(v) if conv(v) is not None else v
            else:
                out[k] = remap_doc_ids(v, kind, idmap, k, False)
        return out
    if isinstance(o, list):
        return [remap_doc_ids(x, kind, idmap, parent, False) for x in o]
    return o


def rewrite_docs(want_cust, idmap, customer):
    """Every JSON document: use case ids remapped to the copy's ids; customer edition also cleaned.
    Re-chunked over the same master rows (chunk i reuses the master id of the doc's i-th piece)."""
    groups = {}
    for mid, d in want_cust.items():
        if d.get("DocKind") in COPY_KINDS and d.get("DocKind") != "image":  # images are pictures, not text
            groups.setdefault((d.get("DocKind"), str(d.get("DocRef")), d.get("DocVersion"), str(d.get("Title") or "").split(" #")[0]), []).append((mid, d))
    for key, items in groups.items():
        items.sort(key=lambda x: float(x[1].get("DocSeq") or 0))
        text = doc_text([d for _, d in items])
        try:
            j = remap_doc_ids(json.loads(text), key[0], idmap)
            new = json.dumps(clean_design(j) if customer else j, ensure_ascii=False)
        except Exception:
            if customer:
                for mid, _ in items:   # unreadable document: never expose it to a customer
                    want_cust.pop(mid, None)
            continue
        size = max(CHUNK, -(-len(new) // len(items)))
        if size > MAX_CHUNK:
            raise RuntimeError(f"document {key} grew beyond its rows; refusing")
        parts = [new[i:i + size] for i in range(0, len(new), size)] or [""]
        for i, (mid, d) in enumerate(items):
            if i < len(parts):
                d["DocBody"], d["DocSeq"], d["DocChunks"] = parts[i], i, len(parts)
                base = str(d.get("Title") or "").rsplit(" #", 1)[0]
                if " #" in str(d.get("Title") or ""):
                    d["Title"] = f"{base} #{i}"
            else:
                want_cust.pop(mid, None)


def select(account, master, uc_map):
    """Desired copy rows per list, keyed by master id (str)."""
    uc = [r for r in master["UseCases"] if r.get("Account") == account and r.get("Discarded") is not True]
    uc_ids = {r["id"] for r in uc}
    titles = {(r.get("Title") or "").strip() for r in uc if r.get("Title")}
    want = {k: {} for k in ORDER}
    for r in uc:
        d = dict(r)
        d["RelatedUseCases"] = remap_related(r.get("RelatedUseCases"), uc_map)
        # Sam's rule (14 Nov 2026): evidence only appears in his own app. Copies never carry the
        # Evidence trail, the Sources list or any Signals row.
        for f in EVIDENCE_FIELDS:
            d[f] = None
        want["UseCases"][r["id"]] = d
    for r in master["FeatureRadar"]:
        rel = [x.strip() for x in re.split(r"[;\n]", r.get("RelevantUseCases") or "") if x.strip()]
        mine = [x for x in rel if x in titles]
        if mine:
            d = dict(r)
            d["RelevantUseCases"] = "; ".join(mine)
            want["FeatureRadar"][r["id"]] = d
    cust = master["Customers"]
    wslug = slug(account) + "-"
    cases = []
    for r in cust:
        kind, ref, st = r.get("DocKind"), str(r.get("DocRef") or ""), r.get("DocStatus")
        if kind == "customer" and r.get("Title") == account:
            want["Customers"][r["id"]] = dict(r)
        elif st == "Current" and kind in ID_KINDS and ref in uc_ids:
            d = dict(r)
            d["DocRef"] = uc_map.get(ref)  # None until the use case copy exists (second pass fills it)
            want["Customers"][r["id"]] = d
            if kind == "whatif-case":
                cases.append(r)
        elif st == "Current" and kind == "waveplan" and ref.startswith(wslug):
            want["Customers"][r["id"]] = dict(r)
    estates = set()
    by_doc = {}
    for r in cases:
        by_doc.setdefault((r["DocRef"], r.get("DocVersion")), []).append(r)
    for rows in by_doc.values():
        try:
            e = json.loads(doc_text(rows)).get("estate")
            if e:
                estates.add(e)
        except Exception:
            pass
    for r in cust:
        if r.get("DocKind") == "whatif-estate" and r.get("DocStatus") == "Current" and str(r.get("DocRef")) in estates:
            want["Customers"][r["id"]] = dict(r)
    if TARGET["edition"] == "customer":
        want["FeatureRadar"] = {}
        for d in want["UseCases"].values():
            for f in CUSTOMER_FIELDS:
                if f in d:
                    d[f] = None
            for f, v in list(d.items()):
                d[f] = scrub_text(v)
    rewrite_docs(want["Customers"], uc_map, TARGET["edition"] == "customer")
    return want


def batch(reqs, what):
    """POST /$batch in groups of 20; returns list of (request, status, body)."""
    out = []
    for i in range(0, len(reqs), 20):
        group = reqs[i:i + 20]
        pending = group
        for attempt in range(4):
            body = {"requests": [{"id": str(j), "method": q["method"], "url": q["url"], "headers": {"Content-Type": "application/json"}, "body": q["body"]} for j, q in enumerate(pending)]}
            p = load(tools.graph_deferred.CallGraph(method="POST", path="/$batch", body=body, description=f"{what} ({i + 1}-{i + len(group)} of {len(reqs)})"))
            resp = p.get("responses", []) if isinstance(p, dict) else []
            got = {int(x["id"]): x for x in resp}
            retry = []
            for j, q in enumerate(pending):
                x = got.get(j)
                st = int(x.get("status", 0)) if x else 0
                if st in (429, 503, 504, 0):
                    retry.append(q)
                else:
                    out.append((q, st, x.get("body") if x else None))
            if not retry:
                break
            pending = retry
            time.sleep(5 * (attempt + 1))
        else:
            out.extend((q, 0, "retries exhausted") for q in pending)
    return out


TOMBSTONE_TITLE = "(removed by sync)"


def is_tomb(r):
    v = r.get("SourceId")
    return v not in (None, "") and float(v) == 0


def sync_list(k, list_id, want, copy_rows, types, dry, hard_delete=False):
    """Create / patch / retire copy rows so the list equals `want` (keyed by master id).
    Retired rows become tombstones (SourceId 0, fields cleared; the app skips them) and are recycled
    for the next new row, so an unattended run never needs a delete. hard_delete=True deletes them
    instead (DeleteListItem; may ask for approval)."""
    if list_id in MASTER_IDS:
        raise RuntimeError("refusing to write a master list")
    fields = [n for n in types if n != "SourceId"]
    by_src, orphans, tombs = {}, [], []
    for r in sorted(copy_rows, key=lambda r: int(r["id"])):
        if is_tomb(r):
            tombs.append(r)
            continue
        s = r.get("SourceId")
        s = str(int(float(s))) if s not in (None, "") else None
        if s is None or s not in want or s in by_src:
            orphans.append(r)
        else:
            by_src[s] = r
    reqs = []
    free = list(tombs) + ([] if hard_delete else list(orphans))
    for src, d in want.items():
        target = {f: (None if d.get(f) == "" else d.get(f)) for f in fields}
        cur = by_src.get(src)
        if cur is None and free:
            cur = free.pop(0)
            body = dict(target)
            body["SourceId"] = int(src)
            reqs.append({"method": "PATCH", "url": f"/sites/{TARGET['site']}/lists/{list_id}/items/{cur['id']}/fields", "body": body, "src": src, "op": "recycle"})
        elif cur is None:
            body = {f: v for f, v in target.items() if v is not None}
            body["SourceId"] = int(src)
            reqs.append({"method": "POST", "url": f"/sites/{TARGET['site']}/lists/{list_id}/items", "body": {"fields": body}, "src": src, "op": "create"})
        else:
            diff = {f: v for f, v in target.items() if norm(v, types[f]) != norm(cur.get(f), types[f])}
            if diff:
                reqs.append({"method": "PATCH", "url": f"/sites/{TARGET['site']}/lists/{list_id}/items/{cur['id']}/fields", "body": diff, "src": src, "op": "update"})
    retire = [r for r in orphans if r in free] if not hard_delete else []
    for r in retire:
        body = {f: None for f in fields if r.get(f) not in (None, "", False)}
        body.update({"Title": TOMBSTONE_TITLE, "SourceId": 0})
        if "Discarded" in types:
            body["Discarded"] = True
        reqs.append({"method": "PATCH", "url": f"/sites/{TARGET['site']}/lists/{list_id}/items/{r['id']}/fields", "body": body, "src": f"retire {r['id']}", "op": "retire"})
    deletes = [r["id"] for r in orphans] if hard_delete else []
    stats = {x: sum(1 for q in reqs if q["op"] == x) for x in ("create", "update", "recycle", "retire")}
    stats.update({"delete": len(deletes), "tombstones_after": len(free), "errors": []})
    if dry:
        return stats
    for q in reqs:
        if any(mid in q["url"] for mid in MASTER_IDS) or f"/lists/{list_id}/" not in q["url"]:
            raise RuntimeError("write URL outside the copy list; refusing")
    for q, st, body in batch(reqs, f"Sync {k} copy"):
        if not 200 <= st < 300:
            stats["errors"].append({"src": q["src"], "op": q["op"], "status": st, "body": str(body)[:300]})
    for iid in deletes:
        r = load(tools.sharepoint_onedrive_deferred.DeleteListItem(site_id=TARGET["site"], list_id=list_id, item_id=str(iid)))
        if isinstance(r, dict) and (r.get("error") or r.get("success") is False):
            stats["errors"].append({"delete": iid, "res": str(r)[:200]})
    log(f"{k}: " + ", ".join(f"{v} {x}" for x, v in stats.items() if x != "errors") + f", {len(stats['errors'])} errors")
    return stats


def verify(account, master, ids, types_by, uc_map):
    want = select(account, master, uc_map)
    rep = {}
    for k in ORDER:
        rows = read_all(ids[k], f"read back {k} copy", TARGET["site"])
        by_src = {}
        for r in rows:
            if r.get("SourceId") not in (None, "") and not is_tomb(r):
                by_src.setdefault(str(int(float(r["SourceId"]))), []).append(r)
        types = types_by[k]
        mism = []
        for src, d in want[k].items():
            got = by_src.get(src)
            if not got or len(got) != 1:
                mism.append({"src": src, "problem": f"{len(got or [])} copies"})
                continue
            for f in types:
                if f == "SourceId":
                    continue
                if norm(d.get(f) if d.get(f) != "" else None, types[f]) != norm(got[0].get(f), types[f]):
                    mism.append({"src": src, "field": f, "master": str(d.get(f))[:80], "copy": str(got[0].get(f))[:80]})
        tombs = [r for r in rows if is_tomb(r)]
        live = [r for r in rows if not is_tomb(r)]
        extra = [r["id"] for r in live if r.get("SourceId") in (None, "") or str(int(float(r["SourceId"]))) not in want[k]]
        rep[k] = {"master_selected": len(want[k]), "copy_rows": len(live), "tombstones": len(tombs), "fields_compared": len(types) - 1, "mismatches": mism[:20], "mismatch_count": len(mism), "extra_rows": extra}
        if k == "Customers":
            docs_m, docs_c = {}, {}
            for src, d in want[k].items():
                if d.get("DocKind") in COPY_KINDS:
                    key = (d.get("DocKind"), str(d.get("DocRef")), d.get("DocVersion"))
                    docs_m.setdefault(key, []).append(d)
            for r in live:
                if r.get("DocKind") in COPY_KINDS:
                    key = (r.get("DocKind"), str(r.get("DocRef")), r.get("DocVersion"))
                    docs_c.setdefault(key, []).append(r)
            bodies = []
            for key, rs in docs_m.items():
                a, b = doc_text(rs), doc_text(docs_c.get(key, []))
                bodies.append({"doc": f"{key[0]}/{key[1]}/v{key[2]}", "chunks": len(rs), "chars": len(a), "equal": a == b})
            rep[k]["docs"] = bodies
    return rep


def run_one(account, dry, verify_only, master, master_cols, hard_delete=False, edition="team", site=None):
    TARGET["site"], TARGET["edition"] = site or SITE, edition
    if edition == "customer" and TARGET["site"] == SITE:
        raise RuntimeError("a customer edition must live on its own site, never on the master site")
    ids, created, added = ensure_lists(account, master_cols, dry)
    types_by = {}
    for k in ORDER:
        t = coltypes(writable(master_cols[k]))
        t["SourceId"] = "number"
        types_by[k] = t
    result = {"account": account, "edition": edition, "site": TARGET["site"], "lists": {f"{k}-{suffix(account)}": ids[k] for k in ORDER}, "created_lists": created, "added_columns": added}
    if dry and None in ids.values():
        result["plan"] = {k: len(v) for k, v in select(account, master, {}).items()}
        return result

    def uc_map_now():
        rows = read_all(ids["UseCases"], "read UseCases copy ids", TARGET["site"])
        return {str(int(float(r["SourceId"]))): str(r["id"]) for r in rows if r.get("SourceId") not in (None, "") and not is_tomb(r)}

    if not verify_only:
        stats = {}
        for pass_no in (1, 2):
            # UseCases first; the other lists then use the copy ids it produced (pass 2 fixes RelatedUseCases).
            for k in ORDER:
                if k in ("UseCases", "Signals"):
                    want = select(account, master, uc_map_now())
                copy_rows = read_all(ids[k], f"read {k} copy", TARGET["site"])
                s = sync_list(k, ids[k], want[k], copy_rows, types_by[k], dry, hard_delete)
                stats.setdefault(k, []).append({x: v for x, v in s.items() if x != "errors" and v} | ({"errors": s["errors"][:5]} if s.get("errors") else {}))
            if dry:
                break
        result["sync"] = stats
    if not dry:
        result["verify"] = verify(account, master, ids, types_by, uc_map_now())
    return result


def resolve_site(s):
    if s.startswith("http"):
        m = re.match(r"https://([^/]+)(/.*)$", s.rstrip("/"))
        p = get(f"/sites/{m.group(1)}:{m.group(2)}:", {}, "resolve the copy site")
        return p["id"]
    return s


def main():
    a = args() or {}
    account = a.get("account") or "ALL"
    dry = bool(a.get("dry"))
    verify_only = bool(a.get("verify_only"))
    master_cols = {k: get(f"/sites/{SITE}/lists/{lid}/columns", {"$top": "500"}, f"read master {k} columns")["value"] for k, lid in MASTER.items()}
    master = {k: read_all(lid, f"read master {k}") for k, lid in MASTER.items()}
    if account == "ALL":
        cfg = [r for r in master["Customers"] if r.get("DocKind") == "config" and r.get("DocRef") == "readonly-apps"]
        lines = [l for l in (cfg[0].get("DocBody") or "").splitlines() if l.strip()] if cfg else []
    else:
        lines = [account + (f" | edition {a['edition']}" if a.get("edition") else "") + (f" | site {a['site']}" if a.get("site") else "")]
    jobs = []
    for l in lines:
        segs = [x.strip() for x in l.split("|")]
        opt = {}
        for x in segs[1:]:
            m = re.match(r"^(edition|site)\s+(\S+)$", x)
            if m:
                opt[m.group(1)] = m.group(2)
        jobs.append((segs[0], opt.get("edition", "team"), resolve_site(opt["site"]) if opt.get("site") else None))
    accounts = [f"{j[0]} ({j[1]})" for j in jobs]
    out = [run_one(acc, dry, verify_only, master, master_cols, bool(a.get("hard_delete")), ed, st) for acc, ed, st in jobs]
    for o in out:
        v = o.get("verify") or {}
        o["ok"] = bool(v) and all(x["mismatch_count"] == 0 and not x["extra_rows"] and x["master_selected"] == x["copy_rows"] for x in v.values()) and all(d["equal"] for d in v.get("Customers", {}).get("docs", []))
    try:
        os.makedirs("/mnt/workspace/working/sync", exist_ok=True)
        json.dump(out, open("/mnt/workspace/working/sync/customer_copy_last.json", "w"), indent=1, ensure_ascii=False)
    except OSError as e:
        log(f"report file not saved: {e}")
    set_result({"accounts": accounts, "results": out})


main()
