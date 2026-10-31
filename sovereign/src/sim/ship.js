// Capital-weighted flight model. One owner: this module writes ship motion state.
//
// Heavy-vessel feel comes from three lags, all scaled from the hull's catalog stats:
//  - throttle sets a *target* speed; the hull accelerates toward it at a limited rate,
//  - velocity bends toward the nose at that same limited rate, so big hulls drift through turns,
//  - turn rates spin up and down with angular inertia instead of snapping.

import {
  v3, quat, copy3, copyQ, addScaled3, rotate3, rotateLocal, len3, sub3, scale3,
  clamp, approach, FORWARD, RIGHT, UP,
} from '../core/math.js';

const SPEED_UNIT = 60;     // catalog maxSpeed 1.0 → 60 u/s
const ACCEL_UNIT = 14;     // catalog accel^1.5 1.0 → 14 u/s²
const TURN_UNIT = 0.32;    // catalog turn 1.0 → 0.32 rad/s
const THROTTLE_RATE = 0.55; // throttle fraction per second while held

/** Derive flight constants from a fleet-catalog hull record. */
export function flightProfile(hull) {
  const s = hull.stats;
  const maxTurn = s.turn * TURN_UNIT;
  return {
    maxSpeed: s.maxSpeed * SPEED_UNIT,
    accel: Math.pow(s.accel, 1.5) * ACCEL_UNIT,
    maxTurn,
    maxRoll: maxTurn * 1.6,
    angAccel: maxTurn * (0.55 + s.turn * 0.5),
    radius: hull.radius * 1.4,
  };
}

/** @returns {object} a ship entity */
export function createShip({ id, hull, pos, faction = 'player' }) {
  return {
    id, kind: 'ship', faction,
    hullId: hull.id,
    hull,
    flight: flightProfile(hull),
    pos: { ...pos }, prevPos: { ...pos },
    vel: v3(),
    rot: quat(), prevRot: quat(),
    angVel: v3(),          // body rates: x pitch, y yaw, z roll (rad/s)
    throttle: 0,           // 0..1 fraction of max speed (the order)
    speed: 0,              // current |vel|, for readouts
    autoLevel: true,
  };
}

/** Swap hull in place, keeping position and heading. Used by the hull test cycle and later the Shipwright. */
export function setHull(ship, hull) {
  ship.hullId = hull.id;
  ship.hull = hull;
  ship.flight = flightProfile(hull);
}

const _fwd = v3(), _right = v3(), _target = v3(), _dv = v3();

/**
 * @param {object} ship
 * @param {{throttle:number, throttleSet:number|null, yaw:number, pitch:number, roll:number, stop:boolean}} cmd
 * @param {number} dt
 */
export function stepShip(ship, cmd, dt) {
  const f = ship.flight;
  copy3(ship.prevPos, ship.pos);
  copyQ(ship.prevRot, ship.rot);

  // Throttle order.
  if (cmd.stop) ship.throttle = 0;
  else if (cmd.throttleSet != null) ship.throttle = clamp(cmd.throttleSet, 0, 1);
  else ship.throttle = clamp(ship.throttle + cmd.throttle * THROTTLE_RATE * dt, 0, 1);

  // Angular inertia: body rates chase the commanded rates at a limited angular acceleration.
  const wantPitch = clamp(cmd.pitch, -1, 1) * f.maxTurn;
  const wantYaw = clamp(-cmd.yaw, -1, 1) * f.maxTurn;
  let wantRoll = clamp(-cmd.roll, -1, 1) * f.maxRoll;

  rotate3(_right, RIGHT, ship.rot);
  if (ship.autoLevel && Math.abs(cmd.roll) < 0.05) {
    // Settle the wings back toward the sector plane when the pilot is not rolling.
    wantRoll = clamp(_right.y * 1.4, -1, 1) * f.maxRoll * 0.5;
  }
  const maxStep = f.angAccel * dt;
  ship.angVel.x += clamp(wantPitch - ship.angVel.x, -maxStep, maxStep);
  ship.angVel.y += clamp(wantYaw - ship.angVel.y, -maxStep, maxStep);
  ship.angVel.z += clamp(wantRoll - ship.angVel.z, -maxStep * 1.5, maxStep * 1.5);
  rotateLocal(ship.rot, ship.angVel.x * dt, ship.angVel.y * dt, ship.angVel.z * dt);

  // Linear: velocity moves toward nose * ordered speed, limited by hull acceleration.
  rotate3(_fwd, FORWARD, ship.rot);
  scale3(_target, _fwd, ship.throttle * f.maxSpeed);
  sub3(_dv, _target, ship.vel);
  const need = len3(_dv);
  const can = f.accel * dt;
  if (need > can) scale3(_dv, _dv, can / need);
  ship.vel.x += _dv.x; ship.vel.y += _dv.y; ship.vel.z += _dv.z;

  addScaled3(ship.pos, ship.pos, ship.vel, dt);
  ship.speed = len3(ship.vel);
}

export { UP };
