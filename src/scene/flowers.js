/* 实例化花丛：曲面花瓣、叶脉和轻量薄层散射 */
import * as THREE from 'three';
import { rnd, rr, rint, fbm, isMobile, mergedGeo } from './noise.js';
import { terrainHeight, distToPath } from './terrain.js';
import { plantMaterial, tissueGeometry } from './plantMaterial.js';

function petalMaterial() {
  return plantMaterial({ detail: 'petal', strength: 0.22, wind: 0.05 });
}
function stemMaterial() {
  return plantMaterial({ color: 0x59813b, strength: 0.13, wind: 0.05 });
}

function makeStemGeo(cluster = false) {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.006, 0.009, 1, 5, 1);
  stem.translate(0, 0.5, 0);
  parts.push(stem);
  for (const rot of [0.6, 2.6, 4.4]) {
    const leaf = tissueGeometry(0.075, 0.24);
    leaf.rotateX(-1.1);
    leaf.rotateY(rot);
    leaf.translate(0, 0.3 + rot * 0.05, 0);
    parts.push(leaf);
  }
  if (cluster) {
    for (const tip of CLUSTER_TIPS) {
      const start = new THREE.Vector3(0, 0.76, 0);
      const end = new THREE.Vector3(...tip);
      const branch = new THREE.CylinderGeometry(0.003, 0.004, start.distanceTo(end), 4, 1, true);
      branch.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
      branch.translate(...start.add(end).multiplyScalar(0.5).toArray());
      parts.push(branch);
    }
  }
  const geometry = mergedGeo(parts);
  parts.forEach(part => part.dispose());
  return geometry;
}

