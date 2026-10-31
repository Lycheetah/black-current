// Navigation: turns a goal (approach, orbit, keep at range) into a ship order.
// Used by the player's autopilot and by every AI hull, so both fly with the same physics.
import { v3, sub3, len3, scale3, rotate3, copyQ, clamp } from '../core/math.js';

const _r = v3(), _t = v3(), _want = v3(), _local = v3(), _inv = { x: 0, y: 0, z: 0, w: 1 };

/** Order that turns the nose toward a world direction. */
export function steerToward(ship, dir, throttleSet) {
  copyQ(_inv, ship.rot); _inv.x = -_inv.x; _inv.y = -_inv.y; _inv.z = -_inv.z;
  rotate3(_local, dir, _inv);
  const yawErr = Math.atan2(_local.x, -_local.z);
  const pitchErr = Math.atan2(_local.y, Math.hypot(_local.x, _local.z));
  return {
    throttle: 0, throttleSet, stop: false, roll: 0,
    yaw: clamp(yawErr * 2.2, -1, 1),
    pitch: clamp(pitchErr * 2.2, -1, 1),
  };
}

/**
 * @param {'approach'|'orbit'|'range'} mode
 * @param {{x:number,y:number,z:number}} goal target position
 * @param {number} range desired distance
 * @param {number} spin orbit direction/plane seed (−1 or 1)
 */
export function navCommand(ship, mode, goal, range, spin = 1) {
  sub3(_r, ship.pos, goal);
  const d = len3(_r) || 1;
  scale3(_r, _r, 1 / d);
  if (mode === 'approach') {
    scale3(_want, _r, -1);
    const slow = clamp((d - range) / (ship.flight.maxSpeed * 3), 0, 1);
    return steerToward(ship, _want, slow);
  }
  if (mode === 'range') {
    const err = (d - range) / Math.max(range, 1);
    scale3(_want, _r, err > 0 ? -1 : 1);
    return steerToward(ship, _want, clamp(Math.abs(err) * 3, 0, 1));
  }
  // Orbit: tangent around a mostly horizontal plane, pulled in or out toward the orbit radius.
  _t.x = -_r.z * spin; _t.y = 0; _t.z = _r.x * spin;
  const tl = Math.hypot(_t.x, _t.z) || 1;
  _t.x /= tl; _t.z /= tl;
  const pull = clamp((d - range) / Math.max(range * 0.5, 1), -1.5, 1.5);
  _want.x = _t.x - _r.x * pull;
  _want.y = -_r.y * pull * 0.6 - _r.y * 0.3;
  _want.z = _t.z - _r.z * pull;
  const wl = len3(_want) || 1;
  scale3(_want, _want, 1 / wl);
  return steerToward(ship, _want, 0.75);
}
