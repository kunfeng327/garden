/* 场景总装：构建完整花园并返回每帧更新函数 */
import * as THREE from 'three';
import { buildSky, buildLighting } from './sky.js';
import { buildGround } from './terrain.js';
import { buildPath } from './path.js';
import { buildGrass } from './grass.js';
import { buildFlowers } from './flowers.js';
import { buildTrees } from './trees.js';
import { buildDetails } from './details.js';
import { buildAmbient } from './ambient.js';
import { createControls } from './controls.js';
import { uTime } from './wind.js';

export function createGarden(container, { onLockChange, onReady } = {}) {
  // 渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdcecf4, 30, 150);
  const camera = new THREE.PerspectiveCamera(
    66, container.clientWidth / container.clientHeight, 0.05, 500);

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

  const controls = createControls(camera, renderer.domElement, sun, {
    onLock: onLockChange,
  });

  const clock = new THREE.Clock();
  let raf = 0;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  addEventListener('resize', resize);

  function animate() {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    uTime.value = clock.elapsedTime;
    const player = controls.update(dt);
    updateAmbient(dt, clock.elapsedTime, player.pos);
    renderer.render(scene, camera);
  }

  if (onReady) onReady(renderer.domElement);
  animate();

  return {
    canvas: renderer.domElement,
    lock() { renderer.domElement.requestPointerLock(); },
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
