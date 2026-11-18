import { Vector3 } from 'three';
import { education, projects, skills } from './content';

export type SectionId = 'home' | 'education' | 'skills' | 'projects' | 'arcade' | 'contact';

export interface Moon {
  name: string;
  dist: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
  tilt: number;
}

export interface Body {
  id: SectionId;
  name: string;
  subtitle: string;
  kind: 'station' | 'planet' | 'beacon' | 'arcade';
  style?: 'ocean' | 'rocky' | 'gas';
  pos: [number, number, number];
  vec: Vector3;
  radius: number;
  colors: string[];
  atmosphere?: string;
  rings?: { inner: number; outer: number; color: string }[];
  moons?: Moon[];
  moonLabels?: boolean;
  /** Real model (public/models). `size` = radius of its main body in model units. */
  model?: { file: string; size: number; coreOnly?: boolean; animate?: boolean; scale?: number };
  seed: number;
}

const b = (body: Omit<Body, 'vec'>): Body => ({ ...body, vec: new Vector3(...body.pos) });

export const BODIES: Body[] = [
  b({
    id: 'home',
    name: 'Launch Station',
    subtitle: 'Home · About',
    kind: 'station',
    pos: [0, 0, 0],
    radius: 24,
    colors: [],
    model: { file: 'station.glb', size: 8.7, animate: true, scale: 1.15 },
    seed: 1,
  }),
  b({
    id: 'education',
    name: 'Academy',
    subtitle: 'Education',
    kind: 'planet',
    style: 'ocean',
    pos: [-140, 20, -320],
    radius: 42,
    colors: ['#123a6b', '#1f6aa5', '#e8d8a8', '#5aa469', '#3d7a4a', '#8a8f7a', '#f2f2f2'],
    atmosphere: '#6cc3ff',
    model: { file: 'earth.glb', size: 1 },
    moons: education.map((e, i) => ({
      name: e.level,
      dist: 64 + i * 13,
      size: 6 - i,
      color: ['#d9e4ff', '#b8c6e6', '#9aa4c7'][i],
      speed: 0.12 - i * 0.025,
      phase: i * 2.1,
      tilt: 0.2 + i * 0.15,
    })),
    seed: 7,
  }),
  b({
    id: 'skills',
    name: 'Forge',
    subtitle: 'Skills',
    kind: 'planet',
    style: 'rocky',
    pos: [180, -25, -640],
    radius: 52,
    colors: ['#2b1a1a', '#4a2b23', '#6b3a2a', '#9c4a2c', '#d5702f', '#ffb45a'],
    atmosphere: '#ff7a3c',
    model: { file: 'theia-e-red.glb', size: 150, coreOnly: true },
    rings: skills.map((s, i) => ({ inner: 72 + i * 6, outer: 74.2 + i * 6, color: s.color })),
    seed: 21,
  }),
  b({
    id: 'projects',
    name: 'Project System',
    subtitle: `Projects · ${projects.length} moons`,
    kind: 'planet',
    style: 'gas',
    pos: [-160, 30, -1020],
    radius: 78,
    colors: ['#2b3440', '#3d4a57', '#6c7a86', '#a7a59b', '#cbbfa6', '#55606b'],
    atmosphere: '#9fd6ff',
    model: { file: 'theia-c.glb', size: 13.1, coreOnly: true, animate: true },
    moons: projects.map((p, i) => ({
      name: p.name,
      dist: 112 + i * 10,
      size: p.featured ? 7 : 4.5,
      color: p.color,
      speed: 0.09 - i * 0.007,
      phase: (i / projects.length) * Math.PI * 2,
      tilt: (i % 3) * 0.12 - 0.12,
    })),
    moonLabels: true,
    seed: 42,
  }),
  b({
    id: 'arcade',
    name: 'Event Horizon',
    subtitle: 'Bonus · Arcade',
    kind: 'arcade',
    pos: [330, 40, -1530],
    radius: 22,
    model: { file: 'blackhole.glb', size: 21.6, animate: true, scale: 1.9 },
    colors: ['#ff5a1f', '#ece7dd'],
    seed: 99,
  }),
  b({
    id: 'contact',
    name: 'Comms Beacon',
    subtitle: 'Contact · Final stop',
    kind: 'beacon',
    pos: [0, 0, -1900],
    radius: 14,
    colors: ['#ff5a1f'],
    seed: 5,
  }),
];

export const BODY = Object.fromEntries(BODIES.map((x) => [x.id, x])) as Record<SectionId, Body>;

/** Main route in order. Arcade is optional and not part of it. */
export const ROUTE: SectionId[] = ['home', 'education', 'skills', 'projects', 'contact'];

/** Where the ship waits at the start: clamped under the station's docking arm. */
export const DOCK_BERTH = new Vector3(0, -7, -40);

/** Close enough to land: generous, so landing on a phone never needs precision. */
export const approachRadius = (body: Body) => body.radius * 2.4 + 45;

export const BELT = {
  center: new Vector3(120, 0, -1330),
  half: new Vector3(260, 60, 100),
  gate: new Vector3(120, 0, -1448),
  gateRadius: 16,
  duration: 30,
};

export const insideBelt = (p: Vector3, margin = 0) =>
  Math.abs(p.x - BELT.center.x) < BELT.half.x + margin &&
  Math.abs(p.y - BELT.center.y) < BELT.half.y + margin &&
  Math.abs(p.z - BELT.center.z) < BELT.half.z + margin;
