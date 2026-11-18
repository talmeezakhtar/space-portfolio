import { useEffect, useState } from 'react';
import { oldSite, profile } from '../data/content';
import { useGame } from '../game/store';
import { Icon } from './Icon';

/**
 * First screen after the loader: a title over the live scene (same composition as
 * the share image). The flight guide sits behind "How to fly" and opens beside it.
 * Lives in the first, tiny bundle so it shows at once; the 3D scene fades in behind.
 */
const go = (then?: () => void) =>
  import('../game/sim').then((m) => {
    m.launch();
    then?.();
  });

function FlightGuide({ touch, onClose }: { touch: boolean; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="guide glass" role="dialog" aria-label="How to fly" id="flight-guide">
      <div className="guide-head">
        <h2>How to fly</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close how to fly" autoFocus>
          <Icon name="close" />
        </button>
      </div>
      <p className="guide-copy">
        This portfolio is a small solar system. Land on a planet to open its section: about me, education, skills,
        projects and contact. Clear the asteroid run to find a secret.
      </p>
      <ul className="intro-controls">
        {touch ? (
          <>
            <li>
              <Icon name="move" /> <span><b>Drag</b> anywhere to steer</span>
            </li>
            <li>
              <Icon name="bolt" /> <span>Hold <b>Boost</b> to speed up</span>
            </li>
            <li>
              <Icon name="target" /> <span>Tap a <b>planet</b> to autopilot, or fly into it to land</span>
            </li>
          </>
        ) : (
          <>
            <li>
              <Icon name="move" /> <span><kbd>WASD</kbd> or drag to steer</span>
            </li>
            <li>
              <Icon name="bolt" /> <span><kbd>Shift</kbd> boost · <kbd>E</kbd> land</span>
            </li>
            <li>
              <Icon name="target" /> <span><kbd>M</kbd> map · click a planet to autopilot, or fly into it</span>
            </li>
          </>
        )}
      </ul>
      <a className="link small hurry" href={oldSite} target="_blank" rel="noopener noreferrer">
        <Icon name="history" /> In a hurry? See my classic portfolio
      </a>
    </div>
  );
}

export function Intro() {
  const phase = useGame((s) => s.phase);
  const touch = useGame((s) => s.touch);
  const visited = useGame((s) => s.visited);
  const set = useGame((s) => s.set);
  const [guide, setGuide] = useState(false);
  if (phase !== 'intro') return null;
  const returning = visited.length > 1;
  return (
    <div className="intro">
      <div className="hero">
        <p className="status hero-status">
          <span className="dot" /> Available for internships, freelance and collaborations
        </p>
        <h1>{profile.name}</h1>
        <p className="hero-role">{profile.role}</p>
        <p className="hero-stack num">React · Next.js · NestJS · PostgreSQL</p>
        <div className="hero-actions">
          <button className="btn big" onClick={() => go()} autoFocus>
            <Icon name="rocket" /> {returning ? 'Resume flight' : 'Fly through my portfolio'}
          </button>
          <button className="btn ghost big" onClick={() => go(() => set({ mapOpen: true }))}>
            <Icon name="map" /> Quick tour
          </button>
        </div>
        <div className="hero-links">
          <button className="link" onClick={() => setGuide((g) => !g)} aria-expanded={guide} aria-controls="flight-guide">
            <Icon name="help" /> How to fly
          </button>
          <a className="link" href={oldSite} target="_blank" rel="noopener noreferrer">
            <Icon name="history" /> In a hurry? Classic portfolio
          </a>
        </div>
      </div>
      {guide && <FlightGuide touch={touch} onClose={() => setGuide(false)} />}
    </div>
  );
}
