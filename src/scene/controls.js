/* 第一人称行走控制（指针锁定 + WASD + 起伏地面 + 头部晃动） */
import * as THREE from 'three';
import { terrainHeight, curve } from './terrain.js';
import { SUN_DIR } from './sky.js';

export const EYE = 1.65;

export function createControls(camera, canvas, sun, { onLock } = {}) {
  const player = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, bob: 0 };
  { // 出生点：小径起点，朝路深处
    const p = curve.getPointAt(0.015);
    player.pos.set(p.x, terrainHeight(p.x, p.z) + EYE, p.z);
    const look = curve.getPointAt(0.12);
    player.yaw = Math.atan2(-(look.x - p.x), -(look.z - p.z));
  }

  const keys = {};
  const onKeyDown = e => { keys[e.code] = true; };
  const onKeyUp = e => { keys[e.code] = false; };
  const onMouseMove = e => {
    if (document.pointerLockElement !== canvas) return;
    player.yaw -= e.movementX * 0.0022;
    player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.25, 1.25);
  };
  const onPointerLockChange = () => {
    if (onLock) onLock(document.pointerLockElement === canvas);
  };
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  const dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0),
        bobOff = new THREE.Vector3();

  function update(dt) {
    const run = keys.ShiftLeft || keys.ShiftRight;
    const speed = (run ? 3.4 : 1.5) * dt;
    dir.set((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), 0, (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0));
    if (dir.lengthSq() > 0) {
      dir.normalize().applyAxisAngle(up, player.yaw);
      player.pos.addScaledVector(dir, speed);
      player.bob += dt * (run ? 11 : 7);
    } else {
      player.bob += dt * 1.2;
    }
    player.pos.x = THREE.MathUtils.clamp(player.pos.x, -40, 40);
    player.pos.z = THREE.MathUtils.clamp(player.pos.z, -99, 12);
    const ground = terrainHeight(player.pos.x, player.pos.z) + EYE;
    player.pos.y += (ground - player.pos.y) * Math.min(1, dt * 10);

    const bobY = Math.sin(player.bob) * 0.028;
    const bobX = Math.cos(player.bob * 0.5) * 0.015;
    bobOff.set(bobX, bobY, 0).applyAxisAngle(up, player.yaw);
    camera.position.copy(player.pos).add(bobOff);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(player.yaw);
    camera.rotateX(player.pitch);

    // 太阳阴影跟随玩家
    sun.target.position.set(player.pos.x, 0, player.pos.z - 10);
    sun.position.set(player.pos.x + SUN_DIR.x, player.pos.y + SUN_DIR.y, player.pos.z - 10 + SUN_DIR.z);
    return player;
  }

  function dispose() {
    removeEventListener('keydown', onKeyDown);
    removeEventListener('keyup', onKeyUp);
    removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
  }

  return { player, update, dispose };
}
