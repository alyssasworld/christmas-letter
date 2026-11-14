// Public-domain carols (SPEC §5) as [midi note or null for a rest, beats][]. C5 = 72.
export interface Song {
  title: string;
  bpm: number;
  notes: [number | null, number][];
}

// C major, at C5-ish pitch
const [C, D, E, F, G] = [72, 74, 76, 77, 79];
const [Fs, A, B, C6] = [78, 81, 83, 84];
const B4 = 71;

const deckLine: [number, number][] = [
  [G, 1.5],
  [F, 0.5],
  [E, 1],
  [D, 1],
  [C, 1],
  [D, 1],
  [E, 1],
  [C, 1],
  [D, 0.5],
  [E, 0.5],
  [F, 0.5],
  [D, 0.5],
  [E, 1.5],
  [D, 0.5],
  [C, 1],
  [B4, 1],
  [C, 2],
];

export const SONGS: Song[] = [
  {
    title: 'Jingle Bells',
    bpm: 150,
    // chorus, twice through with the two different endings
    notes: [
      // Jingle bells, jingle bells, jingle all the way
      [E, 1],
      [E, 1],
      [E, 2],
      [E, 1],
      [E, 1],
      [E, 2],
      [E, 1],
      [G, 1],
      [C, 1.5],
      [D, 0.5],
      [E, 4],
      // Oh what fun it is to ride in a one-horse open sleigh, hey!
      [F, 1],
      [F, 1],
      [F, 1.5],
      [F, 0.5],
      [F, 1],
      [E, 1],
      [E, 1],
      [E, 0.5],
      [E, 0.5],
      [E, 1],
      [D, 1],
      [D, 1],
      [E, 1],
      [D, 2],
      [G, 2],
      // Jingle bells, jingle bells, jingle all the way
      [E, 1],
      [E, 1],
      [E, 2],
      [E, 1],
      [E, 1],
      [E, 2],
      [E, 1],
      [G, 1],
      [C, 1.5],
      [D, 0.5],
      [E, 4],
      // Oh what fun it is to ride in a one-horse open sleigh
      [F, 1],
      [F, 1],
      [F, 1.5],
      [F, 0.5],
      [F, 1],
      [E, 1],
      [E, 1],
      [E, 0.5],
      [E, 0.5],
      [G, 1],
      [G, 1],
      [F, 1],
      [D, 1],
      [C, 4],
    ],
  },
  {
    title: 'Deck the Halls',
    bpm: 120,
    notes: [
      // Deck the halls with boughs of holly, fa la la la la, la la la la (twice)
      ...deckLine,
      ...deckLine,
      // Don we now our gay apparel
      [D, 1.5],
      [E, 0.5],
      [F, 1],
      [D, 1],
      [E, 1.5],
      [F, 0.5],
      [G, 1],
      [D, 1],
      // Fa la la, la la la, la la la
      [E, 0.5],
      [Fs, 0.5],
      [G, 1],
      [A, 0.5],
      [B, 0.5],
      [C6, 1],
      [B, 1],
      [A, 1],
      [G, 2],
      // Troll the ancient Yuletide carol, fa la la la la, la la la la
      ...deckLine,
    ],
  },
  {
    title: 'We Wish You a Merry Christmas',
    bpm: 150,
    // G major, 3/4, one pickup note
    notes: [
      [74, 1],
      [79, 1],
      [79, 0.5],
      [81, 0.5],
      [79, 0.5],
      [78, 0.5],
      [76, 1],
      [76, 1],
      [76, 1],
      [81, 1],
      [81, 0.5],
      [83, 0.5],
      [81, 0.5],
      [79, 0.5],
      [78, 1],
      [74, 1],
      [74, 1],
      [83, 1],
      [83, 0.5],
      [84, 0.5],
      [83, 0.5],
      [81, 0.5],
      [79, 1],
      [76, 1],
      [74, 0.5],
      [74, 0.5],
      [76, 1],
      [81, 1],
      [78, 1],
      [79, 3],
    ],
  },
];
