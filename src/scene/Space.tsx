import { Environment as DreiEnvironment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  LineSegments,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';
import { useGame } from '../game/store';
import { ship, warpLevel } from '../game/sim';

/** Far starfield that follows the camera, so it reads as infinitely distant. */
export function Starfield() {
  const tier = useGame((s) => s.tier);
  const ref = useRef<Group>(null);
  const geo = useMemo(() => {
    const n = tier === 'low' ? 1400 : tier === 'med' ? 2200 : 3200;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new Color();
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = 2600 + Math.random() * 400;
      const s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3);
      c.setHSL(0.58 + Math.random() * 0.08, 0.15, 0.7 + Math.random() * 0.3);
      if (Math.random() < 0.08) c.setHSL(0.08, 0.8, 0.75);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('color', new BufferAttribute(col, 3));
    return g;
  }, [tier]);

  useFrame(({ camera }) => ref.current?.position.copy(camera.position));

  return (
    <group ref={ref}>
      <points geometry={geo} frustumCulled={false}>
        <pointsMaterial size={2.2} sizeAttenuation={false} vertexColors depthWrite={false} toneMapped={false} />
      </points>
    </group>
  );
}

/** Near "space dust" that wraps around the camera and sells the sense of speed. */
export function SpaceDust() {
  const tier = useGame((s) => s.tier);
  const size = 140;
  const geo = useMemo(() => {
    const n = tier === 'low' ? 220 : 420;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pos[i] = Math.random() * size;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    return g;
  }, [tier]);

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uCam: { value: [0, 0, 0] }, uSize: { value: size } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform vec3 uCam; uniform float uSize;
          varying float vA;
          void main() {
            vec3 p = mod(position - uCam, uSize) - uSize * 0.5 + uCam;
            vec4 mv = viewMatrix * vec4(p, 1.0);
            float d = -mv.z;
            vA = smoothstep(uSize * 0.5, 8.0, d);
            gl_PointSize = clamp(90.0 / d, 1.0, 5.0);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vA;
          void main() {
            float r = length(gl_PointCoord - 0.5);
            if (r > 0.5) discard;
            gl_FragColor = vec4(0.75, 0.85, 1.0, vA * (1.0 - r * 2.0) * 0.8);
          }`,
      }),
    [],
  );

  useFrame(({ camera }) => {
    const p = camera.position;
    mat.uniforms.uCam.value = [p.x, p.y, p.z];
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

function glowTexture(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// Sun off to the right of the route: planets read half-lit, never as black discs.
export const SUN: [number, number, number] = [2600, 700, -500];

/** Sun, lights and a couple of nebula clouds. */
export function Environment() {
  const tier = useGame((s) => s.tier);
  const nebulae = useMemo(
    () => [
      { pos: [-1800, 300, -2200] as const, scale: 2600, tex: glowTexture('rgba(120,110,100,0.16)', 'rgba(60,55,50,0.06)') },
      { pos: [1600, -400, -800] as const, scale: 2200, tex: glowTexture('rgba(70,95,120,0.16)', 'rgba(35,50,65,0.06)') },
      { pos: [200, 700, 900] as const, scale: 2000, tex: glowTexture('rgba(140,90,60,0.12)', 'rgba(70,45,30,0.05)') },
    ],
    [],
  );
  const sunGlow = useMemo(() => glowTexture('rgba(255,230,180,1)', 'rgba(255,150,70,0.35)'), []);
  return (
    <>
      <color attach="background" args={['#030304']} />
      {/* Reflections for the metal models, generated locally (no HDR download). */}
      {tier !== 'low' && (
        <DreiEnvironment resolution={64} frames={1}>
          <Lightformer form="circle" intensity={3} color="#fff1dc" position={[10, 3, -2]} scale={6} />
          <Lightformer form="rect" intensity={0.8} color="#8fa6ff" position={[-10, 2, 6]} scale={[14, 8, 1]} />
          <Lightformer form="rect" intensity={0.3} color="#2a241e" position={[0, -10, 0]} scale={[30, 30, 1]} />
        </DreiEnvironment>
      )}
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#9aa8b8', '#1c1712', 0.45]} />
      <directionalLight position={SUN} intensity={2.8} color="#fff1dc" />
      <directionalLight position={[-600, 300, 1400]} intensity={0.75} color="#9fb0ff" />
      <mesh position={SUN}>
        <sphereGeometry args={[90, 24, 16]} />
        <meshBasicMaterial color={[4, 3.2, 2]} toneMapped={false} />
      </mesh>
      <sprite position={SUN} scale={700}>
        <spriteMaterial map={sunGlow} transparent depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      {nebulae.map((n, i) => (
        <sprite key={i} position={n.pos as unknown as [number, number, number]} scale={n.scale}>
          <spriteMaterial map={n.tex} transparent depthWrite={false} blending={AdditiveBlending} fog={false} />
        </sprite>
      ))}
    </>
  );
}

/**
 * Warp: short streaks that wrap around the camera and stretch along the ship's
 * travel direction. Invisible until autopilot is really moving.
 */
export function WarpStreaks() {
  const tier = useGame((s) => s.tier);
  const size = 220;
  const geo = useMemo(() => {
    const n = tier === 'low' ? 160 : 320;
    const pos = new Float32Array(n * 6);
    const end = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const z = Math.random() * size;
      pos.set([x, y, z, x, y, z], i * 6);
      end.set([0, 1], i * 2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new BufferAttribute(end, 1));
    return g;
  }, [tier]);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uCam: { value: [0, 0, 0] }, uSize: { value: size }, uDir: { value: [0, 0, -1] }, uLen: { value: 0 }, uAmt: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform vec3 uCam; uniform float uSize; uniform vec3 uDir; uniform float uLen;
          attribute float aEnd; varying float vA;
          void main() {
            vec3 p = mod(position - uCam, uSize) - uSize * 0.5 + uCam;
            p -= uDir * uLen * aEnd; // tail trails behind the ship's motion
            vec4 mv = viewMatrix * vec4(p, 1.0);
            vA = (1.0 - aEnd) * smoothstep(uSize * 0.5, 10.0, -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uAmt; varying float vA;
          void main() { gl_FragColor = vec4(0.82, 0.92, 1.0, vA * uAmt * 0.8); }`,
      }),
    [],
  );
  const ref = useRef<LineSegments>(null);
  useFrame(({ camera }, dt) => {
    const w = warpLevel();
    const u = mat.uniforms;
    u.uAmt.value += (w - u.uAmt.value) * Math.min(1, dt * 3);
    if (ref.current) ref.current.visible = u.uAmt.value > 0.01;
    if (!ref.current?.visible) return;
    const p = camera.position;
    u.uCam.value = [p.x, p.y, p.z];
    const f = ship.forward;
    u.uDir.value = [f.x, f.y, f.z];
    u.uLen.value = 6 + u.uAmt.value * 34;
  });
  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
