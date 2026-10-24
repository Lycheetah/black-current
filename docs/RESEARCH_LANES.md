# Black Current — daily research lanes

Product direction: Mac / Lycheetah. Updated 2026-10-25.
Three focused research conversations feed the existing live plan. One implementation
thread integrates accepted work; these briefs do not ask research chats to edit code,
spend credits, publish, contact people or alter saves.

## Shared context to paste into each chat

> Black Current is a small single-player browser RPG about a captain and a modular
> ship. It needs to work on a phone. The player reports excessive power by the third
> sector, unclear money/fitting costs, a difficult shipyard and weapon/audio spam.
> Current local content includes 21 weapon families, 32 exotic fittings, GP capacity,
> paid research, fire-control limits, captain training, AI augments and quests.
> Ordinary fittings currently lack a separate per-unit hardware cost. Planned capital
> Mk I weapons start around 99,000 of our currency. Progress should introduce distinct
> roles and tradeoffs. Keep the sector grid, recognisable places and seeded encounters.
> Avoid idle training timers, an MMO economy and copying another game's names or art.
> Distinguish implemented code, reported symptoms and proposals. Do not assume a
> green functional test proves balance or fun. Research only; do not edit the game.

## Lane 1 — economy and progression

> Investigate one economic decision for Black Current: how to stop free equipment
> replication and make saving for a capital weapon meaningful. Use current primary
> sources where possible. For any market quote, give item, location, date, currency
> and whether it is an ask, transaction or average. Compare costs relative to income
> and progression, not nominal currencies alone. Separate blueprints, owned equipment
> and fitted equipment. Identify an opening-game path, a late-game path and one
> exploit that would defeat the design. Return at most three recommendations, one
> numerical example, one counterargument and one small test. Maximum one page.

## Lane 2 — combat, camera and audio

> Investigate one combat decision for Black Current. Start with making different
> weapon classes useful without increasing projectile and sound spam. Consider fast
> tracking, charge time, range, energy, shield pressure, EMP, gravity control and
> carrier roles. Describe the player's action, readable tell, counterplay and fitting
> sacrifice. For audio, distinguish a battery, burst and individual projectile; reserve
> space for danger cues. For camera, consider the phone viewport and target readability.
> Return at most three recommendations, relevant source links, one tradeoff and one
> inexpensive playtest. Keep existing controls and engine constraints in view.
> Maximum one page; no implementation or claims of tested performance.

## Lane 3 — RPG content and consequences

> Investigate one RPG loop for Black Current. Propose a compact quest or encounter
> chain in which a captain choice changes a later event, job, relationship or fitting
> opportunity. Build on crew, vow, AI core, training, salvage and the existing recovery
> mission. Use current game examples as sources for mechanisms, not copied characters,
> nouns or plots. State objective, choice, consequence, reward, failure/recovery and
> save state needed. Explain why the reward will not break the economy. Return at most
> three useful findings and one testable quest outline. Maximum one page; no code edits.

## Daily handoff

Each brief contains: question, sources/dates, three findings at most, uncertainty,
one proposed decision and one validation step. The build thread checks claims against
the current repo, accepts or rejects the proposal, and records the next bounded batch
in the existing tracker. Prioritise a decision needed now. Repeating solved questions
daily is optional; a clear answer can close a research lane until something changes.

## ChatGPT limits and daily automation

Ordinary free text chat and research tools have different allowances. The current
[Free Tier FAQ](https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq)
describes unlimited everyday text subject to safeguards, with separate tool limits.
[Deep research](https://help.openai.com/en/articles/10500283-deep-research-in-chatgpt)
is plan-dependent and displays its remaining allowance in the product.

Daily automation requires an actual scheduled task. Current documentation lists
three active tasks for eligible Free accounts, with Free recurring tasks no more
frequent than daily; availability depends on the account and app. Check the Scheduled
page rather than assuming that leaving chats open schedules work.
[Official scheduled-task documentation](https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt).
No tasks or additional agents were started while preparing these briefs.
