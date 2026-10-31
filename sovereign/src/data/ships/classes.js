/* Extracted unchanged from gold master 0.27.5. */
export const BANK_IDS=['WPN_FL','WPN_FR','WPN_ML','WPN_MR','WPN_AL','WPN_AR'];
export const BANK_LABELS={WPN_FL:'Fore Port',WPN_FR:'Fore Starboard',WPN_ML:'Mid Port',WPN_MR:'Mid Starboard',WPN_AL:'Aft Port',WPN_AR:'Aft Starboard'};

export const BANKS_BY_COUNT={
  1:['WPN_FL'],
  2:['WPN_FL','WPN_FR'],3:['WPN_FL','WPN_FR','WPN_ML'],
  4:['WPN_FL','WPN_FR','WPN_ML','WPN_MR'],
  5:['WPN_FL','WPN_FR','WPN_ML','WPN_MR','WPN_AL'],
  6:['WPN_FL','WPN_FR','WPN_ML','WPN_MR','WPN_AL','WPN_AR']
};

export const CLASS_CATALOG={
  pod:{
    id:'pod',name:'Pod',role:'ESCAPE / SCOUT',banks:1,maxWeaponTier:1,
    pg:72,mass:34,visual:.34,pgScale:.18,massScale:.11,scale:.20,
    shield:.18,armor:.13,hull:.16,speed:2.55,accel:2.48,turn:2.55,damage:.42,
    camera:31,height:10,radius:4.2,mobility:100
  },
  starter:{
    id:'starter',name:'Starter Frigate',role:'FOUNDATION MULTIROLE',banks:2,maxWeaponTier:1,
    pg:118,mass:72,visual:.48,pgScale:.25,massScale:.16,scale:.27,
    shield:.30,armor:.27,hull:.29,speed:2.12,accel:2.02,turn:2.00,damage:.62,
    camera:40,height:14,radius:6,mobility:100
  },
  frigate:{
    id:'frigate',name:'Frigate',role:'SKIRMISH / INTERCEPT',banks:2,maxWeaponTier:1,
    pg:145,mass:92,visual:.56,pgScale:.31,massScale:.22,scale:.32,
    shield:.38,armor:.34,hull:.36,speed:2.00,accel:1.90,turn:1.90,damage:.70,
    camera:45,height:16,radius:7,mobility:94
  },
  assault_frigate:{
    id:'assault_frigate',name:'Assault Frigate',role:'BRAWL / BREACH',banks:3,maxWeaponTier:2,
    pg:184,mass:124,visual:.62,pgScale:.37,massScale:.28,scale:.36,
    shield:.43,armor:.48,hull:.47,speed:1.87,accel:1.79,turn:1.78,damage:.82,
    camera:49,height:17,radius:8,mobility:88
  },
  specialist_frigate:{
    id:'specialist_frigate',name:'Speciality Frigate',role:'EWAR / SCAN / UTILITY',banks:2,maxWeaponTier:2,
    pg:178,mass:112,visual:.61,pgScale:.36,massScale:.26,scale:.35,
    shield:.48,armor:.34,hull:.38,speed:1.93,accel:1.84,turn:1.88,damage:.68,
    camera:49,height:17,radius:7.8,mobility:91
  },
  destroyer:{
    id:'destroyer',name:'Destroyer',role:'ANTI-FRIGATE / KINETIC',banks:3,maxWeaponTier:2,
    pg:205,mass:145,visual:.68,pgScale:.42,massScale:.32,scale:.40,
    shield:.50,armor:.47,hull:.49,speed:1.78,accel:1.67,turn:1.62,damage:.80,
    camera:53,height:19,radius:9,mobility:81
  },
  cruiser:{
    id:'cruiser',name:'Cruiser',role:'SUSTAINED MULTIROLE',banks:4,maxWeaponTier:2,
    pg:295,mass:230,visual:.82,pgScale:.56,massScale:.47,scale:.49,
    shield:.69,armor:.68,hull:.70,speed:1.46,accel:1.38,turn:1.34,damage:.91,
    camera:65,height:23,radius:12,mobility:66
  },
  heavy_cruiser:{
    id:'heavy_cruiser',name:'Heavy Cruiser',role:'LINE TANK / ATTRITION',banks:4,maxWeaponTier:3,
    pg:338,mass:298,visual:.90,pgScale:.64,massScale:.57,scale:.54,
    shield:.79,armor:.86,hull:.83,speed:1.28,accel:1.22,turn:1.18,damage:.98,
    camera:72,height:25,radius:13.6,mobility:56
  },
  advanced_cruiser:{
    id:'advanced_cruiser',name:'Advanced Cruiser',role:'PRECISION / MOBILITY',banks:4,maxWeaponTier:3,
    pg:350,mass:272,visual:.91,pgScale:.65,massScale:.54,scale:.55,
    shield:.78,armor:.70,hull:.72,speed:1.42,accel:1.38,turn:1.34,damage:1.02,
    camera:72,height:25,radius:13.3,mobility:65
  },
  battlecruiser:{
    id:'battlecruiser',name:'Battlecruiser',role:'OVERSIZED GUNSHIP',banks:5,maxWeaponTier:3,
    pg:392,mass:330,visual:.96,pgScale:.72,massScale:.64,scale:.58,
    shield:.82,armor:.78,hull:.80,speed:1.21,accel:1.18,turn:1.08,damage:1.13,
    camera:78,height:27,radius:15,mobility:49
  },
  specialist_ship:{
    id:'specialist_ship',name:'Specialist Warship',role:'COMMAND / SUPPORT / CONTROL',banks:4,maxWeaponTier:3,
    pg:376,mass:315,visual:.95,pgScale:.70,massScale:.62,scale:.57,
    shield:.88,armor:.74,hull:.78,speed:1.18,accel:1.14,turn:1.16,damage:.91,
    camera:78,height:27,radius:14.8,mobility:53
  },
  battleship:{
    id:'battleship',name:'Battleship',role:'LINE WARSHIP / HEAVY BATTERIES',banks:5,maxWeaponTier:3,
    pg:410,mass:390,visual:.98,pgScale:.76,massScale:.70,scale:.59,
    shield:.91,armor:1.02,hull:.98,speed:1.02,accel:1.02,turn:.92,damage:1.08,
    camera:82,height:29,radius:16,mobility:43
  },
  drone_carrier:{
    id:'drone_carrier',name:'Drone Carrier',role:'AUTONOMOUS WING COMMAND',banks:4,maxWeaponTier:3,
    pg:448,mass:470,visual:1.04,pgScale:.82,massScale:.78,scale:.63,
    shield:1.01,armor:.94,hull:1.02,speed:.89,accel:.90,turn:.80,damage:.90,
    camera:89,height:31,radius:18,mobility:34
  },
  industrial:{
    id:'industrial',name:'Industrial Fleet Ship',role:'FABRICATION / SALVAGE / LOGISTICS',banks:3,maxWeaponTier:2,
    pg:485,mass:560,visual:1.06,pgScale:.88,massScale:.86,scale:.66,
    shield:.94,armor:1.06,hull:1.18,speed:.78,accel:.80,turn:.72,damage:.70,
    camera:92,height:32,radius:19,mobility:28
  },
  autonomous:{
    id:'autonomous',name:'Autonomous Fleet Core',role:'AI COMMAND / UNCREWED WARFARE',banks:5,maxWeaponTier:3,
    pg:472,mass:438,visual:1.05,pgScale:.86,massScale:.76,scale:.64,
    shield:1.04,armor:.92,hull:.96,speed:.96,accel:.94,turn:.92,damage:1.04,
    camera:89,height:31,radius:18.5,mobility:38
  },
  dreadnought:{
    id:'dreadnought',name:'Dreadnought',role:'SIEGE / CAPITAL EXECUTION',banks:6,maxWeaponTier:4,
    pg:590,mass:740,visual:1.18,pgScale:1.0,massScale:1.0,scale:.70,
    shield:1.16,armor:1.38,hull:1.35,speed:.72,accel:.75,turn:.65,damage:1.18,
    camera:101,height:35,radius:21,mobility:23
  },
  carrier:{
    id:'carrier',name:'Carrier',role:'FLEET SUPPORT / DRONE CAPITAL',banks:4,maxWeaponTier:4,
    pg:625,mass:820,visual:1.22,pgScale:1.04,massScale:1.05,scale:.74,
    shield:1.28,armor:1.24,hull:1.42,speed:.64,accel:.67,turn:.58,damage:.92,
    camera:108,height:38,radius:23,mobility:18
  },
  titan:{
    id:'titan',name:'Titan',role:'APEX CIVILISATION WARFORM',banks:6,maxWeaponTier:4,
    pg:690,mass:980,visual:1.34,pgScale:1.12,massScale:1.15,scale:.82,
    shield:1.42,armor:1.50,hull:1.55,speed:.54,accel:.58,turn:.48,damage:1.32,
    camera:120,height:42,radius:26,mobility:13
  }
};
