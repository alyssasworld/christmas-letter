// SPEC §7 viewport matrix, both orientations, at typical device pixel ratios.
const SIZES: [number, number, number][] = [
  [320, 568, 2],
  [375, 667, 2],
  [390, 844, 3],
  [430, 932, 3],
  [768, 1024, 2],
  [1024, 768, 2],
  [1280, 800, 2],
  [1440, 900, 2],
  [1920, 1080, 1],
  [2560, 1440, 1],
];
// both orientations, de-duplicated (768x1024 and 1024x768 are both already listed)
export const VIEWPORTS = [
  ...new Map(
    SIZES.flatMap(([w, h, dpr]) => [
      [w, h, dpr],
      [h, w, dpr],
    ]).map((v) => [v.join(), v]),
  ).values(),
].map(([w, h, dpr]) => ({ w, h, dpr }));
