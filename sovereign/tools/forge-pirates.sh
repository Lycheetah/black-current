#!/usr/bin/env bash
# Fixed local frontier batch. No paid services, remote writes or publication.
set -euo pipefail
cd -- "$(dirname -- "$0")/.."
case "${1:---prepare}" in
  --prepare)
    printf 'LOCAL FRONTIER BUILD: Oathbreaker / Cinderwake; Wake-Eater / Nacre\n'
    "${BLENDER_BIN:-blender}" --background -noaudio --version
    ;;
  --ship)
    ship="${2:?Name a frontier ship}"
    case "$ship" in oathbreaker|wake_eater) ;; *) exit 2 ;; esac
    mkdir -p captures/pirates
    export ATELIER_COLLECTION=pirates ATELIER_SAMPLES=16
    printf 'BUILD %s\n' "$ship"
    "${BLENDER_BIN:-blender}" --background -noaudio --factory-startup --threads 6 --python-exit-code 1 \
      --python tools/blender/build-atelier.py -- "$ship" >> captures/pirates/production.log 2>&1
    printf 'RENDER %s\n' "$ship"
    "${BLENDER_BIN:-blender}" --background -noaudio --factory-startup --threads 6 --python-exit-code 1 \
      --python tools/blender/render-atelier.py -- "$ship" >> captures/pirates/production.log 2>&1
    ;;
  --finish)
    node tools/glb-blueprint.mjs src/data/models/oathbreaker_hero.glb cinderwake_heavy_cruiser
    node tools/glb-blueprint.mjs src/data/models/wake_eater_hero.glb nacre_cruiser
    python3 tools/register-ships.py
    npm run build
    node tools/check-frontier.mjs
    ;;
  --serve) exec python3 -m http.server 8813 --bind 127.0.0.1 ;;
  --witness-testament) node tools/witness-testament.mjs ;;
  *) printf 'Usage: --prepare | --ship oathbreaker|wake_eater | --finish | --serve\n' >&2;exit 2 ;;
esac
