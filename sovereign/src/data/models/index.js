// Embedded ship models. Each .glb here is bundled into the single-file build as a data URL.
// Add a model: drop <name>.glb in this folder, import it below, and point a blueprint's
// model.src at <name>.glb. See docs/MAKING_SHIPS.md.
import greenSeedHero from './green_seed_hero.glb';
import gravityFangHero from './gravity_fang_hero.glb';
import mawCruiserHero from './maw_cruiser_hero.glb';
import blackSunHero from './black_sun_hero.glb';
import turrets from './turrets.glb';
import eventKnifeHero from './event_knife_hero.glb';
import harpyClawHero from './harpy_claw_hero.glb';
import eyeKnifeHero from './eye_knife_hero.glb';
import radiantArkHero from './radiant_ark_hero.glb';
import fangDartHero from './fang_dart_hero.glb';
import joinedSpearHero from './joined_spear_hero.glb';

export const MODEL_FILES = {
  'green_seed_hero.glb': greenSeedHero,
  'gravity_fang_hero.glb': gravityFangHero,
  'maw_cruiser_hero.glb': mawCruiserHero,
  'black_sun_hero.glb': blackSunHero,
  // The authored turret set (tools/blender/turrets.py): every hardpoint on every ship uses it.
  'turrets.glb': turrets,
  'event_knife_hero.glb': eventKnifeHero,
  'harpy_claw_hero.glb': harpyClawHero,
  'eye_knife_hero.glb': eyeKnifeHero,
  'radiant_ark_hero.glb': radiantArkHero,
  'fang_dart_hero.glb': fangDartHero,
  'joined_spear_hero.glb': joinedSpearHero,
};
