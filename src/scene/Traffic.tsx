import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Object3D,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BODY } from '../data/world';
import { useGame } from '../game/store';
import { SUN } from './Space';

/*
 * Life between the stops: comets, cargo traffic on lanes, distant galaxies.
 * Everything here is instanced or a handful of meshes, so it stays cheap on phones.
 */

const UP = new Vector3(0, 1, 0);
const SUN_POS = new Vector3(...SUN);
const ZERO = new Vector3();

/* ---------------- comets ---------------- */

const tailMaterial = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color('#cfe8ff') } },
    vertexShader: /* glsl */ `
      varying float vT;
      void main() {
        vT = uv.y; // 1 at the head, 0 at the tail end
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vT;
      void main() { gl_FragColor = vec4(uColor * 1.4, pow(vT, 2.2) * 0.55); }`,
  });

interface Comet {
  from: Vector3;
  to: Vector3;
  t: number;
  speed: number;
}

function newComet(c: Comet, first = false) {
  // Long straight paths that cross the route at a distance.
  const side = Math.random() < 0.5 ? -1 : 1;
  const z = -200 - Math.random() * 1700;
  const y = 80 + Math.random() * 260 * (Math.random() < 0.5 ? -1 : 1);
  c.from.set(side * 1400, y, z + (Math.random() - 0.5) * 600);
  c.to.set(-side * 1400, y + (Math.random() - 0.5) * 300, z + (Math.random() - 0.5) * 600);
  c.t = first ? Math.random() : 0;
  c.speed = 1 / (40 + Math.random() * 40);
}

function Comets({ count }: { count: number }) {
  const group = useRef<Group>(null);
  const comets = useMemo(() => {
    const list = Array.from({ length: count }, () => ({ from: new Vector3(), to: new Vector3(), t: 0, speed: 0 }));
    list.forEach((c) => newComet(c, true));
    return list;
  }, [count]);
  const tailGeo = useMemo(() => {
    const g = new CylinderGeometry(0.2, 3.2, 90, 10, 1, true);
    g.translate(0, -45, 0); // head at the origin, tail along -Y
    return g;
  }, []);
  const mat = useMemo(tailMaterial, []);
  const q = useMemo(() => new Quaternion(), []);
  const away = useMemo(() => new Vector3(), []);

  useFrame((_, dt) => {
    group.current?.children.forEach((node, i) => {
      const c = comets[i];
      c.t += c.speed * Math.min(dt, 0.05);
      if (c.t > 1) newComet(c);
      node.position.lerpVectors(c.from, c.to, c.t);
      // A comet's tail always points away from the sun.
      away.copy(node.position).sub(SUN_POS).normalize();
      q.setFromUnitVectors(UP, away.negate());
      node.quaternion.copy(q);
    });
  });

  return (
    <group ref={group}>
      {comets.map((_, i) => (
        <group key={i}>
          <mesh>
            <sphereGeometry args={[1.6, 10, 8]} />
            <meshBasicMaterial color={[2.6, 2.9, 3.2]} toneMapped={false} />
          </mesh>
          <mesh geometry={tailGeo} material={mat} />
        </group>
      ))}
    </group>
  );
}

/* ---------------- cargo traffic ---------------- */

function freighterGeometry() {
  const hull = new BoxGeometry(2.2, 1.6, 9);
  const bridge = new BoxGeometry(1.4, 1, 1.8).translate(0, 1.2, -3.2);
  const pods = [-1, 1].map((s) => new BoxGeometry(1, 1, 5).translate(s * 1.7, -0.2, 0.6));
  const engine = new BoxGeometry(2.6, 2, 1).translate(0, 0, 4.9);
  return mergeGeometries([hull, bridge, ...pods, engine].map((g) => g.toNonIndexed()));
}

/** Lanes between stops, pushed off the direct route so traffic passes beside you. */
function lanes() {
  const ids = ['home', 'education', 'skills', 'projects', 'contact'] as const;
  const out: [Vector3, Vector3][] = [];
  for (let i = 0; i < ids.length - 1; i++) {
    const a = BODY[ids[i]].vec;
    const b = BODY[ids[i + 1]].vec;
    const side = new Vector3().subVectors(b, a).cross(UP).normalize().multiplyScalar(i % 2 ? 140 : -140);
    const lift = new Vector3(0, i % 2 ? 60 : -45, 0);
    out.push([a.clone().add(side).add(lift), b.clone().add(side).add(lift)]);
  }
  return out;
}

