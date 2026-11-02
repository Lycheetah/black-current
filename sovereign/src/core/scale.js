// World scale. Every distance and speed in space is multiplied by WORLD, so travel and combat timing stay
// as tuned while space becomes EVE-sized. Ship lengths are real metres per class (EVE ballpark), so a
// frigate is small against a station and a battleship is a kilometre of hull.
export const WORLD = 6;

/** Canon map coordinates (the original WORLD table) to metres: sector layouts and signature sites. */
export const SECTOR_SCALE = 8 * WORLD;

/** Hull length in metres by class. */
export const CLASS_LENGTH = {
  pod: 25, starter: 55, frigate: 60, assault_frigate: 70, specialist_frigate: 75,
  destroyer: 140, cruiser: 280, heavy_cruiser: 330, advanced_cruiser: 360,
  battlecruiser: 480, specialist_ship: 600, battleship: 1000, drone_carrier: 1300,
  industrial: 900, autonomous: 1200, dreadnought: 3000, carrier: 3200, titan: 21000,
};

/** Physical radius (collisions, explosions, wreck size) from length. */
export const radiusFor = (length) => length * 0.3;
