/* Extracted unchanged from gold master 0.27.5. */
export const DAMAGE_PROFILES={
  balanced:{shield:1,armor:1,hull:1,subsystem:1},
  kinetic:{shield:.82,armor:1.28,hull:1.08,subsystem:1.18},
  thermal:{shield:1.24,armor:.94,hull:1.02,subsystem:.92},
  explosive:{shield:.72,armor:1.08,hull:1.36,subsystem:1.12},
  void:{shield:1.06,armor:1.12,hull:1.24,subsystem:1.42}
};

export const WEAPON_GROUPS={
  fore:['WPN_FL','WPN_FR'],
  mid:['WPN_ML','WPN_MR'],
  aft:['WPN_AL','WPN_AR']
};

export const WEAPON_ANATOMY={
  // shield = weapon-specific shield pressure
  // armour = local plate destruction
  // penetration = ability to transmit damage through intact plate
  // structure = post-penetration structural output
  // internalBlast = radius/weight of internal subsystem damage
  // critical = deterministic subsystem damage emphasis after penetration
  autocannon:{
    role:'SUSTAINED BREACH',shield:.84,penetration:.82,armour:1.12,
    structure:.92,internalBlast:.72,critical:.78,shieldBypass:0
  },
  repeater:{
    role:'ANTI-LIGHT',shield:.88,penetration:.54,armour:.86,
    structure:.68,internalBlast:.48,critical:.48,shieldBypass:0
  },
  railgun:{
    role:'PRECISION PENETRATOR',shield:.62,penetration:1.72,armour:1.04,
    structure:1.22,internalBlast:.56,critical:1.42,shieldBypass:0
  },
  plasma:{
    role:'ARMOUR MELTER',shield:1.08,penetration:.78,armour:1.48,
    structure:1.00,internalBlast:1.08,critical:.86,shieldBypass:0
  },
  void_torpedo:{
    role:'INTERNAL DEVASTATION',shield:.86,penetration:1.38,armour:1.12,
    structure:1.38,internalBlast:1.78,critical:1.34,shieldBypass:.10
  },
  flak:{
    role:'POINT DEFENCE',shield:.96,penetration:.36,armour:.72,
    structure:.58,internalBlast:.72,critical:.42,shieldBypass:0
  },
  beam_laser:{
    role:'SHIELD LANCE',shield:1.46,penetration:.60,armour:.82,
    structure:.78,internalBlast:.42,critical:.72,shieldBypass:0
  },
  missile:{
    role:'BLAST WARHEAD',shield:.78,penetration:.88,armour:1.00,
    structure:1.22,internalBlast:1.54,critical:1.02,shieldBypass:0
  },
  ion:{
    role:'SHIELD / SYSTEM PRESSURE',shield:1.34,penetration:.58,armour:.90,
    structure:.76,internalBlast:1.22,critical:1.18,shieldBypass:0
  },
  shard:{
    role:'PLATE BREAKER',shield:.72,penetration:1.10,armour:1.34,
    structure:1.02,internalBlast:.82,critical:.92,shieldBypass:0
  },
  siege_beam:{
    role:'CAPITAL PENETRATOR',shield:.94,penetration:1.24,armour:1.10,
    structure:1.18,internalBlast:.68,critical:1.30,shieldBypass:0
  },
  lance:{
    role:'SOVEREIGN PENETRATOR',shield:.88,penetration:1.78,armour:1.08,
    structure:1.34,internalBlast:.72,critical:1.52,shieldBypass:0
  },
  pulse:{
    role:'VOID DISRUPTION',shield:1.08,penetration:1.10,armour:1.08,
    structure:1.22,internalBlast:1.90,critical:1.26,shieldBypass:.16
  },
  world_collision:{
    role:'IMPACT',shield:.62,penetration:.34,armour:1.20,
    structure:.54,internalBlast:.34,critical:.44,shieldBypass:0
  },
  aether_furnace:{
    role:'INDUSTRIAL THERMAL SURGE',shield:1.28,penetration:.54,armour:1.22,
    structure:.72,internalBlast:.48,critical:.52,shieldBypass:0
  },
  normal:{
    role:'GENERAL PURPOSE',shield:1,penetration:.76,armour:1,
    structure:1,internalBlast:.75,critical:.75,shieldBypass:0
  }
};
