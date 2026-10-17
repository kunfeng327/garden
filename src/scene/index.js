/* 场景总装：构建完整花园并返回每帧更新函数 */
import * as THREE from 'three';
import { buildSky, buildLighting, SUN_DIR } from './sky.js';
import { buildGround } from './terrain.js';
import { buildPath } from './path.js';
import { buildGrass } from './grass.js';
import { buildFlowers } from './flowers.js';
import { buildTrees } from './trees.js';
import { buildDetails } from './details.js';
import { buildAmbient } from './ambient.js';
import { createControls } from './controls.js';
import { uTime } from './wind.js';
import { isMobile } from './noise.js';

export function createGarden(container, { onLockChange, onReady } = {}) {
  // 渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile() ? 1.25 : 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe4e7db, 28, 125);
  const camera = new THREE.PerspectiveCamera(
    58, container.clientWidth / container.clientHeight, 0.1, 450);

  // 组装花园（同步构建；数量已按设备自适应）
  buildSky(scene);
  const sun = buildLighting(scene);
  buildGround(scene);
  buildPath(scene);
  buildGrass(scene);
  buildFlowers(scene);
  buildTrees(scene);
  buildDetails(scene);
  const updateAmbient = buildAmbient(scene);

  const controls = createControls(camera, renderer.domElement, {
    onLock: onLockChange,
  });

  let timer = 0;
  let disposed = false;
  let lastFrame = performance.now();
  let elapsed = 0;
  const shadowAnchor = new THREE.Vector3(Infinity, 0, Infinity);

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  addEventListener('resize', resize);

  // Schedule only the frames we render: 30 fps while walking, 18 fps in preview.
  function animate() {
    if (disposed || document.hidden) return;
    const start = performance.now();
    const dt = Math.min((start - lastFrame) / 1000, 0.1);
    lastFrame = start;
    elapsed += dt;
    uTime.value = elapsed;
    const player = controls.update(dt);
    updateAmbient(dt, elapsed, player.pos);
    if (Math.hypot(player.pos.x - shadowAnchor.x, player.pos.z - shadowAnchor.z) > 3) {
      shadowAnchor.copy(player.pos);
      sun.target.position.set(player.pos.x, 0, player.pos.z - 12);
      sun.position.copy(sun.target.position).add(SUN_DIR);
      renderer.shadowMap.needsUpdate = true;
    }
    renderer.render(scene, camera);
    const fps = document.pointerLockElement === renderer.domElement ? 30 : 18;
    timer = setTimeout(animate, Math.max(0, 1000 / fps - (performance.now() - start)));
  }
  function visibilityChange() {
    clearTimeout(timer);
    lastFrame = performance.now();
    if (!document.hidden) animate();
  }
  document.addEventListener('visibilitychange', visibilityChange);

  animate();
  if (onReady) onReady(renderer.domElement);

  return {
    canvas: renderer.domElement,
    lock() { renderer.domElement.requestPointerLock(); },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibilityChange);
      removeEventListener('resize', resize);
      controls.dispose();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(obj => {
        if (obj.geometry) geometries.add(obj.geometry);
        if (obj.isInstancedMesh) obj.dispose();
        if (obj.material) {
          for (const material of [obj.material].flat()) materials.add(material);
        }
      });
      for (const material of materials) {
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        material.dispose();
      }
      for (const geometry of geometries) geometry.dispose();
      for (const texture of textures) texture.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
