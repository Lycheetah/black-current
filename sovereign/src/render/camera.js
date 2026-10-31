// Independent orbit camera. It orbits the player's ship on its own angles (world frame),
// so you can look around a heavy hull while it keeps its heading. "Chase" eases it behind the nose.
import * as THREE from 'three';

export function createCameraRig(aspect) {
  const camera = new THREE.PerspectiveCamera(55, aspect, 1, 200000);
  const rig = {
    camera,
    yaw: 0,              // around world Y; 0 = behind a ship facing -Z
    pitch: 0.22,
    dist: 120,
    targetDist: 120,
    minDist: 40, maxDist: 2000,
    chase: false,
    focus: new THREE.Vector3(),
    /** Fit the zoom range to a hull length. */
    fitHull(length) {
      rig.minDist = length * 1.4;
      rig.maxDist = length * 30;
      rig.targetDist = THREE.MathUtils.clamp(length * 3.2, rig.minDist, rig.maxDist);
    },
    orbit(dx, dy) {
      rig.yaw -= dx * 0.005;
      rig.pitch = THREE.MathUtils.clamp(rig.pitch + dy * 0.004, -1.45, 1.45);
    },
    zoom(f) { rig.targetDist = THREE.MathUtils.clamp(rig.targetDist * f, rig.minDist, rig.maxDist); },
    /**
     * @param {THREE.Vector3} shipPos interpolated position
     * @param {THREE.Quaternion} shipRot interpolated orientation
     */
    update(shipPos, shipRot, dt) {
      if (rig.chase) {
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(shipRot);
        const wantYaw = Math.atan2(-fwd.x, -fwd.z);
        let d = wantYaw - rig.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        rig.yaw += d * (1 - Math.exp(-3 * dt));
        rig.pitch += (Math.asin(-fwd.y) * 0.6 + 0.2 - rig.pitch) * (1 - Math.exp(-2 * dt));
      }
      rig.dist += (rig.targetDist - rig.dist) * (1 - Math.exp(-6 * dt));
      rig.focus.copy(shipPos);
      const cp = Math.cos(rig.pitch);
      camera.position.set(
        shipPos.x + Math.sin(rig.yaw) * cp * rig.dist,
        shipPos.y + Math.sin(rig.pitch) * rig.dist,
        shipPos.z + Math.cos(rig.yaw) * cp * rig.dist,
      );
      camera.lookAt(shipPos.x, shipPos.y + rig.dist * 0.08, shipPos.z);
    },
  };
  return rig;
}
