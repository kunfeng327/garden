import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildGrass } from '../src/scene/grass.js';
import { buildFlowers } from '../src/scene/flowers.js';
import { tissueGeometry } from '../src/scene/plantMaterial.js';
import { distToPath, HALF_PATH } from '../src/scene/terrain.js';

function triangleCount(mesh) {
  return (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3 * mesh.count;
}

function disposeScene(scene) {
  const materials = new Set();
  for (const mesh of scene.children) {
    mesh.geometry.dispose();
    mesh.dispose();
    materials.add(mesh.material);
  }
  for (const material of materials) material.dispose();
}

for (const mobile of [false, true]) {
  test(`${mobile ? 'mobile' : 'desktop'} meadow keeps diversity within the geometry budget`, () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: mobile ? 'Android Mobile' : 'Desktop' } });
    const scene = new THREE.Scene();
    try {
      buildGrass(scene);
      buildFlowers(scene);
      const grass = scene.children.filter(mesh => mesh.name.startsWith('grass-'));
      const flowers = scene.children.filter(mesh => mesh.name.includes('-heads-'));
      assert.equal(grass.length, 6);
      assert.equal(flowers.length, 14);
      assert.equal(grass.reduce((sum, mesh) => sum + mesh.count, 0), mobile ? 9000 : 22000);
      assert.equal(flowers.reduce((sum, mesh) => sum + mesh.count, 0), mobile ? 520 : 1200);
      for (const species of ['star', 'cluster', 'single']) {
        assert.equal(flowers.filter(mesh => mesh.name.startsWith(`flower-${species}-`)).length, 3);
      }
      assert.ok(scene.children.length <= 34, 'vegetation should need at most 34 main-pass draws');
      assert.ok(grass.reduce((sum, mesh) => sum + triangleCount(mesh), 0) <= (mobile ? 72000 : 168000));
      assert.ok(scene.children.reduce((sum, mesh) => sum + triangleCount(mesh), 0) <= (mobile ? 220000 : 500000));
      const matrix = new THREE.Matrix4();
      for (const mesh of scene.children) {
        assert.ok(mesh.count > 0 && mesh.count <= mesh.instanceMatrix.count);
        for (const attribute of Object.values(mesh.geometry.attributes)) {
          assert.ok(attribute.array.every(Number.isFinite), `${mesh.name} has invalid geometry`);
        }
        const positions = new Set(), silhouettes = new Set(), colors = new Set();
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          assert.ok(matrix.elements.every(Number.isFinite));
          const e = matrix.elements;
          positions.add(`${e[12]},${e[13]},${e[14]}`);
          silhouettes.add(e.slice(0, 12).join(','));
          if (mesh.instanceColor) colors.add(Array.from(mesh.instanceColor.array.slice(i * 3, i * 3 + 3)).join(','));
          if (mesh.name.startsWith('grass-') || mesh.name.includes('-heads-')) {
            assert.ok(distToPath(e[12], e[14]) > HALF_PATH, 'vegetation must avoid the stone path');
          }
        }
        assert.equal(positions.size, mesh.count, `${mesh.name} repeats a position`);
        assert.equal(silhouettes.size, mesh.count, `${mesh.name} repeats a rotation and scale`);
        if (mesh.instanceColor) assert.ok(colors.size > 1);
      }
    } finally {
      disposeScene(scene);
      if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
      else delete globalThis.navigator;
    }
  });
}

test('thin petals and leaves remain finite at float32 endpoints', () => {
  for (const length of [0.047, 0.09, 0.10, 0.14, 0.17, 0.24]) {
    const geometry = tissueGeometry(0.018, length, 2);
    try {
      assert.ok(geometry.attributes.position.array.every(Number.isFinite));
      assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
    } finally {
      geometry.dispose();
    }
  }
});
