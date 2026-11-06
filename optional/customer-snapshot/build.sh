#!/bin/bash
# Rebuild the Customer x Microsoft static snapshot from working/solext/t_uc.json + t_cu.json.
set -e
K=/mnt/workspace/working/static-kit; B=/tmp/static-build
rm -rf $B; mkdir -p $B; (cd $K && tar cf - --exclude=out --exclude=build.sh --exclude=make_data.py .) | (cd $B && tar xf -)
ln -s /opt/appbuilder/templates/v1/node_modules $B/node_modules
python3 $K/make_data.py $B/generated/static-data.json
cd $B && ./node_modules/.bin/vite build -c vite.static.config.mjs --configLoader native > $B/build.log 2>&1 || { tail -20 $B/build.log; exit 1; }
python3 - <<'PY'
import re, glob, datetime
d = '/tmp/static-build/dist'
h = open(f'{d}/index.html').read()
js = open(glob.glob(f'{d}/assets/*.js')[0]).read().replace('</script', '<\\/script')
css = open(glob.glob(f'{d}/assets/*.css')[0]).read()
h = re.sub(r'<script type="module" crossorigin src="[^"]+"></script>', '', h)
h = re.sub(r'<link rel="stylesheet" crossorigin href="[^"]+">', '', h)
h = re.sub(r'<title>.*?</title>', '<title>Contoso × Microsoft AI Use Cases (snapshot)</title>', h)
day = datetime.date.today().strftime('%-d %b %Y')
badge = f'<div style="position:fixed;left:12px;bottom:12px;z-index:9999;font:12px Segoe UI,system-ui,sans-serif;background:#1B2A41;color:#fff;padding:6px 10px;border-radius:999px;opacity:.9">Read-only snapshot · updated {day} · Contoso × Microsoft</div>'
h = h.replace('</head>', '<style>' + css + '</style>\n</head>').replace('</body>', badge + '<script type="module">' + js + '</script>\n</body>')
open('/mnt/workspace/working/static-kit/out/Customer-AI-Use-Cases.html', 'w').write(h)
print('built', len(h) // 1024, 'KB', day)
PY
