import { useEffect, useRef } from 'react';
import { BODY } from '../data/world';
import { autopilotTo, nextTarget, undock } from '../game/sim';
import { useGame } from '../game/store';
import { Icon } from './Icon';
import { SECTION_ICON, SectionBody } from './Sections';

/** Bottom sheet on phones, side panel on wider screens. */
export function Panel() {
  const panel = useGame((s) => s.panel);
  const dockedId = useGame((s) => s.dockedId);
  useGame((s) => s.visited); // re-render "next stop" when visits change
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Move focus into the panel so keyboard and screen-reader users land on it.
    if (panel) heading.current?.focus({ preventScroll: true });
  }, [panel]);

  if (!panel) return null;
  const body = BODY[panel];
  const docked = dockedId === panel;
  const nxt = nextTarget();

  const onDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !sheet.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = () => {
    if (!drag.current || !sheet.current) return;
    const close = drag.current.dy > 90;
    sheet.current.style.transform = '';
    drag.current = null;
    if (close) undock();
  };

  return (
    <aside className="panel glass" ref={sheet} key={panel} aria-labelledby="panel-title">
      <div className="grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <span />
      </div>
      <header className="panel-head">
        <span className="tile big-tile">
          <Icon name={SECTION_ICON[panel]} />
        </span>
        <div className="panel-title">
          <h2 id="panel-title" ref={heading} tabIndex={-1}>
            {body.name}
          </h2>
          <p className="meta">{docked ? `Landed · ${body.subtitle}` : body.subtitle}</p>
        </div>
        <button className="icon-btn" onClick={undock} aria-label={docked ? 'Take off' : 'Close'}>
          <Icon name={docked ? 'takeoff' : 'close'} />
        </button>
      </header>
      <div className="panel-body">
        <SectionBody id={panel} docked={docked} />
      </div>
      <footer className="panel-foot">
        {nxt && nxt !== panel ? (
          <button className="btn" onClick={() => autopilotTo(nxt)}>
            Next stop: {BODY[nxt].name} <Icon name="arrow" />
          </button>
        ) : (
          <button className="btn ghost" onClick={undock}>
            {docked ? 'Take off and explore' : 'Back to the ship'}
          </button>
        )}
      </footer>
    </aside>
  );
}
