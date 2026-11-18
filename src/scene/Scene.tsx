import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Suspense, lazy, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { BODY } from '../data/world';
import { BOOST, nextTarget, ship } from '../game/sim';
import { useGame } from '../game/store';
import { Bodies } from './Bodies';
import { Ship } from './Ship';
import { Scenery } from './Models';
import { Traffic } from './Traffic';
import { Environment, SpaceDust, Starfield, WarpStreaks } from './Space';
import { LabelSync } from '../ui/Labels';
import { PhotoCapture } from '../ui/PhotoMode';

const Belt = lazy(() => import('../game/Belt'));

const v = new Vector3();
let els: Record<string, HTMLElement | null> | null = null;
let lastWp = '';

/** Writes per-frame HUD values straight to the DOM (no React re-renders). */
function HudSync() {
  useFrame(({ camera, size }) => {
    if (!els || !els.speed?.isConnected) {
      els = {
        speed: document.getElementById('hud-speed'),
        energy: document.getElementById('hud-energy'),
        wp: document.getElementById('hud-wp'),
        wpName: document.getElementById('hud-wp-name'),
        wpDist: document.getElementById('hud-wp-dist'),
        wpArrow: document.getElementById('hud-wp-arrow'),
      };
    }
    if (els.speed) els.speed.style.transform = `scaleX(${Math.min(1, ship.speed / (BOOST * 1.4))})`;
    if (els.energy) els.energy.style.transform = `scaleX(${ship.energy})`;

    const g = useGame.getState();
    const id = g.autopilot ?? nextTarget();
    const wp = els.wp;
    if (!wp) return;
    if (!id || g.phase !== 'flying' || g.mapOpen) {
      wp.style.opacity = '0';
      return;
    }
    const body = BODY[id];
    if (lastWp !== id && els.wpName) {
      els.wpName.textContent = body.name;
      lastWp = id;
    }
    const dist = ship.pos.distanceTo(body.vec) - body.radius;
    if (els.wpDist) els.wpDist.textContent = `${Math.max(0, Math.round(dist))} m`;

    v.copy(body.vec).project(camera);
    const behind = v.z > 1;
    let x = v.x;
    let y = v.y;
    if (behind) {
      x = -x;
      y = -y;
    }
    const margin = 0.86;
    const off = behind || Math.abs(x) > margin || Math.abs(y) > margin;
    if (off) {
      const k = margin / Math.max(Math.abs(x), Math.abs(y), 0.0001);
      x *= k;
      y *= k;
    }
    const px = (x * 0.5 + 0.5) * size.width;
    const py = (-y * 0.5 + 0.5) * size.height;
    wp.style.opacity = dist < 30 ? '0' : '1';
    wp.style.transform = `translate(${px}px, ${py}px)`;
    if (els.wpArrow) {
      els.wpArrow.style.opacity = off ? '1' : '0';
      els.wpArrow.style.transform = `rotate(${Math.atan2(-y, x)}rad)`;
    }
  });
  return null;
}

/** Fade the canvas in once real frames are on screen (shaders compiled). */
function Reveal() {
  const frames = useRef(0);
  useFrame(({ gl }) => {
    if (++frames.current === 3) gl.domElement.closest('.space-canvas')?.classList.add('ready');
  });
  return null;
}

export function Scene() {
  const tier = useGame((s) => s.tier);
  const [dpr, setDpr] = useState(tier === 'high' ? 1.75 : tier === 'med' ? 1.5 : 1.15);
  const maxDpr = tier === 'high' ? 2 : tier === 'med' ? 1.5 : 1.25;
  return (
    <Canvas
      className="space-canvas"
      dpr={dpr}
      gl={{ antialias: tier === 'high', powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 60, near: 0.5, far: 6500, position: [30, 10, 30] }}
      onCreated={({ gl }) => {
        // Phones can drop the GPU context under memory pressure; ask the browser to
        // give it back (three.js restores itself) and tell the visitor what happened.
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          useGame.getState().toast('Graphics paused by the browser. Restoring…');
        });
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(0.75, +(d - 0.25).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(maxDpr, +(d + 0.25).toFixed(2)))}
      />
      <Environment />
      <Starfield />
      <SpaceDust />
      <WarpStreaks />
      <Bodies />
      <Scenery />
      <Traffic />
      <Ship />
      <Suspense fallback={null}>
        <Belt />
      </Suspense>
      <HudSync />
      <Reveal />
      <LabelSync />
      <PhotoCapture />
      {tier !== 'low' && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.9} luminanceSmoothing={0.2} resolutionScale={0.5} />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
