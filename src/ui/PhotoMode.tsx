import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type { Camera, Scene, WebGLRenderer } from 'three';
import { photoCam, setPhoto } from '../game/sim';
import { useGame } from '../game/store';
import { Icon } from './Icon';

/* Renderer handles for the "Save image" button (filled in from inside the canvas). */
const view: { gl?: WebGLRenderer; scene?: Scene; camera?: Camera } = {};

export function PhotoCapture() {
  const { gl, scene, camera } = useThree();
  view.gl = gl;
  view.scene = scene;
  view.camera = camera;
  return null;
}

function save() {
  const { gl, scene, camera } = view;
  if (!gl || !scene || !camera) return;
  // Render a fresh frame and read it back in the same task, before the buffer clears.
  gl.render(scene, camera);
  gl.domElement.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'talmeez-flight-log.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
}

/** Bottom bar + orbit controls while photo mode is on. */
export function PhotoBar() {
  const photo = useGame((s) => s.photo);

  useEffect(() => {
    if (!photo) return;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const down = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      e.target.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) {
        photoCam.yaw -= (e.clientX - p.x) * 0.008;
        photoCam.pitch = Math.max(-1.3, Math.min(1.3, photoCam.pitch + (e.clientY - p.y) * 0.006));
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) photoCam.dist = Math.max(8, Math.min(120, photoCam.dist * (pinch / d)));
        pinch = d;
      }
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      pinch = 0;
    };
    const wheel = (e: WheelEvent) => {
      photoCam.dist = Math.max(8, Math.min(120, photoCam.dist * (1 + Math.sign(e.deltaY) * 0.08)));
    };
    const key = (e: KeyboardEvent) => e.code === 'Escape' && setPhoto(false);
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', key);
    };
  }, [photo]);

  if (!photo) return null;
  return (
    <div className="photo-bar glass">
      <span className="muted small">Drag to orbit · pinch or scroll to zoom</span>
      <div className="row">
        <button className="btn" onClick={save}>
          Save image
        </button>
        <button className="btn ghost" onClick={() => setPhoto(false)}>
          Done
        </button>
      </div>
    </div>
  );
}
