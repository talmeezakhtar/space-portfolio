import { useEffect, useRef, useState } from 'react';
import { contact, oldSite } from '../data/content';
import { BODY, ROUTE } from '../data/world';
import { input } from '../game/input';
import { dock, launch, LANDING_MS, setPhoto, undock } from '../game/sim';
import { PhotoBar } from './PhotoMode';
import { setSound } from '../game/audio';
import { useGame } from '../game/store';
import { Icon } from './Icon';
import { Credits } from './Credits';

function TopBar() {
  const visited = useGame((s) => s.visited);
  const set = useGame((s) => s.set);
  const phase = useGame((s) => s.phase);
  const seen = ROUTE.filter((r) => visited.includes(r)).length;
  return (
    <div className="topbar">
      <div className="brand glass">
        <span className="brand-name">TALMEEZ AKHTAR</span>
        <span className="brand-sub">
          Flight log · {seen}/{ROUTE.length} stops
        </span>
        <span className="pips">
          {ROUTE.map((r) => (
            <i key={r} className={visited.includes(r) ? 'on' : ''} title={BODY[r].name} />
          ))}
        </span>
        {phase === 'flying' && (
          <span className="gauges" aria-hidden>
            <span className="gauge">
              <i id="hud-speed" />
            </span>
            <span className="gauge energy">
              <i id="hud-energy" />
            </span>
          </span>
        )}
      </div>
      <nav className="actions">
        <button className="hud-btn glass" onClick={() => set({ mapOpen: true })} aria-label="Star map">
          <Icon name="map" />
          <span className="txt">Map</span>
        </button>
        <a className="hud-btn glass" href={contact.resume} target="_blank" rel="noopener noreferrer" aria-label="Résumé">
          <Icon name="file" />
          <span className="txt">Résumé</span>
        </a>
        <button className="hud-btn glass" onClick={() => set({ panel: 'contact' })} aria-label="Contact">
          <Icon name="mail" />
          <span className="txt">Contact</span>
        </button>
        <SoundToggle />
        <button className="hud-btn glass" onClick={() => setPhoto(true)} aria-label="Photo mode">
          <Icon name="camera" />
        </button>
        <button className="hud-btn glass" onClick={() => set({ helpOpen: true })} aria-label="Help">
          <span className="ico">?</span>
        </button>
      </nav>
    </div>
  );
}

