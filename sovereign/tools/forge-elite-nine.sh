#!/usr/bin/env bash
# One authorised local collection: no publication or paid-service calls.
set -euo pipefail
cd -- "$(dirname -- "$0")/.."
ships=(iron_jackal red_verdict vesper_basilica daybreak_reliquary silent_meridian ruin_regent prism_seraph ashen_pilgrim lattice_tyrant)
hulls=(human_hunters_heavy_cruiser ai_hunters_battleship amethyst_angels_battleship cosmic_light_carrier cosmic_darkness_battleship chaos_dreadnought techno_angels_carrier pagan_ai_battleship ai_dreadnought)
case "${1:---prepare}" in
  --prepare)
    printf 'LOCAL NINE-SHIP BATCH\nTarget: %s\n' "$PWD"
    printf 'Blender export and studio rendering; existing blueprint importer; local game build.\n'
    for i in "${!ships[@]}"; do printf '%s -> %s\n' "${ships[$i]}" "${hulls[$i]}"; done
    "${BLENDER_BIN:-blender}" --background -noaudio --version
    node --version
    ;;
  --run)
    mkdir -p captures/elite-nine
    export ATELIER_COLLECTION=elite-nine ATELIER_SAMPLES=16
    log="$PWD/captures/elite-nine/production.log"
    printf 'Starting nine-ship local production. Log: %s\n' "$log"
    for ship in "${ships[@]}"; do
      printf 'BUILD %s\n' "$ship"
      "${BLENDER_BIN:-blender}" --background -noaudio --factory-startup --threads 6 --python-exit-code 1 \
        --python tools/blender/build-atelier.py -- "$ship" >> "$log" 2>&1
      printf 'RENDER %s\n' "$ship"
      "${BLENDER_BIN:-blender}" --background -noaudio --factory-startup --threads 6 --python-exit-code 1 \
        --python tools/blender/render-atelier.py -- "$ship" >> "$log" 2>&1
    done
    for i in "${!ships[@]}"; do
      node tools/glb-blueprint.mjs "src/data/models/${ships[$i]}_hero.glb" "${hulls[$i]}" >> "$log" 2>&1
    done
    python3 tools/register-ships.py
    npm run build
    printf 'Nine-ship local batch finished. No publication performed.\n'
    ;;
  --repair)
    shift
    export ATELIER_COLLECTION=elite-nine ATELIER_SAMPLES=16
    log="$PWD/captures/elite-nine/production.log"
    for ship in "$@"; do
      found=false
      for i in "${!ships[@]}"; do
        if [[ "$ship" != "${ships[$i]}" ]]; then continue; fi
        found=true
        printf 'REFINE %s\n' "$ship"
        "${BLENDER_BIN:-blender}" --background -noaudio --factory-startup --threads 6 --python-exit-code 1 \
          --python tools/blender/build-atelier.py -- "$ship" >> "$log" 2>&1
        "${BLENDER_BIN:-blender}" --background -noaudio --factory-startup --threads 6 --python-exit-code 1 \
          --python tools/blender/render-atelier.py -- "$ship" >> "$log" 2>&1
        break
      done
      if [[ "$found" != true ]]; then printf 'Outside this collection: %s\n' "$ship" >&2; exit 2; fi
    done
    ;;
  --finish)
    log="$PWD/captures/elite-nine/production.log"
    for i in "${!ships[@]}"; do
      node tools/glb-blueprint.mjs "src/data/models/${ships[$i]}_hero.glb" "${hulls[$i]}" >> "$log" 2>&1
    done
    python3 tools/register-ships.py
    npm run build
    ;;
  --accept-streaming)
    node tools/check-model-streaming.mjs
    ;;
  --serve)
    exec python3 -m http.server 8813 --bind 127.0.0.1
    ;;
  *) printf 'Usage: bash tools/forge-elite-nine.sh --prepare|--run|--repair SHIP...|--finish|--accept-streaming|--serve\n' >&2; exit 2 ;;
esac
