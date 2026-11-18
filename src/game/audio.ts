/**
 * All sound is synthesized with Web Audio: nothing to download.
 * Off by default; the context is only created after the visitor turns sound on
 * (a user gesture), as browsers require.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let engineGain: GainNode | null = null;
let engineFilter: BiquadFilterNode | null = null;
let rumble: OscillatorNode | null = null;
let lastSpeed = -1;

function noiseBuffer(c: AudioContext, seconds = 2) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    // brown noise: soft, low rumble rather than hiss
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

function build() {
  const c = new AudioContext();
  ctx = c;
  master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);

  // Engine: looped brown noise through a low-pass whose cutoff follows speed, plus a sub tone.
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  engineFilter = c.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 220;
  engineGain = c.createGain();
  engineGain.gain.value = 0.25;
  src.connect(engineFilter).connect(engineGain).connect(master);
  src.start();
  rumble = c.createOscillator();
  rumble.type = 'sine';
  rumble.frequency.value = 42;
  const rg = c.createGain();
  rg.gain.value = 0.12;
  rumble.connect(rg).connect(master);
  rumble.start();

  // Ambience: two detuned tones breathing slowly.
  [55, 82.6].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = 0.025;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07 + i * 0.03;
    const lg = c.createGain();
    lg.gain.value = 0.02;
    lfo.connect(lg).connect(g.gain);
    o.connect(g).connect(master!);
    o.start();
    lfo.start();
  });
}

export function setSound(on: boolean) {
  if (on && !ctx) build();
  if (!ctx || !master) return;
  if (on) void ctx.resume();
  master.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.25);
  if (!on) setTimeout(() => ctx && master!.gain.value < 0.01 && ctx.suspend(), 1200);
}

const live = () => !!ctx && ctx.state === 'running' && !!master && master.gain.value > 0.01;

/** Called every frame; only touches the graph when the speed has really changed. */
export function engine(speed: number) {
  if (!live() || Math.abs(speed - lastSpeed) < 1.5) return;
  lastSpeed = speed;
  const t = ctx!.currentTime;
  engineFilter!.frequency.setTargetAtTime(160 + speed * 7, t, 0.3);
  engineGain!.gain.setTargetAtTime(0.16 + Math.min(speed / 170, 1) * 0.35, t, 0.3);
  rumble!.frequency.setTargetAtTime(38 + speed * 0.12, t, 0.3);
}

function tone(freq: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.05);
}

/** Clamps engaged: a short rising three-note chime. */
export function chime() {
  if (!live()) return;
  const t = ctx!.currentTime;
  tone(659.3, t, 0.9, 0.12);
  tone(987.8, t + 0.12, 0.9, 0.1);
  tone(1318.5, t + 0.24, 1.2, 0.08);
}

/** Docking started: two soft clicks of the clamps reaching out. */
export function clampClicks() {
  if (!live()) return;
  const t = ctx!.currentTime;
  tone(180, t, 0.12, 0.2, 'square');
  tone(140, t + 0.5, 0.12, 0.18, 'square');
}

function burst(dur: number, from: number, to: number, vol: number) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  const t = c.currentTime;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master!);
  src.start();
}

/** Going to warp: a rising whoosh. */
export function whoosh() {
  if (live()) burst(1.6, 200, 2400, 0.9);
}

/** Asteroid hit: a short low thud. */
export function thud() {
  if (!live()) return;
  tone(70, ctx!.currentTime, 0.35, 0.5, 'sine');
  burst(0.3, 600, 120, 0.6);
}
