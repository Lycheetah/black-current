/* Extracted unchanged from gold master 0.27.5. */
import { CLASS_CATALOG, BANKS_BY_COUNT } from './classes.js';
import {
  RACE_CATALOG, RACE_ORDER, PLAYER_CLASS_ORDER,
  LEGACY_CLASS_NAME_INDEX, RACE_HULL_ROOT, CLASS_NAME_SUFFIX, RACE_FLEET_SIGNATURES
} from './races.js';

function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}

export function generatedHullName(raceId,classId){
  const race=RACE_CATALOG[raceId];
  const legacyIndex=LEGACY_CLASS_NAME_INDEX[classId];
  if(Number.isInteger(legacyIndex)&&race?.names?.[legacyIndex])return race.names[legacyIndex];
  return (RACE_HULL_ROOT[raceId]||race?.name||raceId)+' '+(CLASS_NAME_SUFFIX[classId]||CLASS_CATALOG[classId]?.name||classId);
}

export function createFleetCatalog(){
  const catalog={};

  for(const raceId of RACE_ORDER){
    const race=RACE_CATALOG[raceId];

    for(const classId of PLAYER_CLASS_ORDER){
      const c=CLASS_CATALOG[classId],b=race.bonus||{},id=raceId+'_'+classId;
      const signature=RACE_FLEET_SIGNATURES[raceId];
      const signatureActive=!!signature?.classes?.includes(classId);
      const sb=signatureActive?(signature.stats||{}):{};

      const stats={
        shield:c.shield*(b.shield||1)*(sb.shield||1),
        armor:c.armor*(b.armor||1)*(sb.armor||1),
        hull:c.hull*(b.hull||1)*(sb.hull||1),
        maxSpeed:c.speed*(b.maxSpeed||1)*(sb.maxSpeed||1),
        accel:c.accel*(b.accel||1)*(sb.accel||1),
        turn:c.turn*(b.turn||1)*(sb.turn||1),
        turretDamage:c.damage*(b.turretDamage||1)*(sb.turretDamage||1),
        turretRate:(b.turretRate||1)*(sb.turretRate||1),
        capacitor:(b.capacitor||1)*(sb.capacitor||1),
        capRegen:(b.capRegen||1)*(sb.capRegen||1),
        weaponCapUse:(b.weaponCapUse||1)*(sb.weaponCapUse||1),
        abilityDamage:(b.abilityDamage||1)*(sb.abilityDamage||1),
        shieldRegen:(b.shieldRegen||1)*(sb.shieldRegen||1)
      };

      const signatureLabel=signatureActive?signature.label:null;
      const classRole=c.role||c.name;

      catalog[id]={
        id,
        name:generatedHullName(raceId,classId),
        raceId,classId,
        raceName:race.name,className:c.name,
        familyRole:classRole,
        signatureRole:signatureLabel,
        role:classRole+' // '+race.doctrine+(signatureLabel?' // '+signatureLabel:''),
        desc:
          c.name+' doctrine platform. '+classRole+'. '+
          race.doctrine+'.'+
          (signatureLabel?' This is a '+race.name+' signature hull family: '+signatureLabel+'.':''),
        doctrine:race.doctrine,
        accent:race.accent,
        powergrid:Math.round(c.pg*(.98+(b.capacitor||1)*.03)),
        baseMass:Math.round(c.mass*(b.hull||1)),
        visualModuleScale:c.visual,
        architecturePGScale:c.pgScale,
        architectureMassScale:c.massScale,
        scale:[c.scale,c.scale*(classId==='titan'?1.06:.96),c.scale],
        shieldScale:[c.radius*2.0,c.radius*1.18,c.radius*4.15],
        activeBanks:BANKS_BY_COUNT[c.banks]||BANKS_BY_COUNT[2],
        stats,cameraDist:c.camera,cameraHeight:c.height,radius:c.radius,
        display:{
          shield:Math.round(clamp(stats.shield/1.65*100,6,100)),
          armor:Math.round(clamp(stats.armor/1.65*100,6,100)),
          hull:Math.round(clamp(stats.hull/1.7*100,6,100)),
          mobility:Math.round(clamp(c.mobility*(b.maxSpeed||1)*Math.pow(b.turn||1,.35),5,100)),
          hardpoints:c.banks+' BANKS'
        }
      };
    }
  }
  return catalog;
}

export const FRAME_CATALOG=createFleetCatalog();
export const HULL_CLASS_PRICE={
  pod:20,starter:0,frigate:115,assault_frigate:210,specialist_frigate:225,
  destroyer:280,cruiser:520,heavy_cruiser:690,advanced_cruiser:730,
  battlecruiser:840,specialist_ship:810,battleship:920,
  drone_carrier:1180,industrial:980,autonomous:1260,
  dreadnought:3400,carrier:3900,titan:0
};

export const HULL_CLASS_TIER={
  pod:1,starter:1,frigate:1,assault_frigate:1,specialist_frigate:1,destroyer:1,
  cruiser:2,heavy_cruiser:2,advanced_cruiser:2,battlecruiser:2,specialist_ship:2,
  battleship:1,drone_carrier:2,industrial:2,autonomous:2,
  dreadnought:3,carrier:3,titan:99
};

// 0.27.5: the fleet continuum is now a real multi-tier roster.
export const POD_FLEET=RACE_ORDER.map(id=>id+'_pod');
export const STARTER_FLEET=RACE_ORDER.map(id=>id+'_starter');
export const DESTROYER_FLEET=RACE_ORDER.map(id=>id+'_destroyer');
export const BATTLESHIP_FLEET=RACE_ORDER.map(id=>id+'_battleship');
export const TITAN_FLEET=RACE_ORDER.map(id=>id+'_titan');

export const PLAYER_SANDBOX_CLASSES=new Set(['titan']);

