"""Dump every CUSTOMER-edition copy (master config row DocKind=config, DocRef=readonly-apps, lines with
"edition customer") to working/ce/<Suffix>/c_UseCases.json and c_Customers.json, for build_account_snapshot.py.
Reads the customer-safe copy lists only (never the master lists)."""
from aether_tools import tools, set_result
import json, os, re
exec(open('/mnt/workspace/.aether/scripts/customer_copy.py').read().split("def main():")[0])
cfg = [r for r in read_all(MASTER["Customers"], "read master Customers") if r.get("DocKind") == "config" and r.get("DocRef") == "readonly-apps"]
out = []
for l in (cfg[0].get("DocBody") or "").splitlines() if cfg else []:
    segs = [x.strip() for x in l.split("|")]
    opt = {m.group(1): m.group(2) for m in (re.match(r"^(edition|site)\s+(\S+)$", x) for x in segs[1:]) if m}
    if opt.get("edition") != "customer":
        continue
    acc, sfx = segs[0], suffix(segs[0])
    m = re.match(r"https://([^/]+)(/.*)$", opt["site"].rstrip("/"))
    site = get(f"/sites/{m.group(1)}:{m.group(2)}:", {}, "resolve the customer site")["id"]
    lists = {x["displayName"]: x["id"] for x in get(f"/sites/{site}/lists", {"$select": "id,displayName", "$top": "500"}, "list customer site lists")["value"]}
    d = f"/mnt/workspace/working/ce/{sfx}"
    os.makedirs(d, exist_ok=True)
    n = {}
    for k in ("UseCases", "Customers"):
        rows = read_all(lists[f"{k}-{sfx}"], f"read customer {k}", site)
        json.dump(rows, open(f"{d}/c_{k}.json", "w"), ensure_ascii=False)
        n[k] = len(rows)
    out.append({"account": acc, "dir": d, "rows": n})
set_result(out)
