import { useEffect } from 'react';
import { clearKeys, keyDown, keyUp } from './game/input';
import { useGame } from './game/store';
import { Scene } from './scene/Scene';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { oldSite } from './data/content';
import { HUD } from './ui/HUD';
import { Labels } from './ui/Labels';
import { Panel } from './ui/Panel';
import { StarMap } from './ui/StarMap';

const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** If the 3D scene cannot run on this device, say so and offer the plain pages. */
function SceneFailed() {
  return (
    <div className="scene-failed">
      <p>The 3D scene could not start on this device.</p>
      <div className="row">
        <a className="btn" href="/classic/">
          Read the plain version
        </a>
        <a className="btn ghost" href={oldSite} target="_blank" rel="noopener noreferrer">
          Classic portfolio
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const tier = useGame((s) => s.tier);
  const touch = useGame((s) => s.touch);
  const photo = useGame((s) => s.photo);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const inUi = e.target instanceof HTMLElement && e.target.closest('.panel, .map, .help, .intro');
      if (GAME_KEYS.has(e.code) && !inUi) e.preventDefault();
      keyDown(e.code);
    };
    const up = (e: KeyboardEvent) => keyUp(e.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  return (
    <div className={`app tier-${tier}${touch ? ' is-touch' : ''}${photo ? ' photo' : ''}`}>
      <ErrorBoundary fallback={<SceneFailed />}>
        <Scene />
      </ErrorBoundary>
      <Labels />
      <HUD />
      <Panel />
      <StarMap />
    </div>
  );
}
