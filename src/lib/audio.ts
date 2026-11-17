import { musicTracks } from "@/config";

/**
 * Site-wide music engine (no framework).
 *  - One <audio> element, created only after a visitor opts in, so nothing is downloaded before that.
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
  volume: 0.7,
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

const resolve = (src: string) => `${import.meta.env.BASE_URL}${src.replace(/^\//, "")}`;

let audio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let bag: number[] = [];
const history: number[] = [];

function makeBag(n: number, avoid?: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (avoid !== undefined && n > 1 && a[0] === avoid) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

function getAudio(): HTMLAudioElement {
  if (audio) return audio;
  const a = new Audio();
  a.preload = "auto";
  a.volume = state.volume;
  a.muted = state.muted;
  a.addEventListener("play", () => set({ isPlaying: true, hasStarted: true }));
  a.addEventListener("pause", () => set({ isPlaying: false }));
  a.addEventListener("ended", () => next());
  a.addEventListener("error", () => next()); // skip unplayable/missing files
  audio = a;
  return a;
}

/** Hook the element into Web Audio so the visualizer can read it. Same-origin files only. */
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
    const node = c.createAnalyser();
    node.fftSize = 512;
    node.smoothingTimeConstant = 0.72;
    src.connect(node);
    node.connect(c.destination);
    ctx = c;
    set({ analyser: node });
    if (c.state === "suspended") void c.resume();
  } catch {
    /* Visualizer falls back to simulated bars. */
  }
}

function load(index: number, autoplay: boolean) {
  const a = getAudio();
  set({ current: index });
  a.src = resolve(tracks[index].src);
  if (autoplay) {
    ensureAnalyser();
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
  // Within first 3s -> previous song; otherwise restart this one.
  if (a.currentTime > 3) {
    a.currentTime = 0;
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
