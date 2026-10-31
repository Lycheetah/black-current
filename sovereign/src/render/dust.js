// Near-field space dust that wraps around the camera: the eye's speedometer.
import * as THREE from 'three';

export function createDust(count = 1800, box = 700) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * box;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCam: { value: new THREE.Vector3() }, uBox: { value: box }, uVel: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform vec3 uCam; uniform float uBox; uniform float uVel;
      varying float vA;
      void main(){
        vec3 p = mod(position - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        vA = smoothstep(uBox * 0.5, uBox * 0.15, length(p - uCam)) * smoothstep(2.0, 20.0, d);
        gl_PointSize = clamp(260.0 / d, 1.0, 4.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float r = length(c);
        gl_FragColor = vec4(vec3(0.75, 0.88, 1.0), vA * 0.6 * smoothstep(0.5, 0.0, r));
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, update(cam) { mat.uniforms.uCam.value.copy(cam.position); } };
}
