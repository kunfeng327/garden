/* 天空穹顶 + 暖阳光照 */
import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(38, 46, 30);

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
      float h33(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
      void main(){
        float h = clamp(vDir.y, 0., 1.);
        vec3 zenith = vec3(0.32, 0.56, 0.88), horizon = vec3(0.86, 0.92, 0.96);
        vec3 col = mix(horizon, zenith, pow(h, 0.55));
        float s = max(dot(vDir, sunDir), 0.);
        col += vec3(1., 0.85, 0.6) * pow(s, 220.) * 8.;  // 太阳
        col += vec3(1., 0.9, 0.7) * pow(s, 10.) * 0.22;  // 光晕
        float cl = smoothstep(0.55, 0.95, h33(vDir.xz * 4. + vec2(0., vDir.y * 2.)));
        col = mix(col, vec3(1.), cl * 0.18 * smoothstep(0.05, 0.35, vDir.y)); // 高空云
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), skyMat));
}

export function buildLighting(scene) {
  const sun = new THREE.DirectionalLight(0xffe0b0, 3.0);
  sun.position.copy(SUN_DIR);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 60;   sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 5;   sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.target.position.set(0, 0, -42);
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xbdd9ff, 0x8c7d5c, 0.85));
  scene.add(new THREE.AmbientLight(0xfff2dd, 0.18));
  return sun;
}
