/* 共享的风吹 uniforms 与注入器 */
export const uTime = { value: 0 };

export function windInject(mat, strength) {
  mat.onBeforeCompile = s => {
    s.uniforms.uTime = uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float hF = clamp(position.y, 0., 1.); hF *= hF;
        #ifdef USE_INSTANCING
          vec3 iw = (instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
          float w = sin(uTime * 1.5 + iw.x * .7 + iw.z * .5)
                  + .55 * sin(uTime * 2.9 + iw.x * 1.9 + iw.z * 1.3);
          transformed.x += w * ${strength} * hF;
          transformed.z += cos(uTime * 1.1 + iw.z * .8) * ${(strength * 0.4).toFixed(3)} * hF;
        #endif
      `);
  };
}
