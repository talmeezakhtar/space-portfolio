import { useMemo } from 'react';
import { BELT, BODIES, BODY, ROUTE, type SectionId } from '../data/world';
import { autopilotTo, nextTarget, ship } from '../game/sim';
import { useGame } from '../game/store';
import { Icon } from './Icon';
import { SECTION_ICON } from './Sections';

// Top-down chart of the system (x → right, -z → up).
const X0 = -360;
const X1 = 560;
const Z0 = 140;
const Z1 = -2140;
const W = 340;
const H = 600;
const mx = (x: number) => ((x - X0) / (X1 - X0)) * W;
const my = (z: number) => ((Z0 - z) / (Z0 - Z1)) * H;

/** Map look per stop: surface colours for the shaded disc. */
const LOOK: Record<SectionId, { a: string; b: string }> = {
  home: { a: '#c9ccc6', b: '#5d625e' },
  education: { a: '#7fb6e8', b: '#1d4f86' },
  skills: { a: '#e08a5c', b: '#6b2414' },
  projects: { a: '#a9c4b8', b: '#2f4a46' },
  arcade: { a: '#1a1410', b: '#000000' },
  contact: { a: '#d8efe6', b: '#5f8a7c' },
};

const fmt = (d: number) => (d >= 1000 ? `${(d / 1000).toFixed(1)}k m` : `${Math.round(d)} m`);