function Freighters({ perLane }: { perLane: number }) {
  const hulls = useRef<InstancedMesh>(null);
  const glows = useRef<InstancedMesh>(null);
  const lights = useRef<InstancedMesh>(null);
  const geo = useMemo(freighterGeometry, []);
  const ships = useMemo(() => {
    const ls = lanes();
    return ls.flatMap(([a, b], li) =>
      Array.from({ length: perLane }, (_, k) => ({
        a,
        b,
        t: (k + Math.random() * 0.5) / perLane,
        dir: (li + k) % 2 ? 1 : -1,
        speed: 1 / (70 + Math.random() * 40),
        scale: 1.2 + Math.random() * 1.2,
      })),
    );
  }, [perLane]);
  const n = ships.length;
  const o = useMemo(() => new Object3D(), []);
  const m = useMemo(() => new Matrix4(), []);
  const fwd = useMemo(() => new Vector3(), []);
  const pos = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);

  useFrame(({ clock }, dt) => {
    const blink = Math.floor(clock.elapsedTime * 1.2) % 2 === 0;
    ships.forEach((s, i) => {
      s.t += s.dir * s.speed * Math.min(dt, 0.05);
      if (s.t > 1 || s.t < 0) {
        s.dir *= -1; // turn round at the end of the lane
        s.t = Math.min(1, Math.max(0, s.t));
      }
      pos.lerpVectors(s.a, s.b, s.t);
      fwd.subVectors(s.b, s.a).multiplyScalar(s.dir).normalize();
      o.position.copy(pos);
      o.lookAt(look.copy(pos).sub(fwd)); // the model's nose is -Z
      o.scale.setScalar(s.scale);
      o.updateMatrix();
      hulls.current!.setMatrixAt(i, o.matrix);
      // engine glow sits at the stern
      m.makeTranslation(0, 0, 5.6).premultiply(o.matrix);
      glows.current!.setMatrixAt(i, m);
      // one blinking beacon on the bridge
      m.makeTranslation(0, 2, -3.2).premultiply(o.matrix);
      if (!blink) m.scale(ZERO);
      lights.current!.setMatrixAt(i, m);
    });
    hulls.current!.instanceMatrix.needsUpdate = true;
    glows.current!.instanceMatrix.needsUpdate = true;
    lights.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={hulls} args={[geo, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial color="#8d918c" metalness={0.6} roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={glows} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.45, 8, 6]} />
        <meshBasicMaterial color={[0.9, 1.3, 1.7]} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={lights} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.3, 6, 4]} />
        <meshBasicMaterial color={[3, 0.5, 0.35]} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/* ---------------- distant galaxies ---------------- */

function galaxyTexture(seed: number, tint: string) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const core = ctx.createRadialGradient(128, 128, 0, 128, 128, 60);
  core.addColorStop(0, 'rgba(255,240,220,0.9)');
  core.addColorStop(1, 'rgba(255,240,220,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);
  let r = seed;
  const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = tint;
  const arms = 2 + (seed % 2);
  for (let i = 0; i < 2600; i++) {
    const arm = i % arms;
    const d = Math.pow(rand(), 0.7) * 120;
    const a = (arm / arms) * Math.PI * 2 + d * 0.045 + (rand() - 0.5) * 0.6;
    const x = 128 + Math.cos(a) * d + (rand() - 0.5) * 8;
    const y = 128 + Math.sin(a) * d * 0.55 + (rand() - 0.5) * 6;
    ctx.globalAlpha = (1 - d / 125) * 0.55;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function Galaxies() {
  const list = useMemo(
    () => [
      { pos: [2200, 900, -3400] as const, scale: 900, rot: 0.4, tex: galaxyTexture(7, '#cfd8ff') },
      { pos: [-3200, -500, -900] as const, scale: 700, rot: -0.7, tex: galaxyTexture(19, '#ffe2c4') },
      { pos: [600, -1400, 2400] as const, scale: 800, rot: 1.2, tex: galaxyTexture(31, '#d9f0e6') },
    ],
    [],
  );
  return (
    <>
      {list.map((g, i) => (
        <sprite key={i} position={g.pos as unknown as [number, number, number]} scale={g.scale}>
          <spriteMaterial map={g.tex} rotation={g.rot} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.75} />
        </sprite>
      ))}
    </>
  );
}

export function Traffic() {
  const tier = useGame((s) => s.tier);
  return (
    <>
      <Galaxies />
      <Comets count={tier === 'low' ? 2 : 4} />
      <Freighters perLane={tier === 'low' ? 1 : 2} />
    </>
  );
}
