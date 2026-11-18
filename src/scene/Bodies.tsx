import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  MathUtils,
  Mesh,
  ShaderMaterial,
} from 'three';
import { createNoise3D } from 'simplex-noise';
import { BODIES, DOCK_BERTH, type Body } from '../data/world';
import { moonAnchors } from '../ui/Labels';
import { GLB, MoonBody, useNear } from './Models';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useGame } from '../game/store';

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Low-poly planet: noise-displaced icosphere with height-based vertex colours. */
function planetGeometry(body: Body, detail: number) {
  const geo = new IcosahedronGeometry(body.radius, detail);
  const noise = createNoise3D(rng(body.seed));
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const palette = body.colors.map((c) => new Color(c));
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / body.radius;
    const y = pos.getY(i) / body.radius;
    const z = pos.getZ(i) / body.radius;
    let disp = 1;
    if (body.style === 'gas') {
      const band = y * 2.4 + noise(x * 1.5, y * 4, z * 1.5) * 0.35;
      const t = (band * 0.5 + 0.5 + 10) % 1;
      const idx = Math.floor(t * palette.length) % palette.length;
      c.copy(palette[idx]).lerp(palette[(idx + 1) % palette.length], (t * palette.length) % 1 * 0.35);
      disp = 1 + noise(x * 3, y * 3, z * 3) * 0.008;
    } else {
      let h = 0;
      let amp = 1;
      let f = 1.3;
      for (let o = 0; o < 3; o++) {
        h += noise(x * f, y * f, z * f) * amp;
        amp *= 0.5;
        f *= 2.1;
      }
      h /= 1.75; // ~[-1, 1]
      if (body.style === 'ocean') {
        const sea = 0.05;
        const land = Math.max(h, sea);
        disp = 1 + (land - sea) * 0.12;
        const t = h < sea ? (h + 1) / (sea + 1) * 0.28 : 0.28 + ((h - sea) / (1 - sea)) * 0.72 * 1.5;
        const idx = Math.min(palette.length - 1, Math.floor(t * (palette.length - 1)));
        c.copy(palette[idx]);
      } else {
        disp = 1 + h * 0.09;
        const t = MathUtils.clamp((h + 0.8) / 1.6, 0, 0.999);
        c.copy(palette[Math.floor(t * palette.length)]);
        if (h < -0.35) c.lerp(new Color('#ff6a1a'), 0.75); // lava in the valleys
      }
    }
    pos.setXYZ(i, pos.getX(i) * disp, pos.getY(i) * disp, pos.getZ(i) * disp);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  // One colour per triangle for a crisp low-poly look.
  for (let f = 0; f < colors.length; f += 9) {
    for (let k = 0; k < 3; k++) {
      const avg = (colors[f + k] + colors[f + 3 + k] + colors[f + 6 + k]) / 3;
      colors[f + k] = colors[f + 3 + k] = colors[f + 6 + k] = avg;
    }
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function atmosphereMaterial(color: string) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.2);
        gl_FragColor = vec4(uColor * 1.2, f * 0.6);
      }`,
  });
}

function Moons({ body, detail }: { body: Body; detail: number }) {
  const group = useRef<Group>(null);
  const geo = useMemo(() => new IcosahedronGeometry(1, detail > 3 ? 1 : 0), [detail]);
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.children.forEach((pivot, i) => {
      pivot.rotation.y += body.moons![i].speed * dt;
      pivot.children[0].rotation.y += dt * 0.15;
    });
  });
  return (
    <group ref={group}>
      {body.moons!.map((m, i) => (
        <group key={m.name} rotation={[m.tilt, m.phase, 0]}>
          <group
            position={[m.dist, 0, 0]}
            scale={m.size}
            ref={body.moonLabels ? (el) => void (moonAnchors[i] = el) : undefined}
          >
            <ErrorBoundary fallback={<SimpleMoon geo={geo} color={m.color} />}>
              <Suspense fallback={<SimpleMoon geo={geo} color={m.color} />}>
                <MoonBody variant={i} tint={m.color} />
              </Suspense>
            </ErrorBoundary>
          </group>
        </group>
      ))}
    </group>
  );
}

function SimpleMoon({ geo, color }: { geo: IcosahedronGeometry; color: string }) {
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} flatShading roughness={0.85} />
    </mesh>
  );
}

function Planet({ body }: { body: Body }) {
  const tier = useGame((s) => s.tier);
  const detail = tier === 'low' ? 4 : tier === 'med' ? 5 : 6;
  const geo = useMemo(() => planetGeometry(body, body.style === 'gas' ? detail - 1 : detail), [body, detail]);
  const atmo = useMemo(() => (body.atmosphere ? atmosphereMaterial(body.atmosphere) : null), [body]);
  const spin = useRef<Group>(null);
  useFrame((_, dt) => spin.current && (spin.current.rotation.y += dt * 0.03));
  const procedural = (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors flatShading roughness={0.9} metalness={0.05} />
    </mesh>
  );
  const m = body.model;
  const near = useNear(body.vec, body.radius * 3 + 650);
  return (
    <group position={body.pos}>
      <group ref={spin}>
        {m && near ? (
          <GLB file={m.file} size={m.size} radius={body.radius} coreOnly={m.coreOnly} animate={m.animate} fallback={procedural} />
        ) : (
          procedural
        )}
      </group>
      {atmo && (
        <mesh material={atmo} scale={body.radius * (m ? 1.035 : 1.12)}>
          <sphereGeometry args={[1, 40, 24]} />
        </mesh>
      )}
      {body.rings && (
        <group rotation={[-Math.PI / 2 + 0.35, 0, 0.2]}>
          {body.rings.map((r, i) => (
            <mesh key={i}>
              <ringGeometry args={[r.inner, r.outer, 96]} />
              <meshBasicMaterial color={new Color(r.color).multiplyScalar(1.6)} transparent opacity={0.7} side={DoubleSide} toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}
      {body.moons && <Moons body={body} detail={detail} />}
    </group>
  );
}

function Station({ body }: { body: Body }) {
  const m = body.model!;
  return (
    <>
      <GLB
        file={m.file}
        size={m.size}
        radius={body.radius * (m.scale ?? 1)}
        animate={m.animate}
        position={body.pos}
        rotation={[0.25, 0.6, 0]}
        fallback={<StationProcedural body={body} />}
      />
      <DockingArm />
    </>
  );
}

/** Gantry from the station out to the berth, with a clamp over the ship's back. */
function DockingArm() {
  const lights = useRef<Group>(null);
  useFrame(({ clock }) => {
    const on = Math.floor(clock.elapsedTime * 1.5) % 2 === 0;
    lights.current?.children.forEach((l, i) => (l.visible = on === (i % 2 === 0)));
  });
  const y = DOCK_BERTH.y + 6.5;
  const z0 = -14;
  const z1 = DOCK_BERTH.z;
  const len = z0 - z1;
  const metal = <meshStandardMaterial color="#9aa0a8" metalness={0.75} roughness={0.35} />;
  return (
    <group>
      {/* two rails + cross braces */}
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, y, (z0 + z1) / 2]}>
          <boxGeometry args={[0.35, 0.35, len]} />
          {metal}
        </mesh>
      ))}
      {Array.from({ length: Math.floor(len / 3) }).map((_, i) => (
        <mesh key={i} position={[0, y, z0 - 1.5 - i * 3]} rotation={[0, 0, 0]}>
          <boxGeometry args={[2.2, 0.18, 0.18]} />
          {metal}
        </mesh>
      ))}
      {/* clamp down to the orbiter */}
      <mesh position={[0, y - 2, z1]}>
        <boxGeometry args={[0.6, 4, 0.6]} />
        {metal}
      </mesh>
      <mesh position={[0, y - 4.1, z1]}>
        <boxGeometry args={[2.4, 0.3, 1.4]} />
        {metal}
      </mesh>
      <group ref={lights}>
        {[z0 - 1, z1 + 1].flatMap((z) =>
          [-1.1, 1.1].map((x) => (
            <mesh key={`${x}${z}`} position={[x, y + 0.3, z]}>
              <sphereGeometry args={[0.18, 6, 4]} />
              <meshBasicMaterial color={[3, 0.9, 0.3]} toneMapped={false} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}

function StationProcedural({ body }: { body: Body }) {
  const ring = useRef<Group>(null);
  useFrame((_, dt) => ring.current && (ring.current.rotation.z += dt * 0.25));
  return (
    <group position={body.pos} rotation={[0, 0.4, 0]}>
      <mesh>
        <cylinderGeometry args={[2.2, 2.2, 14, 8]} />
        <meshStandardMaterial color="#b9c3dd" flatShading metalness={0.5} roughness={0.4} />
      </mesh>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[9, 1.1, 8, 28]} />
          <meshStandardMaterial color="#8e98b8" flatShading metalness={0.6} roughness={0.35} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, 0, 0]}>
            <boxGeometry args={[0.5, 18, 0.5]} />
            <meshStandardMaterial color="#6f7896" />
          </mesh>
        ))}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 9, Math.sin(a) * 9, 1.15]}>
              <boxGeometry args={[0.9, 0.5, 0.1]} />
              <meshBasicMaterial color={[0.6, 2.2, 2.6]} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 9, 0, -6]}>
          <boxGeometry args={[10, 0.15, 4]} />
          <meshStandardMaterial color="#25407a" emissive="#1a3a8a" emissiveIntensity={0.6} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 7.5, 0]}>
        <sphereGeometry args={[0.6, 8, 6]} />
        <meshBasicMaterial color={[3, 0.6, 0.4]} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Beacon({ body }: { body: Body }) {
  const a = useRef<Mesh>(null);
  const b = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);
  useFrame(({ clock }, dt) => {
    if (a.current) a.current.rotation.x += dt * 0.6;
    if (b.current) b.current.rotation.y += dt * 0.8;
    if (core.current) core.current.scale.setScalar(4 + Math.sin(clock.elapsedTime * 2.5) * 0.6);
  });
  return (
    <group position={body.pos}>
      <mesh ref={core}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={[1.9, 2.8, 2.4]} toneMapped={false} />
      </mesh>
      <mesh ref={a}>
        <torusGeometry args={[11, 0.45, 6, 48]} />
        <meshBasicMaterial color={[1.5, 2.3, 2]} toneMapped={false} />
      </mesh>
      <mesh ref={b}>
        <torusGeometry args={[14, 0.3, 6, 48]} />
        <meshBasicMaterial color={[1.6, 1.5, 1.4]} toneMapped={false} />
      </mesh>
      <mesh position={[0, -14, 0]}>
        <cylinderGeometry args={[0.3, 1.6, 16, 6]} />
        <meshStandardMaterial color="#8e98b8" flatShading metalness={0.6} />
      </mesh>
    </group>
  );
}

function ArcadeMoon({ body }: { body: Body }) {
  const unlocked = useGame((s) => s.arcadeUnlocked);
  const tier = useGame((s) => s.tier);
  const m = body.model!;
  // The secret reward: a black hole, loaded only once the run is cleared.
  if (unlocked && tier !== 'low')
    return (
      <GLB
        file={m.file}
        size={m.size}
        radius={body.radius * (m.scale ?? 1)}
        animate={m.animate}
        position={body.pos}
        rotation={[0.35, 0, 0.25]}
        fallback={<ArcadePlaceholder body={body} unlocked />}
      />
    );
  return <ArcadePlaceholder body={body} unlocked={unlocked} />;
}

function ArcadePlaceholder({ body, unlocked }: { body: Body; unlocked: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.4;
    ref.current.rotation.x += dt * 0.15;
  });
  return (
    <group position={body.pos}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[body.radius, 1]} />
        {unlocked ? (
          <meshBasicMaterial color={[2.4, 0.8, 0.3]} wireframe toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#2a2826" wireframe transparent opacity={0.5} />
        )}
      </mesh>
      <mesh>
        <icosahedronGeometry args={[body.radius * 0.8, 0]} />
        <meshStandardMaterial color="#111012" flatShading />
      </mesh>
    </group>
  );
}

export function Bodies() {
  return (
    <>
      {BODIES.map((b) =>
        b.kind === 'planet' ? (
          <Planet key={b.id} body={b} />
        ) : b.kind === 'station' ? (
          <Station key={b.id} body={b} />
        ) : b.kind === 'beacon' ? (
          <Beacon key={b.id} body={b} />
        ) : (
          <ArcadeMoon key={b.id} body={b} />
        ),
      )}
    </>
  );
}
