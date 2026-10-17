/* 小径曲线与起伏地形 */
import * as THREE from 'three';
import { fbm } from './noise.js';

export const curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.0, 0, 12), new THREE.Vector3(-1.6, 0, 0),
  new THREE.Vector3(0.6, 0, -12), new THREE.Vector3(-1.0, 0, -24),
  new THREE.Vector3(1.4, 0, -38), new THREE.Vector3(0.2, 0, -52),
  new THREE.Vector3(-1.2, 0, -66), new THREE.Vector3(0.6, 0, -82),
  new THREE.Vector3(-0.4, 0, -96),
]);

const PATH_SAMPLES = curve.getSpacedPoints(420).sort((a, b) => b.z - a.z);
export const HALF_PATH = 0.85;

export function distToPath(x, z) {
  // Samples are ordered by decreasing z. Find the nearest z first, then
  // visit only samples whose z distance can improve the current result.
  let low = 0, high = PATH_SAMPLES.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (PATH_SAMPLES[mid].z > z) low = mid + 1;
    else high = mid;
  }
  let best = Infinity;
  for (let i = low; i < PATH_SAMPLES.length; i++) {
    const p = PATH_SAMPLES[i], dz = p.z - z;
    if (dz * dz > best) break;
    best = Math.min(best, (p.x - x) ** 2 + dz * dz);
  }
  for (let i = low - 1; i >= 0; i--) {
    const p = PATH_SAMPLES[i], dz = p.z - z;
    if (dz * dz > best) break;
    best = Math.min(best, (p.x - x) ** 2 + dz * dz);
  }
  return Math.sqrt(best);
}

export function terrainHeight(x, z) {
  const d = distToPath(x, z);
  const damp = THREE.MathUtils.smoothstep(d, 1.3, 7.0); // 路边压平
  let h = (fbm(x * 0.045 + 3.1, z * 0.045 + 8.7) - 0.45) * 2.2 * damp
        + (fbm(x * 0.16 + 7.7, z * 0.16 + 2.2) - 0.5) * 0.35;
  h += THREE.MathUtils.smoothstep(Math.hypot(x, z + 45), 55, 95) * 2.2; // 远处微隆
  return h;
}

/** 程序化草地噪点纹理 */
function groundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#6d8a4a';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 512, y = Math.random() * 512,
          r = Math.random() * 2.4 + 0.4, t = Math.random();
    g.fillStyle = t < 0.5 ? `rgba(60,90,40,${0.25 + Math.random() * 0.3})`
               : t < 0.85 ? `rgba(120,150,70,${0.2 + Math.random() * 0.3})`
               : `rgba(90,70,45,${0.2 + Math.random() * 0.25})`;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 32);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 构建地面网格（顶点色：路泥 → 路缘 → 草地） */
export function buildGround(scene) {
  const geo = new THREE.PlaneGeometry(190, 220, 100, 120);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) - 48;
    pos.setY(i, terrainHeight(x, z));
    pos.setX(i, x);
    pos.setZ(i, z);
    const d = distToPath(x, z), n = fbm(x * 0.3, z * 0.3);
    if (d < HALF_PATH + 0.15)      c.setHSL(0.09, 0.35, 0.28 + n * 0.10);       // 路面泥土
    else if (d < HALF_PATH + 0.8)  c.setHSL(0.24 - n * 0.03, 0.4, 0.30 + n * 0.08); // 路缘过渡
    else                           c.setHSL(0.26 + n * 0.05, 0.45, 0.30 + n * 0.14); // 草地
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: groundTexture(), vertexColors: true, roughness: 0.95, metalness: 0,
  }));
  ground.receiveShadow = true;
  scene.add(ground);
}
