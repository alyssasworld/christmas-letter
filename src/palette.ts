// Shared palette. Colours marked (owner) are taken from the supplied sprites; the rest fill gaps (sky, paper, glass).
export const PALETTE = {
  black: '#000000', // owner: cat
  catBrown: '#351c10', // owner: cat shading
  catTan: '#72432c', // owner: cat highlight
  ink: '#2b2b2b', // owner: cat whisker grey-black, used for outlines/text
  grey: '#868585', // owner: cat
  snowWhite: '#ffffff', // owner: tree snow
  snowShade: '#d1d1d1', // owner: tree snow shadow
  treeGreen: '#486914', // owner: tree
  ornBlue: '#6d94ff', // owner: tree ornament, also the airmail blue
  ornYellow: '#ffeb14', // owner: tree ornament
  ornOrange: '#e57a44', // owner: tree ornament
  ornPink: '#ea99f4', // owner: tree ornament
  baseDark: '#a93927', // owner: globe base
  baseMid: '#c44935', // owner: globe base, also the airmail red
  baseLight: '#d75945', // owner: globe base
  cream: '#f4efe6', // sketch paper
  creamShade: '#e6dccb',
  creamDeep: '#cdbfa8',
  glass: '#9ac4d0', // owner: dome glass
  glassLight: '#86a2ac', // owner: dome inner rim
  glassShine: '#d2ebf2', // owner: dome shine
  domeOutline: '#65838e', // owner: dome outline
  snowMid: '#eaeaea', // owner: dome ground snow
} as const;

export type PaletteKey = keyof typeof PALETTE;
export const AIRMAIL_RED = PALETTE.baseMid;
export const AIRMAIL_BLUE = PALETTE.ornBlue;
