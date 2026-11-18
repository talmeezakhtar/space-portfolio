import { useEffect, useState } from 'react';
import { profile } from '../data/content';

// First-visit intro (same pattern as Crimson Claws): flight words swap in letter by
// letter, the name lands in the accent, then the panel lifts like a curtain while the
// 3D scene loads underneath. Pure CSS timeline from first paint (styles.css,
// "loader"); this component only removes it once the wipe is over.

const WORDS = ['Ignition', 'Liftoff', 'Orbit'];
const HOLLOW = new Set([1, 2]); // a pair of outlined letters in each word

function Word({ text, slot, final = false }: { text: string; slot: number; final?: boolean }) {
  return (
    <span className={`ld-word${final ? ' ld-final' : ''}`} aria-hidden>
      {[...text].map((ch, i) => (
        <span key={i} className="ld-mask">
          <span
            className={`ld-letter${HOLLOW.has(i) && ch !== ' ' ? ' ld-hollow' : ''}`}
            style={{ animationDelay: `${slot * 0.6 + 0.15 + i * 0.035}s` }}
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        </span>
      ))}
    </span>
  );
}

export function Loader() {
  const [gone, setGone] = useState(() => document.documentElement.dataset.intro !== 'playing');

  useEffect(() => {
    if (gone) return;
    try {
      sessionStorage.setItem('fl-intro', '1');
    } catch {
      /* private mode: the intro simply plays again next time */
    }
    // Timed from page load, not from React, so a slow start never leaves the curtain behind.
    const html = document.documentElement;
    const left = Math.max(0, 3800 - performance.now());
    const hide = setTimeout(() => setGone(true), left);
    const done = setTimeout(() => (html.dataset.intro = 'seen'), left + 1000);
    return () => {
      clearTimeout(hide);
      clearTimeout(done);
    };
  }, [gone]);

  if (gone) return null;
  return (
    <div className="ld" role="status" aria-label={`Loading ${profile.name}'s portfolio`}>
      <div className="ld-stage">
        {WORDS.map((w, i) => (
          <Word key={w} text={w} slot={i} />
        ))}
        <Word text={profile.name} slot={WORDS.length} final />
      </div>
    </div>
  );
}
