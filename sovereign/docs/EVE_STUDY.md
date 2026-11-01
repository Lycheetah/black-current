# Studying EVE: the whole game, rebuilt as ours

EVE Online studied as **design**: what each system does for the player, why it works, where it
hurts, and the Sovereign Eclipse version in our own world (canon from `docs/canon/` and the original
Forge data). We take lessons; names, shapes and content are ours.

## The loop that drives everything
EVE's loop is: undock, take a risk, gain something, get it home. Loss is real: your ship, guns and
cargo are destroyed when you die, so risk carries weight and organised risk-takers earn the most. Combat
drives the economy because destroyed ships must be rebuilt. Critics call it punishing: long travel,
waiting, preparation, multi-hour fleets.

**Ours:** launch from a station, take an operation or chase a signature, bring salvage, materials and
research home. Cargo is only safe once docked. Loss is real but quick to recover from: the pilot always
returns to Asterion, ships are assets you replace. Travel is short and eventful, never a commute.

## System by system

| EVE system | What it gives the player | Where it hurts | Sovereign Eclipse version |
|---|---|---|---|
| Overview, locking, orbit, transversal | tactics over twitch | dense, intimidating | **done**: Overview, lock, orbit/keep-range/approach, tracking and angular velocity, readable target panel |
| Fitting: slots, CPU, powergrid | every fit is a trade-off | spreadsheets | **nodes** (guns placed on the hull) + **module slots** (weapon / defence / drive / utility, from the original MODULE_CATALOG) + **powergrid and mass**: mass is our second budget and changes how the ship flies |
| Ship loss, insurance, clones | stakes | harsh for newcomers | hull and fitted guns lost; **Covenant cover** (insurance) returns part; the pilot is recovered at Asterion; wrecks drop loot for whoever gets there |
| Skills trained in real time | long-term growth | waiting, a gate on fun | **Research** (the canon research tree) earned by play, and **civilisation doctrine** mastery; nothing trains while you wait |
| Warp, gates, autopilot | geography and distance | slow travel | **Micro-ZJ jumps** for fast, slightly dangerous local travel (spool by mass) and **PILLAR gates** between sectors |
| Security space, CONCORD | safe ↔ dangerous gradient | ganking frustration | **security levels** per sector with **Warden patrols**: Naraka watched, Erebos contested, Deep Current lawless; reward rises with risk |
| Agents, missions, standings, LP | structure and goals | repetitive | the 11 canon **contracts**, **agents per civilisation**, standing with 15 civilisations, **Covenant marks** spent in civilisation stores |
| Probe scanning, relic and data sites | discovery | fiddly | **the Atlas** (done): detect, triangulate, scan, understand, resolve; site types get their own decode puzzles |
| Industry, blueprints, research | build your own fleet | opaque UI | the original **INDUSTRY_RECIPES** and materials; our hull **blueprints** are literally what you build from |
| Market, regional orders | a real economy | market PvP is niche | **station markets** with stock that moves, prices that react, trade routes with risk |
| Mining, planetary industry | quiet income | dull | resource signatures, mining drone wings (canon), refining at stations |
| Drones | a second weapon system | micromanagement | canon **drone wings** and **AI cores** as autonomous wingmates |
| Corporations, sovereignty | belonging, war | needs many players | later: co-op crews, then persistent space (phase E) |
| New player experience (career agents, AIR program) | guided start | CCP reports about 90% of new players left within a week; career agents "lead nowhere" | **first hour as a story**: an induction chain at Asterion that teaches by doing, then hands you to a civilisation agent and the next sector; never a dead end |

## What we keep, what we refuse
- **Keep:** meaningful loss, tactical combat, deep fitting, discovery, an economy where things are built
  and destroyed, a gradient from safe to lawless.
- **Refuse:** waiting as gameplay, long empty travel, opaque menus, a first week that loses players,
  content that leads nowhere.

## Sources
- University of Chicago participant observation of EVE's economy — https://voices.uchicago.edu/202003sosc20224/2020/07/09/participant-observation-the-economy-of-eve-online
- GameDev.net, EVE as a case study in MMORPG design (risk and loss) — https://gamedev.net/forums/topic/487957-eve-online-a-case-study-in-innovative-mmorpg-design?page=2
- EVE forums, "Downfall" (extraction loop, punishing travel and waiting) — https://forums.eveonline.com/t/downfall/501841
- Hackernoon, lessons from EVE's economy — https://hackernoon.com/how-to-build-a-robust-game-economy-lessons-from-one-of-the-worlds-longest-running-mmos-426f8fd94f6d
- CCP, AIR Career Program (2022) — https://www.ccpgames.com/news/2022/eve-onlines-new-player-experience-expands-with-dedicated-career-program
- Prima Games, CCP on the new player problem (about 90% lost in a week; older figure) — https://primagames.com/featured/how-eve-online-is-solving-its-new-player-problem-ccp-interview
- EVE forums, "How CCP could keep new players longer" (career agents lead nowhere) — https://forums.eveonline.com/t/how-ccp-could-keep-new-players-longer/386366
- EVE University wiki, Neocom and Industry — https://wiki.eveuniversity.org/Neocom , https://wiki.eveuniversity.org/Industry
- CCP, Industry UI — https://www.eveonline.com/article/industry-ui
