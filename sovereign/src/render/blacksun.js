// The Spectral Black Sun: an occluding void, a spectral photon rim, a lensed halo ring
// and a tilted accretion disc that the void eclipses.
import * as THREE from 'three';
import { NOISE_GLSL } from './shaders.js';

export function createBlackSun({ pos, radius }, glowTex) {
  const group = new THREE.Group();
  group.position.set(pos.x, pos.y, pos.z);
  const time = { value: 0 };

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  group.add(core);

  // Spectral photon rim (fresnel), hue drifting slowly: "does not remain consistent between observations".
  const rimMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec3 vN; varying vec3 vV;
      void main(){
        float f = 1.0 - max(0.0, dot(vN, vV));
        float rim = pow(f, 6.0) * 1.6 + pow(f, 16.0) * 3.5;
        float h = 0.5 + 0.5 * sin(uTime * 0.07 + vN.y * 3.0);
        vec3 col = mix(vec3(1.0, 0.78, 0.45), vec3(0.72, 0.55, 1.0), h);
        col = mix(col, vec3(1.0), pow(f, 18.0));
        gl_FragColor = vec4(col * rim, 1.0);
      }`,
  });
  const rim = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.035, 96, 48), rimMat);
  group.add(rim);

  // Accretion disc: swirling bands, Doppler-brightened on the approaching side.
  const discMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uInner: { value: radius * 1.18 }, uOuter: { value: radius * 3.4 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uInner, uOuter; varying vec2 vP;
      ${NOISE_GLSL}
      void main(){
        float r = length(vP);
        float t = (r - uInner) / (uOuter - uInner);
        float a = atan(vP.y, vP.x);
        float swirl = a + uTime * 0.05 / (0.25 + t) ;
        float bands = fbm(vec3(cos(swirl) * 3.0, sin(swirl) * 3.0, t * 14.0));
        float streak = 0.55 + 0.45 * sin(t * 90.0 + bands * 6.0);
        float fade = smoothstep(0.0, 0.06, t) * pow(1.0 - clamp(t, 0.0, 1.0), 1.6);
        float doppler = 0.45 + 0.75 * (0.5 + 0.5 * cos(a - 0.6));
        vec3 hot = vec3(1.0, 0.93, 0.8), mid = vec3(1.0, 0.55, 0.18), cool = vec3(0.55, 0.22, 0.75);
        vec3 col = mix(hot, mid, smoothstep(0.0, 0.35, t));
        col = mix(col, cool, smoothstep(0.35, 0.95, t));
        float i = fade * doppler * (0.35 + bands * streak) * 1.7;
        gl_FragColor = vec4(col * i, 1.0);
      }`,
  });
  const disc = new THREE.Mesh(new THREE.RingGeometry(radius * 1.18, radius * 3.4, 256, 12), discMat);
  disc.rotation.set(-Math.PI / 2 + 0.22, 0.0, 0.35);
  group.add(disc);

  // Lensed ring: the far side of the disc bent over the top of the void, always facing the viewer.
  const lensMat = discMat.clone();
  lensMat.uniforms = { uTime: time, uInner: { value: radius * 1.04 }, uOuter: { value: radius * 1.55 } };
  const lens = new THREE.Mesh(new THREE.RingGeometry(radius * 1.04, radius * 1.55, 256, 4), lensMat);
  group.add(lens);

  const haloMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xb77cff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.setScalar(radius * 9);
  group.add(halo);
  const warm = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffb36b, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }));
  warm.scale.setScalar(radius * 4.2);
  group.add(warm);

  group.traverse((o) => { o.frustumCulled = false; });

  return {
    group,
    update(t, camera) {
      time.value = t;
      lens.quaternion.copy(camera.quaternion); // face the viewer
      lens.rotateZ(t * 0.01);
    },
  };
}
