/** 左下角 HUD 提示 */
export default function Hud({ locked }) {
  if (!locked) return null;
  return (
    <div className="hud">
      WASD 行走 · Shift 快步 · Esc 暂停
    </div>
  );
}