/* 花头几何（基座在 y=1，即单位茎顶） */
function daisyHead(petals = 10, plen = 0.17, pwid = 0.075, tilt = 0.5) {
  const parts = [];
  for (let i = 0; i < petals; i++) {
    const p = tissueGeometry(pwid, plen);
    p.rotateX(-Math.PI / 2 + tilt * 0.25);
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

// Tiny pointed stars and small single-whorl wildflowers use only two petal segments.
function wildHead(variant, star = false) {
  const parts = [], petals = star ? 5 + variant % 2 : 5;
  for (let i = 0; i < petals; i++) {
    const petal = tissueGeometry(star ? 0.018 : 0.057, star ? 0.047 : 0.09, 2);
    petal.rotateX(-Math.PI / 2 + 0.10 + variant * 0.08);
    petal.rotateY(i / petals * Math.PI * 2 + variant * 0.15);
    parts.push(petal);
  }
  const geometry = mergedGeo(parts);
  parts.forEach(part => part.dispose());
  geometry.translate(0, 1, 0);
  return geometry;
}

const CLUSTER_TIPS = [[0.075, 0.96, 0], [-0.02, 1.08, 0.07], [-0.08, 0.94, -0.01], [0.01, 1.02, -0.08]];
function clusterHead(variant) {
  const parts = CLUSTER_TIPS.map(([x, y, z], i) => {
    const bloom = wildHead((variant + i) % 3, true);
    bloom.translate(0, -1, 0);
    bloom.scale(0.65, 0.65, 0.65);
    bloom.rotateY(i * 1.7);
    bloom.translate(x, y, z);
    return bloom;
  });
  const geometry = mergedGeo(parts);
  parts.forEach(part => part.dispose());
  return geometry;
}

function smallCenter() {
  const geometry = new THREE.CircleGeometry(0.019, 8);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 1.004, 0);
  return geometry;
}

export function buildFlowers(scene) {
  const mobile = isMobile();
  const types = [
    { count: mobile ? 70 : 180, head: daisyHead(11, 0.17, 0.08, 0.55), center: centerHead(),
      centerColor: 0xd8a018, colors: [0xffffff, 0xffd9ec, 0xffe9f4, 0xf6f0ff],
      sMin: 0.55, sMax: 1.25, budRate: 0.15, zone: [0.9, 4.5] },   // 雏菊系(白/粉)
    { count: mobile ? 50 : 120, head: tulipHead(), center: null,
      colors: [0xe75a8f, 0xc05bd8, 0xf2b134, 0xff8f5e, 0xd94f6e],
      sMin: 0.7, sMax: 1.35, budRate: 0.22, zone: [0.8, 3.5] },    // 杯状花
    { count: mobile ? 60 : 140, head: bellHead(), center: null,
      colors: [0x7f7fdc, 0x9b6fd4, 0x6f93e0, 0xb287e8],
      sMin: 0.5, sMax: 0.95, budRate: 0.18, zone: [1.0, 5.5] },    // 蓝紫风铃
    { count: mobile ? 65 : 160, head: daisyHead(6, 0.10, 0.06, 0.7), center: centerHead(),
      centerColor: 0xc99414, colors: [0xffd23e, 0xffe86b, 0xf7b93e],
      sMin: 0.4, sMax: 0.8, budRate: 0.12, zone: [0.6, 7] },       // 小黄菊
    { count: mobile ? 40 : 100, head: daisyHead(9, 0.14, 0.07, 0.6), center: centerHead(),
      centerColor: 0xb06018, colors: [0xe86aa4, 0xd4508a, 0xf39ac2, 0xc44a9a],
      sMin: 0.5, sMax: 1.05, budRate: 0.16, zone: [0.8, 6] },      // 粉色大花
    { name: 'star', count: mobile ? 100 : 240, variants: [0, 1, 2].map(v => wildHead(v, true)), center: null,
      colors: [0xfffaf0, 0xe4dcff, 0xc6d4fa, 0xf4cce5],
      sMin: 0.24, sMax: 0.52, budRate: 0.08, zone: [0.95, 6], clusterRate: 0.55 },
    { name: 'cluster', count: mobile ? 85 : 180, variants: [0, 1, 2].map(clusterHead), center: null,
      colors: [0xfff4dc, 0xe6ddff, 0xf8d2df, 0xe2edc4],
      sMin: 0.38, sMax: 0.75, budRate: 0.10, zone: [1.1, 7.5], clusterRate: 0.86 },
    { name: 'single', count: mobile ? 50 : 80, variants: [0, 1, 2].map(v => wildHead(v)), center: smallCenter(),
      centerColor: 0xcba534, colors: [0xfff8ea, 0xed9ebb, 0xd3bcf3, 0xffe298],
      sMin: 0.35, sMax: 0.72, budRate: 0.12, zone: [1, 5], clusterRate: 0.35 },
  ];
  const budGeo = budHead();
  const budMat = plantMaterial({ color: 0x7fa05a, wind: 0.05 });
  const petalMat = petalMaterial(), stemMat = stemMaterial();
  const budBatch = { mesh: new THREE.InstancedMesh(budGeo, budMat, 800), count: 0 };
  budBatch.mesh.name = 'flower-buds';
  budBatch.mesh.count = 0;
  budBatch.mesh.receiveShadow = true;
  budBatch.mesh.castShadow = true;
  scene.add(budBatch.mesh);

  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(),
        P = new THREE.Vector3(), S = new THREE.Vector3(), col = new THREE.Color();

  const budStems = [];
  for (const [typeIndex, cfg] of types.entries()) {
    const name = cfg.name || `garden-${typeIndex}`;
    const stems = new THREE.InstancedMesh(makeStemGeo(cfg.name === 'cluster'), stemMat, cfg.count);
    stems.name = `flower-${name}-stems`;
    stems.receiveShadow = true;
    const heads = (cfg.variants || [cfg.head]).map((geometry, variant, variants) => {
      const mesh = new THREE.InstancedMesh(geometry, petalMat, Math.ceil(cfg.count / variants.length));
      mesh.name = `flower-${name}-heads-${variant}`;
      mesh.count = 0;
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    });
    const centers = cfg.center
      ? new THREE.InstancedMesh(cfg.center,
          new THREE.MeshStandardMaterial({ color: cfg.centerColor, roughness: 0.7 }), cfg.count)
      : null;
    if (centers) centers.name = `flower-${name}-centers`;

    const clusters = Math.floor(cfg.count / rr(7, 13));
    const clusterCenters = [];
    for (let c = 0; c < clusters; c++) {
      let cx, cz, tries = 0;
      do {
        cx = rr(-22, 22); cz = rr(-92, 10); tries++;
      } while (tries < 40 && !(distToPath(cx, cz) > cfg.zone[0] && distToPath(cx, cz) < cfg.zone[1]));
      clusterCenters.push([cx, cz, rr(0.25, 0.7)]);
    }

    let n = 0, attempts = 0;
    while (n < cfg.count && attempts++ < cfg.count * 100) {
      let x, z;
      if (rnd() < (cfg.clusterRate ?? 0.75)) {  // 成丛
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
      S.set(s * rr(0.75, 1.25), s, s * rr(0.8, 1.2));
      M.compose(P, Q, S);
      const color = cfg.colors[rint(0, cfg.colors.length - 1)];
      if (rnd() < cfg.budRate) {  // 花苞
        if (budBatch.count >= 800) continue;
        budBatch.mesh.setMatrixAt(budBatch.count, M);
        col.setHex(color).lerp(new THREE.Color(0x86a05c), 0.55);
        budBatch.mesh.setColorAt(budBatch.count, col);
        budStems.push(M.clone());
        budBatch.count++;
        budBatch.mesh.count = budBatch.count;
        // Compact flower batches separately; append bud stems after the blossoms below.
      } else {
        stems.setMatrixAt(n, M);
        const head = heads[n % heads.length];
        head.setMatrixAt(head.count, M);
        if (centers) centers.setMatrixAt(n, M);
        col.setHex(color).offsetHSL(rr(-0.02, 0.02), rr(-0.05, 0.08), rr(-0.06, 0.06));
        head.setColorAt(head.count++, col);
        n++;
      }
    }
    stems.count = n;
    if (centers) centers.count = n;
    scene.add(stems, ...heads);
    if (centers) scene.add(centers);
  }
  const budStemMesh = new THREE.InstancedMesh(makeStemGeo(), stemMat, budStems.length);
  budStems.forEach((matrix, i) => budStemMesh.setMatrixAt(i, matrix));
  budStemMesh.name = 'flower-bud-stems';
  budStemMesh.receiveShadow = true;
  scene.add(budStemMesh);
}
