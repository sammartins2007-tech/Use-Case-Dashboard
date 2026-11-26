#!/bin/sh
# Installs the radar's sync, audit and offline-copy tools into a fresh workspace (refresh step 11).
set -e
W=/mnt/workspace
D=$(cd "$(dirname "$0")" && pwd)
mkdir -p $W/.aether/scripts $W/working/ce $W/working/sync $W/working/coverage
cp $D/customer_copy.py $D/customer_snapshot_dump.py $D/consistency_audit.py $W/.aether/scripts/
cp $D/build_account_snapshot.py $D/offline-viewer.txt $W/working/ce/
# brand files and the images they name (logo, hero) travel together
for f in $D/brand.*.json $D/*.png $D/*.webp $D/*.jpg $D/*.jpeg $D/*.svg; do
  [ -e "$f" ] && cp "$f" $W/working/ce/
done
echo "radar ops toolkit $(cat $D/VERSION 2>/dev/null || echo '(no VERSION file)') installed"
