"""Whole-account CUSTOMER offline copy: offline viewer + all rows of the customer-edition lists.
Usage: python3 build_account_snapshot.py <dump_dir with c_UseCases.json/c_Customers.json> <brand.json> <viewer.txt> <out.html>
The lists are already customer-safe (customer_copy.py edition customer); this only reshapes them."""
import json, sys, base64, datetime, re, os
dump, brand_f, viewer_f, out = sys.argv[1:5]
CH = {"UseCases": ["Account","Stage","Confidence","Decision","Complexity","Effort","Classification","ClassificationConfidence","Department","ValueLevel","CustomerDecision"], "Customers": []}
DROP = {"id","LinkTitle","LinkTitleNoMenu","Edit","ContentType","FolderChildCount","ItemChildCount","AppAuthorLookupId","AppEditorLookupId","AuthorLookupId","EditorLookupId","Attachments","_UIVersionString","RelatedUseCases"}
def row(r, k):
    o = {a: b for a, b in r.items() if not a.startswith("@") and not a.startswith("_") and a not in DROP}
    o["ID"] = int(r["id"])
    if o.get("SourceId") is not None: o["SourceId"] = int(float(o["SourceId"]))
    for c in CH[k]:
        if isinstance(o.get(c), str) and o[c]: o[c] = {"Value": o[c]}
    return o
uc = [row(r, "UseCases") for r in json.load(open(f"{dump}/c_UseCases.json")) if r.get("SourceId") not in (None, "") and float(r["SourceId"]) != 0]
cu = [row(r, "Customers") for r in json.load(open(f"{dump}/c_Customers.json")) if r.get("SourceId") not in (None, "") and float(r["SourceId"]) != 0]
b = json.load(open(brand_f))
def uri(p):
    ext = p.rsplit(".", 1)[-1].lower(); mime = {"png":"image/png","webp":"image/webp","jpg":"image/jpeg","jpeg":"image/jpeg","svg":"image/svg+xml"}[ext]
    return f"data:{mime};base64," + base64.b64encode(open(p, "rb").read()).decode()
c = dict(b["customer"]); c["logo"] = uri(b["logo"])
if c.get("identity"): c["identity"] = dict(c["identity"]); c["identity"]["hero"] = uri(b["hero"])
tables = {}
for key in b["table_keys"]["UseCases"]: tables[key] = uc
for key in b["table_keys"]["Customers"]: tables[key] = cu
for key in b["table_keys"]["Empty"]: tables[key] = []
snap = {"v": 1, "edition": "customer", "id": "", "account": c["name"], "title": b["appTitle"],
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "config": {"appTitle": b["appTitle"], "owner": b["owner"], "team": b["team"], "tagline": b["tagline"], "defaultHourlyRateUSD": b.get("defaultHourlyRateUSD", 50), "customers": [c], "internal": None},
        "tables": tables}
viewer = open(viewer_f).read()
at = viewer.index('<script type="module"')
head = re.sub(r"<title>[\s\S]*?</title>", lambda m: f"<title>{b['appTitle']} (read-only copy)</title>", viewer[:at])
js = json.dumps(snap, ensure_ascii=False).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
html = f"{head}<script>window.__UCX__={js};</script>\n{viewer[at:]}"
open(out, "w").write(html)
print(json.dumps({"use_cases": len(uc), "customer_rows": len(cu), "kb": len(html.encode()) // 1024}))
