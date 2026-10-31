// Naraka Veil backdrop: procedural nebula, galactic band and a crisp multi-layer starfield.
import * as THREE from 'three';
import { NOISE_GLSL } from './shaders.js';

export function createSky(sunDir) {
  const uniforms = {
    uSunDir: { value: sunDir.clone().normalize() },
    uCenter: { value: new THREE.Vector3() },
    uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
        gl_Position.z = gl_Position.w; // pin to far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir, uCenter; uniform float uTime;
      varying vec3 vWorld;
      ${NOISE_GLSL}
      float stars(vec3 d, float scale, float thresh, float sharp){
        vec3 p = d * scale; vec3 c = floor(p);
        float h = hash13(c);
        if (h < thresh) return 0.0;
        vec3 jitter = vec3(hash13(c + 11.1), hash13(c + 23.7), hash13(c + 37.3)) * 0.7 + 0.15;
        float dist = length(fract(p) - jitter);
        return pow(max(0.0, 1.0 - dist * sharp), 6.0) * (0.4 + 0.6 * (h - thresh) / (1.0 - thresh));
      }
      void main(){
        vec3 d = normalize(vWorld - uCenter);
        // Galactic band along a tilted great circle.
        vec3 bandN = normalize(vec3(0.28, 0.92, -0.27));
        float band = exp(-pow(dot(d, bandN) * 3.4, 2.0));
        // Nebula: two warped fbm fields.
        vec3 q = d * 2.2;
        float warp = fbm(q + vec3(0.0, uTime * 0.002, 0.0));
        float n1 = fbm(q * 1.4 + warp * 1.6);
        float n2 = fbm(q * 3.1 - warp * 1.2 + 7.0);
        float sunAmt = max(0.0, dot(d, uSunDir));
        vec3 col = vec3(0.004, 0.006, 0.014);
        vec3 violet = vec3(0.30, 0.08, 0.46);
        vec3 teal = vec3(0.03, 0.26, 0.34);
        vec3 amber = vec3(0.55, 0.25, 0.07);
        float neb = smoothstep(0.42, 0.85, n1) * (0.35 + band * 0.9);
        col += mix(teal, violet, smoothstep(0.35, 0.7, n2)) * neb * 0.55;
        col += amber * pow(sunAmt, 6.0) * smoothstep(0.35, 0.8, n2) * 0.6;
        // Dark dust lanes cut through the band.
        float dust = smoothstep(0.5, 0.75, fbm(q * 5.0 + 3.0)) * band;
        col *= 1.0 - dust * 0.75;
        col += vec3(0.10, 0.09, 0.13) * band * 0.25 * (0.6 + n2);
        // Sun bloom across the sky.
        col += vec3(0.9, 0.62, 0.35) * pow(sunAmt, 48.0) * 0.35 + vec3(0.45, 0.25, 0.7) * pow(sunAmt, 10.0) * 0.08;
        // Stars: dense dim, sparse bright, band-boosted.
        float s = stars(d, 180.0, 0.90 - band * 0.06, 2.4) * 0.6
                + stars(d, 90.0, 0.965, 2.0) * 1.4
                + stars(d, 40.0, 0.988, 1.6) * 3.0;
        s *= 1.0 - dust * 0.85;
        float tint = hash13(floor(d * 90.0));
        col += s * mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.65), tint);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat);
  mesh.scale.setScalar(90000);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms };
}
