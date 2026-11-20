// Music-box synth (SPEC §5): plays the current carol, driven by snow energy (volume and tempo wind-down).
import { prefs } from '../state.ts';
import { SONGS } from './songs.ts';

/** Below this energy the box is paused. */
export const THRESHOLD = 0.03;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Tempo multiplier: 1 from energy 0.5 up, easing down to 0.6 at the threshold. */
export const tempoFor = (e: number) => 0.6 + 0.4 * clamp01((e - THRESHOLD) / (0.5 - THRESHOLD));
/** Master gain: square-root curve so mid energy stays audible. */
export const volumeFor = (e: number) => 0.35 * Math.sqrt(clamp01(e));

const AHEAD = 0.1; // schedule this far past currentTime (s)
const DECAY = 1.5; // body decay (s)

function note(ctx: AudioContext, out: AudioNode, midi: number, t: number) {
  const f = 440 * 2 ** ((midi - 69) / 12);
  // fundamental rings long; the 4x partial is the short "tine" ping
  for (const [mult, peak, decay] of [
    [1, 0.5, DECAY],
    [4, 0.12, 0.25],
  ]) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

export function createMusicBox() {
  let ctx: AudioContext | undefined;
  let master: GainNode;
  let energy = 0;
  let on = prefs.soundOn;
  let song = 0; // every visit starts with Jingle Bells
  let idx = 0;
  let next = 0;
  let playing = false;

  function tick() {
    if (!ctx) return;
    const active = on && !document.hidden && energy > THRESHOLD;
    master.gain.setTargetAtTime(active ? volumeFor(energy) : 0, ctx.currentTime, 0.1);
    if (!active) return void (playing = false);
    if (!playing) next = ctx.currentTime + 0.05; // resume without replaying a backlog
    playing = true;
    while (next < ctx.currentTime + AHEAD) {
      const { bpm, notes } = SONGS[song];
      const [midi, beats] = notes[idx];
      if (midi !== null) note(ctx, master, midi, next);
      next += (beats * 60) / (bpm * tempoFor(energy));
      if (++idx >= notes.length) {
        idx = 0;
        song = (song + 1) % SONGS.length;
      }
    }
  }

  function start() {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      // light shimmer: short feedback delay mixed in quietly
      const delay = ctx.createDelay(0.5);
      delay.delayTime.value = 0.12;
      const fb = ctx.createGain();
      fb.gain.value = 0.3;
      const wet = ctx.createGain();
      wet.gain.value = 0.25;
      master.connect(ctx.destination);
      master.connect(delay).connect(fb).connect(delay);
      delay.connect(wet).connect(ctx.destination);
      setInterval(tick, 25);
    }
    void ctx.resume().then(() => {
      if (ctx!.state === 'running') for (const ev of GESTURES) removeEventListener(ev, start);
    });
  }
  // nothing may sound before the first user gesture (SPEC §10); keep listening until the context is running
  const GESTURES = ['pointerdown', 'pointerup', 'keydown'];
  for (const ev of GESTURES) addEventListener(ev, start);

  return {
    setEnergy(e: number) {
      energy = e;
    },
    setSound(v: boolean) {
      on = v;
      tick();
    },
  };
}
