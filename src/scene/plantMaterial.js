import * as THREE from 'three';
import { windInject } from './wind.js';

// Thin plant tissue: approximate single scattering from the existing sunlight.
// No transmission render target, ray marching, extra lights or GI passes.
export function plantMaterial({ color = 0xffffff, strength = 0.18, detail = 'leaf', wind = null, vertexColors = false } = {}) {
  const material = new THREE.MeshStandardMaterial({
    color, roughness: detail === 'petal' ? 0.58 : 0.82,
    side: THREE.DoubleSide, vertexColors,
  });
  if (wind !== null) windInject(material, wind);
  const injectWind = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    injectWind(shader);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPlantUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPlantUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPlantUv;')
      .replace('#include <clipping_planes_pars_fragment>', '#include <clipping_planes_pars_fragment>\n#include <shadowmask_pars_fragment>')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float midrib = exp(-abs(vPlantUv.x - 0.5) * 90.0);
        float veins = pow(0.5 + 0.5 * cos(${detail === 'petal' ? 'vPlantUv.x * 72.0' : '(vPlantUv.y + abs(vPlantUv.x - 0.5) * 0.7) * 90.0'}), 12.0);
        diffuseColor.rgb *= ${detail === 'petal' ? 'mix(0.78, 1.06, smoothstep(0.0, 0.8, vPlantUv.y)) - veins * 0.055' : '0.94 + midrib * 0.10 - veins * 0.045'};
      `)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        #if NUM_DIR_LIGHTS > 0
          float backLight = pow(clamp(dot(-normal, directionalLights[0].direction) * 0.5 + 0.5, 0.0, 1.0), 2.0);
          float forwardScatter = pow(max(dot(normalize(vViewPosition), -directionalLights[0].direction), 0.0), 3.0);
          reflectedLight.directDiffuse += diffuseColor.rgb * directionalLights[0].color
            * (backLight + forwardScatter * 0.35) * ${strength.toFixed(3)} * getShadowMask();
        #endif
      `);
  };
  material.customProgramCacheKey = () => `plant-${detail}-${strength}-${wind}`;
  return material;
}

// Rounded outline and a shallow central fold, shared by petals and stem leaves.
export function tissueGeometry(width, length, segments = 4) {
  const geometry = new THREE.PlaneGeometry(width, length, 2, segments);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const t = positions.getY(i) / length + 0.5;
    const x = positions.getX(i);
    positions.setXYZ(i,
      x * (0.12 + 0.88 * Math.pow(Math.sin(Math.PI * t), 0.65)),
      t * length,
      length * 0.13 * t * t + Math.abs(x) * 0.24,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}
