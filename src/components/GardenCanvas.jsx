import { useEffect, useRef, useCallback } from 'react';
import { createGarden } from '../scene/index.js';

/**
 * 花园 3D 画布：负责 Three.js 场景的创建 / 渲染 / 销毁。
 * UI 与交互状态全部由 React（上层 App + hooks）管理。
 */
export default function GardenCanvas({ onLockChange, onReady }) {
  const containerRef = useRef(null);
  const gardenRef = useRef(null);

  // 副作用：挂载时构建场景，卸载时清理
  useEffect(() => {
    const garden = createGarden(containerRef.current, { onLockChange });
    gardenRef.current = garden;
    if (onReady) onReady(garden);
    return () => {
      garden.dispose();
      gardenRef.current = null;
    };
    // onLockChange / onReady 均由上层 useCallback 稳定化，只需执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 画布自身被点击（例如 Esc 暂停后再点画布空白处）也可重新锁定
  const handleClick = useCallback(() => {
    gardenRef.current?.lock();
  }, []);

  return (
    <div
      ref={containerRef}
      className="garden-canvas"
      onClick={handleClick}
      aria-label="3D 花园场景"
    />
  );
}
