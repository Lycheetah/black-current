/* Connected hulls are the authoring model. Legacy combat nodes are compiled
 * from them at the boundary; the combat source and its gun-mark lane stay intact. */
(() => {
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  const HULLS={frigate:{name:'Forge frigate',cls:'FRIGATE',sections:10,slots:6,power:12,cost:0,mass:0,rank:0},cruiser:{name:'Forge cruiser',cls:'CRUISER',sections:18,slots:8,power:24,cost:1800,mass:500,rank:1},battleship:{name:'Forge battleship',cls:'BATTLESHIP',sections:30,slots:12,power:44,cost:9000,mass:1400,rank:3},capital:{name:'Forge capital',cls:'CAPITAL',sections:48,slots:18,power:72,cost:24000,mass:3000,rank:4},supercapital:{name:'Forge supercapital',cls:'SUPERCAPITAL',sections:72,slots:24,power:110,cost:60000,mass:6000,rank:5},titan:{name:'Forge titan',cls:'TITAN',sections:96,slots:32,power:160,cost:250000,mass:20000,rank:6}};
  for(const[id,h]of Object.entries(HULLS))h.cost=window.tuning.PRICE_CURVE.frame[id];   // js/tuning.js owns frame prices
  // fleet.js's ladder carries TITAN (the titan frame uses it as is); the two capital frames between battleship and titan get their own bands, kept at the same net (rate × dmg ≈ 1.07) so size is never strictly stronger
  const CAPITAL_BANDS={CAPITAL:{min:Infinity,cls:'CAPITAL',rate:.52,dmg:2.05},SUPERCAPITAL:{min:Infinity,cls:'SUPERCAPITAL',rate:.38,dmg:2.85}};
  const SECTIONS={bridge:{name:'Command core',slot:'utility',cost:0},spine:{name:'Structural spine',slot:null,cost:8},plate:{name:'Armour plate (+35 base hull HP)',slot:null,cost:30},novice:{name:'Novice weapon deck',slot:'point',cost:12},deck:{name:'Light weapon deck',slot:'light',cost:96},battery:{name:'Medium battery deck',slot:'medium',cost:260},drive:{name:'Engine block',slot:'engine',cost:10},utility:{name:'Utility section',slot:'utility',cost:12},heavy:{name:'Heavy battery deck',slot:'heavy',cost:520,hulls:['battleship','capital','supercapital','titan']},hangar:{name:'Hangar deck',slot:'utility',cost:380},spinal:{name:'Spinal mount',slot:'capital',cost:1400,hulls:['capital','supercapital','titan']}};
  const GEARS={engine:{name:'Compact engine',type:'thruster',radius:8,power:2,cost:18,kind:'engine',description:'Adds an engine fitting for thrust.'},shield:{name:'Shield emitter',type:'shield',radius:6,power:2,cost:24,kind:'utility',description:'Adds shield capacity; hull numbers update when applied.'},repair:{name:'Repair module',type:'mender',radius:8,power:3,cost:40,kind:'utility',description:'Adds a repair fitting for the ship role system.'}};
  // Clip-ons bolt onto a section's open sides or its top. Each is one data row: where it mounts, what it
  // costs, and the combat node it compiles to (skirts and casings are armour pods, a ram is a spike).
  const PIECES={
    skirt:{name:'Side skirt',mounts:['port','star'],cost:16,node:{type:'pod',radius:9},blurb:'Flank armour plate on an open side. +35 hull HP.'},
    casing:{name:'Gun casing',mounts:['top'],needs:'weapon',cost:20,node:{type:'pod',radius:7},blurb:'Armoured cowl round a fitted gun. +35 hull HP.'},
    command:{name:'Command post',mounts:['top'],on:'bridge',cost:400,slots:1,blurb:'Raised flight deck on the core. +1 module slot.'},
    ram:{name:'Ram prow',mounts:['prow'],cost:200,node:{type:'spike',radius:10},blurb:'Armoured ramming wedge on an open bow.'},
    silo:{name:'Seeker silo',mounts:['top'],needs:'clear',cost:300,power:2,silo:'seeker',blurb:'Missile hatches sunk into the deck. Homing missiles without a turret slot.'},
    rockets:{name:'Rocket silo',mounts:['top'],needs:'clear',cost:280,power:2,silo:'rocket',blurb:'Deck launcher that fans rockets at your target.'},
    torpedo:{name:'Torpedo silo',mounts:['top'],needs:'clear',cost:360,power:3,silo:'torpedo',blurb:'One heavy seeking torpedo tube. Slow and brutal.'},
    bay:{name:'Drone bay',mounts:['port','star','stern'],cost:450,power:2,node:{type:'bay',radius:14},blurb:'Launches a fighter that hunts your target. It can be shot down; relaunch 6 s.'},
    nacelle:{name:'Engine nacelle',mounts:['stern'],cost:220,power:1,node:{type:'thruster',radius:6},blurb:'Extra thrust on an open stern. Uses 1 power.'},
    // The forge set (Mac, 2026-10-25: "forge as many new art pieces for the modular build"). Pieces with
    // no node are paint only and say so; negative power is a generator.
    vane:{name:'Steering vane',mounts:['port','star'],cost:140,power:1,node:{type:'thruster',radius:5},blurb:'Swept vane on an open side. Extra thrust. Uses 1 power.'},
    wing:{name:'Swept wing',mounts:['port','star'],cost:200,node:{type:'pod',radius:9},blurb:'Armoured wing with running lights. +35 hull HP.'},
    blister:{name:'Shield blister',mounts:['port','star'],cost:260,power:2,node:{type:'shield',radius:6},blurb:'Shield projector bulging from an open side. Adds shield capacity. Uses 2 power.'},
    cargo:{name:'Strap-on pods',mounts:['port','star'],cost:20,node:{type:'pod',radius:8},blurb:'Twin hardened pods strapped to a flank. +35 hull HP.'},
    lattice:{name:'Sensor lattice',mounts:['port','star'],cost:90,blurb:'Truss outrigger with sensor lights. Looks only, no stats.'},
    tines:{name:'Forked ram',mounts:['prow'],cost:240,node:{type:'spike',radius:10},blurb:'Two-pronged ramming prow on an open bow.'},
    dish:{name:'Sensor nose',mounts:['prow'],cost:110,blurb:'Rounded nose with a scanning dish. Looks only, no stats.'},
    bowshield:{name:'Bow shield',mounts:['prow'],cost:300,power:2,node:{type:'shield',radius:6},blurb:'Curved shield emitter ahead of the bow. Adds shield capacity. Uses 2 power.'},
    twinjet:{name:'Twin jets',mounts:['stern'],cost:320,power:2,node:{type:'thruster',radius:8},blurb:'Two engine bells on an open stern. Extra thrust. Uses 2 power.'},
    burner:{name:'Afterburner',mounts:['stern'],cost:420,power:3,node:{type:'thruster',radius:10},blurb:'One big hot bell on an open stern. Extra thrust. Uses 3 power.'},
    fins:{name:'Tail fins',mounts:['stern'],cost:100,blurb:'Split tail with running lights. Looks only, no stats.'},
    bulwark:{name:'Deck bulwark',mounts:['top'],needs:'clear',cost:220,node:{type:'pod',radius:7},blurb:'Riveted armour slab over a deck with no turret. +35 hull HP.'},
    reactor:{name:'Auxiliary reactor',mounts:['top'],needs:'clear',cost:600,power:-2,blurb:'Reactor sunk into a deck with no turret. +2 power budget.'},
    radar:{name:'Radar dome',mounts:['top'],cost:120,blurb:'Sweeping radar in the deck corner. Looks only, no stats.'},
    mast:{name:'Comms mast',mounts:['top'],cost:80,blurb:'Antenna mast with a beacon light. Looks only, no stats.'},
    hab:{name:'Habitat ring',mounts:['top'],needs:'clear',cost:260,blurb:'Lit crew ring over a deck with no turret. Looks only, no stats.'},
    // Stage 6: recovered only from a broken citadel (js/capital-endgame.js); one fitted per heart owned.
    citadelheart:{name:'Citadel heart',mounts:['top'],needs:'clear',cost:0,power:-8,unique:true,hulls:['supercapital','titan'],blurb:'A citadel reactor heart, recovered from a broken fortress. +8 power budget. Supercapital or titan only; one per heart recovered.'}
  };
  const SILO={FRIGATE:['light',12],CRUISER:['medium',18],BATTLESHIP:['siege',22],CAPITAL:['capital',26],SUPERCAPITAL:['capital',30],TITAN:['capital',34]};  // a silo's missile class follows the hull class
  const MOUNT_AT={top:[0,0],port:[0,-26],star:[0,26],prow:[30,0],stern:[-30,0]};
  function mountsOf(m,s){const at=new Set(m.sections.map(q=>q.x+','+q.y)),open=(dx,dy)=>!at.has((s.x+dx)+','+(s.y+dy));return['top',...(open(0,-1)?['port']:[]),...(open(0,1)?['star']:[]),...(open(1,0)?['prow']:[]),...(open(-1,0)?['stern']:[])];}
  function kitWhy(m,k,taken){
    const s=m.sections.find(s=>s.id===k?.cell),p=own(PIECES,k?.piece)?PIECES[k.piece]:null;
    if(!s||!p||!p.mounts.includes(k.mount)||taken?.has(s.id+':'+k.mount))return'Each clip-on needs its own mount.';
    if(!mountsOf(m,s).includes(k.mount))return`${p.name} needs an open ${k.mount} side.`;
    if(p.on&&s.kind!==p.on)return`${p.name} only fits the command core.`;
    if(p.hulls&&!p.hulls.includes(m.hull))return`${p.name} needs a supercapital or titan frame.`;
    if(p.unique){const h=hangar(),have=ownedCount(h,'kit:'+k.piece),used=(m.kit||[]).filter(x=>x.piece===k.piece).length;if(used>have)return`${p.name} is recovered from broken citadels only (${have} owned).`;}
    if(p.needs==='weapon'&&!m.fittings.some(f=>f.slot===s.id&&own(GEARS,f.gear)&&GEARS[f.gear].kind==='weapon'))return`${p.name} needs a fitted gun under it.`;
    if(p.needs==='clear'&&m.fittings.some(f=>f.slot===s.id&&own(GEARS,f.gear)&&GEARS[f.gear].kind==='weapon'))return`${p.name} needs a section with no turret.`;
    return null;
  }
  // Reshaping can close a side or unfit a gun; the yard drops clip-ons that lost their mount.
  function prune(m){if(Array.isArray(m?.kit)){const t=new Set();m.kit=m.kit.filter(k=>!kitWhy(m,k,t)&&t.add(k.cell+':'+k.mount));}return m;}
  const CLASSES=['POINT','LIGHT','MEDIUM','HEAVY','SIEGE','CAPITAL'];
  const ART={spitter:5,twin:1,needler:29,flechette:33,burst:36,autocannon:38,flak:28,wave:24,boomerang:31,mortar:3,heavycannon:2,laser:24,burstbeam:35,homing:63,torpedo:63,railgun:61,lance:61,cluster:71,shrapnel:40,howitzer:82,capitalrail:61};
  for(const[id,w]of Object.entries(WEAPON_TYPES)){
    const mount=fleet.equips().filter(p=>p.type==='cannon'&&fleet.mountWeapons(p.radius).includes(id)).sort((a,b)=>a.radius-b.radius)[0];if(!mount)continue;
    const cls=fleet.mountBand(mount.radius).cls;
    const family=window.arsenal?arsenal.familyName(id):['laser','burstbeam','lance'].includes(id)?'Laser':['wave','boomerang'].includes(id)?'Chaotic':['homing','torpedo','mortar','cluster','shrapnel'].includes(id)?'Projectile':'Electro-kinetic';
    GEARS['gun-'+id]={name:w.title||id,type:'cannon',radius:mount.radius,weapon:id,power:2+CLASSES.indexOf(cls)*2,cost:window.upgradePath?.NOVICE_PRICES[id]??(cls==='CAPITAL'?99000:Math.max(150,Math.round((armory.PRICES[id]||200)*.75))),kind:'weapon',cls,family,description:`${family} · ${w.damage} base damage · ${(w.fireRate/60).toFixed(2)}s base cycle. ${w.blurb||''}`};
  }
  // Stage 2: retired guns stay flyable for owners but are never fabricated, offered or dropped.
  for(const[id,g]of Object.entries(GEARS))if(g.weapon&&arsenal.GUNS[g.weapon]?.retired)Object.assign(g,{retired:true,salvageOnly:true,description:'Retired pattern: your owned copies still fly; new hulls use '+(WEAPON_TYPES[arsenal.replacementFor(g.weapon)]?.title||'its roster successor')+'. '+g.description});
  // Authored role mappings, verified against the manifest before async art loading.
  for(const[id,g]of Object.entries(GEARS)){const n=g.weapon?ART[g.weapon]:id==='engine'?89:id==='shield'?57:null;if(n)g.art='module_'+String(n).padStart(3,'0')+'.png';}
  // Factory hulls are authored modular blueprints: the same sections, slots and bill as a
  // player build, so a bought ship can be reshaped in the yard. Each fitting lists gear in
  // preference order; the first that fits the slot and leaves power for the rest is used.
  const LIGHT_GUNS=['gun-twin','gun-needler','gun-burst','gun-flechette','gun-autocannon','gun-spitter'],MEDIUM_GUNS=['gun-heavycannon','gun-railgun','gun-laser','gun-flak','gun-autocannon',...LIGHT_GUNS];
  const FACTORY=[
    {id:'kestrel',name:'Kestrel interceptor',hull:'frigate',role:'Fast striker',color:'#5ef2e0',blurb:'Arrowhead frame, shielded core, one bow gun. Hits first, leaves fast.',sections:[['core','bridge',0,0],['nose','deck',1,0],['port','plate',0,-1],['star','plate',0,1],['aft','drive',-1,0],['tail','spine',-2,0]],fittings:[['nose',LIGHT_GUNS],['aft',['engine']],['core',['shield']]]},
    {id:'hornet',name:'Hornet gunboat',hull:'frigate',role:'Twin-gun brawler',color:'#f2c45e',blurb:'Two wing decks either side of the core. More guns, thinner skin.',sections:[['core','bridge',0,0],['port','deck',0,-1],['star','deck',0,1],['neck','spine',1,0],['bow','plate',2,0],['aft','drive',-1,0]],fittings:[['port',LIGHT_GUNS],['star',LIGHT_GUNS],['aft',['engine']]]},
    {id:'warden',name:'Bulwark warden',hull:'frigate',role:'Armoured tank',color:'#9fb7c9',blurb:'Plated ram-nose and flanks with a repair core. Outlasts its rivals.',sections:[['core','bridge',0,0],['nose','deck',1,0],['bow','plate',2,0],['port','plate',0,-1],['star','plate',0,1],['aft','drive',-1,0]],fittings:[['nose',LIGHT_GUNS],['aft',['engine']],['core',['repair','shield']]]},
    // The first step up the capital ladder: rank 3 shipwrights and 1400 mass. It comes dressed in the forge set.
    {id:'dreadnought',name:'Asterion dreadnought',hull:'battleship',role:'Capital line ship',color:'#ffb347',blurb:'A heavy battery on the spine, three medium decks, a hangar and three drives. The first capital-class frame.',sections:[['core','bridge',0,0],['f1','heavy',1,0],['f2','battery',2,0],['bow','plate',3,0],['a1','spine',-1,0],['a2','hangar',-2,0],['d1','drive',-3,0],['p1','battery',0,-1],['s1','battery',0,1],['p2','plate',1,-1],['s2','plate',1,1],['pu','utility',-1,-1],['su','utility',-1,1],['dp','drive',-3,-1],['ds','drive',-3,1]],fittings:[['f1',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['f2',['gun-autocannon','gun-laser','gun-spitter']],['p1',['gun-autocannon','gun-flak','gun-spitter']],['s1',['gun-autocannon','gun-flak','gun-spitter']],['d1',['engine']],['core',['shield']]],kit:[['bow','prow','tines'],['p2','port','wing'],['s2','star','wing'],['p2','top','bulwark'],['s2','top','bulwark'],['a1','top','reactor'],['pu','top','radar'],['su','top','mast'],['pu','port','cargo'],['su','star','cargo'],['dp','stern','fins'],['ds','stern','fins'],['dp','port','lattice'],['ds','star','lattice']]},
    // Capital class: a spinal mount down the keel, twin hangars and a drive wall. Shipwright rank 4, 3000 mass.
    {id:'leviathan',name:'Leviathan carrier',hull:'capital',role:'Capital carrier',color:'#d1b5ff',blurb:'A spinal rail down the keel, a heavy battery behind it, three hangars and five drives. The ship the station builds docks around.',sections:[['core','bridge',0,0],['d9','spinal',1,0],['d10','heavy',2,0],['d11','battery',3,0],['d12','plate',4,0],['d13','plate',5,0],['d7','spine',-1,0],['d6','hangar',-2,0],['d5','spine',-3,0],['d4','drive',-4,0],['c9','battery',1,-1],['c8','utility',0,-1],['c7','hangar',-1,-1],['c6','spine',-2,-1],['c4','drive',-4,-1],['e9','battery',1,1],['e8','utility',0,1],['e7','hangar',-1,1],['e6','spine',-2,1],['e4','drive',-4,1],['b8','plate',0,-2],['b7','heavy',-1,-2],['b6','drive',-2,-2],['f8','plate',0,2],['f7','heavy',-1,2],['f6','drive',-2,2]],fittings:[['d9',['gun-capitalrail','gun-railgun','gun-heavycannon','gun-lance','gun-autocannon']],['d10',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['d11',['gun-autocannon','gun-flak','gun-laser','gun-spitter']],['c9',['gun-autocannon','gun-flak','gun-laser','gun-spitter']],['e9',['gun-autocannon','gun-flak','gun-laser','gun-spitter']],['d4',['engine']],['core',['shield']],['c8',['repair','shield']]],kit:[['d13','prow','tines'],['b8','port','wing'],['f8','star','wing'],['b8','top','bulwark'],['f8','top','bulwark'],['d5','top','reactor'],['c8','top','radar'],['e8','top','mast'],['c4','stern','twinjet'],['e4','stern','twinjet'],['d4','stern','burner'],['b6','port','vane'],['f6','star','vane'],['d12','top','radar']]},
    // Supercapital: forty sections, two spinal rails and a city on its back. Shipwright rank 5, 6000 mass.
    {id:'sovereign',name:'Sovereign titan',hull:'supercapital',role:'Supercapital flagship',color:'#ff5d73',blurb:'Two spinal rails, four heavy batteries, habitat rings and twin reactors. Slow as a moon and twice as hard to ignore.',sections:[['core','bridge',0,0],['d2','drive',-6,0],['d3','spine',-5,0],['d4','hangar',-4,0],['d5','hangar',-3,0],['d6','spine',-2,0],['d7','spine',-1,0],['d9','spinal',1,0],['d10','spinal',2,0],['d11','heavy',3,0],['d12','battery',4,0],['d13','plate',5,0],['d14','plate',6,0],['d15','deck',7,0],['c2','drive',-6,-1],['c3','spine',-5,-1],['c4','hangar',-4,-1],['c5','utility',-3,-1],['c6','spine',-2,-1],['c7','heavy',-1,-1],['c8','utility',0,-1],['c9','battery',1,-1],['c10','heavy',2,-1],['c11','battery',3,-1],['c12','plate',4,-1],['e2','drive',-6,1],['e3','spine',-5,1],['e4','hangar',-4,1],['e5','utility',-3,1],['e6','spine',-2,1],['e7','heavy',-1,1],['e8','utility',0,1],['e9','battery',1,1],['e10','heavy',2,1],['e11','battery',3,1],['e12','plate',4,1],['b4','drive',-4,-2],['b7','plate',-1,-2],['f4','drive',-4,2],['f7','plate',-1,2]],fittings:[['d9',['gun-capitalrail','gun-railgun','gun-heavycannon','gun-lance','gun-autocannon']],['d10',['gun-capitalrail','gun-railgun','gun-heavycannon','gun-lance','gun-autocannon']],['d11',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['c7',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['e7',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['c10',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['e10',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['d12',['gun-autocannon','gun-flak','gun-laser','gun-spitter']],['d2',['engine']],['core',['shield']]],kit:[['d15','prow','tines'],['d14','top','radar'],['b7','port','wing'],['f7','star','wing'],['b7','top','bulwark'],['f7','top','bulwark'],['d3','top','reactor'],['d6','top','reactor'],['c5','top','hab'],['e5','top','hab'],['c8','top','radar'],['e8','top','mast'],['d2','stern','burner'],['c2','stern','twinjet'],['e2','stern','twinjet'],['b4','stern','fins'],['f4','stern','fins'],['c12','port','blister'],['e12','star','blister'],['b4','port','lattice'],['f4','star','lattice']]},
    // Titan: sixty-four sections. At this size you are flying a base. Shipwright rank 6, 20000 mass: the steepest climb in the game.
    {id:'athanor',name:'Athanor titan',hull:'titan',role:'Titan · flying base',color:'#ffd36a',blurb:'Three spinal rails, eight heavy batteries, four habitat rings, triple reactors and a hangar city. The last rung of the ladder.',sections:[['d1','drive',-7,0],['d2','spine',-6,0],['d3','hangar',-5,0],['d4','hangar',-4,0],['d5','spine',-3,0],['d6','utility',-2,0],['d7','spine',-1,0],['core','bridge',0,0],['d9','spinal',1,0],['d10','spinal',2,0],['d11','spinal',3,0],['d12','heavy',4,0],['d13','heavy',5,0],['d14','battery',6,0],['d15','plate',7,0],['d16','deck',8,0],['c1','drive',-7,-1],['c2','spine',-6,-1],['c3','hangar',-5,-1],['c4','utility',-4,-1],['c5','hangar',-3,-1],['c6','spine',-2,-1],['c7','heavy',-1,-1],['c8','utility',0,-1],['c9','battery',1,-1],['c10','heavy',2,-1],['c11','battery',3,-1],['c12','heavy',4,-1],['c13','plate',5,-1],['e1','drive',-7,1],['e2','spine',-6,1],['e3','hangar',-5,1],['e4','utility',-4,1],['e5','hangar',-3,1],['e6','spine',-2,1],['e7','heavy',-1,1],['e8','utility',0,1],['e9','battery',1,1],['e10','heavy',2,1],['e11','battery',3,1],['e12','heavy',4,1],['e13','plate',5,1],['b2','drive',-6,-2],['b3','spine',-5,-2],['b4','hangar',-4,-2],['b5','spine',-3,-2],['b6','utility',-2,-2],['b7','plate',-1,-2],['b8','battery',0,-2],['b9','heavy',1,-2],['b10','battery',2,-2],['b11','plate',3,-2],['f2','drive',-6,2],['f3','spine',-5,2],['f4','hangar',-4,2],['f5','spine',-3,2],['f6','utility',-2,2],['f7','plate',-1,2],['f8','battery',0,2],['f9','heavy',1,2],['f10','battery',2,2],['f11','plate',3,2],['a8','plate',0,-3],['g8','plate',0,3]],fittings:[['d9',['gun-capitalrail','gun-railgun','gun-heavycannon','gun-lance','gun-autocannon']],['d10',['gun-capitalrail','gun-railgun','gun-heavycannon','gun-lance','gun-autocannon']],['d11',['gun-capitalrail','gun-railgun','gun-heavycannon','gun-lance','gun-autocannon']],['d12',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['d13',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['c7',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['e7',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['c10',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['e10',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['c12',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['e12',['gun-heavycannon','gun-railgun','gun-lance','gun-autocannon','gun-spitter']],['d14',['gun-autocannon','gun-flak','gun-laser','gun-spitter']],['c9',['gun-autocannon','gun-flak','gun-laser','gun-spitter']],['e9',['gun-autocannon','gun-flak','gun-laser','gun-spitter']],['d1',['engine']],['core',['shield']]],kit:[['d16','prow','tines'],['d15','top','radar'],['a8','port','wing'],['g8','star','wing'],['a8','top','bulwark'],['g8','top','bulwark'],['d2','top','reactor'],['d5','top','reactor'],['d7','top','reactor'],['c4','top','hab'],['e4','top','hab'],['b6','top','hab'],['f6','top','hab'],['c8','top','radar'],['e8','top','mast'],['d1','stern','burner'],['c1','stern','twinjet'],['e1','stern','twinjet'],['b2','stern','burner'],['f2','stern','burner'],['c13','port','blister'],['e13','star','blister'],['b11','port','bowshield'],['b2','port','lattice'],['f2','star','lattice'],['b3','port','cargo'],['f3','star','cargo']]},
    {id:'lancer',name:'Forge lancer',hull:'cruiser',role:'Line cruiser',color:'#cf9af0',blurb:'Medium battery on a long bow, twin wing decks aft. The fleet\'s spear.',sections:[['core','bridge',0,0],['neck','spine',1,0],['bow','battery',2,0],['port','plate',0,-1],['star','plate',0,1],['waist','spine',-1,0],['port-deck','deck',-1,-1],['star-deck','deck',-1,1],['aft','drive',-2,0]],fittings:[['bow',MEDIUM_GUNS],['aft',['engine']],['port-deck',LIGHT_GUNS],['star-deck',LIGHT_GUNS]]},
    {id:'aegis',name:'Aegis bastion',hull:'cruiser',role:'Shield fortress',color:'#86ded0',blurb:'Ringed in plate behind a shield core, triple drives, one heavy bow battery.',sections:[['core','bridge',0,0],['bow','battery',1,0],['port-bow','plate',1,-1],['star-bow','plate',1,1],['port','plate',0,-1],['star','plate',0,1],['aft','drive',-1,0],['port-aft','drive',-1,-1],['star-aft','drive',-1,1]],fittings:[['bow',MEDIUM_GUNS],['core',['shield']],['aft',['engine']],['port-aft',['engine']]]}
  ];
  // the last rank is the steepest step in the game: a titan is a flying base
  const RANK_COST=window.tuning.PRICE_CURVE.rankMetal,RANK_MASS=window.tuning.PRICE_CURVE.rankBiomass;   // js/tuning.js
  const ratings=new WeakMap(),visuals=new WeakMap(),orientations=new WeakMap();let ready=false;
  function error(message){throw new Error(message);}
  // Imported blueprints are untrusted: only a table's own string keys count, so
  // inherited names such as __proto__, constructor or toString never resolve.
  const own=(table,key)=>typeof key==='string'&&Object.prototype.hasOwnProperty.call(table,key);
  const metal=n=>Number.isSafeInteger(n)&&n>=0;
  function stock(){return{'hull:frigate':1,'section:spine':1,'section:novice':1,'section:drive':1,'gear:gun-spitter:1':1,'gear:engine:1':1};}
  function hangar(){const d=saveState.doc.modularHangar;if(!d||d.v!==1)return{v:1,rank:0,owned:stock()};return{v:1,rank:Math.max(0,Math.min(RANK_COST.length,Math.floor(Number(d.rank)||0))),owned:{...stock(),...d.owned},recoveries:Array.isArray(d.recoveries)?copy(d.recoveries):[]};}
  function ownedCount(h,key){const n=Number(h.owned[key]);return Number.isSafeInteger(n)&&n>=0?Math.min(64,n):0;}
  function make(hull='frigate'){
    if(!own(HULLS,hull))error('Unknown hull.');
    return{id:'build-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),frame:HULLS[hull].name,color:engine.player.color||'#5ef2e0',primaryWeapon:'spitter',secAbility:'shield',modular:{v:1,hull,sections:[{id:'core',kind:'bridge',x:0,y:0},{id:'aft',kind:'spine',x:-1,y:0},{id:'fore',kind:hull==='frigate'?'novice':'deck',x:1,y:0},{id:'drive',kind:'drive',x:-2,y:0}],fittings:[{slot:'fore',gear:'gun-spitter',mk:1},{slot:'drive',gear:'engine',mk:1}]},nodes:[]};
  }
  // A retired gun fits only where the captain still owns a copy (any mark).
  const ownsGear=g=>{const id=Object.keys(GEARS).find(k=>GEARS[k]===g),h=hangar();return!!id&&Object.keys(h.owned).some(k=>k.startsWith('gear:'+id+':')&&ownedCount(h,k)>0);};
  function fits(slot,g){
    if(!g)return false;if(g.kind!=='weapon')return !!slot&&slot===g.kind;
    if(g.retired&&!ownsGear(g))return false;
    const rank=CLASSES.indexOf(g.cls),limit={point:0,light:1,medium:2,heavy:3,capital:5}[slot];
    // A larger mount can down-fit a smaller gun, but an unknown class must
    // never pass as rank -1. Novice mounts cannot skip the Light investment.
    return rank>=0&&limit!==undefined&&rank<=limit;
  }
  function factory(id){
    const f=FACTORY.find(f=>f.id===id);if(!f)error('Unknown factory hull.');
    const h=HULLS[f.hull],sections=f.sections.map(([id,kind,x,y])=>({id,kind,x,y})),fittings=[];
    const options=f.fittings.map(([slot,list])=>({slot,list:list.filter(g=>own(GEARS,g)&&fits(SECTIONS[sections.find(s=>s.id===slot).kind].slot,GEARS[g]))}));
    let used=0;
    // Prefer researched guns so a factory hull flies on what the captain already owns.
    options.forEach((o,i)=>{const reserve=options.slice(i+1).reduce((n,p)=>n+(p.list.length?Math.min(...p.list.map(g=>GEARS[g].power)):0),0),room=o.list.filter(g=>used+GEARS[g].power+reserve<=h.power),gear=room.find(g=>!GEARS[g].weapon||armory.owns(GEARS[g].weapon))||room[0];if(gear){fittings.push({slot:o.slot,gear,mk:1});used+=GEARS[gear].power;}});
    const d=make(f.hull);d.frame=f.name;d.color=f.color;d.modular.sections=sections;d.modular.fittings=fittings;if(f.kit){d.modular.kit=f.kit.map(([cell,mount,piece])=>({cell,mount,piece}));prune(d.modular);}
    // Then step the costliest fitting down its list until the hull fits this captain's GP.
    const owned=g=>!GEARS[g].weapon||armory.owns(GEARS[g].weapon)?1:0,gpOf=g=>fleet.costOfNode(GEARS[g].type,GEARS[g].radius),cap=progression.getTotalGP();
    for(let guard=0;guard<12;guard++){let gp;try{gp=compile(d).gp;}catch{break;}if(gp<=cap)break;
      const swaps=fittings.map(x=>{const o=options.find(o=>o.slot===x.slot),down=o.list.filter(g=>gpOf(g)<gpOf(x.gear)&&GEARS[g].power<=GEARS[x.gear].power).sort((a,b)=>owned(b)-owned(a)||gpOf(b)-gpOf(a))[0];return down&&{x,down};}).filter(Boolean).sort((a,b)=>gpOf(b.x.gear)-gpOf(a.x.gear));
      if(!swaps.length)break;swaps[0].x.gear=swaps[0].down;}
    const gun=fittings.map(x=>GEARS[x.gear].weapon).find(Boolean);if(gun)d.primaryWeapon=gun;return d;
  }
  function inspect(design){
    const m=design?.modular,h=own(HULLS,m?.hull)?HULLS[m.hull]:null;if(!m||m.v!==1||!h)error('This modular hull version is unavailable.');
    if(!Array.isArray(m.sections)||m.sections.length<1||m.sections.length>h.sections||!Array.isArray(m.fittings)||m.fittings.length>48)error('Hull section or fitting limit exceeded.');
    const ids=new Set(),cells=new Set();
    for(const s of m.sections){if(own(SECTIONS,s?.kind)&&SECTIONS[s.kind].hulls&&!SECTIONS[s.kind].hulls.includes(m.hull))error(`${SECTIONS[s.kind].name} needs a ${SECTIONS[s.kind].hulls.map(k=>HULLS[k].name).join(' or ')}.`);if(!s||!own(SECTIONS,s.kind)||typeof s.id!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(s.id)||ids.has(s.id)||![s.x,s.y].every(n=>Number.isInteger(n)&&Math.abs(n)<=8)||![0,90,180,270].includes(s.rotation??0))error('Invalid or duplicate hull section.');const cell=s.x+','+s.y;if(cells.has(cell))error('Two hull sections cannot occupy the same space.');ids.add(s.id);cells.add(cell);if(s.kind==='battery'&&m.hull==='frigate')error('Medium battery decks need a cruiser or larger hull.');}
    const core=m.sections.find(s=>s.kind==='bridge');if(!core||core.x!==0||core.y!==0||m.sections.filter(s=>s.kind==='bridge').length!==1)error('The command core must remain at the hull origin.');
    const reached=new Set([core.id]);let changed=true;while(changed){changed=false;for(const s of m.sections)if(!reached.has(s.id)&&m.sections.some(q=>reached.has(q.id)&&Math.abs(q.x-s.x)+Math.abs(q.y-s.y)===1)){reached.add(s.id);changed=true;}}
    if(reached.size!==m.sections.length)error('Every section must connect to the command core.');
    const occupied=new Set();let power=0;for(const f of m.fittings){
      const s=m.sections.find(s=>s.id===f?.slot),g=own(GEARS,f?.gear)?GEARS[f.gear]:null;if(!s||!g||occupied.has(f.slot))error('Each compatible slot holds one module.');
      if(!fits(SECTIONS[s.kind].slot,g))error(`${g.name} does not fit the ${SECTIONS[s.kind].name}. ${g.cls==='LIGHT'?'Upgrade to a Light weapon deck first.':'Choose a compatible module size.'}`);
      if(!Number.isInteger(f.mk??1)||(f.mk??1)<1||(f.mk??1)>5)error('Invalid weapon mark.');
      if(![0,90,180,270].includes(f.rotation??0))error('Rotation must use quarter turns.');
      if(f.art!==undefined&&(typeof f.art!=='string'||!sprites.manifest?.modules?.some(a=>a.file===f.art&&a.usable)))error('Unknown fitting artwork.');
      occupied.add(f.slot);power+=g.power;
    }
    const kit=m.kit??[],taken=new Set();if(!Array.isArray(kit)||kit.length>64)error('Clip-on limit exceeded.');
    for(const k of kit){const why=kitWhy(m,k,taken);if(why)error(why);taken.add(k.cell+':'+k.mount);power+=PIECES[k.piece].power||0;}
    if(power>h.power)error(`Power budget exceeded: ${power} / ${h.power}. Fit fewer or lighter modules.`);
    return{m,h,power};
  }
  function compile(design){
    const{m,h,power}=inspect(design),d=copy(design),core=m.sections.find(s=>s.kind==='bridge'),sections=[core,...m.sections.filter(s=>s!==core)],nodes=[];
    for(const s of sections)nodes.push({type:s.kind==='bridge'?'core':s.kind==='plate'?'pod':'hull',radius:s.kind==='bridge'?18:s.kind==='plate'?12:6,dx:s.x*48,dy:s.y*48});
    for(const k of m.kit??[]){const p=PIECES[k.piece],s=m.sections.find(s=>s.id===k.cell),o=MOUNT_AT[k.mount];const[tier,r]=SILO[h.cls]||SILO.FRIGATE,nd=p.silo?{type:'cannon',radius:r,weapon:p.silo+'-'+tier}:p.node;if(nd)nodes.push({...nd,dx:s.x*48+o[0],dy:s.y*48+o[1]});}
    const hidden=nodes.length;
    for(const f of m.fittings){const s=m.sections.find(s=>s.id===f.slot),g=GEARS[f.gear];nodes.push({type:g.type,radius:g.radius,dx:s.x*48+(g.kind==='weapon'?8:g.kind==='engine'?-8:0),dy:s.y*48+(g.kind==='utility'?8:0),...(g.weapon?{weapon:g.weapon,mk:f.mk??1}:{}),...(g.quirk?{quirk:g.quirk,rarity:g.rarity||'rare'}:{}),...((f.art||g.art)?{art:f.art||g.art}:{})});}
    if(nodes.length>160)error('This layout exceeds 160 physical components. Remove some clip-ons or fittings.');
    // Stage 1: bigger frames fly bigger. Spacing scales; radii stay (they select weapon class).
    const k=window.tuning.SIZE.hullScale[m.hull]||1;if(k!==1)for(const n of nodes){n.dx=Math.round(n.dx*k*10)/10;n.dy=Math.round(n.dy*k*10)/10;}
    d.nodes=nodes;ratings.set(nodes,h.cls);visuals.set(nodes,{model:copy(m),sections:copy(sections),hidden,color:d.color,scale:k});return{design:d,hull:h,power,gp:nodes.reduce((n,p,i)=>i>=sections.length&&i<hidden?n:n+fleet.costOfNode(p.type,p.radius),0)};
  }
  function quote(design){
    const c=compile(design),h=hangar(),needed={};const add=(key,cost)=>{if(!needed[key])needed[key]={key,count:0,cost};needed[key].count++;};
    add('hull:'+c.design.modular.hull,c.hull.cost);
    for(const s of c.design.modular.sections)if(s.kind!=='bridge')add('section:'+s.kind,SECTIONS[s.kind].cost);
    for(const f of c.design.modular.fittings){if((f.mk??1)>1&&!ownedCount(h,'gear:'+f.gear+':'+f.mk))error('Higher weapon marks must already be owned.');add('gear:'+f.gear+':'+(f.mk??1),GEARS[f.gear].cost);}
    for(const k of c.design.modular.kit??[])add('kit:'+k.piece,PIECES[k.piece].cost);
    const lines=Object.values(needed).map(n=>({...n,owned:ownedCount(h,n.key),buy:Math.max(0,n.count-ownedCount(h,n.key))}));
    const total=lines.reduce((n,p)=>n+p.buy*p.cost,0);
    // A fabrication bill must be a whole, non-negative metal amount; NaN would pass `metal < total`.
    if(!lines.every(l=>metal(l.cost)&&metal(l.buy))||!metal(total))error('Invalid fabrication quote. This blueprint cannot be priced.');
    return{...c,lines,total,modules:c.design.modular.fittings.length,capacity:c.hull.slots+h.rank+(c.design.modular.kit??[]).reduce((n,k)=>n+(PIECES[k.piece].slots||0),0)};
  }
  function capacityReason(q){
    if(q.modules>q.capacity)return`Module slots full: ${q.modules} / ${q.capacity}. Train Shipwright or remove a module.`;
    if(q.design.modular.hull==='frigate'&&q.design.modular.fittings.filter(f=>GEARS[f.gear].kind==='weapon').length+(q.design.modular.kit||[]).filter(k=>PIECES[k.piece].silo).length>4)return'Starter frigates carry at most 4 weapons. Move to a cruiser for more.';
    return null;
  }
  function check(design,{restore=false}={}){
    try{
      const q=quote(design),h=hangar();if(restore)return null;
      // Biomass/rank unlock a new frame. A frame already paid for stays owned
      // after death; a lower biomass balance must not disable every refit.
      if(!ownedCount(h,'hull:'+q.design.modular.hull)&&(progression.totalMass<q.hull.mass||h.rank<q.hull.rank))return`${q.hull.name} frame requires ${q.hull.mass} biomass and Shipwright rank ${q.hull.rank}.`;
      if(q.lines.some(l=>l.key.startsWith('gear:')&&GEARS[l.key.slice(5,-2)]?.salvageOnly&&l.buy>0))return'Recovered variants require one owned fitting per slot; they cannot be fabricated.';
      const capacity=capacityReason(q);if(capacity)return capacity;
      for(const f of q.design.modular.fittings){const g=GEARS[f.gear];if(g.weapon&&!armory.owns(g.weapon))return`Research ${g.name} in the Armoury before applying it.`;}
      return null;
    }catch(e){return e.message;}
  }
  function fieldReason(design){
    try{
      const q=quote(design),old=saveState.doc.design?.modular,m=q.design.modular;
      if(!old||old.hull!==m.hull||JSON.stringify(old.sections)!==JSON.stringify(m.sections))return'Dock to rebuild hull sections. Owned equipment can be swapped in the field.';
      if(q.total>0)return'New hardware costs '+q.total+' metal. Buy it at a station; owned equipment can be fitted here.';
      if(engine.player.dead)return'Recover your ship before refitting.';
      if(engine.player.nodes.some(n=>n.lost))return'Dock to repair destroyed sections before refitting.';
      return null;
    }catch(e){return e.message;}
  }
  function restoreDoc(before){for(const k of Object.keys(saveState.doc))delete saveState.doc[k];Object.assign(saveState.doc,before);}
  function train(){
    const before=copy(saveState.doc),h=hangar(),rank=h.rank,cost=RANK_COST[rank];if(rank>=RANK_COST.length||!hubs.docked||progression.totalMass<RANK_MASS[rank]||hubs.metal<cost)return false;
    saveState.doc.metal=hubs.metal-cost;h.rank++;saveState.doc.modularHangar=h;if(!saveState.save()){restoreDoc(before);return false;}window.walletHUD?.paint();return true;
  }
  const hiddenOf=d=>visuals.get(d.nodes)?.hidden??d.modular.sections.length;
  function bind(nodes,design){const c=compile(design);nodes.forEach(n=>{if(n)n.rigid=true;});ratings.set(nodes,c.hull.cls);visuals.set(nodes,visuals.get(c.design.nodes));c.design.nodes.forEach((n,i)=>{if(nodes[i]&&n.mk!==undefined)nodes[i].mk=n.mk;});c.design.modular.fittings.forEach((f,i)=>{if(nodes[hiddenOf(c.design)+i])orientations.set(nodes[hiddenOf(c.design)+i],(f.rotation??0)*Math.PI/180);});}
  function apply(design,options,previous,owner){
    if(!design?.modular){const ok=previous.call(owner,design,options);if(ok!==false&&!options?.restore&&saveState.doc.workshop){const w=saveState.doc.workshop;w.editTarget='active';w.draft=copy(saveState.doc.design);w.activeSnapshot=JSON.stringify(saveState.doc.design);saveState.save();}return ok;}
    let c;try{c=compile(design);}catch(e){window.garage?.banner(e.message,'bad');return false;}
    const why=check(c.design,{restore:!!options?.restore});if(why){window.garage?.banner(why,'bad');return false;}
    if(options?.restore){const ok=previous.call(owner,c.design,options);if(ok!==false){bind(owner.player.nodes,c.design);owner.recalculatePlayerStats();}return ok;}
    if(!hubs.docked){const why=fieldReason(c.design);if(why){window.garage?.banner(why,'bad');return false;}}
    const fittingError=fitting.check(c.design);if(fittingError){window.garage?.banner(fittingError,'bad');return false;}
    const q=quote(c.design);if(hubs.metal<q.total){window.garage?.banner(`Fabrication needs ${q.total} metal; you have ${hubs.metal}.`,'bad');return false;}
    const field=!hubs.docked,hp=owner.player.hp,shield=owner.player.shieldHp||0,frames=owner.player.iFrames||0;
    const before=copy(saveState.doc),hang=hangar(),persist=saveState.save;
    for(const l of q.lines)if(l.buy)hang.owned[l.key]=l.count;
    saveState.doc.modularHangar=hang;saveState.doc.metal=hubs.metal-q.total;if(before.design&&!before.design.modular&&!saveState.doc.modularLegacy)saveState.doc.modularLegacy=copy(before.design);saveState.doc.design=c.design;
    if(saveState.doc.workshop){saveState.doc.workshop.draft=copy(c.design);saveState.doc.workshop.editTarget='active';saveState.doc.workshop.activeSnapshot=JSON.stringify(c.design);}
    if(!persist.call(saveState)){restoreDoc(before);return false;}
    const playerBefore={...owner.player};let ok;try{saveState.save=()=>true;ok=previous.call(owner,c.design,options);}catch(e){Object.assign(owner.player,playerBefore);restoreDoc(before);persist.call(saveState);window.garage?.banner('Refit cancelled: '+e.message,'bad');return false;}finally{saveState.save=persist;}
    if(ok===false){restoreDoc(before);persist.call(saveState);return false;}
    bind(owner.player.nodes,c.design);owner.recalculatePlayerStats();owner.player.hp=field?Math.min(hp,owner.player.maxHp):owner.player.maxHp;if(field){owner.player.shieldHp=Math.min(shield,owner.player.shieldHp||0);owner.player.iFrames=frames;const start=hiddenOf(before.design),next=hiddenOf(c.design);for(let i=0;i<owner.player.nodes.length;i++){let old=playerBefore.nodes[i];if(i>=next){const f=c.design.modular.fittings[i-next],j=before.design.modular.fittings.findIndex(o=>o.slot===f?.slot);old=j>=0?playerBefore.nodes[start+j]:null;}const node=owner.player.nodes[i];if(old&&Number.isFinite(old.partHp)&&old.partMax>0&&node.partMax>0)node.partHp=node.partMax*Math.min(1,Math.max(0,old.partHp/old.partMax));}}window.walletHUD?.paint();return true;
  }
  function draw(ctx,x,y,angle,nodes,info){
    if(typeof topdownKit!=='undefined')return topdownKit.flightHull(ctx,x,y,angle,nodes,info);
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    info.sections.forEach((s,i)=>{const n=nodes[i];if(!n||n.lost)return;const px=n.currentDx??n.dx,py=n.currentDy??n.dy,turn=(s.rotation??0)%180!==0,w=turn?(s.kind==='spine'?24:34):(s.kind==='spine'?44:42),h=turn?(s.kind==='spine'?44:42):(s.kind==='spine'?24:34);
      ctx.fillStyle='#15232f';ctx.strokeStyle='#a08250';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(px-w/2+5,py-h/2);ctx.lineTo(px+w/2-5,py-h/2);ctx.lineTo(px+w/2,py-h/2+5);ctx.lineTo(px+w/2,py+h/2-5);ctx.lineTo(px+w/2-5,py+h/2);ctx.lineTo(px-w/2+5,py+h/2);ctx.lineTo(px-w/2,py+h/2-5);ctx.lineTo(px-w/2,py-h/2+5);ctx.closePath();ctx.fill();ctx.stroke();
      for(const q of info.sections)if(q.x===s.x+1&&q.y===s.y){ctx.fillStyle='#657883';ctx.fillRect(px+18,py-5,12,10);}else if(q.y===s.y+1&&q.x===s.x){ctx.fillStyle='#657883';ctx.fillRect(px-5,py+12,10,24);}
      ctx.strokeStyle='#405965';ctx.strokeRect(px-w/2+5,py-h/2+5,w-10,h-10);ctx.fillStyle='#81d6da';ctx.fillRect(px-8,py-h/2+4,7,2);
    });ctx.restore();
  }
  function install(){
    if(!sprites.ready||!fluidShader._spritesInstalled){setTimeout(install,40);return;}
    for(const[id,g]of Object.entries(GEARS)){const n=g.weapon?ART[g.weapon]:id==='engine'?89:id==='shield'?57:null;if(n){const file='module_'+String(n).padStart(3,'0')+'.png';if(sprites.manifest?.modules?.some(a=>a.file===file&&a.usable&&a.type===g.type))g.art=file;}}
    const band=fleet.hullBand;fleet.hullBand=function(p){const cls=ratings.get(p?.nodes);return cls?HULL_LADDER.find(h=>h.cls===cls)||CAPITAL_BANDS[cls]:band.call(this,p);};
    const canonical=fitting.check;fitting.check=function(d){if(d?.modular)return check(d)||(!hubs.docked?fieldReason(d):null);return canonical.call(this,d);};
    const prior=engine.applyDesign;engine.applyDesign=function(d,o={}){return apply(d,o,prior,this);};
    /* Mac: "modular ship pieces must lock together properly, no movement". A bolted hull is one rigid body:
       bound nodes sit exactly on their design offset every frame. Blob ships keep their springs. */
    const spring=SpringNode.prototype.updateSpring;SpringNode.prototype.updateSpring=function(){if(!this.rigid)return spring.apply(this,arguments);this.currentDx=this.targetDx;this.currentDy=this.targetDy;this.vx=this.vy=0;};
    const angle=sprites._angleFor;sprites._angleFor=function(n,a){if(!orientations.has(n))return angle.call(this,n,a);if(n.type==='cannon'&&hardpoints._turrets?.some(t=>t.node===n))return angle.call(this,n,a);return angle.call(this,n,a)+orientations.get(n);};
    const sanitize=engine.sanitizeDesign;engine.sanitizeDesign=function(d){if(d?.modular){try{d=compile(d).design;}catch{return null;}}return sanitize.call(this,d);};
    const preview=shipyard.renderNodes;shipyard.renderNodes=function(...args){const n=preview.apply(this,args);if(this.design?.modular){try{bind(n,this.design);}catch{}}return n;};
    const original=fluidShader.drawOrganismMembrane;fluidShader.drawOrganismMembrane=function(ctx,x,y,a,r,nodes,color,state){const info=visuals.get(nodes);if(!info||!sprites.ready)return original.apply(this,arguments);draw(ctx,x,y,a,nodes,info);const visible=nodes.filter((n,i)=>i===0||i>=(info.hidden??info.sections.length)),u=sprites.underlay,c=sprites.chassis;try{sprites.underlay=false;sprites.chassis=false;return original.call(this,ctx,x,y,a,r,visible,color,state);}finally{sprites.underlay=u;sprites.chassis=c;}};
    if(saveState.doc.design?.modular){try{bind(engine.player.nodes,saveState.doc.design);engine.recalculatePlayerStats();}catch{}}
    ready=true;window.modularYard?.refresh();
  }
  window.modularShips={hasModel:nodes=>visuals.has(nodes),CAPITAL_BANDS,PIECES,kitWhy,mountsOf,prune,HULLS,SECTIONS,GEARS,FACTORY,factory,fits,RANK_COST,RANK_MASS,copy,make,compile,inspect,quote,check,capacityReason,fieldReason,hangar,train,get ready(){return ready;}};
  window.addEventListener('load',()=>setTimeout(install,0));
})();
