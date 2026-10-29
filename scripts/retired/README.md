# Retired witnesses

These witnesses test parts of the game that were removed or hidden. They are kept for history.
`scripts/regression.mjs` only runs `scripts/witness-*.mjs`, so it never runs these.
Retired in Route 2 Stage 0 (2026-10-29). The `main` branch (rc.13) fails each of them the same way.

| Witness | Subject it tests | Why retired |
|---|---|---|
| armory | Armoury door, GP price floors, `sy-*` editor buttons | station-grid.js hides the "Armoury / upgrades" door; the modular shop replaced it |
| fleet | `FLEET_HULLS` roster and `ORDER` | the legacy hull roster is empty by design (modular frames replaced it) |
| night-sprint | Title "Ship builder" and the three shipyard tabs | the freeform shipyard UI is retired; the modular yard (Y) is the editor |
| ship-identity | `sy-style`, `sy-save`, `sy-fly`, `sy-my-builds` | old freeform editor controls, hidden under the modular yard |
| shipyard | Freeform editor overlay, Save into `FLEET_HULLS` | same retired editor |
| skin-selector | `window.packRenderer` | `js/packs.js` is commented out in index.html |
| workshop | `#btn-open-designer` and the old designer flow | old designer entry; the modular yard replaced it |
| workshop-reset | 18-part GP drafts and the GP wallet | GP economy replaced by metal and modular fittings |
