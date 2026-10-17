/* 程序化树木与灌木：每棵树干形/冠幅/叶色都不同（最初版：光滑噪声球树冠） */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plantMaterial } from './plantMaterial.js';
import { rnd, rr, rint, fbm } from './noise.js';
import { terrainHeight } from './terrain.js';

function foliageMat() {
  return plantMaterial({ vertexColors: true, strength: 0.10 });
}

// Static branches and crowns share two draw calls per tree. Preserve vertex colors.
function batchTree(group) {
  const batches = new Map();
  for (const mesh of group.children) {
    mesh.updateMatrix();
    mesh.geometry.applyMatrix4(mesh.matrix);
    if (!batches.has(mesh.material)) batches.set(mesh.material, []);
    batches.get(mesh.material).push(mesh.geometry);
  }
  group.clear();
  for (const [material, geometries] of batches) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }
  return group;
}

function makeFoliageBlob(r, detail = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 2.1 + 9, v.z * 2.1 + v.y * 1.7);
    v.multiplyScalar(0.86 + n * 0.32);
    p.setXYZ(i, v.x, v.y * 0.92, v.z);
    col.setHSL(rr(0.25, 0.33), rr(0.4, 0.62), rr(0.24, 0.42));
    c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}
function barkMaterial() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#6b5540';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 600; i++) {
    const v = 70 + Math.random() * 55 | 0;
    g.fillStyle = `rgba(${v},${v * 0.8 | 0},${v * 0.62 | 0},.5)`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 6 + Math.random() * 20);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, color: 0xcfb9a0 });
}

function makeTree(barkMat, scale = 1, simplify = false) {
  const grp = new THREE.Group();
  const trunkH = rr(2.2, 3.6) * scale, trunkR = rr(0.13, 0.22) * scale;
  const pts = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    pts.push(new THREE.Vector3(
      rr(-0.15, 0.15) * t * trunkR * 3, t * trunkH, rr(-0.15, 0.15) * t * trunkR * 3));
  }
  const trunk = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, trunkR, 7, false), barkMat);
  const root = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR * 1.05, trunkR * 1.9, 0.55, 8), barkMat);
  root.position.y = 0.25;
  trunk.castShadow = root.castShadow = true;
  grp.add(trunk, root);

  const branchTips = [];
  const nb = simplify ? 3 : rint(4, 6);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + rr(-0.5, 0.5),
          len = rr(1.1, 2.0) * scale, br = trunkR * rr(0.32, 0.5);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(br * 0.4, br, len, 5), barkMat);
    b.position.set(Math.cos(a) * len * 0.32, trunkH * rr(0.72, 0.98), Math.sin(a) * len * 0.32);
    b.rotation.set(Math.PI / 2 - rr(0.5, 0.9), -a, 0, 'YXZ');
    b.castShadow = true;
    grp.add(b);
    branchTips.push(b.position.clone().add(
      new THREE.Vector3(Math.cos(a), 0.8, Math.sin(a)).multiplyScalar(len * 0.45)));
  }
  const fm = foliageMat();
  const crowns = simplify ? rr(4, 6) : rr(6, 10);
  for (let i = 0; i < crowns; i++) {
    const base = i === 0
      ? new THREE.Vector3(0, trunkH + 0.4 * scale, 0)
      : branchTips[rint(0, branchTips.length - 1)];
    const r = rr(0.8, 1.5) * scale;
    const blob = new THREE.Mesh(makeFoliageBlob(r, simplify ? 1 : 2), fm);
    blob.position.copy(base).add(
      new THREE.Vector3(rr(-0.5, 0.5), rr(-0.2, 0.6), rr(-0.5, 0.5)).multiplyScalar(scale));
    blob.castShadow = blob.receiveShadow = true;
    grp.add(blob);
  }
  return batchTree(grp);
}

export function buildTrees(scene) {
  const barkMat = barkMaterial();
  // 近景树（部分枝干伸向小径上方 → 斑驳光影）
  const nearSpots = [[-4.5, 4], [-5.5, -14], [4.6, -26], [-5.2, -44], [5.0, -58], [-4.6, -72], [4.2, -88]];
  for (const [x, z] of nearSpots) {
    const t = makeTree(barkMat, rr(0.9, 1.3));
    t.position.set(x + rr(-0.8, 0.8), terrainHeight(x, z) - 0.06, z + rr(-0.8, 0.8));
    t.rotation.y = rr(0, Math.PI * 2);
    scene.add(t);
  }
  // 远景大树（背景层次）
  const farSpots = [[-16, -6], [-19, -32], [17, -22], [-18, -56], [18, -48], [-15, -78], [16, -74], [-13, -95], [14, -94]];
  for (const [x, z] of farSpots) {
    const t = makeTree(barkMat, rr(1.6, 2.4), true);
    t.position.set(x + rr(-2, 2), terrainHeight(x, z) - 0.1, z + rr(-2, 2));
    scene.add(t);
  }
  // 路边灌木
  const shrubSpots = [[-2.6, 8], [2.4, 1], [-2.8, -8], [2.7, -18], [-3.0, -30], [2.5, -40],
    [-2.7, -52], [2.9, -63], [-2.9, -76], [2.6, -86]];
  for (const [x, z] of shrubSpots) {
    const g = new THREE.Group();
    const shrubMaterial = foliageMat();
    for (let i = 0, n = rint(3, 5); i < n; i++) {
      const b = new THREE.Mesh(makeFoliageBlob(rr(0.3, 0.62), 1), shrubMaterial);
      b.position.set(rr(-0.4, 0.4), rr(0.15, 0.5), rr(-0.4, 0.4));
      b.castShadow = b.receiveShadow = true;
      g.add(b);
    }
    g.position.set(x + rr(-0.5, 0.5), terrainHeight(x, z), z + rr(-0.5, 0.5));
    scene.add(batchTree(g));
  }
}
