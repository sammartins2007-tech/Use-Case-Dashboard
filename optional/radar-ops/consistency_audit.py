"""Consistency audit of the radar and its read-only copies (kit 1.11.0) - read-only, writes nothing.

Run as a tool script (RunScript, no args) after customer_copy.py in refresh step 11. It reuses the settings and
helpers of .aether/scripts/customer_copy.py, so install both with the radar-ops toolkit (install.sh).

Checks the master lists and every copy named in the master config row (Customers-704f56, DocKind = "config",
DocRef = "readonly-apps"):
- every RelatedUseCases line, wave plan entry, what-if member and solution design points to an existing use case
  whose current title matches;
- every copy use case carries the same title as its master row (matched by SourceId);
- every copied design equals the master design (use case ids remapped; cleaned for a customer edition).
Result: {"master": {...}, "<Account> <edition>": {...}}. bad_links, title_mismatch and design_mismatch must be 0/empty.
"""
from aether_tools import tools, set_result
import json, re
exec(open('/mnt/workspace/.aether/scripts/customer_copy.py').read().split("def main():")[0])


def tnorm(t):
    t = re.sub(r"\s*\[[^\]]*\]\s*$", "", t or "")            # a trailing "[reference]"
    t = re.sub(r"\s*\([A-Z][A-Z0-9]+[^)]*\)\s*$", "", t)        # a trailing "(REF123 ...)" reference
    return re.sub(r"\s+", " ", t).strip().lower()


def same_title(a, b):
    a, b = tnorm(a), tnorm(b)
    n = min(len(a), len(b), 40)
    return n >= 6 and a[:n] == b[:n]


def docs_of(rows):
    d = {}
    for r in rows:
        if r.get("DocKind") in ("solution", "waveplan", "whatif-estate", "whatif-case") and r.get("DocStatus") == "Current":
            d.setdefault((r["DocKind"], str(r["DocRef"]), r.get("DocVersion")), []).append(r)
    return {k: json.loads(doc_text(v)) for k, v in d.items()}


def links(uc, docs):
    """Every use case link a page can render, checked against the target's title."""
    bad, n = [], 0
    for i, r in uc.items():
        for line in (r.get("RelatedUseCases") or "").split("\n"):
            m = re.match(r"^\s*(\d+)\s*\|\s*([^|]+)\|", line)
            if m:
                n += 1
                tgt = uc.get(m.group(1))
                if not tgt or not same_title(m.group(2), tgt.get("Title")):
                    bad.append(("related", r.get("Title"), m.group(2).strip()[:50], (tgt or {}).get("Title")))
    for (kind, ref, v), j in docs.items():
        if kind == "solution":
            n += 1
            if ref not in uc:
                bad.append(("design without use case", ref))
        if kind == "waveplan":
            for s in j.get("schedule", []):
                n += 1
                tgt = uc.get(str(s.get("id")))
                if not tgt or not same_title(s.get("title"), tgt.get("Title")):
                    bad.append(("waveplan", ref, s.get("title"), (tgt or {}).get("Title")))

            def walk(o):
                nonlocal n
                if isinstance(o, dict):
                    for k2, v2 in o.items():
                        if k2 == "useCases" and isinstance(v2, list):
                            for x in v2:
                                n += 1
                                if str(x) not in uc:
                                    bad.append(("waveplan list", ref, x))
                        else:
                            walk(v2)
                elif isinstance(o, list):
                    for v2 in o:
                        walk(v2)

            walk(j)
        if kind == "whatif-estate":
            for x in j.get("members", []) + j.get("dependants", []):
                n += 1
                if str(x) not in uc:
                    bad.append(("what-if estate", ref, x))
        if kind == "whatif-case":
            n += 1
            if ref not in uc:
                bad.append(("what-if case without use case", ref))
    return n, bad


def copies(master_cu):
    """(account, edition, site id) for every line of the readonly-apps config row."""
    cfg = [r for r in master_cu if r.get("DocKind") == "config" and r.get("DocRef") == "readonly-apps"]
    lines = [l for l in (cfg[0].get("DocBody") or "").splitlines() if l.strip()] if cfg else []
    out = []
    for l in lines:
        segs = [x.strip() for x in l.split("|")]
        opt = {}
        for x in segs[1:]:
            m = re.match(r"^(edition|site)\s+(\S+)$", x)
            if m:
                opt[m.group(1)] = m.group(2)
        out.append((segs[0], opt.get("edition", "team"), resolve_site(opt["site"]) if opt.get("site") else SITE))
    return out


master_uc = {str(r["id"]): r for r in read_all(MASTER["UseCases"], "read master UseCases")}
master_cu = read_all(MASTER["Customers"], "read master Customers")
mdocs = docs_of(master_cu)
live_master = {i: r for i, r in master_uc.items() if r.get("Discarded") is not True}
n, bad = links(master_uc, mdocs)
out = {"master": {"links": n, "bad": len(bad), "ex": bad[:6]}}

for acc, ed, site in copies(master_cu):
    name = f"{acc} {ed}"
    lists = {x["displayName"]: x["id"] for x in get(f"/sites/{site}/lists", {"$select": "id,displayName", "$top": "500"}, "lists")["value"]}
    sfx = suffix(acc)
    if f"UseCases-{sfx}" not in lists or f"Customers-{sfx}" not in lists:
        out[name] = {"error": f"copy lists UseCases-{sfx} / Customers-{sfx} not found on the copy site"}
        continue
    uc = {str(r["id"]): r for r in read_all(lists[f"UseCases-{sfx}"], f"read {name} use cases", site) if not is_tomb(r)}
    cu = [r for r in read_all(lists[f"Customers-{sfx}"], f"read {name} content", site) if not is_tomb(r)]
    cdocs = docs_of(cu)
    n, bad = links(uc, cdocs)
    idmap = {str(int(float(r["SourceId"]))): i for i, r in uc.items()}
    title_bad = [(i, r.get("Title")) for i, r in uc.items() if master_uc.get(str(int(float(r["SourceId"]))), {}).get("Title") != r.get("Title")]
    TARGET["edition"] = ed
    doc_bad = []
    for (kind, ref, v), j in mdocs.items():
        if kind in ("solution", "whatif-case"):
            if ref not in idmap:
                continue
            key = (kind, idmap[ref], v)
        elif kind == "waveplan":
            if not ref.startswith(slug(acc) + "-"):
                continue
            key = (kind, ref, v)
        else:
            key = (kind, ref, v)
            if key not in cdocs:
                continue
        want = remap_doc_ids(j, kind, idmap)
        if ed == "customer":
            want = clean_design(want)
        if cdocs.get(key) != want:
            doc_bad.append(key)
    out[name] = {"use_cases": len(uc), "master_use_cases": sum(1 for r in live_master.values() if r.get("Account") == acc),
                 "links": n, "bad_links": len(bad), "ex": bad[:6], "title_mismatch": title_bad[:5],
                 "designs_checked": len(cdocs), "design_mismatch": doc_bad[:5]}
set_result(out)