function SoundToggle() {
  const sound = useGame((s) => s.sound);
  const set = useGame((s) => s.set);
  useEffect(() => {
    if (!sound) return;
    // Browsers only start audio after a gesture: resume on the first tap or key.
    const go = () => setSound(true);
    window.addEventListener('pointerdown', go, { once: true });
    window.addEventListener('keydown', go, { once: true });
    return () => {
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
    };
  }, [sound]);
  const toggle = () => {
    setSound(!sound);
    set({ sound: !sound });
  };
  return (
    <button className="hud-btn glass" onClick={toggle} aria-label={sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={sound}>
      <Icon name={sound ? 'sound' : 'mute'} />
    </button>
  );
}

function LandingHud() {
  const landing = useGame((s) => s.landing);
  const id = useGame((s) => s.dockedId);
  if (!landing || !id) return null;
  return (
    <div className="landing glass" role="status">
      <span>
        Docking with <b>{BODY[id].name}</b>
      </span>
      <span className="landing-bar" style={{ '--dur': `${LANDING_MS}ms` } as React.CSSProperties}>
        <i />
      </span>
    </div>
  );
}

function Waypoint() {
  return (
    <div id="hud-wp" className="waypoint" aria-hidden>
      <span id="hud-wp-arrow" className="wp-arrow">
        <Icon name="pointer" className="icon wp-arrow-svg" />
      </span>
      <span className="wp-diamond" />
      <span className="wp-text">
        <b id="hud-wp-name" />
        <span id="hud-wp-dist" />
      </span>
    </div>
  );
}

function BeltHud() {
  const belt = useGame((s) => s.belt);
  if (!belt.active) return null;
  return (
    <div className="belt-hud glass">
      <span>Asteroid run</span>
      <b className={belt.time < 8 ? 'warn' : ''}>{Math.ceil(belt.time)}s</b>
      <span className="hull">
        <i style={{ transform: `scaleX(${belt.hull / 100})` }} />
      </span>
    </div>
  );
}

function AutopilotBadge() {
  const auto = useGame((s) => s.autopilot);
  const set = useGame((s) => s.set);
  const touch = useGame((s) => s.touch);
  if (!auto) return null;
  return (
    <div className="autopilot glass">
      <span>
        Autopilot to <b>{BODY[auto].name}</b>
      </span>
      <button className="link" onClick={() => set({ autopilot: null })}>
        {touch ? 'Take control' : 'Take control (steer)'}
      </button>
    </div>
  );
}

function LandPrompt() {
  const near = useGame((s) => s.nearId);
  const phase = useGame((s) => s.phase);
  const touch = useGame((s) => s.touch);
  const unlocked = useGame((s) => s.arcadeUnlocked);
  const panel = useGame((s) => s.panel);
  if (!near || phase !== 'flying' || panel) return null;
  const locked = near === 'arcade' && !unlocked;
  return (
    <button className={`land-btn${locked ? ' locked' : ''}`} onClick={() => dock(near)}>
      {locked ? 'Locked: clear the Asteroid Run first' : `Land on ${BODY[near].name}`}
      {!touch && !locked && <kbd>E</kbd>}
    </button>
  );
}

/** Floating thumbstick (any touch/drag on the canvas) + hold buttons. */
function TouchControls() {
  const phase = useGame((s) => s.phase);
  const touch = useGame((s) => s.touch);
  const beltNear = useGame((s) => s.beltNear);
  const beltActive = useGame((s) => s.belt.active);
  const panelOpen = useGame((s) => !!s.panel);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let id: number | null = null;
    let ox = 0;
    let oy = 0;
    const R = 56;
    const down = (e: PointerEvent) => {
      if (id !== null || !(e.target instanceof HTMLCanvasElement)) return;
      if (useGame.getState().phase !== 'flying' || useGame.getState().photo) return;
      id = e.pointerId;
      ox = e.clientX;
      oy = e.clientY;
      // Capture so the release is always seen, even off-window or over a label.
      e.target.setPointerCapture(e.pointerId);
      if (base.current) base.current.style.transform = `translate(${ox}px, ${oy}px)`;
      if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
      setActive(true);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox;
      let dy = e.clientY - oy;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      const dead = 6;
      input.stickX = len < dead ? 0 : dx / R;
      input.stickY = len < dead ? 0 : -dy / R;
      if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const reset = () => {
      id = null;
      input.stickX = input.stickY = 0;
      setActive(false);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === id) reset();
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('lostpointercapture', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('lostpointercapture', up);
      window.removeEventListener('blur', reset);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);

  const hold = (key: 'boost' | 'fire') => ({
    onPointerDown: (e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      input[key] = true;
    },
    onPointerUp: () => (input[key] = false),
    onPointerCancel: () => (input[key] = false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <>
      <div ref={base} className={`stick${active ? ' on' : ''}`} aria-hidden>
        <div ref={knob} className="knob" />
      </div>
      {touch && phase === 'flying' && !panelOpen && (
        <div className="hold-btns">
          {(beltNear || beltActive) && (
            <button className="hold fire" {...hold('fire')}>
              Fire
            </button>
          )}
          <button className="hold boost" {...hold('boost')}>
            Boost
          </button>
        </div>
      )}
    </>
  );
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast glass">
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Help() {
  const open = useGame((s) => s.helpOpen);
  const set = useGame((s) => s.set);
  if (!open) return null;
  return (
    <div className="overlay" onClick={() => set({ helpOpen: false })}>
      <div className="help glass" role="dialog" aria-modal="true" aria-label="How to fly" onClick={(e) => e.stopPropagation()}>
        <header className="panel-head">
          <div>
            <h2>How to fly</h2>
          </div>
          <button className="icon-btn" onClick={() => set({ helpOpen: false })} aria-label="Close help" autoFocus>
            <Icon name="close" />
          </button>
        </header>
        <div className="help-grid">
          <section>
            <h3>Phone</h3>
            <ul>
              <li>Drag anywhere to steer: a thumbstick appears under your thumb</li>
              <li>Hold <b>Boost</b> to go fast</li>
              <li>Tap <b>Land</b> near a planet, or simply fly into it</li>
              <li>Tap a planet name or open the <b>Map</b> to autopilot there</li>
              <li>Tap a project moon to fly to that project</li>
              <li>The camera button opens photo mode; the speaker turns sound on</li>
            </ul>
          </section>
          <section>
            <h3>Keyboard</h3>
            <ul>
              <li>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> / arrows, or drag with the mouse, to steer
              </li>
              <li>
                <kbd>Shift</kbd> boost · <kbd>Space</kbd> fire
              </li>
              <li>
                <kbd>E</kbd> land · <kbd>M</kbd> map · <kbd>Esc</kbd> close
              </li>
            </ul>
          </section>
        </div>
        <p className="muted small">
          Route: Launch Station, Academy, Forge, Project System, then the Comms Beacon. The ship cruises on its own. Hidden in
          the asteroid field is something secret.
        </p>
        <p className="help-links">
          <a className="link" href={oldSite} target="_blank" rel="noopener noreferrer">
            <Icon name="history" /> Classic portfolio
          </a>
          <a className="link" href="/classic/">
            <Icon name="file" /> Plain text version
          </a>
        </p>
        <Credits />
      </div>
    </div>
  );
}


function Keyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState();
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'KeyM') s.set({ mapOpen: !s.mapOpen, helpOpen: false });
      if (e.code === 'KeyH') s.set({ helpOpen: !s.helpOpen });
      if (e.code === 'KeyE' && s.phase === 'flying' && s.nearId) dock(s.nearId);
      if (e.code === 'Enter' && s.phase === 'intro') launch();
      if (e.code === 'Escape') {
        if (s.mapOpen || s.helpOpen) s.set({ mapOpen: false, helpOpen: false });
        else if (s.panel) undock();
        else if (s.autopilot) s.set({ autopilot: null });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}

export function HUD() {
  const phase = useGame((s) => s.phase);
  return (
    <>
      <Keyboard />
      {phase !== 'intro' && <TopBar />}
      <Waypoint />
      <BeltHud />
      <AutopilotBadge />
      <LandPrompt />
      <LandingHud />
      <PhotoBar />
      <TouchControls />
      <Toasts />
      <Help />
    </>
  );
}

