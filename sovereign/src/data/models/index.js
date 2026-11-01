// Embedded ship models. Each .glb here is bundled into the single-file build as a data URL.
// Add a model: drop <name>.glb in this folder, import it below, and point a blueprint's
// model.src at <name>.glb. See docs/MAKING_SHIPS.md.
import greenSeedHero from './green_seed_hero.glb';
import gravityFangHero from './gravity_fang_hero.glb';
import mawCruiserHero from './maw_cruiser_hero.glb';

export const MODEL_FILES = {
  'green_seed_hero.glb': greenSeedHero,
  'gravity_fang_hero.glb': gravityFangHero,
  'maw_cruiser_hero.glb': mawCruiserHero,
};
