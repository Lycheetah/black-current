// Seeded RNG (mulberry32) so a simulation run is reproducible from its seed.
export function createRng(seed = 0x5eed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (a, b) => a + (b - a) * next(), state: () => s, set: (v) => { s = v >>> 0; } };
}
