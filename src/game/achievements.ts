import { ROUTE } from '../data/world';
import { chime } from './audio';
import { useGame } from './store';

export const ACHIEVEMENTS = [
  { id: 'route', name: 'Full flight log', how: 'Land at every stop on the route' },
  { id: 'run', name: 'Rock hopper', how: 'Clear the Asteroid Run' },
  { id: 'fast', name: 'Thread the needle', how: 'Clear the run in under 12 seconds' },
  { id: 'horizon', name: 'Past the horizon', how: 'Land at the Event Horizon' },
  { id: 'moon', name: 'Moonwalker', how: 'Fly to a project from its moon' },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

export function award(id: AchievementId) {
  const s = useGame.getState();
  if (s.achievements.includes(id)) return;
  s.set({ achievements: [...s.achievements, id] });
  const a = ACHIEVEMENTS.find((x) => x.id === id)!;
  s.toast(`Achievement unlocked: ${a.name}`);
  chime();
}

/** Called after every landing. */
export function checkRoute() {
  const { visited } = useGame.getState();
  if (ROUTE.every((r) => visited.includes(r))) award('route');
}
