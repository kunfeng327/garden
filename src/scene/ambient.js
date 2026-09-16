/* 动态氛围：空中飘落花瓣 + 蝴蝶 */
import * as THREE from 'three';
import { rr, rint, rnd } from './noise.js';
import { terrainHeight } from './terrain.js';
import { isMobile } from './noise.js';

export function buildAmbient(scene) {
  const mobile = isMobile();

  // 飘落花瓣
  const N = mobile ? 40 : 90;
  const g = new THREE.PlaneGeometry(0.045, 0.06);
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide,
  });
  const petalMesh = new THREE.InstancedMesh(g, m, N);
  const pal = [0xf5a8c8, 0xffffff, 0xffe08a, 0xc9a6f2];
  const items = [];
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    items.push({
      x: rr(-12, 12), y: rr(0.3, 4), z: rr(-85, -5),
      vx: rr(0.1, 0.35), vy: rr(-0.08, -0.03), vz: rr(-0.05, 0.05),
      rx: rr(0, 6), rz: rr(0, 6), sp: rr(1, 3),
    });
    col.setHex(pal[rint(0, 3)]);
    petalMesh.setColorAt(i, col);
  }
  scene.add(petalMesh);

  // 蝴蝶
  const grp = new THREE.Group();
  scene.add(grp);
  const wingGeo = new THREE.PlaneGeometry(0.09, 0.12);
  wingGeo.translate(0.045, 0, 0);
  const list = [];
  for (let i = 0, n = mobile ? 3 : 5; i < n; i++) {
    const b = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: [0xffb3c8, 0xf7d774, 0xb9a5f0, 0x9fd8ff, 0xffc9a3][i % 5],
      side: THREE.DoubleSide, roughness: 0.5,
    });
    const w1 = new THREE.Mesh(wingGeo, mat);
    w1.rotation.y = Math.PI;
    const w2 = new THREE.Mesh(wingGeo, mat);
    b.add(w1, w2);
    grp.add(b);
    list.push({
      obj: b, w1, w2, seed: rnd() * 100,
      cx: rr(-6, 6), cy: rr(0.8, 2), cz: rr(-80, -10),
      r: rr(1, 2.5), sp: rr(0.4, 0.9), phase: rr(0, 6),
    });
  }

  /* 每帧更新（dt 秒, t 总时间, playerPos 玩家位置） */
  const M = new THREE.Matrix4(), E = new THREE.Euler(),
        Q = new THREE.Quaternion(), P = new THREE.Vector3(),
        S = new THREE.Vector3(1, 1, 1);
  return function updateAmbient(dt, t, playerPos) {
    for (let i = 0; i < items.length; i++) {
      const p = items[i];
      p.x += (p.vx + Math.sin(t * 1.3 + i) * 0.15) * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < terrainHeight(p.x, p.z) + 0.03) {
        p.y = rr(1.5, 4);
        p.x = playerPos.x + rr(-10, 10);
        p.z = playerPos.z + rr(-14, 6);
      }
      P.set(p.x, p.y, p.z);
      E.set(p.rx + t * p.sp, p.rz + t * p.sp * 0.7, 0);
      Q.setFromEuler(E);
      M.compose(P, Q, S);
      petalMesh.setMatrixAt(i, M);
    }
    petalMesh.instanceMatrix.needsUpdate = true;

    for (const b of list) {
      const a = t * b.sp + b.phase;
      b.obj.position.set(
        b.cx + Math.cos(a) * b.r,
        terrainHeight(b.cx, b.cz) + b.cy + Math.sin(a * 2.3) * 0.4,
        b.cz + Math.sin(a * 1.2) * b.r);
      b.obj.rotation.y = a + Math.PI / 2;
      const flap = Math.sin(t * 18 + b.seed) * 0.9;
      b.w1.rotation.x = flap;
      b.w2.rotation.x = -flap;
    }
  };
}
