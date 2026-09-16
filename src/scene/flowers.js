/* 多类型 / 多色 / 含花苞的花丛，成丛 + 零散混合（最初版） */
import * as THREE from 'three';
import { rnd, rr, rint, fbm, isMobile, mergedGeo } from './noise.js';
import { terrainHeight, distToPath } from './terrain.js';
import { windInject } from './wind.js';

function petalMaterial() {
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.55, metalness: 0,
    side: THREE.DoubleSide, emissive: 0x332211, emissiveIntensity: 0.25,
  });
  windInject(m, '0.05');
  return m;
}
function stemMaterial() {
  const m = new THREE.MeshStandardMaterial({
    color: 0x4c7a33, roughness: 0.8, side: THREE.DoubleSide,
  });
  windInject(m, '0.06');
  return m;
}

function makeStemGeo() {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.006, 0.009, 1, 5, 1);
  stem.translate(0, 0.5, 0);
  parts.push(stem);
  for (const rot of [0.6, 2.6, 4.4]) {
    const leaf = new THREE.PlaneGeometry(0.05, 0.22);
    leaf.translate(0, 0.11, 0);
    leaf.rotateX(-1.1);
    leaf.rotateY(rot);
    leaf.translate(0, 0.3 + rot * 0.05, 0);
    parts.push(leaf);
  }
  return mergedGeo(parts);
}

/* 花头几何（基座在 y=1，即单位茎顶） */
function daisyHead(petals = 10, plen = 0.17, pwid = 0.075, tilt = 0.5) {
  const parts = [];
  for (let i = 0; i < petals; i++) {
    const p = new THREE.PlaneGeometry(pwid, plen, 1, 2);
    p.translate(0, plen * 0.45, 0);
    p.rotateX(-tilt);
    p.rotateY((i / petals) * Math.PI * 2);
    parts.push(p);
  }
  const g = mergedGeo(parts);
  g.translate(0, 1, 0);
  return g;
}
function centerHead() {
  const s = new THREE.SphereGeometry(0.032, 8, 6);
  s.scale(1, 0.55, 1);
  s.translate(0, 1, 0);
  return s;
}
function tulipHead() {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(new THREE.Vector2(0.008 + Math.sin(t * 2.4) * 0.052 * (1 - t * 0.25), t * 0.11));
  }
  const l = new THREE.LatheGeometry(pts, 10);
  l.translate(0, 1, 0);
  return l;
}
function bellHead() {
  const pts = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    pts.push(new THREE.Vector2(0.006 + Math.pow(t, 1.6) * 0.04, 1 - 0.09 * (1 - t)));
  }
  return new THREE.LatheGeometry(pts, 9);
}
function budHead() {
  const s = new THREE.SphereGeometry(0.038, 8, 7);
  s.scale(0.75, 1.25, 0.75);
  s.translate(0, 1.015, 0);
  return s;
}

