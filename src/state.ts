// Persisted preferences only (SPEC §9: never photos). Storage can throw or be empty (private mode), so every access is guarded.
import { BACKGROUNDS } from './assets/manifest.ts';

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
};
