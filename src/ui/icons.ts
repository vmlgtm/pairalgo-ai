/**
 * Zero-dependency SVG Icon Registry
 * Clean, lightweight, monochrome SVG icons styled after Lucide / Radix.
 * All icons inherit `currentColor` and use consistent stroke geometry.
 */

export interface IconOptions {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function svg(
  paths: string,
  { size = 14, className = 'icon', strokeWidth = 1.75 }: IconOptions = {}
): string {
  const cls = className ? ` class="${className}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${cls}>${paths}</svg>`;
}

export const iconBot = (opts?: IconOptions) =>
  svg(
    `<rect width="18" height="14" x="3" y="6" rx="2"/><path d="M12 2v4"/><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M7 16h10"/>`,
    opts
  );

export const iconTarget = (opts?: IconOptions) =>
  svg(
    `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
    opts
  );

export const iconPlay = (opts?: IconOptions) =>
  svg(`<polygon points="6 3 20 12 6 21 6 3"/>`, opts);

export const iconLightbulb = (opts?: IconOptions) =>
  svg(
    `<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>`,
    opts
  );

export const iconFlame = (opts?: IconOptions) =>
  svg(
    `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`,
    opts
  );

export const iconLock = (opts?: IconOptions) =>
  svg(
    `<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
    opts
  );

export const iconCopy = (opts?: IconOptions) =>
  svg(
    `<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`,
    opts
  );

export const iconCheck = (opts?: IconOptions) =>
  svg(`<polyline points="20 6 9 17 4 12"/>`, opts);

export const iconTerminal = (opts?: IconOptions) =>
  svg(`<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>`, opts);

export const iconActivity = (opts?: IconOptions) =>
  svg(`<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`, opts);

export const iconClock = (opts?: IconOptions) =>
  svg(`<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`, opts);

export const iconFileText = (opts?: IconOptions) =>
  svg(
    `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>`,
    opts
  );

export const iconFlask = (opts?: IconOptions) =>
  svg(
    `<path d="M10 2v7.31a2 2 0 0 1-.37 1.15l-4.26 6.39A2 2 0 0 0 7 20h10a2 2 0 0 0 1.63-3.15l-4.26-6.39A2 2 0 0 1 14 9.31V2"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 0 0-4 0"/>`,
    opts
  );

export const iconArrowRight = (opts?: IconOptions) =>
  svg(`<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`, opts);

export const iconArrowLeft = (opts?: IconOptions) =>
  svg(`<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>`, opts);

export const iconRotateCcw = (opts?: IconOptions) =>
  svg(`<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>`, opts);

export const iconSparkles = (opts?: IconOptions) =>
  svg(
    `<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>`,
    opts
  );

export const iconTrophy = (opts?: IconOptions) =>
  svg(
    `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
    opts
  );

export const iconCpu = (opts?: IconOptions) =>
  svg(
    `<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>`,
    opts
  );

export const iconExternalLink = (opts?: IconOptions) =>
  svg(
    `<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>`,
    opts
  );

export const iconCheckCircle = (opts?: IconOptions) =>
  svg(`<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>`, opts);

export const iconXCircle = (opts?: IconOptions) =>
  svg(`<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>`, opts);
