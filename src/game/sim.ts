import { Euler, MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { BELT, BODIES, BODY, DOCK_BERTH, ROUTE, approachRadius, type SectionId } from '../data/world';
import { input, steer } from './input';
import { useGame } from './store';
import * as audio from './audio';
import { award, checkRoute } from './achievements';

/* ------------------------------------------------------------------ */
/* Ship state (mutable, read every frame by scene + HUD)               */
/* ------------------------------------------------------------------ */

const start = DOCK_BERTH.clone();
const startDir = BODY.education.vec.clone().sub(start).normalize();

export const ship = {
  pos: start.clone(),
  vel: new Vector3(),
  forward: new Vector3(0, 0, -1),
  quat: new Quaternion(),
  yaw: Math.atan2(-startDir.x, -startDir.z),
  pitch: 0,
  roll: 0,
  yawRate: 0,
  pitchRate: 0,
  speed: 0,
  energy: 1,
  boosting: false,
  invuln: 0,
  /** Stop we just took off from: no auto-landing on it until we are clear of it. */
  leftId: null as SectionId | null,
  dock: null as null | { point: Vector3; cam: Vector3; look: Vector3; from: Vector3; t0: number; dur: number },
};

export const CRUISE = 32;
export const LANDING_MS = 2400;
export const BOOST = 95;
export const AUTO_MAX = 170;

const clamp = MathUtils.clamp;
const damp = MathUtils.damp;
const tmp = new Vector3();
const tmp2 = new Vector3();
const euler = new Euler(0, 0, 0, 'YXZ');
const camQ = new Quaternion();
const camRel = new Vector3(0, 6, 30);
const lookRel = new Vector3(0, 0, -20);
const lookTarget = new Vector3();
const viewOffset = { x: 0, y: 0 };
let introT = 0;
/** Orbit camera for photo mode, steered by the photo controls. */
export const photoCam = { yaw: 0, pitch: 0.2, dist: 24, ready: false };
let inWarp = false;

/** 0..1 strength of the warp streaks: only on autopilot, only at high speed. */
export const warpLevel = () =>
  g().autopilot && g().phase === 'flying' ? clamp((ship.speed - 70) / (AUTO_MAX - 70), 0, 1) : 0;

export function forwardFrom(yaw: number, pitch: number, out: Vector3) {
  return out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
}
const yawTo = (d: Vector3) => Math.atan2(-d.x, -d.z);
const pitchTo = (d: Vector3) => Math.asin(clamp(d.y, -1, 1));
function angleDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

const g = () => useGame.getState();

export function nextTarget(): SectionId | null {
  const { visited } = g();
  return ROUTE.find((id) => !visited.includes(id)) ?? null;
}

function grabCameraContinuity(cam: PerspectiveCamera) {
  camRel.copy(cam.position).sub(ship.pos);
  lookRel.copy(lookTarget).sub(ship.pos);
}

let cameraRef: PerspectiveCamera | null = null;

export function launch() {
  const s = g();
  if (cameraRef) grabCameraContinuity(cameraRef);
  s.visit('home');
  s.set({ phase: 'flying', panel: null });
  ship.speed = 8;
  s.toast(s.touch ? 'Drag anywhere to steer · follow the marker' : 'Steer with WASD, arrows or mouse-drag · follow the marker');
}

export function dock(id: SectionId) {
  const s = g();
  const body = BODY[id];
  if (id === 'arcade' && !s.arcadeUnlocked) {
    s.toast("Locked. Clear the Asteroid Run to reveal what's hiding behind it.");
    return;
  }
  if (s.belt.active) s.set({ belt: { ...s.belt, active: false } });
  const dir = tmp.copy(ship.pos).sub(body.vec);
  if (dir.lengthSq() < 1) dir.set(0, 0, 1);
  dir.normalize();
  const portrait = (cameraRef?.aspect ?? 1) < 1;
  const up = new Vector3(0, 1, 0);
  const point = body.vec.clone().addScaledVector(dir, body.radius * 1.45 + 7);
  const camDist = body.radius * (portrait ? 6.2 : 3.1) + 10;
  const cam = body.vec.clone().addScaledVector(dir, camDist).addScaledVector(up, body.radius * 0.45 + 3);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  ship.dock = { point, cam, look: body.vec.clone(), from: ship.pos.clone(), t0: performance.now(), dur: reduced ? 700 : LANDING_MS };
  s.visit(id);
  s.set({ phase: 'docked', dockedId: id, panel: null, landing: true, autopilot: null, nearId: null, mapOpen: false });
  audio.clampClicks();
}

export function undock() {
  const s = g();
  if (s.phase !== 'docked') {
    s.set({ panel: null });
    return;
  }
  if (cameraRef) grabCameraContinuity(cameraRef);
  const nxt = nextTarget();
  const target = nxt ? BODY[nxt].vec : BODY.contact.vec;
  // Turn away from the planet towards the next stop.
  tmp.copy(target).sub(ship.pos).normalize();
  ship.yaw = yawTo(tmp);
  ship.pitch = clamp(pitchTo(tmp), -0.6, 0.6);
  ship.leftId = s.dockedId;
  ship.dock = null;
  ship.speed = 10;
  s.set({ phase: 'flying', dockedId: null, panel: null, landing: false });
}

/** Tap on a project moon: fly to the Project System and open on that project's card. */
export function flyToProject(projectId: string) {
  const s = g();
  s.set({ focusProject: projectId });
  if (s.phase === 'docked' && s.dockedId === 'projects') {
    s.set({ panel: 'projects' });
    return;
  }
  autopilotTo('projects');
}

export function setPhoto(on: boolean) {
  const s = g();
  if (on && s.phase === 'intro') return;
  if (on) s.set({ photo: true, autopilot: null, mapOpen: false, helpOpen: false });
  else {
    if (cameraRef) grabCameraContinuity(cameraRef);
    s.set({ photo: false });
  }
}

export function autopilotTo(id: SectionId) {
  const s = g();
  if (id === 'arcade' && !s.arcadeUnlocked) {
    s.toast("Locked. Clear the Asteroid Run to reveal what's hiding behind it.");
    return;
  }
  if (s.phase === 'intro') launch();
  if (g().phase === 'docked') {
    if (g().dockedId === id) {
      g().set({ mapOpen: false, panel: id });
      return;
    }
    undock();
  }
  g().set({ autopilot: id, mapOpen: false, panel: null });
}

/** Autopilot routes around the asteroid belt instead of through it. */
function autopilotWaypoint(target: Vector3): Vector3 {
  const zMin = BELT.center.z - BELT.half.z;
  const zMax = BELT.center.z + BELT.half.z;
  const crosses = (ship.pos.z > zMax && target.z < zMin) || (ship.pos.z < zMin && target.z > zMax);
  if (!crosses) return target;
  const side = target.x > BELT.center.x ? 1 : -1;
  return tmp2.set(BELT.center.x + side * (BELT.half.x + 90), 0, BELT.center.z);
}

/* ------------------------------------------------------------------ */
/* Per-frame simulation                                                */
/* ------------------------------------------------------------------ */

export function step(rawDt: number, cam: PerspectiveCamera, width: number, height: number) {
  cameraRef = cam;
  const dt = Math.min(rawDt, 0.05);
  const s = g();
  const portrait = width < height;

  if (s.photo) {
    // Photo mode: the ship holds still; the camera orbits it from photoCam.
    if (!photoCam.ready) {
      tmp.copy(cam.position).sub(ship.pos);
      photoCam.dist = clamp(tmp.length(), 12, 36);
      photoCam.yaw = Math.atan2(tmp.x, tmp.z);
      photoCam.pitch = Math.asin(clamp(tmp.y / photoCam.dist, -1, 1));
      photoCam.ready = true;
    }
    tmp.set(
      Math.sin(photoCam.yaw) * Math.cos(photoCam.pitch),
      Math.sin(photoCam.pitch),
      Math.cos(photoCam.yaw) * Math.cos(photoCam.pitch),
    );
    cam.position.copy(ship.pos).addScaledVector(tmp, photoCam.dist);
    cam.lookAt(ship.pos);
    applyViewOffset(cam, width, height, 0, 0, dt);
    return;
  }
  photoCam.ready = false;

  if (s.phase === 'intro') {
    introT += dt;
    // Slow orbit that keeps the station and the berthed ship in one frame.
    const a = Math.sin(introT * 0.07) * 0.55 - 0.9;
    const c = tmp.set(0, -4, -26);
    cam.position.set(c.x + Math.sin(a) * 58, 10 + Math.sin(introT * 0.3) * 2, c.z + Math.cos(a) * 58);
    lookTarget.copy(c);
    cam.lookAt(lookTarget);
    setFov(cam, portrait ? 74 : 56, dt);
    applyViewOffset(cam, width, height, width >= 900 ? -width * 0.16 : 0, portrait ? height * 0.24 : 0, dt);
    updateShipTransform();
    return;
  }

  if (s.phase === 'docked' && ship.dock) {
    const k = 1 - Math.exp(-2.5 * dt);
    // Landing: an eased glide from where we were to the berth, then clamps engage.
    const p = Math.min(1, (performance.now() - ship.dock.t0) / ship.dock.dur);
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    ship.pos.lerpVectors(ship.dock.from, ship.dock.point, e);
    if (p >= 1 && s.landing) {
      s.set({ landing: false, panel: s.dockedId });
      audio.chime();
      navigator.vibrate?.([20, 40, 20]);
      checkRoute();
      if (s.dockedId === 'arcade') award('horizon');
      if (s.dockedId === 'projects' && s.focusProject) award('moon');
    }
    ship.vel.set(0, 0, 0);
    ship.speed = damp(ship.speed, 0, 4, dt);
    tmp.copy(ship.dock.look).sub(ship.pos).normalize();
    ship.yaw += angleDiff(ship.yaw, yawTo(tmp)) * k;
    ship.pitch = damp(ship.pitch, pitchTo(tmp), 2.5, dt);
    ship.roll = damp(ship.roll, 0, 4, dt);
    ship.yawRate = ship.pitchRate = 0;
    forwardFrom(ship.yaw, ship.pitch, ship.forward);
    updateShipTransform();
    cam.position.lerp(ship.dock.cam, 1 - Math.exp(-2 * dt));
    lookTarget.lerp(ship.dock.look, 1 - Math.exp(-3 * dt));
    cam.lookAt(lookTarget);
    setFov(cam, portrait ? 70 : 55, dt);
    const sheet = width <= 760;
    applyViewOffset(cam, width, height, sheet ? 0 : Math.min(440, width * 0.45) / 2, sheet ? height * 0.3 : 0, dt);
    return;
  }

  /* ---------- flying ---------- */
  const st = steer();
  let tYaw = 0;
  let tPitch = 0;
  let targetSpeed = CRUISE;
  let speedRate = 1.8;

  if (s.autopilot && Math.hypot(st.x, st.y) > 0.35) {
    s.set({ autopilot: null });
    s.toast('Manual control');
  }

  const auto = g().autopilot;
  if (auto) {
    const body = BODY[auto];
    const wp = autopilotWaypoint(body.vec);
    tmp.copy(wp).sub(ship.pos);
    tmp.normalize();
    const dYaw = angleDiff(ship.yaw, yawTo(tmp));
    tYaw = clamp(dYaw * 2.6, -1.8, 1.8);
    tPitch = clamp((pitchTo(tmp) - ship.pitch) * 2.6, -1.3, 1.3);
    const bodyDist = ship.pos.distanceTo(body.vec);
    const aligned = Math.abs(dYaw) < 0.45;
    targetSpeed = aligned ? clamp((bodyDist - body.radius) * 0.5, 26, AUTO_MAX) : 22;
    speedRate = 1.3;
    if (bodyDist < body.radius * 1.8 + 22) {
      dock(auto);
      return;
    }
    ship.boosting = false;
  } else {
    const sx = st.x * (0.35 + 0.65 * Math.abs(st.x));
    const sy = st.y * (0.35 + 0.65 * Math.abs(st.y));
    tYaw = -sx * 1.5;
    tPitch = sy * 1.1;
    ship.boosting = input.boost && ship.energy > 0.02;
    if (ship.boosting) targetSpeed = BOOST;
    // Ease off near a stop so you glide into the landing zone instead of past it.
    else if (s.nearId) targetSpeed = 18;
  }

  ship.energy = clamp(ship.energy + (ship.boosting ? -0.32 : 0.16) * dt, 0, 1);
  ship.yawRate = damp(ship.yawRate, tYaw, 6, dt);
  ship.pitchRate = damp(ship.pitchRate, tPitch, 6, dt);
  ship.yaw += ship.yawRate * dt;
  ship.pitch = clamp(ship.pitch + ship.pitchRate * dt, -1.15, 1.15);
  if (!auto && Math.abs(st.y) < 0.05) ship.pitch = damp(ship.pitch, 0, 0.5, dt); // gentle auto-level
  ship.roll = damp(ship.roll, ship.yawRate * 0.55, 5, dt);
  forwardFrom(ship.yaw, ship.pitch, ship.forward);

  ship.speed = damp(ship.speed, targetSpeed, speedRate, dt);
  const warpNow = !!auto && ship.speed > 100;
  if (warpNow && !inWarp) audio.whoosh();
  inWarp = warpNow;
  tmp.copy(ship.forward).multiplyScalar(ship.speed);
  ship.vel.lerp(tmp, 1 - Math.exp(-3 * dt));

  // Gentle gravity near planets helps you line up for landing.
  if (!auto) {
    for (const body of BODIES) {
      if (body.kind === 'station') continue;
      tmp.copy(body.vec).sub(ship.pos);
      const d = tmp.length();
      const A = approachRadius(body);
      if (d < A) ship.vel.addScaledVector(tmp.normalize(), 7 * (1 - d / A) * dt);
    }
  }

  ship.pos.addScaledVector(ship.vel, dt);

  // Soft collisions with every body.
  for (const body of BODIES) {
    const minD = body.radius * (body.kind === 'planet' ? 1.1 : 1.0) + 3;
    tmp.copy(ship.pos).sub(body.vec);
    const d = tmp.length();
    if (d < minD && d > 0.001) {
      // Flying into a stop is the easiest way to land, especially with a thumb.
      if (!auto && s.phase === 'flying' && !s.landing && body.id !== ship.leftId && (body.id !== 'arcade' || s.arcadeUnlocked)) {
        dock(body.id);
        return;
      }
      tmp.divideScalar(d);
      ship.pos.copy(body.vec).addScaledVector(tmp, minD);
      const vn = ship.vel.dot(tmp);
      if (vn < 0) ship.vel.addScaledVector(tmp, -vn * 1.4);
    }
  }

  // Keep pilots inside the system.
  tmp.set(60, 0, -950);
  const fromCenter = ship.pos.distanceTo(tmp);
  if (fromCenter > 1900) ship.vel.addScaledVector(tmp.sub(ship.pos).normalize(), (fromCenter - 1900) * 0.05 * dt * 60);

  updateShipTransform();

  if (ship.leftId && ship.pos.distanceTo(BODY[ship.leftId].vec) > approachRadius(BODY[ship.leftId])) ship.leftId = null;

  // Which body are we close enough to land on?
  let near: SectionId | null = null;
  if (!auto) {
    let best = Infinity;
    for (const body of BODIES) {
      const d = ship.pos.distanceTo(body.vec);
      if (d < approachRadius(body) && d < best) {
        best = d;
        near = body.id;
      }
    }
  }
  if (near !== s.nearId) s.set({ nearId: near });

  // Chase camera: smooth the offset relative to the ship so it never lags at speed.
  euler.set(ship.pitch * 0.8, ship.yaw, 0, 'YXZ');
  camQ.setFromEuler(euler);
  // Camera sits high and looks far ahead, so the ship rides in the lower third
  // and never hides the destination.
  tmp.set(0, portrait ? 8.5 : 5.2, portrait ? 21 : 14).applyQuaternion(camQ);
  camRel.lerp(tmp, 1 - Math.exp(-5 * dt));
  cam.position.copy(ship.pos).add(camRel);
  tmp.copy(ship.forward).multiplyScalar(portrait ? 46 : 36);
  tmp.y += portrait ? 5 : 3.5;
  lookRel.lerp(tmp, 1 - Math.exp(-8 * dt));
  lookTarget.copy(ship.pos).add(lookRel);
  cam.lookAt(lookTarget);
  const base = portrait ? 72 : 58;
  setFov(cam, base + clamp((ship.speed - CRUISE) / (AUTO_MAX - CRUISE), 0, 1) * 20, dt);
  applyViewOffset(cam, width, height, 0, 0, dt);
}

function updateShipTransform() {
  euler.set(ship.pitch, ship.yaw, ship.roll, 'YXZ');
  ship.quat.setFromEuler(euler);
}

function setFov(cam: PerspectiveCamera, target: number, dt: number) {
  if (Math.abs(cam.fov - target) < 0.02) return;
  cam.fov = damp(cam.fov, target, 3, dt);
  cam.updateProjectionMatrix();
}

function applyViewOffset(cam: PerspectiveCamera, w: number, h: number, x: number, y: number, dt: number) {
  viewOffset.x = damp(viewOffset.x, x, 3, dt);
  viewOffset.y = damp(viewOffset.y, y, 3, dt);
  if (Math.abs(viewOffset.x) < 0.5 && Math.abs(viewOffset.y) < 0.5 && x === 0 && y === 0) {
    if (cam.view?.enabled) cam.clearViewOffset();
    return;
  }
  cam.setViewOffset(w, h, viewOffset.x, viewOffset.y, w, h);
}

// Dev-only handle for driving the ship from the browser console during testing.
if (import.meta.env.DEV) Object.assign(window, { __game: { ship, launch, dock, undock, autopilotTo, photoCam, input, store: useGame } });
