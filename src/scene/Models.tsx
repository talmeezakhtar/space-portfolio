import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Box3, Color, Group, Mesh, MeshStandardMaterial, Points, PointsMaterial, Vector3 } from 'three';
import { BODY } from '../data/world';
import { ship } from '../game/sim';
import { useGame } from '../game/store';

export const modelUrl = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;
// Meshopt-compressed GLBs; no Draco, so nothing is fetched from a CDN.
const load = (file: string) => useGLTF(modelUrl(file), false, true);

// What the first screen needs starts downloading at once.
['shuttle.glb', 'station.glb', 'earth.glb'].forEach((f) => useGLTF.preload(modelUrl(f), false, true));

/**
 * True once the ship has come within `dist` of `pos` (and stays true), so far-off
 * models only download when the pilot heads their way.
 */
export function useNear(pos: Vector3, dist: number) {
  const [near, setNear] = useState(() => ship.pos.distanceTo(pos) < dist);
  useFrame(() => {
    if (!near && ship.pos.distanceTo(pos) < dist) setNear(true);
  });
  return near;
}

const box = new Box3();
const c = new Vector3();

interface GLBProps {
  file: string;
  /** Radius of the model's main body, in the model's own units. */
  size: number;
  /** Radius it should have in the world. */
  radius: number;
  /** Hide parts far from the core (bundled moons we replace with our own). */
  coreOnly?: boolean;
  animate?: boolean;
  /** Hide meshes whose node name contains any of these (e.g. a baked-in exhaust plume). */
  hide?: string[];
  position?: [number, number, number];
  rotation?: [number, number, number];
}

/**
 * A compressed GLB, scaled so `size` model units become `radius` world units.
 * Loads under Suspense; if the file fails, `fallback` (or nothing) shows instead.
 */
export function GLB({ fallback = null, ...props }: GLBProps & { fallback?: ReactNode }) {
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLBModel {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

function GLBModel({ file, size, radius, coreOnly, animate, hide, position, rotation }: GLBProps) {
  const { scene, animations } = load(file);
  const root = useMemo(() => {
    const s = scene.clone(true);
    s.updateMatrixWorld(true);
    s.traverse((o) => {
      if (hide?.some((h) => o.name.includes(h))) o.visible = false;
      if (!(o as Mesh).isMesh) return;
      // Material names end up in shader source; GLSL reserves any name with "__".
      const mats = ([] as { name: string }[]).concat((o as Mesh).material as never);
      mats.forEach((m) => (m.name = m.name.replace(/_{2,}/g, '_')));
      if (coreOnly) {
        box.setFromObject(o).getCenter(c);
        if (c.length() > size * 2) o.visible = false;
      }
    });
    return s;
  }, [scene, coreOnly, size, hide]);
  const group = useRef<Group>(null);
  const { actions } = useAnimations(animations, group);
  useEffect(() => {
    if (animate) Object.values(actions).forEach((a) => a?.play());
  }, [actions, animate]);
  return (
    <group ref={group} position={position} rotation={rotation} scale={radius / size}>
      <primitive object={root} />
    </group>
  );
}

/** Surfaces borrowed from the planet models to dress moons. */
const MOON_SOURCES = [
  { file: 'theia-g-ice.glb', size: 150 },
  { file: 'theia-e-red.glb', size: 150 },
];

/**
 * A moon made from a real planet surface: the core sphere of one of the planet
 * models, recoloured with `tint`, scaled to radius 1 (the parent sets the size).
 */
export function MoonBody({ variant, tint }: { variant: number; tint: string }) {
  const src = MOON_SOURCES[variant % MOON_SOURCES.length];
  const { scene } = load(src.file);
  const { geometry, material, scale } = useMemo(() => {
    let core: Mesh | null = null;
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      const m = o as Mesh;
      if (core || !m.isMesh) return;
      box.setFromObject(m).getCenter(c);
      if (c.length() < src.size) core = m;
    });
    const mesh = core as unknown as Mesh;
    mesh.geometry.computeBoundingSphere();
    const mat = (mesh.material as MeshStandardMaterial).clone();
    mat.color = new Color(tint).lerp(new Color('#ffffff'), 0.3);
    mat.emissive = new Color('#000000');
    return { geometry: mesh.geometry, material: mat, scale: 1 / mesh.geometry.boundingSphere!.radius };
  }, [scene, src.size, tint]);
  return <mesh geometry={geometry} material={material} scale={scale} rotation={[0.3, variant, 0]} />;
}

/** Satellites: one circling the Academy (Earth), one parked at the Comms Beacon. */
function Orbiter({ id, dist, tilt, speed, phase }: { id: 'education' | 'skills' | 'projects'; dist: number; tilt: number; speed: number; phase: number }) {
  const orbit = useRef<Group>(null);
  useFrame((_, dt) => orbit.current && (orbit.current.rotation.y += dt * speed));
  const body = BODY[id];
  return (
    <group position={body.pos} rotation={[tilt, 0, 0.1]}>
      <group ref={orbit} rotation={[0, phase, 0]}>
        <GLB file="satellite.glb" size={90} radius={7} position={[body.radius + dist, 0, 0]} />
      </group>
    </group>
  );
}

function Satellites() {
  const b = BODY.contact;
  return (
    <>
      <Orbiter id="education" dist={22} tilt={0.35} speed={0.08} phase={0} />
      <Orbiter id="skills" dist={58} tilt={-0.25} speed={0.05} phase={2} />
      <Orbiter id="projects" dist={140} tilt={0.5} speed={0.04} phase={4} />
      <GLB file="satellite.glb" size={90} radius={9} position={[b.pos[0] + 26, b.pos[1] + 8, b.pos[2] + 6]} rotation={[0.2, -0.8, 0]} />
    </>
  );
}

/** A distant point-cloud galaxy on the horizon. */
function Galaxy() {
  const { scene } = load('galaxy.glb');
  const root = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      const p = o as Points;
      if (!p.isPoints) return;
      const m = p.material as PointsMaterial;
      m.size = 1.6;
      m.sizeAttenuation = false;
      m.transparent = true;
      m.opacity = 0.9;
      m.depthWrite = false;
      m.toneMapped = false;
    });
    return s;
  }, [scene]);
  return <primitive object={root} position={[-2600, 700, -2600]} scale={520} rotation={[0.5, 0.8, 0.2]} />;
}

const ICE = new Vector3(760, 180, -420);

/** Big off-route scenery so the trip between stops has something to look at. */
export function Scenery() {
  const tier = useGame((s) => s.tier);
  // Background scenery waits until after launch, so the first screen downloads less.
  const launched = useGame((s) => s.phase !== 'intro');
  const iceNear = useNear(ICE, 1100) && launched;
  return (
    <>
      <Suspense fallback={null}>
        <Satellites />
      </Suspense>
      {iceNear && (
        <Suspense fallback={null}>
          <GLB file="theia-g-ice.glb" size={150} radius={170} coreOnly position={[760, 180, -420]} rotation={[0.3, 0, 0.15]} />
        </Suspense>
      )}
      {tier !== 'low' && launched && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <Galaxy />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}
