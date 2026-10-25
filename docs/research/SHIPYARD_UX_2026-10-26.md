# Fitting decisions: make the next action obvious

Mac's direction on 26 October: preserve the central modular ship, replace the
long side lists, make hull progression and equipment effects visible, and make
the game fun before adding advanced systems. This records design decisions;
the active backlog remains `docs/PLAN.md`.

## Sources and what they establish

- [EVE: Fitting Window](https://support.eveonline.com/hc/en-us/articles/213287845-Fitting-Window)
  distinguishes visible equipment slots, weapon hardpoints, fitting resources
  and a separate browser. Our lesson is clear attachment categories and limits.
- [EVE: Fitting Simulation](https://www.eveonline.com/news/view/fitting-simulation-virtual-ship-fitting-in-eve-online)
  describes compatibility/resource filters and previews that update attributes
  before purchase. Our lesson is to show what fits and what changes.
- [EVE: The Wallet](https://support.eveonline.com/hc/en-us/articles/14142293829916-The-Wallet)
  gives finances a named destination with an explicit balance. Black Current
  needs that clarity without calling every progression counter money.
- [Cosmoteer developer: UI revamp](https://blog.cosmoteer.net/2016/04/)
  is a historical 2016 design account. It explains free blueprint planning,
  paid application and the feedback advantages of direct construction. This
  supports distinguishing a plan from the ship currently flying; it is not a
  claim about the current Cosmoteer interface.

These are reference patterns. Their success in Black Current remains Mac's
playtest, not a conclusion established by those games.

## Observed in this checkout

The old desktop rail measured 1,265px of content inside a 725px space: nine
factory blueprints followed by six bare frames. Weapon fitting and clip-ons
added another long list on the opposite side. Smaller desktop viewports made
the information harder to interpret. Mac's screenshots also showed conflicting
HUD positions for health, system identity, navigation and view controls.

The actual spending currency is metal. Biomass is progression; GP is fitting
capacity. Talent and reactor points are separate unspent upgrade balances.
Weapon technology and fabricated hardware are different existing systems.
Frame rank, biomass and chassis cost are independent existing requirements.

The sensor lattice, sensor nose and radar dome currently declare cosmetic
effects only. They must not be advertised as useful sensor equipment. New
sensor mechanics are deferred.

## Installed interaction model

- The central construction renderer stays. High groups existing weapon decks,
  Mid groups support/utility slots, Low groups engineering/drive slots. Weapon
  size remains a separate compatibility rule. No new slot physics is invented.
- A bank and section selector locate the real slot. The right side shows one
  selected item. A focused equipment window provides artwork, search, family,
  class and ownership filters, and small pages of choices.
- Item facts show effect, power and price. Shield previews use the actual
  shield profile; weapon comparisons identify base hit and firing cycle.
- Research uses the original station purchase; fabrication still goes through
  the original Apply transaction. Blueprints do not spend currency. Existing
  limits and failed-save rollback remain authoritative.
- Frames get their own room with construction capacity, base slots, power,
  chassis price, required biomass and rank, and remaining training cost.
- Functional armour and style pieces are separate filters. A gun casing can
  occupy a weapon deck's top mount while retaining the gun. Its real hull HP
  and fabrication cost apply; this does not grant unlimited stacking.
- Wallet rows identify spendable metal, biomass, fitting capacity and unspent
  points with distinct symbols. They read existing campaign data. This release
  does not add a second wallet or a historical transaction ledger.

## Deferred decisions

Mac's refitting preference is still pending: owned swaps between fights with
dock/depot construction, all changes at docks/depots, or any safe field refit.
The current docking requirements have not been changed on an assumed answer.

Starter customisation and early combat pacing need their own measured batch.
The proposed direction is a viable first ship, a visible first upgrade and a
clear training/station route, without restoring runaway early income.

Fusion reactors, energy batteries, passive build specialisation and active
boosts are future gameplay work. Fitting power and stored boost energy should
remain distinct. No such new reactor or battery is claimed by this UI release.

Aetheron's incoming art stays in review until explicitly selected, scaled and
seen in the actual renderer. No new bitmap art generation is claimed here.
