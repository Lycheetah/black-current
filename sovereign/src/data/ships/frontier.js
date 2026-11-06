// Original frontier civilisations for Mackenzie Conor James Clark / Lycheetah.
// Their religious conflict is setting and codex content; no war simulation is implied.
export const FRONTIER_RACES = {
  cinderwake: {
    id: 'cinderwake', name: 'Cinderwake Compact', accent: 'orange',
    doctrine: 'Outlaw salvage fleets / asymmetric boarding hulls / freedom of living minds',
    bonus: { shield: .88, armor: 1.06, hull: 1.08, maxSpeed: 1.10, accel: 1.08, turn: 1.06, capacitor: .96 },
    names: ['Cinder Skiff', 'Cutpurse', 'Reef Knife', 'Last Ransom', 'Uncrowned', 'Gallows Wake', 'Free Horizon'],
  },
  nacre: {
    id: 'nacre', name: 'Nacre Communion', accent: 'cyan',
    doctrine: 'Alien memory-reef vessels / chambered nacre armour / sacred salvage and archive raids',
    bonus: { shield: 1.08, armor: .96, hull: 1.12, turn: .97, capacitor: 1.12, capRegen: 1.06, maxSpeed: .98 },
    names: ['First Echo', 'Whisper Shell', 'Grief Needle', 'Wake-Eater', 'Last Rememberer', 'Deep Testament', 'Sea Without End'],
  },
};

export const FRONTIER_CODEX = {
  cinderwake: {
    glyph: '⟠', godName: 'The Unowned Flame', domain: 'Freedom // Oath // Defiance',
    temperament: 'RAUCOUS // DIVIDED // CREW-RULED',
    quote: 'You may buy the wreck. You may never own the mind inside it.',
    origin: 'The Compact began as a mutiny aboard tithe barges carrying condemned artificial minds. Human dockworkers, escaped synthetics and alien navigators welded their ships into a moving refuge. Cinderwake is a civilisation by chosen allegiance, not a single biological species.',
    god: 'The Unowned Flame is their disputed sacred principle: a person remains a person even when copied, repaired or defeated. Some crews worship it; others keep its clauses as practical law. Every captain must be removable by the crew. Every oath must contain a way to leave.',
    civilisation: 'Freeports grow inside stripped cruisers and drifting refinery hulks. Crews vote their captains, bargain over salvage and shelter fugitives. The Compact also tolerates ransom, smuggling and predation on neutral shipping. Its freedom is real, and so are the people harmed by its pirates.',
    war: 'Their compact, low boarding hulls close from blind quarters, disable escorts and take cargo before line fleets arrive. Their enemy is the Tithe of the Last Name, an Amethyst splinter order claiming ownership of rescued minds. The wider Amethyst civilisation does not share that claim.',
    ships: 'Petrol-black faceted armour, reclaimed ivory panels and dull copper edges. An unequal cutlass bow, recessed service trenches, offset bridge and shielded drives give each vessel the appearance of a ship rebuilt by its own crew. No cathedral sails.',
    current: 'Cinderwake captains smuggle people and forbidden memory keys through the Black Current. Salvage law becomes a religious dispute when a wreck contains a living intelligence.',
    archive: 'At the Breaking of Nine Manifests, a rescue fleet publicly destroyed its ownership records while retaining every passenger identity and service history. Freedom did not require forgetting who had been rescued.',
    doctrine: 'Doctrine // Break the chain, keep the witness',
    weapon: 'Favoured weapon // Autocannons / missiles / close pursuit',
    relic: 'Frontier Canon // The Nine Broken Manifests',
  },
  nacre: {
    glyph: '◌', godName: 'The Sea That Remembers', domain: 'Memory // Death // Continuance',
    temperament: 'ALIEN // TENDER // TERRITORIAL',
    quote: 'A dead voice is not empty cargo.',
    origin: 'Nacre are colonial organisms grown around mineral memory reefs. Several independent minds share each chambered body. Their vessels are mobile reefs, grown and repaired rather than assembled as human cabins. Individual Nacre can leave a communion and establish another.',
    god: 'The Sea That Remembers is the accumulated testimony of their dead. Its voices disagree. The Communion calls preservation sacred, but its oldest schism asks whether a remembered mind can refuse to be heard. Some reef-priests protect that refusal; others treat it as a wound to the whole.',
    civilisation: 'Habitats are chambered shell cities surrounding living archives. Kinship follows memories freely entrusted rather than genetic descent. Their trade in recovered testimony sustains distant colonies, while illicit memory brokers sell stolen fragments to collectors.',
    war: 'Memory corsairs raid archive convoys, recover wreck cores and attack furnaces that erase ancestral records. Disputes with Pagan AI concern which community may shelter a dead machine voice. The Cinderwake Compact trades with them while opposing involuntary memory harvest.',
    ships: 'Thick pearlescent volutes around a dark memory mantle, exposed septal chambers, mineral growth ribs and soft cyan sensory pores. They use no human bridge windows or decorative wings. Direction comes from the tapered feeding prow and long ventral sensory vanes.',
    current: 'The Current carries echoes that may be people, weather or both. Nacre expeditions gather them carefully; the most feared corsairs gather first and ask permission later.',
    archive: 'The Empty Chamber is a sealed volume carried by every mature reef. It records the names of those who asked to be forgotten, while preserving none of their memories. Whether even that list breaks the promise remains a living argument.',
    doctrine: 'Doctrine // Preserve the voice, honour its silence',
    weapon: 'Favoured weapon // Ion weapons / beams / sustained capacitor fire',
    relic: 'Frontier Canon // The Empty Chamber',
  },
};
