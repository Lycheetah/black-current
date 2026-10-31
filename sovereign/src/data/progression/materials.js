/* Extracted unchanged from gold master 0.27.5. */
export const MATERIAL_CATALOG={
  ferrite:{id:'ferrite',name:'Ferrite Plate',desc:'Common structural metal reclaimed from armour and industrial hulls.'},
  prism_shard:{id:'prism_shard',name:'Prism Shard',desc:'High-energy crystalline substrate used by sensor and shield systems.'},
  biofiber:{id:'biofiber',name:'Bio-Fiber',desc:'Living structural filament recovered from fused and Savanah technology.'},
  void_glass:{id:'void_glass',name:'Void Glass',desc:'Black Current condensed material used by anomaly-grade systems.'},
  solar_filament:{id:'solar_filament',name:'Solar Filament',desc:'Radiant conduction thread used by Angel and Cosmic Light systems.'},
  ai_lattice:{id:'ai_lattice',name:'AI Lattice',desc:'Trained computational substrate required for advanced AI cores.'},
  drone_parts:{id:'drone_parts',name:'Drone Parts',desc:'Actuators, control wafers and compact propulsion components.'}
};

export const DRONE_CATALOG={
  shield_guardians:{id:'shield_guardians',name:'Aegis Guardian Wing',cost:0,count:4,color:'cyan',role:'SHIELD TANK',desc:'Autonomous guardian drones reinforce shield harmonics around the host vessel.',stats:{shield:1.08,shieldRegen:1.18}},
  armor_spiders:{id:'armor_spiders',name:'Armour Spider Wing',cost:180,count:4,color:'amber',role:'ARMOUR TANK',desc:'Repair spiders continuously rebuild armour lattice and emergency hull seams.',stats:{armor:1.10,hull:1.05},repair:{armor:.0045,hull:.0018}},
  combat_interceptors:{id:'combat_interceptors',name:'Interceptor Drone Wing',cost:240,count:5,color:'red',role:'COMBAT',desc:'Fast autonomous attack drones augment tracking and weapons pressure.',stats:{turretDamage:1.07,turretRate:1.08}},
  sentry_lattice:{id:'sentry_lattice',name:'Sentry Lattice',cost:320,count:3,color:'purple',role:'ARTILLERY',desc:'Slow precision drones create a stable long-range targeting mesh.',stats:{turretDamage:1.13,turn:.96}},
  salvage_swarm:{id:'salvage_swarm',name:'Salvage Swarm',cost:150,count:6,color:'gold',role:'SALVAGE',desc:'Micro-drones extend salvage tractor range and recover material fragments.',stats:{}},
  mining_wing:{id:'mining_wing',name:'Industrial Mining Wing',cost:260,count:5,color:'cyan',role:'INDUSTRIAL',desc:'Prototype extraction drones improve autonomous industrial job yields.',stats:{}}
};

export const INDUSTRY_RECIPES={
  ferrite_strip:{id:'ferrite_strip',name:'Ferrite Strip Mining',duration:75,cost:{},output:{ferrite:18},salvage:6,desc:'Low-risk autonomous extraction cycle.'},
  prism_recovery:{id:'prism_recovery',name:'Prism Recovery',duration:110,cost:{salvage:18},output:{prism_shard:6},desc:'Sort high-energy crystalline fragments from debris.'},
  bio_cultivation:{id:'bio_cultivation',name:'Bio-Fiber Cultivation',duration:95,cost:{salvage:14},output:{biofiber:8},desc:'Grow structural bio-fiber in a sealed machine ecology.'},
  drone_print:{id:'drone_print',name:'Drone Parts Print',duration:120,cost:{ferrite:8,biofiber:2},output:{drone_parts:5},desc:'Print compact drone frames and replacement actuators.'},
  lattice_train:{id:'lattice_train',name:'AI Lattice Training',duration:165,researchReq:'ai_cognition',cost:{ferrite:5,prism_shard:2,drone_parts:2},output:{ai_lattice:2},desc:'Train bounded inference substrate for advanced AI architecture.'},
  void_condense:{id:'void_condense',name:'Void Glass Condensation',duration:180,researchReq:'black_current_materials',cost:{salvage:32,prism_shard:1},output:{void_glass:3},desc:'Prototype Black Current material processing. Balance intentionally temporary.'}
};
