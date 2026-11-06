#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")/.."
export ATELIER_COLLECTION=atelier-ii ATELIER_SAMPLES=16
if (( $# )); then ships=("$@"); else ships=(rivet_hound eidolon_bastion thorn_sovereign); fi
"${BLENDER_BIN:-blender}" --background -noaudio --factory-startup --threads 6 --python-exit-code 1 \
  --python tools/blender/render-atelier.py -- "${ships[@]}"
for ship in "${ships[@]}"; do
  case "$ship" in
    rivet_hound) hull=human_hunters_assault_frigate ;;
    eidolon_bastion) hull=hybrid_fused_dreadnought ;;
    thorn_sovereign) hull=savanah_carrier ;;
    *) exit 2 ;;
  esac
  node tools/glb-blueprint.mjs "src/data/models/${ship}_hero.glb" "$hull"
done
python3 tools/register-ships.py
npm run build