export function StarMap() {
  const open = useGame((s) => s.mapOpen);
  const visited = useGame((s) => s.visited);
  const unlocked = useGame((s) => s.arcadeUnlocked);
  const set = useGame((s) => s.set);

  // Background stars and asteroid specks: fixed per session.
  const stars = useMemo(
    () => Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 0.9 + 0.2, o: Math.random() * 0.6 + 0.2 })),
    [],
  );
  const rocks = useMemo(
    () =>
      Array.from({ length: 70 }, () => ({
        x: mx(BELT.center.x + (Math.random() * 2 - 1) * BELT.half.x),
        y: my(BELT.center.z + (Math.random() * 2 - 1) * BELT.half.z),
        r: Math.random() * 1.6 + 0.5,
      })),
    [],
  );

  if (!open) return null;
  const next = nextTarget();
  // A smooth curve through the route (Catmull-Rom as cubic Béziers).
  const pts = ROUTE.map((id) => [mx(BODY[id].pos[0]), my(BODY[id].pos[2])] as const);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  const dist = (id: SectionId) => Math.max(0, ship.pos.distanceTo(BODY[id].vec) - BODY[id].radius);
  const stops: SectionId[] = ['home', 'education', 'skills', 'projects', 'arcade', 'contact'];

  return (
    <div className="overlay" onClick={() => set({ mapOpen: false })}>
      <div className="map glass" role="dialog" aria-modal="true" aria-label="Star map" onClick={(e) => e.stopPropagation()}>
        <header className="panel-head">
          <span className="tile big-tile">
            <Icon name="map" />
          </span>
          <div className="panel-title">
            <h2>Star map</h2>
            <p className="meta">Pick a stop and the ship flies itself there.</p>
          </div>
          <button className="icon-btn" onClick={() => set({ mapOpen: false })} aria-label="Close map" autoFocus>
            <Icon name="close" />
          </button>
        </header>

        <div className="map-scroll">
          <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" role="img" aria-label="Chart of the system with the route and your ship">
            <defs>
              <radialGradient id="mg-space" cx="50%" cy="40%" r="75%">
                <stop offset="0" stopColor="#1b2422" />
                <stop offset="1" stopColor="#0a0e0d" />
              </radialGradient>
              {BODIES.map((b) => (
                <radialGradient key={b.id} id={`mg-${b.id}`} cx="35%" cy="32%" r="75%">
                  <stop offset="0" stopColor={LOOK[b.id].a} />
                  <stop offset="1" stopColor={LOOK[b.id].b} />
                </radialGradient>
              ))}
              <radialGradient id="mg-glow">
                <stop offset="0" stopColor="#e3e2da" stopOpacity=".28" />
                <stop offset="1" stopColor="#e3e2da" stopOpacity="0" />
              </radialGradient>
              <pattern id="mg-grid" width="34" height="34" patternUnits="userSpaceOnUse">
                <path d="M34 0H0V34" fill="none" stroke="rgba(227,226,218,.05)" />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="url(#mg-space)" />
            <rect width={W} height={H} fill="url(#mg-grid)" />
            {stars.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#e3e2da" opacity={s.o} />
            ))}

            {/* asteroid field */}
            <g opacity=".8">
              {rocks.map((r, i) => (
                <circle key={i} cx={r.x} cy={r.y} r={r.r} fill="#8e8a82" />
              ))}
              <text x={mx(BELT.center.x + BELT.half.x) - 4} y={my(BELT.center.z + BELT.half.z) - 6} className="map-note" textAnchor="end">
                Asteroid run
              </text>
            </g>

            {/* route */}
            <path d={d} fill="none" stroke="rgba(227,226,218,.1)" strokeWidth="7" strokeLinecap="round" />
            <path d={d} fill="none" stroke="rgba(159,199,184,.6)" strokeWidth="1.4" strokeDasharray="3 6" strokeLinecap="round" />

            {BODIES.map((b) => {
              const locked = b.id === 'arcade' && !unlocked;
              const seen = visited.includes(b.id);
              const r = Math.max(8, b.radius / 3.6);
              const isNext = b.id === next;
              return (
                <g
                  key={b.id}
                  className={`map-node${locked ? ' locked' : ''}`}
                  transform={`translate(${mx(b.pos[0])},${my(b.pos[2])})`}
                  onClick={() => autopilotTo(b.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Fly to ${locked ? 'the locked stop' : b.name}`}
                  onKeyDown={(e) => e.key === 'Enter' && autopilotTo(b.id)}
                >
                  <circle r={r + 18} fill="transparent" />
                  <circle r={r * 2.2} fill="url(#mg-glow)" />
                  {isNext && <circle r={r + 7} className="pulse" />}
                  {b.id === 'skills' && (
                    <ellipse rx={r * 1.9} ry={r * 0.55} fill="none" stroke="rgba(216,195,160,.65)" strokeWidth="1.2" transform="rotate(-18)" />
                  )}
                  {b.id === 'arcade' && !locked ? (
                    <>
                      <ellipse rx={r * 1.7} ry={r * 0.6} fill="none" stroke="#ff9a4a" strokeWidth="2" opacity=".85" transform="rotate(20)" />
                      <circle r={r * 0.7} fill="#000" stroke="#ffd2a0" strokeWidth="1" />
                    </>
                  ) : b.id === 'contact' ? (
                    <>
                      <circle r={r * 0.95} fill="none" stroke={LOOK.contact.a} strokeWidth="1.2" />
                      <circle r={r * 0.4} fill={LOOK.contact.a} />
                    </>
                  ) : (
                    <circle
                      r={r}
                      fill={locked ? '#14100d' : `url(#mg-${b.id})`}
                      stroke={locked ? 'rgba(227,226,218,.35)' : 'none'}
                      strokeDasharray={locked ? '2 3' : undefined}
                    />
                  )}
                  {b.id === 'projects' &&
                    b.moons!.map((m, i) => {
                      const a = (i / b.moons!.length) * Math.PI * 2;
                      return <circle key={m.name} cx={Math.cos(a) * (r + 7)} cy={Math.sin(a) * (r + 7)} r="1.9" fill={m.color} />;
                    })}
                  {seen && !locked && (
                    <g transform={`translate(${r * 0.78},${-r * 0.78})`}>
                      <circle r="5.5" fill="#9fc7b8" />
                      <path d="M-2.5 0 -0.5 2 2.8 -1.8" fill="none" stroke="#161c1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}
                  <text y={r + 15} className="map-name">
                    {locked ? '???' : b.name}
                  </text>
                  <text y={r + 27} className="map-sub">
                    {locked ? 'Locked' : b.subtitle.split(' · ')[0]}
                  </text>
                </g>
              );
            })}

            {/* your ship, with a heading cone */}
            <g transform={`translate(${mx(ship.pos.x)},${my(ship.pos.z)}) rotate(${(-ship.yaw * 180) / Math.PI})`} className="map-ship">
              <path d="M0,0 L-14,-40 A42,42 0 0 1 14,-40 Z" fill="rgba(159,199,184,.14)" />
              <circle r="9" fill="rgba(159,199,184,.18)" />
              <path d="M0,-7 L4.5,5 L0,2.5 L-4.5,5 Z" fill="#e3e2da" />
            </g>

            {/* scale bar */}
            <g transform="translate(14,22)" className="map-scale">
              <line x1="0" x2={mx(500) - mx(0)} y1="0" y2="0" />
              <text y="-6">500 m</text>
            </g>
          </svg>

          <ul className="map-list">
            {stops.map((id) => {
              const b = BODY[id];
              const locked = id === 'arcade' && !unlocked;
              const seen = visited.includes(id);
              return (
                <li key={id}>
                  <button className={`map-row${id === next ? ' next' : ''}`} onClick={() => autopilotTo(id)} disabled={locked}>
                    <span className="tile">
                      <Icon name={locked ? 'alert' : SECTION_ICON[id]} />
                    </span>
                    <span className="map-row-text">
                      <b>{locked ? 'Locked stop' : b.name}</b>
                      <span>{locked ? 'Clear the Asteroid Run to reveal it' : b.subtitle}</span>
                    </span>
                    <span className="map-row-meta num">{seen && !locked ? 'Visited' : fmt(dist(id))}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
