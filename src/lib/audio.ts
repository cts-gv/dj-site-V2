import { musicTracks, musicClip } from "@/config";

/**
 * Site-wide music engine (no framework).
 *  - One <audio> element, created only after a visitor opts in, so nothing is downloaded before that.
 *  - Every track plays a short clip (musicClip in config.ts) starting at an offset, fading in at the
 *    start and out at the end, then moves on to the next track.
 *  - Shuffle uses a "bag": every track plays once before any repeats, and the
 *    first song of a new bag is never the one that just finished.
 *  - An AnalyserNode is exposed for the equalizer visualizer.
 * Any script or island can import this and call subscribe()/getState()/actions.
 */

export type AudioState = {
  current: number;
  isPlaying: boolean;
  /** True once music has been started at least once (keeps the dock visible while paused). */
  hasStarted: boolean;
  muted: boolean;
  volume: number;
  shuffle: boolean;
  analyser: AnalyserNode | null;
};

const tracks = musicTracks;
let state: AudioState = {
  current: 0,
  isPlaying: false,
  hasStarted: false,
  muted: false,
  volume: 0.1,
  shuffle: true,
  analyser: null,
};

const listeners = new Set<() => void>();
function set(patch: Partial<AudioState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export const getState = () => state;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const resolve = (src: string) => `${BASE}${src.replace(/^\//, "")}`;

let audio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let bag: number[] = [];
const history: number[] = [];

// --- clip window for the current track ---
let ready = false; // true once we have jumped to the clip start (audio is silent until then)
let clipStart = 0; // seconds into the file where the clip begins
let clipLen = musicClip.lengthSeconds; // seconds the clip plays
let ticker = 0; // interval id
let failures = 0; // consecutive load errors, so a playlist of bad files cannot loop forever

function makeBag(n: number, avoid?: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (avoid !== undefined && n > 1 && a[0] === avoid) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

function setGain(v: number) {
  if (!gain || !ctx) return;
  // short smoothing time constant avoids clicks between 50 ms updates
  gain.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
}

function silenceNow() {
  if (!gain || !ctx) return;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
}

/** Runs ~20x/second while playing: sets the fade level from the position and ends the clip. */
function tick() {
  const a = audio;
  if (!a || a.paused || !ready) return;
  const elapsed = a.currentTime - clipStart;
  const remaining = clipLen - elapsed;
  if (remaining <= 0) {
    next();
    return;
  }
  const fade = Math.max(0.05, Math.min(musicClip.fadeSeconds, clipLen / 2));
  setGain(Math.max(0, Math.min(1, elapsed / fade, remaining / fade)));
}

function startTicker() {
  if (!ticker) ticker = window.setInterval(tick, 50);
}
function stopTicker() {
  if (ticker) window.clearInterval(ticker);
  ticker = 0;
}

function getAudio(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.preload = "auto";
  a.volume = state.volume;
  a.muted = state.muted;
  a.addEventListener("play", () => {
    set({ isPlaying: true, hasStarted: true });
    startTicker();
  });
  a.addEventListener("pause", () => {
    set({ isPlaying: false });
    stopTicker();
  });
  a.addEventListener("playing", () => {
    failures = 0;
  });
  // Once the file's length is known, work out the clip window and jump to its start.
  a.addEventListener("loadedmetadata", () => {
    const dur = a.duration;
    const requested = tracks[state.current]?.start ?? musicClip.startSeconds;
    if (Number.isFinite(dur) && dur > 0) {
      // keep the whole clip inside the file; if the file is short, start at the beginning
      clipStart = Math.max(0, Math.min(requested, dur - musicClip.lengthSeconds));
      clipLen = Math.min(musicClip.lengthSeconds, dur - clipStart);
    } else {
      clipStart = 0;
      clipLen = musicClip.lengthSeconds;
    }
    if (clipStart > 0) a.currentTime = clipStart;
    ready = true;
  });
  a.addEventListener("ended", () => next()); // backup for very short files
  a.addEventListener("error", () => {
    // skip unplayable/missing files, but stop after a full pass of failures
    failures++;
    if (failures >= tracks.length) {
      failures = 0;
      set({ isPlaying: false });
      return;
    }
    next();
  });
  audio = a;
  return a;
}

/** Hook the element into Web Audio so the visualizer can read it and we can fade. Same-origin files only. */
function ensureAnalyser() {
  const a = getAudio();
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const c = new AC();
    const src = c.createMediaElementSource(a);
    const g = c.createGain();
    g.gain.value = 0; // silent until the clip has been positioned
    const node = c.createAnalyser();
    node.fftSize = 512;
    node.smoothingTimeConstant = 0.72;
    src.connect(g);
    g.connect(node);
    node.connect(c.destination);
    ctx = c;
    gain = g;
    set({ analyser: node });
    if (c.state === "suspended") void c.resume();
  } catch {
    /* No Web Audio: clips still work, just without fades, and the visualizer simulates bars. */
  }
}

function load(index: number, autoplay: boolean) {
  const a = getAudio();
  ready = false; // silent and idle until loadedmetadata has set the clip window
  silenceNow();
  set({ current: index });
  a.src = resolve(tracks[index].src);
  if (autoplay) {
    ensureAnalyser();
    silenceNow();
    a.play().catch(() => set({ isPlaying: false }));
  }
}

function pickNext(): number {
  const n = tracks.length;
  if (!state.shuffle) return (state.current + 1) % n;
  if (bag.length === 0) bag = makeBag(n, state.current);
  return bag.shift() as number;
}

export function next() {
  history.push(state.current);
  load(pickNext(), true);
}

export function prev() {
  const a = getAudio();
  // Within first 3s of the clip -> previous song; otherwise restart this clip.
  if (ready && a.currentTime - clipStart > 3) {
    a.currentTime = clipStart;
    return;
  }
  load(history.pop() ?? state.current, true);
}

/** Must be called from a click handler (browser autoplay rules). */
export function start() {
  // Begin on a random track so each visit sounds different.
  bag = makeBag(tracks.length);
  const first = state.shuffle ? (bag.shift() as number) : 0;
  load(first, true);
}

export function toggle() {
  const a = getAudio();
  if (!a.src) return start();
  ensureAnalyser();
  if (a.paused) a.play().catch(() => {});
  else a.pause();
}

export function toggleMute() {
  const muted = !state.muted;
  if (audio) audio.muted = muted;
  set({ muted });
}

export function setVolume(v: number) {
  if (audio) {
    audio.volume = v;
    if (v > 0) audio.muted = false;
  }
  set({ volume: v, ...(v > 0 ? { muted: false } : {}) });
}

export function toggleShuffle() {
  bag = [];
  set({ shuffle: !state.shuffle });
}
