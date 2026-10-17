/* 三层混生草地：共享少量几何变体，保持实例和三角形预算。 */
import * as THREE from 'three';
import { rnd, rr, fbm, isMobile, mergedGeo } from './noise.js';
import { terrainHeight, distToPath, HALF_PATH } from './terrain.js';
import { plantMaterial } from './plantMaterial.js';

function bladeGeometry(width, bend, segments, lean = 0) {
  const positions = [], uv = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w = width * (1 - t * 0.97);
    const x = lean * t * t;
    positions.push(x - w, t, bend * t * t, x + w, t, bend * t * t);
    uv.push(0, t, 1, t);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function grassGeometry(kind, variant) {
  if (kind === 'turf') return bladeGeometry(0.0035 + variant * 0.0015, 0.10 + variant * 0.09, 2);
  const parts = [];
  const blades = kind === 'tuft' ? 3 : 2;
  for (let i = 0; i < blades; i++) {
    const blade = bladeGeometry(
      kind === 'tuft' ? 0.010 + variant * 0.004 : 0.0035,
      0.10 + i * 0.13 + variant * 0.09,
      kind === 'tall' && i === 0 ? 3 : 2,
      (i - 1) * 0.10,
    );
    blade.scale(1, i === 0 ? 1 : 0.65 + i * 0.10, 1);
    blade.rotateY(i * 2.4 + variant * 0.5);
    blade.translate(Math.sin(i * 2.4) * 0.025, 0, Math.cos(i * 2.4) * 0.025);
    parts.push(blade);
  }
  const geometry = mergedGeo(parts);
  parts.forEach(part => part.dispose());
  return geometry;
}

export function buildGrass(scene) {
  // More silhouettes, fewer total triangles than the previous 28k/12k single blades.
  const total = isMobile() ? 9000 : 22000;
  const species = [
    { kind: 'turf', share: 0.66, height: [0.07, 0.20], hue: [0.25, 0.31], wind: 0.05 },
    { kind: 'tuft', share: 0.25, height: [0.27, 0.60], hue: [0.23, 0.29], wind: 0.10 },
    { kind: 'tall', share: 0.09, height: [0.60, 1.15], hue: [0.20, 0.26], wind: 0.14 },
  ];
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
  const rotation = new THREE.Euler(), position = new THREE.Vector3();
  const scale = new THREE.Vector3(), color = new THREE.Color();
  for (const [index, cfg] of species.entries()) {
    const count = Math.round(total * cfg.share);
    const material = plantMaterial({ strength: 0.12, wind: cfg.wind });
    const batches = [0, 1].map(variant => {
      const mesh = new THREE.InstancedMesh(grassGeometry(cfg.kind, variant), material, Math.ceil(count / 2));
      mesh.name = `grass-${cfg.kind}-${variant}`;
      mesh.count = 0;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    });
    let placed = 0, attempts = 0;
    while (placed < count && attempts++ < count * 40) {
      const x = rr(-45, 45), z = rr(-100, 14);
      const d = distToPath(x, z);
      if (d < HALF_PATH + 0.08) continue;
      if (cfg.kind === 'tall' && (d < 2 || d > 18)) continue;
      if (d > 26 && rnd() < 0.72) continue;
      const patch = fbm(x * 0.18 + index * 13, z * 0.18 + index * 7);
      if (rnd() > patch * (cfg.kind === 'tuft' ? 1.15 : 1.6)) continue;
      position.set(x, terrainHeight(x, z), z);
      rotation.set(rr(-0.18, 0.18), rr(0, Math.PI * 2), rr(-0.18, 0.18));
      quaternion.setFromEuler(rotation);
      scale.set(rr(0.65, 1.45), rr(...cfg.height) * (d < 1.5 ? 0.7 : 1), rr(0.7, 1.4));
      matrix.compose(position, quaternion, scale);
      const mesh = batches[placed % batches.length];
      mesh.setMatrixAt(mesh.count, matrix);
      if (rnd() < (cfg.kind === 'tall' ? 0.18 : 0.05)) color.setHSL(0.14, 0.35, rr(0.36, 0.48));
      else color.setHSL(rr(...cfg.hue), rr(0.35, 0.57), rr(0.27, 0.43));
      mesh.setColorAt(mesh.count++, color);
      placed++;
    }
    for (const mesh of batches) mesh.computeBoundingSphere();
  }
}
