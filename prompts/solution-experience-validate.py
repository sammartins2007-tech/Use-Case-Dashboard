import json, sys, re
i = sys.argv[1]
p = f"./out2/{i}.json"
d = json.load(open(p))
err = []
for k in ("specialists", "leadSpecialist"):
    if k in d: err.append(f"remove {k}")
s = json.dumps(d, ensure_ascii=False)
if "€" in s or re.search(r"\bEUR\b", s): err.append("€/EUR remains")
for k in ("needs", "technical", "experience", "architecture", "plan", "story", "journey"):
    if k not in d: err.append(f"missing {k}")
if not err:
    cats = {"Platform", "Licences & capacity", "Data & integration", "Security & compliance", "People & process"}
    if not 5 <= len(d["needs"]) <= 10: err.append("needs count")
    for n in d["needs"]:
        if n.get("category") not in cats: err.append(f"need category {n.get('category')}")
        if n.get("status") not in {"In place", "To set up", "To confirm"}: err.append("need status")
        if not n.get("item") or not n.get("why"): err.append("need item/why")
    t = d["technical"]
    zk = {"m365", "powerplatform", "azure", "fabric", "onprem", "saas", "external"}
    zones = {z["id"] for z in t.get("zones", [])}
    if not 3 <= len(zones) <= 6: err.append("zones count")
    for z in t["zones"]:
        if z.get("kind") not in zk: err.append(f"zone kind {z.get('kind')}")
    comps = {c["id"]: c for c in t.get("components", [])}
    if not 8 <= len(comps) <= 16: err.append("components count")
    kinds = {"user","channel","agent","flow","model","knowledge","data","connector","gateway","api","identity","security","monitoring","app","system"}
    for c in comps.values():
        if c.get("zone") not in zones: err.append(f"component {c['id']} zone")
        if c.get("kind") not in kinds: err.append(f"component kind {c.get('kind')}")
        for f in ("name","service","detail"):
            if not c.get(f): err.append(f"component {c['id']} {f}")
    for z in zones:
        if not any(c["zone"] == z for c in comps.values()): err.append(f"empty zone {z}")
    cons = t.get("connections", [])
    if not 8 <= len(cons) <= 20: err.append("connections count")
    for c in cons:
        if c.get("from") not in comps or c.get("to") not in comps: err.append(f"connection {c}")
        for f in ("protocol","auth","data"):
            if not c.get(f): err.append(f"connection {f}")
    cc = t.get("crossCutting", {})
    for f in ("identity","security","networking","alm","monitoring","dataResidency"):
        if not cc.get(f): err.append(f"crossCutting {f}")
    e = d["experience"]
    if e.get("layout") not in {"cinematic","editorial","blueprint","storyboard","console","dashboard"}: err.append("layout")
    for f in ("tagline","hero"):
        if not e.get(f): err.append(f"experience {f}")
    ids = [c.get("id") for c in e.get("chapters", [])]
    if sorted(ids) != sorted(["demo","story","journey","architecture","needs","plan","value"]): err.append(f"chapters {ids}")
    for c in e.get("chapters", []):
        if not c.get("title") or not c.get("intro"): err.append("chapter title/intro")
    dm = e.get("demo", {})
    ty = dm.get("type"); dd = dm.get("data", {})
    req = {
      "inbox-triage": lambda x: isinstance(x.get("categories"), list) and 5 <= len(x.get("items", [])) <= 8 and all(it.get("category") in x["categories"] and it.get("priority") in ("High","Medium","Low") for it in x["items"]),
      "document-extraction": lambda x: 8 <= len(x.get("docLines", [])) <= 14 and 5 <= len(x.get("fields", [])) <= 9 and all(f.get("check") in ("ok","warn","fail") and isinstance(f.get("confidence"), (int, float)) for f in x["fields"]),
      "chat": lambda x: 3 <= len(x.get("questions", [])) <= 5 and all(q.get("q") and q.get("a") and isinstance(q.get("sources"), list) for q in x["questions"]),
      "dashboard-alert": lambda x: 24 <= len(x.get("series", [])) <= 48 and all(isinstance(v, (int, float)) for v in x["series"]) and isinstance(x.get("threshold"), (int, float)) and 2 <= len(x.get("alerts", [])) <= 4 and all(0 <= a.get("index", -1) < len(x["series"]) for a in x["alerts"]),
      "what-if": lambda x: len(x.get("inputs", [])) >= 2 and len(x.get("outputs", [])) >= 1 and all(set(o.get("vars", [])) <= {i_["id"] for i_ in x["inputs"]} and o.get("unit") in ("h/yr","$/yr","days","%","count") for o in x["outputs"]) and all(i_["min"] <= i_["value"] <= i_["max"] and i_["step"] > 0 for i_ in x["inputs"]),
      "draft-compare": lambda x: 5 <= len(x.get("input", [])) <= 10 and len(x.get("output", [])) >= 2 and 3 <= len(x.get("checks", [])) <= 5,
      "process-race": lambda x: x.get("unit") in ("min","h","days") and 4 <= len(x.get("before", [])) <= 8 and 4 <= len(x.get("after", [])) <= 8 and all(isinstance(s_.get("dur"), (int, float)) and s_["dur"] > 0 for s_ in x["before"] + x["after"]),
      "approval-flow": lambda x: 3 <= len(x.get("stages", [])) <= 5 and 4 <= len(x.get("items", [])) <= 6 and all(set(it.get("path", [])) <= set(x["stages"]) and it.get("decision") in ("Approved","Returned","Escalated") for it in x["items"]),
    }
    if ty not in req: err.append(f"demo type {ty}")
    else:
        try:
            if not req[ty](dd): err.append(f"demo data invalid for {ty}")
        except Exception as ex: err.append(f"demo data error {ex}")
    for f in ("title","intro","note"):
        if not dm.get(f): err.append(f"demo {f}")
    if "image" not in e: err.append("experience.image missing")
print("OK" if not err else "ERRORS: " + "; ".join(sorted(set(err))[:25]))
