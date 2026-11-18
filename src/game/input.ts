// Shared, mutable input state. Keyboard, the touch thumbstick and the
// on-screen buttons all write here; the ship controller only reads it.
export const input = {
  stickX: 0,
  stickY: 0,
  keyX: 0,
  keyY: 0,
  boost: false,
  fire: false,
};

const keys = new Set<string>();

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

export function steer() {
  return { x: clamp1(input.stickX + input.keyX), y: clamp1(input.stickY + input.keyY) };
}

function recompute() {
  const has = (...k: string[]) => k.some((x) => keys.has(x));
  input.keyX = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0);
  input.keyY = (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0);
  input.boost = has('ShiftLeft', 'ShiftRight');
  input.fire = has('Space');
}

export function keyDown(code: string) {
  keys.add(code);
  recompute();
}

export function keyUp(code: string) {
  keys.delete(code);
  recompute();
}

export function clearKeys() {
  keys.clear();
  recompute();
  input.stickX = input.stickY = 0;
}
