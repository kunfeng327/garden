/* 随机数（带种子，保证场景每次生成一致可复现）与噪声 */
import * as THREE from 'three';

let seed = 20260916;
export function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
export const rr = (a, b) => a + rnd() * (b - a);
export const rint = (a, b) => Math.floor(rr(a, b + 1));

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** 二维 value noise */
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi),
        c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** 分形噪声 ~0..1 */
export function fbm(x, y, oct = 3) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += amp * vnoise(x * f, y * f);
    amp *= 0.5;
    f *= 2.03;
  }
  return v;
}

export const isMobile = () => /Mobi|Android/i.test(navigator.userAgent);

/** 合并多个 BufferGeometry（保留 uv/normal/index） */
export function mergeGeos(gs) {
  if (gs.length === 1) return gs[0];
  let pc = 0, ic = 0;
  const hasUV = !!gs[0].attributes.uv;
  gs.forEach(g => {
    pc += g.attributes.position.count;
    ic += g.index ? g.index.count : g.attributes.position.count;
  });
  const pos = new Float32Array(pc * 3),
        nor = new Float32Array(pc * 3),
        uv = hasUV ? new Float32Array(pc * 2) : null,
        idx = new (pc > 65535 ? Uint32Array : Uint16Array)(ic);
  let po = 0, io = 0;
  gs.forEach(g => {
    pos.set(g.attributes.position.array, po * 3);
    nor.set(g.attributes.normal.array, po * 3);
    if (uv) uv.set(g.attributes.uv.array, po * 2);
    const gi = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()];
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + po;
    po += g.attributes.position.count;
    io += gi.length;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
export const mergedGeo = list => mergeGeos(list);