export function buildFlowers(scene) {
  const mobile = isMobile();
  const types = [
    { count: mobile ? 220 : 520, head: daisyHead(11, 0.17, 0.08, 0.55), center: centerHead(),
      centerColor: 0xd8a018, colors: [0xffffff, 0xffd9ec, 0xffe9f4, 0xf6f0ff],
      sMin: 0.55, sMax: 1.25, budRate: 0.15, zone: [0.9, 4.5] },   // 雏菊系(白/粉)
    { count: mobile ? 150 : 340, head: tulipHead(), center: null,
      colors: [0xe75a8f, 0xc05bd8, 0xf2b134, 0xff8f5e, 0xd94f6e],
      sMin: 0.7, sMax: 1.35, budRate: 0.22, zone: [0.8, 3.5] },    // 杯状花
    { count: mobile ? 140 : 320, head: bellHead(), center: null,
      colors: [0x7f7fdc, 0x9b6fd4, 0x6f93e0, 0xb287e8],
      sMin: 0.5, sMax: 0.95, budRate: 0.18, zone: [1.0, 5.5] },    // 蓝紫风铃
    { count: mobile ? 180 : 400, head: daisyHead(6, 0.10, 0.06, 0.7), center: centerHead(),
      centerColor: 0xc99414, colors: [0xffd23e, 0xffe86b, 0xf7b93e],
      sMin: 0.4, sMax: 0.8, budRate: 0.12, zone: [0.6, 7] },       // 小黄菊
    { count: mobile ? 120 : 300, head: daisyHead(9, 0.14, 0.07, 0.6), center: centerHead(),
      centerColor: 0xb06018, colors: [0xe86aa4, 0xd4508a, 0xf39ac2, 0xc44a9a],
      sMin: 0.5, sMax: 1.05, budRate: 0.16, zone: [0.8, 6] },      // 粉色大花
  ];
  const budGeo = budHead();
  const budMat = new THREE.MeshStandardMaterial({ color: 0x7fa05a, roughness: 0.7 });
  const budBatch = { mesh: new THREE.InstancedMesh(budGeo, budMat, 800), count: 0 };
  budBatch.mesh.castShadow = true;
  scene.add(budBatch.mesh);

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(),
        P = new THREE.Vector3(), S = new THREE.Vector3(), col = new THREE.Color();

  for (const cfg of types) {
    const stems = new THREE.InstancedMesh(makeStemGeo(), stemMaterial(), cfg.count);
    const heads = new THREE.InstancedMesh(cfg.head, petalMaterial(), cfg.count);
    heads.castShadow = true;
    const centers = cfg.center
      ? new THREE.InstancedMesh(cfg.center,
          new THREE.MeshStandardMaterial({ color: cfg.centerColor, roughness: 0.7 }), cfg.count)
      : null;

    const clusters = Math.floor(cfg.count / rr(7, 13));
    const clusterCenters = [];
    for (let c = 0; c < clusters; c++) {
      let cx, cz, tries = 0;
      do {
        cx = rr(-22, 22); cz = rr(-92, 10); tries++;
      } while (tries < 40 && !(distToPath(cx, cz) > cfg.zone[0] && distToPath(cx, cz) < cfg.zone[1]));
      clusterCenters.push([cx, cz, rr(0.25, 0.7)]);
    }

    let n = 0;
    while (n < cfg.count) {
      let x, z;
      if (rnd() < 0.8) {  // 成丛
        const c = clusterCenters[rint(0, clusterCenters.length - 1)];
        const a = rr(0, Math.PI * 2), r = Math.abs(rr(-1, 1)) * c[2];
        x = c[0] + Math.cos(a) * r;
        z = c[1] + Math.sin(a) * r;
      } else {            // 零散
        x = rr(-30, 30); z = rr(-95, 12);
      }
      const d = distToPath(x, z);
      if (d < cfg.zone[0] || d > cfg.zone[1] + 1.5) continue;
      if (rnd() > fbm(x * 0.12 + 5, z * 0.12 + 9) * 1.35) continue;
      const s = rr(cfg.sMin, cfg.sMax);
      P.set(x, terrainHeight(x, z) - 0.01, z);
      E.set(rr(-0.09, 0.09), rr(0, Math.PI * 2), rr(-0.09, 0.09));
      Q.setFromEuler(E);
      S.set(s, s, s);
      M.compose(P, Q, S);
      const color = cfg.colors[rint(0, cfg.colors.length - 1)];
      if (rnd() < cfg.budRate) {  // 花苞
        if (budBatch.count >= 800) continue;
        budBatch.mesh.setMatrixAt(budBatch.count, M);
        col.setHex(color).lerp(new THREE.Color(0x86a05c), 0.55);
        budBatch.mesh.setColorAt(budBatch.count, col);
        budBatch.count++;
        budBatch.mesh.count = budBatch.count;
      } else {
        stems.setMatrixAt(n, M);
        heads.setMatrixAt(n, M);
        if (centers) centers.setMatrixAt(n, M);
        col.setHex(color).offsetHSL(rr(-0.02, 0.02), rr(-0.05, 0.08), rr(-0.06, 0.06));
        heads.setColorAt(n, col);
        n++;
      }
    }
    stems.count = heads.count = n;
    if (centers) centers.count = n;
    scene.add(stems, heads);
    if (centers) scene.add(centers);
  }
}
