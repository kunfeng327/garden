/* 环境细节：苔藓 / 小石头 / 落叶 / 枯枝 / 散落花瓣 */
import * as THREE from 'three';
import { rr, rint, rnd } from './noise.js';
import { terrainHeight, distToPath, HALF_PATH, curve } from './terrain.js';
import { isMobile } from './noise.js';

function scatter(mesh, n, fn) {
  const M = new THREE.Matrix4(), P = new THREE.Vector3(),
        Q = new THREE.Quaternion(), E = new THREE.Euler(),
        S = new THREE.Vector3(), col = new THREE.Color();
  let c = 0, guard = 0;
  while (c < n && guard++ < n * 40) {
    if (fn(M, P, Q, E, S, col)) {
      mesh.setMatrixAt(c, M);
      mesh.setColorAt(c, col.clone());
      c++;
    }
  }
  mesh.count = c;
  return mesh;
}

export function buildDetails(scene) {
  const mobile = isMobile();
  const D = mobile ? 0.4 : 1; // 移动端细节减量

  // 苔藓（石板缝隙）
  {
    const g = new THREE.CircleGeometry(0.09, 10);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.006, 0);
    const m = new THREE.MeshStandardMaterial({
      color: 0x5a7a2e, roughness: 1, transparent: true, opacity: 0.9,
    });
    const mesh = new THREE.InstancedMesh(g, m, Math.floor(700 * D));
    scene.add(scatter(mesh, Math.floor(700 * D),
      (M, P, Q, E, S, col) => {
        const t = rnd();
        const p = curve.getPointAt(t), q = curve.getTangentAt(t);
        const off = rr(-1.1, 1.1);
        const x = p.x + q.z * off, z = p.z - q.x * off;
        if (distToPath(x, z) > HALF_PATH + 0.5) return false;
        P.set(x, terrainHeight(x, z), z);
        E.set(0, rr(0, 6.28), 0);
        Q.setFromEuler(E);
        S.set(rr(0.6, 2.2), 1, rr(0.6, 2.2));
        M.compose(P, Q, S);
        col.setHSL(rr(0.2, 0.3), rr(0.4, 0.6), rr(0.2, 0.35));
        return true;
      }));
  }
  // 小石头
  {
    const g = new THREE.DodecahedronGeometry(0.05, 0);
    g.scale(1, 0.62, 0.85);
    const m = new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.95 });
    const mesh = new THREE.InstancedMesh(g, m, Math.floor(400 * D));
    scene.add(scatter(mesh, Math.floor(400 * D),
      (M, P, Q, E, S, col) => {
        const x = rr(-30, 30), z = rr(-98, 12);
        const d = distToPath(x, z);
        if (d < 0.4 || d > 14) return false;
        P.set(x, terrainHeight(x, z) + 0.01, z);
        E.set(rr(0, 3), rr(0, 6.28), rr(0, 3));
        Q.setFromEuler(E);
        S.set(rr(0.5, 2.4), rr(0.4, 1.6), rr(0.5, 2.4));
        M.compose(P, Q, S);
        col.setHSL(0.09, rr(0.02, 0.1), rr(0.4, 0.6));
        return true;
      }));
  }
  // 落叶
  {
    const g = new THREE.PlaneGeometry(0.07, 0.1);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(g, m, Math.floor(1300 * D));
    scene.add(scatter(mesh, Math.floor(1300 * D),
      (M, P, Q, E, S, col) => {
        const x = rr(-25, 25), z = rr(-96, 12);
        const d = distToPath(x, z);
        if (d < 0.5 || d > 12) return false;
        P.set(x, terrainHeight(x, z) + 0.005, z);
        E.set(rr(-0.1, 0.1), rr(0, 6.28), rr(-0.1, 0.1));
        Q.setFromEuler(E);
        S.setScalar(rr(0.7, 1.5));
        M.compose(P, Q, S);
        col.setHSL(rr(0.02, 0.12), rr(0.5, 0.75), rr(0.25, 0.45));
        return true;
      }));
  }
  // 枯枝
  {
    const g = new THREE.CylinderGeometry(0.006, 0.011, 0.4, 4);
    g.rotateZ(Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({ color: 0x6a543c, roughness: 1 });
    const mesh = new THREE.InstancedMesh(g, m, Math.floor(160 * D));
    scene.add(scatter(mesh, Math.floor(160 * D),
      (M, P, Q, E, S, col) => {
        const x = rr(-22, 22), z = rr(-94, 12);
        const d = distToPath(x, z);
        if (d < 0.6 || d > 10) return false;
        P.set(x, terrainHeight(x, z) + 0.012, z);
        E.set(rr(-0.06, 0.06), rr(0, 6.28), 0);
        Q.setFromEuler(E);
        S.setScalar(rr(0.6, 1.6));
        M.compose(P, Q, S);
        col.set(1, 1, 1);
        return true;
      }));
  }
  // 花丛脚下散落的花瓣
  {
    const g = new THREE.PlaneGeometry(0.045, 0.06);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide,
    });
    const pal = [0xe86aa4, 0xffd9ec, 0xffd23e, 0xffffff, 0x9b6fd4];
    const mesh = new THREE.InstancedMesh(g, m, Math.floor(1000 * D));
    scene.add(scatter(mesh, Math.floor(1000 * D),
      (M, P, Q, E, S, col) => {
        const x = rr(-18, 18), z = rr(-92, 10);
        const d = distToPath(x, z);
        if (d < 0.8 || d > 5) return false;
        P.set(x, terrainHeight(x, z) + 0.004, z);
        E.set(0, rr(0, 6.28), rr(-0.15, 0.15));
        Q.setFromEuler(E);
        S.setScalar(rr(0.8, 1.4));
        M.compose(P, Q, S);
        col.setHex(pal[rint(0, 4)]);
        return true;
      }));
  }
}
