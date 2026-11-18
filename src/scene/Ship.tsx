import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Group, Mesh, PerspectiveCamera } from 'three';
import { ship, step, AUTO_MAX, CRUISE } from '../game/sim';
import { GLB } from './Models';
import { engine } from '../game/audio';

export function Ship() {
  const ref = useRef<Group>(null);
  const flames = useRef<Mesh[]>([]);
  const boostStretch = useRef(0);
  const size = useThree((s) => s.size);

  // Runs before everything else so all other frame callbacks see this frame's ship state.
  useFrame(({ camera, clock }, dt) => {
    step(dt, camera as PerspectiveCamera, size.width, size.height);
    engine(ship.speed);
    const g = ref.current;
    if (!g) return;
    g.position.copy(ship.pos);
    g.quaternion.copy(ship.quat);
    const throttle = Math.min(1.6, 0.35 + ship.speed / CRUISE * 0.4 + (ship.speed > CRUISE + 5 ? (ship.speed - CRUISE) / AUTO_MAX : 0));
    // All six bells glow with throttle; on boost they stretch back into a short exhaust.
    const glow = Math.min(1.15, 0.55 + throttle * 0.4);
    boostStretch.current += ((ship.boosting || ship.speed > 100 ? 1 : 0) - boostStretch.current) * Math.min(1, dt * 6);
    const len = 1 + boostStretch.current * 2.6;
    flames.current.forEach((f) => {
      if (!f) return;
      f.scale.set(glow, glow, glow * len);
      f.position.z = f.userData.z + (len - 1) * 0.16 * glow;
    });
    g.visible = ship.invuln <= 0 || Math.floor(clock.elapsedTime * 16) % 2 === 0;
  }, -2);

  return (
    <group ref={ref}>
      <GLB file="shuttle.glb" size={1} radius={SHUTTLE_SCALE} position={[0, -0.9, 0.8]} hide={HIDE_PLUME} fallback={<ProceduralHull />} />
      {/* Main-engine glow: small and soft, scales with throttle. No flames. */}
      {NOZZLES.map((p, i) => (
        <mesh key={i} ref={(m) => void (m && ((m.userData.z = p[2]), (flames.current[i] = m)))} position={p}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshBasicMaterial color={[1.05, 1.3, 1.85]} toneMapped={false} transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// Model units -> world: the orbiter's ~30-unit body becomes ~7 units long.
const SHUTTLE_SCALE = 0.23;
const HIDE_PLUME = ['Untitled101']; // the model's baked-in exhaust plume
// Every engine bell on the orbiter's tail, in ship space (checked from behind).
const NOZZLES: [number, number, number][] = [
  // upper pair
  [-0.38, 0.12, 3.15],
  [0.38, 0.12, 3.15],
  // centre bell
  [0, 0.05, 3.05],
  // lower pair
  [-0.31, -0.58, 3.1],
  [0.31, -0.58, 3.1],
];

/** Shown until the shuttle model has loaded. */
function ProceduralHull() {
  return (
    <>
      {/* hull: cone pointing forward (-Z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1.1, 5, 6]} />
        <meshStandardMaterial color="#e6ebf7" flatShading metalness={0.4} roughness={0.35} />
      </mesh>
      {/* cockpit */}
      <mesh position={[0, 0.45, -0.3]} scale={[0.55, 0.45, 1.2]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#1a3d5c" emissive="#3fd6ff" emissiveIntensity={0.9} metalness={0.8} roughness={0.15} />
      </mesh>
      {/* wings */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.9, -0.2, 1.1]} rotation={[0, s * -0.35, s * -0.12]}>
          <boxGeometry args={[3, 0.14, 1.5]} />
          <meshStandardMaterial color="#ff8a5c" flatShading metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
      {/* wingtip lights */}
      {[-1, 1].map((s) => (
        <mesh key={`l${s}`} position={[s * 3.35, -0.2, 1.5]}>
          <sphereGeometry args={[0.16, 6, 4]} />
          <meshBasicMaterial color={s < 0 ? [3, 0.3, 0.3] : [0.3, 3, 0.8]} toneMapped={false} />
        </mesh>
      ))}
      {/* tail fin */}
      <mesh position={[0, 0.8, 1.7]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.14, 1.3, 1.2]} />
        <meshStandardMaterial color="#ff8a5c" flatShading />
      </mesh>
    </>
  );
}
