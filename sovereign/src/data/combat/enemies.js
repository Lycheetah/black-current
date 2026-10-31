/* Extracted unchanged from gold master 0.27.5. */
import { LEGACY_RACE_ALIASES } from '../ships/races.js';

export const ENEMY_CLASS_CATALOG={
  fighter:{name:'Fighter',scale:.42,shield:42,armor:22,hull:44,speed:21,range:82,damage:10,fireRate:.58,radius:3.3,ideal:48,orbit:19,salvage:4,role:'SCREEN'},
  frigate:{name:'Frigate',scale:.72,shield:90,armor:72,hull:105,speed:14,range:120,damage:19,fireRate:.95,radius:5.2,ideal:78,orbit:11,salvage:12,role:'TACKLE'},
  destroyer:{name:'Destroyer',scale:1.06,shield:190,armor:165,hull:225,speed:9.4,range:175,damage:31,fireRate:1.28,radius:7.5,ideal:125,orbit:6,salvage:25,role:'HUNTER'},
  cruiser:{name:'Cruiser',scale:1.52,shield:390,armor:350,hull:465,speed:6.6,range:215,damage:46,fireRate:1.55,radius:10.5,ideal:160,orbit:3.5,salvage:46,role:'LINE'},
  battleship:{name:'Battleship',scale:2.05,shield:760,armor:820,hull:900,speed:4.4,range:265,damage:68,fireRate:1.85,radius:15,ideal:205,orbit:2.0,salvage:88,role:'HEAVY LINE'},
  dreadnought:{name:'Dreadnought',scale:2.72,shield:1250,armor:1550,hull:1700,speed:2.9,range:325,damage:92,fireRate:2.15,radius:21,ideal:270,orbit:.8,salvage:155,role:'ARTILLERY'},
  titan:{name:'Titan',scale:3.65,shield:2450,armor:2250,hull:2850,speed:2.2,range:365,damage:122,fireRate:2.35,radius:31,ideal:315,orbit:.45,salvage:260,role:'FLAGSHIP'}
};

export const ENEMY_RACE_DOCTRINES={
  savanah:{weapon:'repeater',alt:'shard',shield:.98,armor:1.08,hull:1.12,speed:1.06,damage:1.05,range:.96,accent:0x44ff71,desc:'Verdant eye hunters'},
  sol_symbiots:{weapon:'ion',alt:'beam_laser',shield:1.20,armor:.94,hull:1.00,speed:1.00,damage:1.00,range:1.06,accent:0x72eaff,desc:'Covenant shield line'},
  chaos:{weapon:'plasma',alt:'missile',shield:.90,armor:1.00,hull:1.04,speed:1.14,damage:1.10,range:.94,accent:0xd06cff,desc:'Chaotic mixed assault'},
  cosmic_darkness:{weapon:'railgun',alt:'ion',shield:1.00,armor:.98,hull:.98,speed:1.04,damage:1.12,range:1.20,accent:0x8c68ff,desc:'Night precision'},
  cosmic_light:{weapon:'beam_laser',alt:'ion',shield:1.24,armor:.90,hull:.94,speed:1.00,damage:1.02,range:1.08,accent:0xffdb85,desc:'Radiant shield walls'},
  blackhole:{weapon:'plasma',alt:'void_torpedo',shield:1.04,armor:1.04,hull:1.12,speed:.94,damage:1.18,range:1.10,accent:0xffa04f,desc:'Gravity pressure'},
  hybrid_fused:{weapon:'repeater',alt:'shard',shield:.88,armor:1.10,hull:1.22,speed:1.02,damage:1.00,range:.94,accent:0xba70ff,desc:'Regenerative fused pressure'},
  human_hunters:{weapon:'shard',alt:'autocannon',shield:.78,armor:1.30,hull:1.16,speed:.92,damage:1.12,range:.92,accent:0xffa45a,desc:'Industrial pursuit'},
  ai_hunters:{weapon:'railgun',alt:'void_torpedo',shield:.90,armor:1.02,hull:.96,speed:1.08,damage:1.14,range:1.18,accent:0xff4f54,desc:'Stealth interdiction'},
  amethyst_angels:{weapon:'beam_laser',alt:'plasma',shield:1.14,armor:1.02,hull:1.00,speed:.98,damage:1.07,range:1.08,accent:0xb768ff,desc:'Gothic beam pressure'},
  techno_angels:{weapon:'ion',alt:'beam_laser',shield:1.15,armor:.88,hull:.92,speed:1.12,damage:1.02,range:1.06,accent:0x7deaff,desc:'Crystalline tracking'},
  ai_gods:{weapon:'beam_laser',alt:'railgun',shield:1.16,armor:1.06,hull:1.06,speed:.96,damage:1.08,range:1.10,accent:0xffd478,desc:'Imperial command line'},
  pagan_ai:{weapon:'missile',alt:'shard',shield:.76,armor:1.14,hull:1.34,speed:.90,damage:1.16,range:1.00,accent:0xff875d,desc:'Ancestral hull-breakers'},
  ai:{weapon:'ion',alt:'autocannon',shield:1.06,armor:1.04,hull:1.04,speed:1.04,damage:1.02,range:1.04,accent:0x67eaff,desc:'Pure machine modularity'}
};
for(const [legacy,canonical] of Object.entries(LEGACY_RACE_ALIASES)){
  ENEMY_RACE_DOCTRINES[legacy]=ENEMY_RACE_DOCTRINES[canonical];
}

export const CONTRACT_ENEMY_RACES={
  breach_purge:['abyssal','mycelium','ossuary'],
  derelict_recovery:['ferric','vanta','ossuary'],
  leviathan_hunt:['abyssal','vanta'],
  cold_cathedral:['aurelian','abyssal','prism'],
  mirror_extraction:['vanta','prism','seraphim'],
  bone_ring_siege:['ossuary','abyssal','ferric'],
  aion_archive_echo:['prism','seraphim','vanta'],
  aion_warden_intercept:['prism','vanta','abyssal'],
  aion_crown_breaker:['seraphim','prism','abyssal'],
  chaos_carnival_run:['abyssal','prism','seraphim'],
  chaos_laughing_maw:['abyssal','vanta','prism']
};
