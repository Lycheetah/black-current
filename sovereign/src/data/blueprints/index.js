// Authored blueprint overrides. A blueprint here replaces the generated one for the hull with the same id.
// Add a hull: export it from the Hull Forge (or tools/model-kit.mjs for model hulls), save it as
// <id>.json in this folder, and list it below. Validation runs at load.
import savanahStarter from './savanah_starter.json' with { type: 'json' };
import blackholeFrigate from './blackhole_frigate.json' with { type: 'json' };

export const AUTHORED_BLUEPRINTS = [savanahStarter, blackholeFrigate];
