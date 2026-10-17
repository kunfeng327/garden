/** Keep the garden visible while the visitor starts or pauses their walk. */
export default function StartOverlay({ visible, onEnter }) {
  return (
    <div className={`overlay ${visible ? '' : 'overlay--hidden'}`} aria-hidden={!visible}>
      <div className="overlay__brand"><span className="overlay__mark">✳</span> SUNNY GARDEN</div>
      <section className="overlay__intro">
        <p className="overlay__eyebrow">一处可以慢下来的地方</p>
        <h1>阳光花园<span>让时光，长成花。</span></h1>
        <p className="overlay__description">循着石径，走进风与花的日常。<br />在树影间漫步，让目光停留片刻。</p>
        <button className="overlay__enter" onClick={onEnter} tabIndex={visible ? 0 : -1}>
          走进花园 <span aria-hidden="true">↗</span>
        </button>
        <div className="overlay__keys">
          <span><kbd>W A S D</kbd> 漫步</span>
          <span><kbd>鼠标</kbd> 环顾</span>
          <span><kbd>Shift</kbd> 快步</span>
          <span><kbd>Esc</kbd> 暂停</span>
        </div>
      </section>
      <div className="overlay__footer"><span>光落在叶上，风经过花间。</span><span>自由漫步 · 自然生长</span></div>
    </div>
  );
}
