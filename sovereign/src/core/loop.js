// Fixed-timestep loop. The simulation advances in exact SIM_DT steps;
// rendering runs every animation frame with an interpolation alpha.

export const SIM_HZ = 60;
export const SIM_DT = 1 / SIM_HZ;
const MAX_STEPS = 8; // never spiral: drop time after a long stall (tab hidden etc.)

/**
 * @param {{ step:(dt:number)=>void, render:(alpha:number, frameDt:number)=>void }} hooks
 */
export function startLoop(hooks) {
  let last = performance.now();
  let acc = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    const frameDt = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += frameDt;
    let steps = 0;
    while (acc >= SIM_DT && steps < MAX_STEPS) {
      hooks.step(SIM_DT);
      acc -= SIM_DT;
      steps++;
    }
    if (steps === MAX_STEPS) acc = 0;
    hooks.render(acc / SIM_DT, frameDt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { stop() { running = false; } };
}
