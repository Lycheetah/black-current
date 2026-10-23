# Black Current — agent instructions

Start with **`README.md` → "🤖 AGENT: START HERE"**. It is the whole onboarding: read order,
setup (`npm install && npx playwright install firefox && npm run serve`), how to plan with
Mac first, the build loop, and when to stop.

Short version:
- Mac (Mackenzie Clark) owns the game and has final say. **Plan with him first**, then build in batches.
- The locked laws are in README §Laws and `GAME_VISION.md`. Never break one silently.
- The current plan + receipts live in `PLAN_WEEKEND_BLITZ_2026-10-23.md` (§9 receipts, §10 runbook).
- `js/*.js` are classic scripts sharing globals. Never add `export`. Guard with `typeof X`, not `window.X`.
- `npm test` once per batch; counts only go up. Fun and phone feel are Mac's verdict, not a test's.
- `AGENTS.md` is a local seat file for another tool; ignore its machine paths.
