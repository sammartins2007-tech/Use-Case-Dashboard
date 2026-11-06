import json, sys
i = sys.argv[1]
d = json.load(open(ff'solutions/{i}.json'))
ICONS = set("mail inbox file-text file-search scan search database server bot sparkles brain message-square users user-check clipboard-check check-circle alert-triangle bell gauge line-chart bar-chart calendar clock globe languages shield-check lock factory flask truck ship package receipt banknote scale handshake pen-tool book-open graduation-cap leaf zap wrench settings send share-2 archive target trophy rocket lightbulb map compass layers git-branch repeat timer".split())
err = []
c = d.get("creative")
if not c: err.append("missing creative")
else:
    if c.get("journeyStyle") not in {"metro","swimlane","split","cards","spiral","curve"}: err.append("journeyStyle")
    si = c.get("stepIcons", [])
    if len(si) != len(d["journey"]): err.append(f"stepIcons count {len(si)} vs {len(d['journey'])}")
    if any(x not in ICONS for x in si): err.append("stepIcons name")
    n = c.get("numbers", [])
    if len(n) != 3 or not all(isinstance(x.get("value"), (int, float)) and x.get("label") and x.get("basis") in ("Dossier","Illustrative") for x in n): err.append("numbers")
    if any("€" in (x.get("prefix","")+x.get("suffix","")) for x in n): err.append("euro in numbers")
    dl = c.get("dayInTheLife", [])
    if not 4 <= len(dl) <= 6 or not all(x.get("time") and x.get("scene") and x.get("icon") in ICONS for x in dl): err.append("dayInTheLife")
    if c.get("motif") not in {"molecules","waves","grid","dots","circuits","paper","leaves","routes"}: err.append("motif")
    s = c.get("signature", {})
    if not (s.get("kicker") and s.get("line") and s.get("emoji")): err.append("signature")
    if not c.get("funFact"): err.append("funFact")
    ch = c.get("challenge", {})
    if not (ch.get("question") and isinstance(ch.get("options"), list) and len(ch["options"]) == 3 and ch.get("answer") in (0,1,2) and ch.get("explain")): err.append("challenge")
print("OK" if not err else "ERRORS: " + "; ".join(err))
