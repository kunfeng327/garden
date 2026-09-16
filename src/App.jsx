import { useRef, useCallback } from 'react';
import GardenCanvas from './components/GardenCanvas.jsx';
import StartOverlay from './components/StartOverlay.jsx';
import Hud from './components/Hud.jsx';
import usePointerLock from './hooks/usePointerLock.js';

export default function App() {
  const { locked, onLockChange } = usePointerLock();
  const gardenApiRef = useRef(null);

  // GardenCanvas 构建完成后把 { lock } 回传给 App
  const handleGardenReady = useCallback(g => { gardenApiRef.current = g; }, []);
  const handleEnter = useCallback(() => { gardenApiRef.current?.lock(); }, []);

  return (
    <div className="app">
      <GardenCanvas onLockChange={onLockChange} onReady={handleGardenReady} />
      <Hud locked={locked} />
      <StartOverlay visible={!locked} onEnter={handleEnter} />
    </div>
  );
}
