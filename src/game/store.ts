import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SectionId } from '../data/world';

export type Tier = 'low' | 'med' | 'high';
export type Phase = 'intro' | 'flying' | 'docked';

interface Toast {
  id: number;
  text: string;
}

export interface GameState {
  phase: Phase;
  dockedId: SectionId | null;
  panel: SectionId | null;
  nearId: SectionId | null;
  autopilot: SectionId | null;
  visited: SectionId[];
  arcadeUnlocked: boolean;
  bestBelt: number | null;
  /** Docking in progress: the ship is lining up; the panel opens when it ends. */
  landing: boolean;
  sound: boolean;
  /** Project card to bring into view when the Project System panel opens. */
  focusProject: string | null;
  achievements: string[];
  photo: boolean;
  belt: { active: boolean; time: number; hull: number };
  beltNear: boolean;
  mapOpen: boolean;
  helpOpen: boolean;
  toasts: Toast[];
  tier: Tier;
  touch: boolean;
  set: (p: Partial<GameState>) => void;
  toast: (text: string) => void;
  visit: (id: SectionId) => void;
}

function detect(): { tier: Tier; touch: boolean } {
  if (typeof window === 'undefined') return { tier: 'high', touch: false };
  const touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  let tier: Tier = touch ? (mem <= 4 || cores <= 4 ? 'low' : 'med') : 'high';
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'med' || q === 'high') tier = q;
  return { tier, touch };
}

let toastId = 0;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      phase: 'intro',
      dockedId: null,
      panel: null,
      nearId: null,
      autopilot: null,
      visited: [],
      arcadeUnlocked: false,
      bestBelt: null,
      landing: false,
      sound: false,
      focusProject: null,
      achievements: [],
      photo: false,
      belt: { active: false, time: 0, hull: 100 },
      beltNear: false,
      mapOpen: false,
      helpOpen: false,
      toasts: [],
      ...detect(),
      set: (p) => set(p),
      toast: (text) => {
        const id = ++toastId;
        set({ toasts: [...get().toasts.slice(-2), { id, text }] });
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3400);
      },
      visit: (id) => {
        if (!get().visited.includes(id)) set({ visited: [...get().visited, id] });
      },
    }),
    {
      name: 'flight-log-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ visited: s.visited, arcadeUnlocked: s.arcadeUnlocked, bestBelt: s.bestBelt, sound: s.sound, achievements: s.achievements }),
    },
  ),
);
