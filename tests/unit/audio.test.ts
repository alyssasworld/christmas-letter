import { describe, expect, it } from 'vitest';
import { THRESHOLD, tempoFor, volumeFor } from '../../src/audio/musicbox.ts';
import { SONGS } from '../../src/audio/songs.ts';

describe('energy curves', () => {
  it('tempo is 1 at full energy and about 0.6 at the threshold', () => {
    expect(tempoFor(1)).toBe(1);
    expect(tempoFor(THRESHOLD)).toBeCloseTo(0.6);
  });
  it('are monotonic in energy', () => {
    for (const f of [tempoFor, volumeFor]) {
      let prev = -Infinity;
      for (let e = 0; e <= 1; e += 0.01) {
        expect(f(e)).toBeGreaterThanOrEqual(prev);
        prev = f(e);
      }
    }
  });
  it('mid energy is still audible', () => expect(volumeFor(0.25)).toBeGreaterThan(0.15));
});

describe('songs', () => {
  it('has Jingle Bells first', () => expect(SONGS[0].title).toBe('Jingle Bells'));
  it.each(SONGS)('$title is well formed', ({ bpm, notes }) => {
    expect(bpm).toBeGreaterThan(0);
    expect(notes.length).toBeGreaterThan(0);
    for (const [midi, beats] of notes) {
      expect(beats).toBeGreaterThan(0);
      if (midi !== null) expect(midi).toBeGreaterThanOrEqual(71); // B4 up
      if (midi !== null) expect(midi).toBeLessThanOrEqual(96); // C7
    }
  });
});
