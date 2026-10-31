/* Extracted unchanged from gold master 0.27.5. */
export const CAPACITOR_CLASS_PROFILES={starter:{max:220,regen:43},frigate:{max:280,regen:46},destroyer:{max:370,regen:50},cruiser:{max:500,regen:54},battleship:{max:720,regen:60},dreadnought:{max:980,regen:66},titan:{max:1280,regen:72}};

export function capacitorProfileFor(frame){
  return CAPACITOR_CLASS_PROFILES[frame?.classId]||CAPACITOR_CLASS_PROFILES.cruiser;
}
