import { useEffect, useRef } from "react";
import { useMusic } from "@/lib/useMusic";

/**
 * LED spectrum analyzer that fills whatever space the dock gives it.
 * Segmented bars + falling peak-hold caps, indigo → violet → pink.
 * Reads real audio via the AnalyserNode; if the browser can't provide data
 * (e.g. cross-origin audio files), it falls back to a lively simulated spectrum.
 */

const SEG_GAP = 2;
// Most MP3s are low-passed around 15–16 kHz, so bins above that are always empty.
// Only map bars onto frequencies that can actually carry signal.
const MAX_HZ = 14000;

// bottom → top colour stops (indigo, violet, pink)
const STOPS: [number, number, number][] = [
  [99, 102, 241],
  [168, 85, 247],
  [236, 72, 153],
];

function colorAt(k: number): [number, number, number] {
  const t = Math.min(0.9999, Math.max(0, k)) * (STOPS.length - 1);
  const i = Math.floor(t);
  const f = t - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export default function Visualizer() {
  const { analyser, isPlaying } = useMusic();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levels = useRef<number[]>([]);
  const peaks = useRef<number[]>([]);
  const peakVel = useRef<number[]>([]);
  const silentFrames = useRef(0);
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    let width = 0;
    let height = 0;
    let segH = 5;
    let maxSegs = 1;
    let colors: string[] = [];
    let glows: string[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      segH = height >= 60 ? 5 : 3;
      maxSegs = Math.max(2, Math.floor((height + SEG_GAP) / (segH + SEG_GAP)));
      colors = [];
      glows = [];
      for (let s = 0; s < maxSegs; s++) {
        const [r, g, b] = colorAt(s / (maxSegs - 1));
        colors.push(`rgb(${r},${g},${b})`);
        glows.push(`rgba(${r},${g},${b},0.4)`);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const nyquist = (analyser?.context.sampleRate ?? 44100) / 2;
    let t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const bandCount = width < 420 ? 20 : width < 760 ? 32 : 48;
      if (levels.current.length !== bandCount) {
        levels.current = new Array(bandCount).fill(0);
        peaks.current = new Array(bandCount).fill(0);
        peakVel.current = new Array(bandCount).fill(0);
      }

      // --- gather target levels (0..1) ---
      const target = new Array(bandCount).fill(0);
      let usedReal = false;
      if (playingRef.current) {
        if (analyser && bins) {
          analyser.getByteFrequencyData(bins);
          let sum = 0;
          const usable = Math.max(
            bandCount,
            Math.min(bins.length, Math.floor(bins.length * Math.min(1, MAX_HZ / nyquist))),
          );
          for (let b = 0; b < bandCount; b++) {
            // log-ish mapping so the bass gets more bars
            const lo = Math.floor(Math.pow(b / bandCount, 1.8) * usable);
            const hi = Math.max(lo + 1, Math.floor(Math.pow((b + 1) / bandCount, 1.8) * usable));
            let m = 0;
            for (let i = lo; i < hi; i++) m = Math.max(m, bins[i]);
            // tilt so the (naturally quieter) highs still move
            target[b] = Math.min(1, (m / 255) * (0.9 + (b / bandCount) * 1.1));
            sum += m;
          }
          silentFrames.current = sum < 8 ? silentFrames.current + 1 : 0;
          usedReal = silentFrames.current < 90;
        }
        if (!usedReal) {
          const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 2.05)), 6);
          for (let b = 0; b < bandCount; b++) {
            const f = b / bandCount;
            const wob = 0.5 + 0.5 * Math.sin(t * (2.2 + b * 0.37) + b * 1.7);
            const wob2 = 0.5 + 0.5 * Math.sin(t * (4.1 + b * 0.21) + b * 0.9);
            target[b] = Math.min(1, (0.18 + 0.5 * wob * wob2 + 0.35 * beat * (1 - f)) * (1 - f * 0.45));
          }
        }
      }

      // --- physics: fast attack, slow decay, peak-hold with gravity ---
      let anyVisible = false;
      for (let b = 0; b < bandCount; b++) {
        const lv = levels.current[b];
        levels.current[b] = target[b] > lv ? lv + (target[b] - lv) * 0.55 : lv * 0.88;
        if (levels.current[b] < 0.004) levels.current[b] = 0;
        if (levels.current[b] > peaks.current[b]) {
          peaks.current[b] = levels.current[b];
          peakVel.current[b] = 0;
        } else {
          peakVel.current[b] += 0.0009;
          peaks.current[b] = Math.max(0, peaks.current[b] - peakVel.current[b]);
        }
        if (levels.current[b] > 0 || peaks.current[b] > 0) anyVisible = true;
      }

      // --- render ---
      ctx2d.clearRect(0, 0, width, height);
      const gap = width < 420 ? 3 : 4;
      const barW = (width - gap * (bandCount + 1)) / bandCount;
      for (let b = 0; b < bandCount; b++) {
        const x = gap + b * (barW + gap);
        const lit = Math.round(levels.current[b] * maxSegs);
        for (let s = 0; s < maxSegs; s++) {
          const y = height - (s + 1) * (segH + SEG_GAP) + SEG_GAP;
          if (s < lit) {
            ctx2d.fillStyle = colors[s];
            ctx2d.shadowColor = glows[s];
            ctx2d.shadowBlur = 4;
          } else {
            ctx2d.fillStyle = "rgba(255,255,255,0.045)";
            ctx2d.shadowBlur = 0;
          }
          ctx2d.fillRect(x, y, barW, segH);
        }
        // peak cap
        const ps = Math.min(maxSegs - 1, Math.round(peaks.current[b] * maxSegs));
        if (ps > 0 && ps >= lit) {
          const y = height - (ps + 1) * (segH + SEG_GAP) + SEG_GAP;
          ctx2d.fillStyle = "rgba(255,255,255,0.85)";
          ctx2d.shadowColor = "rgba(255,255,255,0.6)";
          ctx2d.shadowBlur = 5;
          ctx2d.fillRect(x, y, barW, segH);
        }
      }
      ctx2d.shadowBlur = 0;

      // stop the loop once everything has settled and music is off
      if (!playingRef.current && !anyVisible) {
        rafRef.current = 0;
        return;
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    const kick = () => {
      if (!rafRef.current) {
        t0 = performance.now();
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    kick();
    // restart whenever play state flips
    const iv = window.setInterval(() => playingRef.current && kick(), 500);

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      window.clearInterval(iv);
      ro.disconnect();
    };
  }, [analyser, isPlaying]);

  return (
    <div className="relative min-h-0 min-w-0 flex-1 px-1 py-1 sm:py-2" aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
