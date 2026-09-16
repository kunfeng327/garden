/** 开始界面 / 暂停界面（指针未锁定时显示） */
export default function StartOverlay({ visible, onEnter }) {
  return (
    <div
      className={`overlay ${visible ? '' : 'overlay--hidden'}`}
      onClick={onEnter}
      role="button"
      aria-hidden={!visible}
    >
      <h1>阳 光 花 园</h1>
      <p>点击进入 · 第一人称漫步</p>
      <div className="overlay__keys">
        <span>鼠标 — 环顾四周 · W A S D — 行走</span>
        <span>Shift — 快步 · Esc — 释放鼠标</span>
      </div>
    </div>
  );
}
