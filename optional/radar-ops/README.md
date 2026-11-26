# Radar ops toolkit (optional, kit 1.11.0)

The scheduled refresh starts in a fresh workspace every time. Step 11 (read-only copies, customer editions,
offline customer copy, consistency check) therefore installs its scripts at the start of the step from one zip
on the radar site.

## Build the zip
Put these files in one folder (no sub-folders) and zip it as `radar-ops-kit.zip`:

| File | From |
|---|---|
| `install.sh`, `consistency_audit.py` | this folder |
| `customer_copy.py` | `optional/read-only-customer-app/`, with its placeholders filled (site Graph id, list ids) |
| `customer_snapshot_dump.py`, `build_account_snapshot.py` | `optional/customer-edition/` |
| `brand.<account>.json` + its logo and hero images | one set per customer edition (`optional/customer-edition/brand.example.json`) |
| `offline-viewer.txt` | the app's `public/offline-viewer.txt` (`npm run build:viewer`) |
| `VERSION` | the kit version or a date, printed by `install.sh` |

Upload the zip to the radar site's Documents library, folder `RadarOps` (create the folder once). The refresh
downloads it, runs `sh install.sh` and then the scripts. The refresh never edits the toolkit.

## Images
Brand files name their logo and hero image by file name, relative to the brand file (for example
`"logo": "contoso.png"`), and the images travel in the same zip. Never point to a path inside an app workspace:
that folder does not exist in the refresh's fresh workspace, and the offline copy could not be rebuilt.

## Keep it current
Rebuild and re-upload the zip after a kit update that changes one of these scripts, after adding a customer edition
or changing its brand file, and after any app change that rebuilds `offline-viewer.txt`.

## Consistency check
`consistency_audit.py` (read-only) checks the master lists and every copy named in the `readonly-apps` config row:
use case links and titles, wave plans, what-if scenarios and designs. The refresh reports its result; every bad
link, title mismatch and design mismatch must be 0.
