/* 不规则天然石板铺成的小径 */
import * as THREE from 'three';
import { rnd, rr, rint } from './noise.js';
import { curve, terrainHeight } from './terrain.js';

function stoneTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#9a958c';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 256, y = Math.random() * 256,
          r = Math.random() * 3 + 0.3, v = 140 + Math.random() * 70 | 0;
    g.fillStyle = `rgba(${v},${v - 4},${v - 12},${0.18 + Math.random() * 0.3})`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(70,66,60,.35)'; // 细微裂纹
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    let x = Math.random() * 256, y = Math.random() * 256;
    g.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * 46;
      y += (Math.random() - 0.5) * 46;
      g.lineTo(x, y);
    }
    g.lineWidth = 0.6 + Math.random();
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** 单块不规则凸多边形石板 */
function slabGeometry() {
  const pts = [], n = rint(7, 10);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rr(-0.13, 0.13), r = rr(0.72, 1.0);
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: 0.075, bevelEnabled: true, bevelThickness: 0.014,
    bevelSize: 0.02, bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.075, 0);
  geo.scale(0.36, 1, 0.34);
  return geo;
}

export function buildPath(scene) {
  const tex = stoneTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.92, metalness: 0,
    bumpMap: tex, bumpScale: 0.35,
  });
  const VARIANTS = 6, batches = [];
  for (let v = 0; v < VARIANTS; v++) {
    const m = new THREE.InstancedMesh(slabGeometry(), mat, 120);
    m.castShadow = m.receiveShadow = true;
    batches.push({ mesh: m, count: 0 });
  }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(),
        E = new THREE.Euler(), P = new THREE.Vector3(),
        S = new THREE.Vector3(), col = new THREE.Color();
  const N = curve.getSpacedPoints(150);
  for (let i = 0; i < N.length - 1; i++) {
    const p = N[i], q = N[i + 1];
    const ang = Math.atan2(q.x - p.x, q.z - p.z);
    const b = batches[i % VARIANTS];
    const s = rr(0.82, 1.18);
    E.set(rr(-0.05, 0.05), ang + rr(-0.22, 0.22), rr(-0.05, 0.05));
    Q.setFromEuler(E);
    P.set(p.x + rr(-0.12, 0.12), terrainHeight(p.x, p.z) + 0.012, p.z + rr(-0.06, 0.06));
    S.set(s * rr(0.9, 1.15), rr(0.85, 1.1), s * rr(0.9, 1.15));
    M.compose(P, Q, S);
    b.mesh.setMatrixAt(b.count, M);
    const tint = rr(0.82, 1.12);
    col.setRGB(tint, tint * rr(0.96, 1.02), tint * rr(0.9, 1.0));
    b.mesh.setColorAt(b.count, col);
    b.count++;
  }
  batches.forEach(b => { b.mesh.count = b.count; scene.add(b.mesh); });
}
