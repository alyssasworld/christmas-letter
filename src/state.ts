// Persisted preferences only (SPEC §9: never photos). Storage can throw or be empty (private mode), so every access is guarded.
import { SONGS } from './audio/songs.ts';
import { BACKGROUNDS } from './assets/manifest.ts';
import { DEFAULT_MESSAGE } from './render/text.ts';

const PREFIX = 'shake-a-memory:';
function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* storage unavailable: preference just isn't remembered */
  }
}

export type BackgroundId = (typeof BACKGROUNDS)[number];

export const prefs = {
  get background(): BackgroundId {
    const v = read('background');
    return (BACKGROUNDS as readonly string[]).includes(v ?? '') ? (v as BackgroundId) : BACKGROUNDS[0];
  },
  set background(v: BackgroundId) {
    write('background', v);
  },
  get soundOn(): boolean {
    return read('sound') !== 'off';
  },
  set soundOn(v: boolean) {
    write('sound', v ? 'on' : 'off');
  },
  get song(): number {
    const v = Number(read('song'));
    return Number.isInteger(v) && v >= 0 && v < SONGS.length ? v : 0;
  },
  set song(v: number) {
    write('song', String(v));
  },
  // letter text (SPEC §9 allows the last message and name); callers sanitise
  get message(): string {
    return read('message') ?? DEFAULT_MESSAGE;
  },
  set message(v: string) {
    write('message', v);
  },
  get name(): string {
    return read('name') ?? '';
  },
  set name(v: string) {
    write('name', v);
  },
};
