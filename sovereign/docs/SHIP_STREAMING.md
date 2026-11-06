# Ship streaming — first architecture slice

The fleet previously fetched and parsed every registered GLB before enabling the
title screen's launch controls. More detailed hulls made every addition a cost to
every player, including pilots using an unrelated starter ship.

The game now waits only for its current hull and the shared turret set. Renderer
entities request their own authored model; the existing `hasModel` view key rebuilds
a procedural preview when that model becomes available. Boarding, recovery and
save restoration therefore follow the same renderer path without changing the
simulation, fitting rules or save format.

`src/render/model-library.js` owns a two-job queue and a cache of parsed scenes.
Requests for the same name share one promise. A selected ship moves ahead of
queued requests, while active jobs finish normally. A failed model is reported
once, retains the procedural preview, and needs an explicit retry; the render
loop cannot turn a missing file into a request storm.

The Hull Forge initially loads the turret set, then streams its selected hull.
Selection changes guard against stale completions, including imported blueprint
JSON. The HUD reports hull assembly while a request is pending and a preview if
an asset fails. Production import tools retain the optional full-collection loader.

This is an incremental architecture change, using the existing simulation/view
boundary. Loaded models remain resident for reuse; a GPU memory budget and cache
eviction remain future work. It is not a full LOD or sector streaming system.

## Focused acceptance

`node tools/check-model-streaming.mjs` passed against the production module and
real GLTFLoader: six HTTP fixture requests, at most two active jobs, shared
duplicate requests, selected-model priority, cached reuse, one deliberately
missing asset, no automatic retry storm and one successful explicit retry.
This tests asset-loading behaviour; it does not attest to visuals or frame rate.
