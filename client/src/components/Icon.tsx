import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  home: <><path d="M3 11L12 4l9 7" /><path d="M5 10v9h14v-9" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="M16 8l-2 6-6 2 2-6z" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 17l9 5 9-5" /></>,
  radio: <><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 010 8.48" /><path d="M7.76 16.24a6 6 0 010-8.48" /><path d="M20.49 4.51a10 10 0 010 14.97" /><path d="M3.51 19.49a10 10 0 010-14.97" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><circle cx="16" cy="9" r="3" /><path d="M21 19c0-2-2-3.5-5-3.5" /></>,
  bar: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-6" /><path d="M22 20H2" /></>,
  sparkle: <><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="M5.6 5.6l2.8 2.8" /><path d="M15.6 15.6l2.8 2.8" /><path d="M5.6 18.4l2.8-2.8" /><path d="M15.6 8.4l2.8-2.8" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>,
  bell: <><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 004 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></>,
  arrowUp: <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>,
  arrowDown: <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>,
  check: <><path d="M4 12l5 5L20 6" /></>,
  x: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  chevR: <><path d="M9 6l6 6-6 6" /></>,
  chevD: <><path d="M6 9l6 6 6-6" /></>,
  play: <><path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none" /></>,
  pause: <><path d="M7 4v16" /><path d="M17 4v16" /></>,
  spinner: <><path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" /></>,
  file: <><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4" /></>,
  send: <><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></>,
  expand: <><path d="M4 14v6h6" /><path d="M20 10V4h-6" /><path d="M20 4l-7 7" /><path d="M4 20l7-7" /></>,
  book: <><path d="M4 4v16a2 2 0 002 2h14V2H6a2 2 0 00-2 2z" /><path d="M8 6h10" /><path d="M8 10h10" /></>,
  rocket: <><path d="M5 19l-2 2 4-1 1-4z" /><path d="M14 3l7 7-9 10-5-1-2-2 1-5z" /><circle cx="14" cy="10" r="2" /></>,
  pen: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" /></>,
  fire: <><path d="M12 22c4 0 7-3 7-7 0-2.5-1.5-4-3-5.5-2-2-2-4.5-1-7 0 0-5 2-7 7-1 2.5-2 3-2 5.5C6 19 8 22 12 22z" /></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>,
  git: <><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" /><path d="M6 8v8" /><path d="M16 12H8.5a2.5 2.5 0 01-2.5-2.5V8" /></>,
  flag: <><path d="M4 22V4" /><path d="M4 4h12l-2 5 2 5H4" /></>,
  download: <><path d="M12 3v14" /><path d="M5 12l7 7 7-7" /><path d="M3 21h18" /></>,
  msg: <><path d="M21 12a8 8 0 01-11.7 7L4 21l1-5.3A8 8 0 1121 12z" /></>,
  zap: <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><circle cx="3.5" cy="6" r="1" fill="currentColor" /><circle cx="3.5" cy="12" r="1" fill="currentColor" /><circle cx="3.5" cy="18" r="1" fill="currentColor" /></>,
  refresh: <><path d="M4 4v6h6" /><path d="M20 20v-6h-6" /><path d="M20 10A8 8 0 005 5l-1 1" /><path d="M4 14a8 8 0 0015 4l1-1" /></>,
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" />,
  star: <><polygon points="12 2 15 9 22 9.3 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9.3 9 9 12 2" /></>,
  bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></>,
  link: <><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" /><path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></>,
  code: <><path d="M16 18l6-6-6-6" /><path d="M8 6l-6 6 6 6" /></>,
  palette: <><path d="M12 3a9 9 0 100 18 3 3 0 003-3 2 2 0 012-2h1a3 3 0 003-3 9 9 0 00-9-10z" /><circle cx="7.5" cy="10.5" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="16.5" cy="10.5" r="1" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5-9 9" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  phone: <><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z" /></>,
  logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  db: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" /><path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" /></>,
  activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
  layout: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></>,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /><path d="M9 21h6" /></>,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M8 4v16" /><path d="M16 4v16" /></>,
  cpu: <><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
  sliders: <><path d="M4 6h12" /><path d="M4 12h6" /><path d="M4 18h10" /><circle cx="18" cy="6" r="2" /><circle cx="14" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
};

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
}

export function Icon({ name, size = 16, stroke = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name] ?? null}
    </svg>
  );
}
