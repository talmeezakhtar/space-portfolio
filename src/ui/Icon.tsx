/**
 * One small drawn icon set: 24px grid, 1.6 stroke, round caps.
 * Replaces Unicode glyphs, which render differently on every device.
 */
const paths = {
  map: 'M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Zm0 0v13m6-10.5v13',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6M9 17h4',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  close: 'M6 6l12 12M18 6 6 18',
  takeoff: 'M12 19V5m0 0-6 6m6-6 6 6',
  arrow: 'M5 12h14m0 0-6-6m6 6-6 6',
  external: 'M14 4h6v6m0-6L10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  pointer: 'M4 12h15m0 0-5-5m5 5-5 5',
  alert: 'M12 4 2.5 20h19L12 4Zm0 6v4m0 3h.01',
  play: 'M7 5v14l11-7L7 5Z',
  sound: 'M4 9v6h4l5 4V5L8 9H4Zm12.5-.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9v6h4l5 4V5L8 9H4Zm12 1 5 5m0-5-5 5',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  cap: 'M2 9l10-5 10 5-10 5L2 9Zm4 2v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6',
  layers: 'M12 3 2 8l10 5 10-5-10-5ZM2 12l10 5 10-5M2 16l10 5 10-5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  gamepad: 'M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L14 15h-4l-1 .6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4Zm2 2v4m-2-2h4m6-1h.01M18 13h.01',
  radio: 'M12 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm0 0v9M7.8 6.3a6 6 0 0 0 0 8.4m8.4 0a6 6 0 0 0 0-8.4M5 3.5a10 10 0 0 0 0 14m14 0a10 10 0 0 0 0-14',
  cloud: 'M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  code: 'm8 8-4 4 4 4m8-8 4 4-4 4m-6 3 4-14',
  cube: 'M12 3 4 7.5v9L12 21l8-4.5v-9L12 3ZM4 7.5 12 12l8-4.5M12 12v9',
  store: 'M4 9h16l-1.5-5h-13L4 9Zm0 0v11h16V9M9 20v-6h6v6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4',
  pen: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  rocket: 'M9.5 14.5 7 12c2-5 6-8 13-9-1 7-4 11-9 13l-1.5-1.5ZM7 17c-1.5.5-3 2-3 3.5 1.5 0 3-1.5 3.5-3M15 9h.01',
  pin: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  move: 'M12 3v18M3 12h18M12 3 9 6m3-3 3 3m-3 15-3-3m3 3 3-3M3 12l3-3m-3 3 3 3m15-3-3-3m3 3-3 3',
  bolt: 'M13 3 4 14h7l-1 7 9-11h-7l1-7Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-3.5h.01',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v4h4m5-1v5l3 2',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = 'icon' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
