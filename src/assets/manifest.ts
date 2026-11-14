// Every asset's native size and anchor, in art pixels. Layout code reads only from here (SPEC §4.1).
// Owner sprites were supplied as co-registered 96x120 frames; offsets below place the cropped PNGs back in that frame.

export const GLOBE_FRAME = { w: 96, h: 120 } as const;

// Owner's dome is a slightly wide ellipse (sprite bbox x1-94, y16-100). Interior = inside the 2px outline; snow stays in here.
export const DOME = { cx: 47.5, cy: 58, rx: 44, ry: 40 } as const;
export const GROUND_Y = 78; // top of the dome's snowy ground at the centre column; flakes settle here

export const ASSETS = {
  globeBack: { src: 'assets/globe-back.png', w: 96, h: 120, x: 0, y: 0 },
  globeFront: { src: 'assets/globe-front.png', w: 96, h: 120, x: 0, y: 0 },
  globeBase: { src: 'assets/globe-base.png', w: 71, h: 20, x: 12, y: 94 },
  tree: { src: 'assets/tree.png', w: 48, h: 49, x: 24, y: 32 },
  // Cat sits on top of the dome, slightly right (owner's answer to open question 1).
  cat: { src: 'assets/cat-sheet.png', w: 40, h: 26, frames: 3, x: 44, y: 5, fps: 4 },
  shadow: { src: 'assets/shadow.png', w: 64, h: 8 },
  snow: { src: 'assets/snow-sheet.png', cell: 8, frames: 4 }, // flake sizes 1,3,5,7
  letterBorder: { src: 'assets/letter-border.png', w: 24, h: 24, inset: 8 }, // 9-slice; stripe period 8
  letterPaper: { src: 'assets/letter-paper.png', w: 8, h: 8 },
  envelope: { src: 'assets/envelope-sheet.png', w: 64, h: 44, frames: 4 },
  stamp: { src: 'assets/stamp.png', w: 16, h: 20 },
  button: {
    src: 'assets/button-sheet.png',
    css: (state: 'normal' | 'hover' | 'pressed') => `assets/button-${state}.png`,
    w: 48,
    h: 18,
    states: ['normal', 'hover', 'pressed'],
    inset: { t: 3, r: 3, b: 4, l: 3 },
  },
  icons: { src: 'assets/icons.png', cell: 8, names: ['picture', 'soundOn', 'soundOff', 'upload', 'camera', 'shake', 'save', 'envelope'] },
} as const;

// Owner decision: the person stands in the middle of the globe, in front of the tree. x = centre column.
export const PHOTO_SLOT = { x: Math.round(DOME.cx), bottom: GROUND_Y + 1, maxW: 30, maxH: 44 } as const;

// Owner backgrounds, native size (supplied at 5x). Pick the variant whose aspect best matches the viewport,
// then cover it at an integer scale. All six are in the picker until the owner chooses which ship.
// sillY = top row of the cream windowsill (same in all six scenes), so the globe can stand on it.
export const BG_VARIANTS = {
  desktop: { w: 384, h: 216, sillY: 149 },
  laptop: { w: 384, h: 240, sillY: 167 },
  mobile: { w: 216, h: 384, sillY: 237 },
} as const;
export const BACKGROUNDS = [
  'christmas-cabin',
  'christmas-village',
  'enchanted-forest',
  'frozen-lake',
  'northern-lights',
  'winter-railway-station',
] as const;
export const bgSrc = (id: (typeof BACKGROUNDS)[number], v: keyof typeof BG_VARIANTS) => `assets/bg-${id}-${v}.png`;

// Pixelta: 1 font pixel = 30 units at 1000 upm, so it's crisp at font-size n * 100/3 px (device px). Cap height = 22 font px.
export const FONT = { family: 'Pixelta', unitsPerPixel: 30, unitsPerEm: 1000, capPx: 22, nativeSize: 100 / 3 } as const;
