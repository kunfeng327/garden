/* 天空穹顶 + 暖阳光照 */
import * as THREE from 'three';
import { isMobile } from './noise.js';

export const SUN_DIR = new THREE.Vector3(-32, 38, -28);

export function buildSky(scene) {
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false, depthWrite: false,
    uniforms: { sunDir: { value: SUN_DIR.clone().normalize() } },
    vertexShader: `
      varying vec3 vDir;
      void main(){
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      varying vec3 vDir; uniform vec3 sunDir;
      void main(){
        float h = clamp(vDir.y, 0., 1.);
        vec3 zenith = vec3(0.38, 0.62, 0.80), horizon = vec3(0.89, 0.91, 0.84);
        vec3 col = mix(horizon, zenith, pow(h, 0.55));
        float s = max(dot(vDir, sunDir), 0.);
        col += vec3(1., 0.85, 0.6) * pow(s, 220.) * 8.;  // 太阳
        col += vec3(1., 0.9, 0.7) * pow(s, 10.) * 0.22;  // 光晕
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), skyMat));
}

export function buildLighting(scene) {
  const sun = new THREE.DirectionalLight(0xffe4bd, 2.6);
  sun.position.copy(SUN_DIR);
  sun.castShadow = true;
  const shadowSize = isMobile() ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 28;   sun.shadow.camera.bottom = -28;
  sun.shadow.camera.near = 5;   sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.target.position.set(0, 0, -42);
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xc4dded, 0x776c46, 1.1));
  scene.add(new THREE.AmbientLight(0xfff2dd, 0.08));
  return sun;
}
