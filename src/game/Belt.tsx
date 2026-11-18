import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';
import {
  BoxGeometry,
  Euler,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';
import { BELT, insideBelt } from '../data/world';
import { input } from './input';
import { ship } from './sim';
import { thud } from './audio';
import { award } from './achievements';
import { useGame } from './store';

const MAX_BOLTS = 24;
const m4 = new Matrix4();
const q = new Quaternion();
const e = new Euler();
const v = new Vector3();
const s3 = new Vector3();
const FWD = new Vector3(0, 0, -1);

function rockGeometry() {
  const geo = new IcosahedronGeometry(1, 1);
  const noise = createNoise3D();
  const p = geo.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = 1 + noise(v.x * 1.8, v.y * 1.8, v.z * 1.8) * 0.28;
    p.setXYZ(i, v.x * d, v.y * d, v.z * d);
  }
  geo.computeVertexNormals();
  return geo;
}

export default function Belt() {
  const tier = useGame((s) => s.tier);
  const count = tier === 'low' ? 150 : tier === 'med' ? 230 : 380;
  const rocks = useRef<InstancedMesh>(null);
  const bolts = useRef<InstancedMesh>(null);
  const gate = useRef<Mesh>(null);
  const geo = useMemo(rockGeometry, []);
  const boltGeo = useMemo(() => new BoxGeometry(0.22, 0.22, 4), []);

  const data = useMemo(() => {
    const pos: Vector3[] = [];
    const scale: number[] = [];
    const rot: Euler[] = [];
    const spin: Vector3[] = [];
    for (let i = 0; i < count; i++) {
      let p: Vector3;
      // Keep a clear lane around the gate so the run is winnable.
      do {
        p = new Vector3(
          BELT.center.x + (Math.random() * 2 - 1) * BELT.half.x,
          BELT.center.y + (Math.random() * 2 - 1) * BELT.half.y,
          BELT.center.z + (Math.random() * 2 - 1) * BELT.half.z,
        );
      } while (p.distanceTo(BELT.gate) < 22);
      pos.push(p);
      scale.push(2 + Math.pow(Math.random(), 2.5) * 9);
      rot.push(new Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      spin.push(new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.8));
    }
    return { pos, scale, rot, spin, life: new Float32Array(count).fill(1) };
  }, [count]);

  const boltState = useMemo(
    () => Array.from({ length: MAX_BOLTS }, () => ({ pos: new Vector3(), dir: new Vector3(), life: 0 })),
    [],
  );
  const run = useRef({ cooldown: 0, fireCd: 0, entry: new Vector3(), lastSec: -1, lastHull: 100 });

  useLayoutEffect(() => {
    for (let i = 0; i < MAX_BOLTS; i++) bolts.current!.setMatrixAt(i, m4.makeScale(0, 0, 0));
    bolts.current!.instanceMatrix.needsUpdate = true;
  }, []);

  const respawnRocks = () => data.life.fill(1);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = useGame.getState();
    const r = run.current;

    // ---- rocks ----
    const mesh = rocks.current!;
    for (let i = 0; i < count; i++) {
      const rr = data.rot[i];
      rr.x += data.spin[i].x * dt;
      rr.y += data.spin[i].y * dt;
      if (data.life[i] < 1 && data.life[i] > 0) data.life[i] = Math.max(0, data.life[i] - dt * 6);
      const sc = data.scale[i] * data.life[i];
      q.setFromEuler(rr);
      mesh.setMatrixAt(i, m4.compose(data.pos[i], q, s3.setScalar(sc)));
    }
    mesh.instanceMatrix.needsUpdate = true;

    // ---- gate ----
    if (gate.current) {
      gate.current.rotation.z += dt * 0.6;
      const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.06;
      gate.current.scale.setScalar(pulse);
    }

    // ---- lasers ----
    r.fireCd -= dt;
    if (input.fire && r.fireCd <= 0 && g.phase === 'flying') {
      r.fireCd = 0.16;
      const b = boltState.find((x) => x.life <= 0);
      if (b) {
        b.life = 1.1;
        b.dir.copy(ship.forward);
        b.pos.copy(ship.pos).addScaledVector(ship.forward, 4);
      }
    }
    const bm = bolts.current!;
    boltState.forEach((b, i) => {
      if (b.life <= 0) return;
      b.life -= dt;
      b.pos.addScaledVector(b.dir, (ship.speed + 220) * dt);
      for (let k = 0; k < count; k++) {
        if (data.life[k] < 1) continue;
        if (b.pos.distanceToSquared(data.pos[k]) < (data.scale[k] + 0.8) ** 2) {
          data.life[k] = 0.999;
          b.life = 0;
          break;
        }
      }
      q.setFromUnitVectors(FWD, b.dir);
      bm.setMatrixAt(i, b.life > 0 ? m4.compose(b.pos, q, s3.set(1, 1, 1)) : m4.makeScale(0, 0, 0));
    });
    bm.instanceMatrix.needsUpdate = true;

    // ---- ship vs rocks ----
    ship.invuln = Math.max(0, ship.invuln - dt);
    const near = ship.pos.distanceTo(BELT.center) < 460;
    if (near !== g.beltNear) g.set({ beltNear: near });
    if (!near || g.autopilot || g.phase !== 'flying') {
      if (g.belt.active && g.phase !== 'flying') g.set({ belt: { ...g.belt, active: false } });
      return;
    }
    for (let k = 0; k < count; k++) {
      if (data.life[k] < 1) continue;
      v.copy(ship.pos).sub(data.pos[k]);
      const minD = data.scale[k] + 1.8;
      const d = v.length();
      if (d < minD) {
        v.divideScalar(d || 1);
        ship.pos.copy(data.pos[k]).addScaledVector(v, minD);
        const vn = ship.vel.dot(v);
        if (vn < 0) ship.vel.addScaledVector(v, -vn * 1.6);
        ship.speed *= 0.6;
        if (g.belt.active && ship.invuln <= 0) {
          ship.invuln = 0.9;
          navigator.vibrate?.(60);
          thud();
          const hull = g.belt.hull - 25;
          if (hull <= 0) return fail('Hull breached! Try the run again.');
          g.set({ belt: { ...g.belt, hull } });
        }
      }
    }

    // ---- the challenge ----
    r.cooldown -= dt;
    const inside = insideBelt(ship.pos);
    if (!g.belt.active) {
      if (inside && r.cooldown <= 0) {
        r.entry.copy(ship.pos).addScaledVector(ship.forward, -30);
        g.set({ belt: { active: true, time: BELT.duration, hull: 100 } });
        g.toast('Asteroid Run: fly through the lit gate within 30s. Fire to clear rocks.');
      }
      return;
    }
    const time = g.belt.time - dt;
    if (ship.pos.distanceTo(BELT.gate) < BELT.gateRadius + 3) {
      const used = BELT.duration - time;
      const best = g.bestBelt == null ? used : Math.min(g.bestBelt, used);
      g.set({ belt: { active: false, time: 0, hull: g.belt.hull }, arcadeUnlocked: true, bestBelt: best });
      g.toast(`Run cleared in ${used.toFixed(1)}s! Something just appeared past the field: the Event Horizon.`);
      award('run');
      if (used < 12) award('fast');
      navigator.vibrate?.([40, 60, 40]);
      r.cooldown = 4;
      respawnRocks();
      return;
    }
    if (time <= 0) return fail('Out of time! Re-enter the field to try again.');
    if (!insideBelt(ship.pos, 45)) {
      g.set({ belt: { ...g.belt, active: false } });
      g.toast('Run aborted. Re-enter the field any time.');
      r.cooldown = 2;
      return;
    }
    // Only touch the store when the visible numbers change.
    const sec = Math.ceil(time);
    if (sec !== r.lastSec) {
      r.lastSec = sec;
      g.set({ belt: { ...g.belt, time } });
    } else {
      g.belt.time = time; // silent update between ticks
    }

    function fail(msg: string) {
      g.set({ belt: { active: false, time: 0, hull: 100 } });
      g.toast(msg);
      ship.pos.copy(r.entry);
      ship.vel.set(0, 0, 0);
      ship.speed = 5;
      ship.invuln = 1.2;
      r.cooldown = 3;
      respawnRocks();
    }
  }, -1);

  return (
    <group>
      <instancedMesh ref={rocks} args={[geo, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial color="#8a7f76" flatShading roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={bolts} args={[boltGeo, undefined, MAX_BOLTS]} frustumCulled={false}>
        <meshBasicMaterial color={[3, 0.5, 0.4]} toneMapped={false} />
      </instancedMesh>
      <group position={BELT.gate}>
        <mesh ref={gate}>
          <torusGeometry args={[BELT.gateRadius, 0.8, 8, 40]} />
          <meshBasicMaterial color={[1.6, 2.6, 2.2]} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
