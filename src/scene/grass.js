/* 实例化草叶，风吹摆动，疏密/颜色随机（最初版） */
import * as THREE from 'three';
import { rnd, rr, fbm, isMobile } from './noise.js';
import { terrainHeight, distToPath, HALF_PATH } from './terrain.js';
import { plantMaterial } from './plantMaterial.js';

/** 单片草叶：3 段渐窄，单位高度 1（实例缩放控制真实高度） */
function bladeGeometry() {
  const pos = [], norm = [], uv = [], idx = [];
  const W0 = 0.013, segs = 3;
  for (let i = 0; i <= segs; i++) {
    const y = i / segs, w = W0 * (1 - y * 0.92), bend = 0.06 * y * y;
    pos.push(-w, y, bend, w, y, bend);
    const n = [Math.cos(y * 1.2) * 0.2, 0.6, 0.8];
    norm.push(...n, ...n);
    uv.push(0, y, 1, y);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export function buildGrass(scene) {
  const COUNT = isMobile() ? 12000 : 28000;
  const mat = plantMaterial({ strength: 0.12, wind: 0.13 });
  const grass = new THREE.InstancedMesh(bladeGeometry(), mat, COUNT);
  grass.receiveShadow = true;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(),
        P = new THREE.Vector3(), S = new THREE.Vector3(), col = new THREE.Color();
  let placed = 0, guard = 0;
  while (placed < COUNT && guard++ < COUNT * 30) {
    const x = rr(-45, 45), z = rr(-100, 14);
    const d = distToPath(x, z);
    if (d < HALF_PATH + 0.08) continue;          // 不长在石板上
    if (d > 26 && rnd() < 0.72) continue;        // 远处变稀
    if (rnd() > fbm(x * 0.09 + 11, z * 0.09 + 4) * 1.25) continue; // 疏密斑块
    P.set(x, terrainHeight(x, z), z);
    E.set(rr(-0.16, 0.16), rr(0, Math.PI * 2), rr(-0.16, 0.16));
    Q.setFromEuler(E);
    S.set(rr(0.8, 1.5), rr(0.16, 0.5) * (d < 2 ? rr(0.5, 0.9) : 1), rr(0.8, 1.5));
    M.compose(P, Q, S);
    grass.setMatrixAt(placed, M);
    if (rnd() < 0.09) col.setHSL(0.13, 0.55, rr(0.35, 0.48));   // 枯草
    else col.setHSL(rr(0.23, 0.30), rr(0.4, 0.6), rr(0.28, 0.45));
    grass.setColorAt(placed, col);
    placed++;
  }
  grass.count = placed;
  scene.add(grass);
}
