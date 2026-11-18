import { useFrame } from '@react-three/fiber';
import { Object3D, Vector3 } from 'three';
import { BELT, BODIES, BODY } from '../data/world';
import { projects } from '../data/content';
import { autopilotTo, flyToProject, nextTarget, ship } from '../game/sim';
import { Icon } from './Icon';
import { useGame } from '../game/store';

/**
 * All world-anchored labels live in ONE plain DOM layer. A single frame callback
 * projects their anchors and writes a transform only when it changes. This replaces
 * ~16 drei <Html> portals (each its own React root, repositioned every frame).
 */

/** Moon meshes of the Project System, registered by the scene, in project order. */
export const moonAnchors: (Object3D | null)[] = [];

type Entry = { el: HTMLElement | null; last: string; w: number };
const entries = new Map<string, Entry>();
const reg = (key: string) => (el: HTMLElement | null) => {
  entries.set(key, { el, last: '', w: el?.offsetWidth ?? 0 });
};

export function Labels() {
  const unlocked = useGame((s) => s.arcadeUnlocked);
  const intro = useGame((s) => s.phase === 'intro');
  return (
    // While the intro card covers the sky, its labels are out of the tab order.
    <div className="labels" inert={intro}>
      {BODIES.map((b) => {
        const locked = b.id === 'arcade' && !unlocked;
        return (
          <button
            key={b.id}
            ref={reg(`b:${b.id}`)}
            className={`planet-label${locked ? ' locked' : ''}`}
            onClick={() => autopilotTo(b.id)}
          >
            <span className="pl-name">{locked ? '??? Locked' : b.name}</span>
            <span className="pl-sub">{locked ? 'Clear the Asteroid Run' : b.subtitle}</span>
          </button>
        );
      })}
      {BODY.projects.moons!.map((m, i) => (
        <button key={m.name} ref={reg(`m:${i}`)} className="moon-label" onClick={() => flyToProject(projects[i].id)}>
          {m.name}
        </button>
      ))}
      <div ref={reg('belt')} className="belt-sign">
        <strong>
          <Icon name="alert" /> Asteroid Run
        </strong>
        <span>Fly through the lit gate in 30s to reveal what&apos;s hiding behind it</span>
      </div>
    </div>
  );
}

const v = new Vector3();
const beltAnchor = new Vector3(BELT.center.x, BELT.center.y + BELT.half.y + 20, BELT.center.z + BELT.half.z);

export function LabelSync() {
  useFrame(({ camera, size }) => {
    const g = useGame.getState();
    const target = g.autopilot ?? nextTarget();
    const place = (key: string, show: boolean, world: Vector3) => {
      const e = entries.get(key);
      if (!e?.el) return;
      let css = '';
      if (show) {
        v.copy(world).project(camera);
        const x = (v.x * 0.5 + 0.5) * size.width;
        const y = (-v.y * 0.5 + 0.5) * size.height;
        if (!e.w) e.w = e.el.offsetWidth;
        // Only show a label that fits whole on screen; never a half-cut one.
        const half = e.w / 2 + 8;
        if (v.z < 1 && x > half && x < size.width - half && y > 24 && y < size.height - 24) {
          css = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
        }
      }
      if (css === e.last) return;
      e.last = css;
      e.el.style.visibility = css ? 'visible' : 'hidden';
      if (css) e.el.style.transform = css;
    };

    for (const b of BODIES) {
      const show =
        g.dockedId !== b.id &&
        (g.phase === 'intro' || target === b.id || ship.pos.distanceTo(b.vec) < b.radius * 4 + 380);
      place(`b:${b.id}`, show, v.set(0, b.radius + (b.kind === 'planet' ? 16 : 10), 0).add(b.vec));
    }

    const nearProjects = g.dockedId !== 'projects' && ship.pos.distanceTo(BODY.projects.vec) < 520;
    moonAnchors.forEach((m, i) => {
      if (!m) return;
      m.getWorldPosition(v);
      v.y += m.scale.y + 3;
      place(`m:${i}`, nearProjects, v);
    });

    place('belt', g.beltNear && !g.belt.active && g.phase === 'flying' && !g.arcadeUnlocked, beltAnchor);
  });
  return null;
}
