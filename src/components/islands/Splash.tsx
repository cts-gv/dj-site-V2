import { useEffect, useRef, useState } from "react";
import type { DiscoBall } from "@/lib/discoBall";
import { siteConfig } from "@/config";
import * as audio from "@/lib/audio";

/* ---------- decorative backdrop data (seeded, so it is identical on every render) ---------- */
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

type Twinkle = { x: number; y: number; size: number; star: boolean; color: string; glow: string; dur: number; delay: number };

// Small lights that fade up and down. Colours match the splash: white, indigo and pink.
const TW_COLORS = [
  { c: "#FFFFFF", g: "rgba(255,255,255,.75)" },
  { c: "#C7D2FE", g: "rgba(129,140,248,.85)" }, // cool
  { c: "#FBCFE8", g: "rgba(244,114,182,.85)" }, // warm
];

function makeTwinkles(seed: number, count: number, place: (r: () => number, i: number) => { x: number; y: number }, sizeMin: number, sizeRange: number, starChance: number): Twinkle[] {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const { x, y } = place(r, i);
    const tone = TW_COLORS[Math.floor(r() * TW_COLORS.length)];
    return {
      x,
      y,
      size: Math.round((sizeMin + r() * sizeRange) * 10) / 10,
      star: r() < starChance,
      color: tone.c,
      glow: tone.g,
      dur: 2.6 + r() * 3.4,
      delay: -r() * 6,
    };
  });
}

// Behind the content: mostly out at the sides and across the top, where they can be seen.
const TWINKLES_BACK = makeTwinkles(
  41,
  30,
  (r) => {
    const side = r() < 0.6;
    return { x: side ? (r() < 0.5 ? r() * 20 : 80 + r() * 20) : r() * 100, y: 2 + r() * 94 };
  },
  2,
  2.6,
  0.3,
);
// A few in front of the content, small and sparse, so they still twinkle on narrow screens.
const TWINKLES_FRONT = makeTwinkles(77, 7, (r) => ({ x: 6 + r() * 88, y: 8 + r() * 62 }), 1.8, 1.4, 0.15);

function Twinkles({ lights, className }: { lights: Twinkle[]; className: string }) {
  return (
    <div className={`twinkles ${className}`} aria-hidden="true">
      {lights.map((t, i) => (
        <span
          key={i}
          className={`twinkle ${t.star ? "star" : ""}`}
          style={
            {
              left: `${t.x}%`,
              top: `${t.y}%`,
              "--s": `${t.star ? t.size * 3.2 : t.size}px`,
              "--c": t.color,
              "--g": t.glow,
              "--d": `${t.dur}s`,
              "--delay": `${t.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

type Person = { cx: number; headY: number; r: number; arm: null | { side: number; hx: number; hy: number }; group: "a" | "b" | "c" };

function makeCrowd(seed: number, count: number, H: number, headMin: number, headRange: number, rMin: number, rRange: number): Person[] {
  const r = rng(seed);
  const step = 1440 / count;
  return Array.from({ length: count }, (_, i) => {
    const rad = rMin + r() * rRange;
    const headY = H - headMin - r() * headRange;
    const raised = r() > 0.62;
    const side = r() > 0.5 ? 1 : -1;
    return {
      cx: step * (i + 0.5) + (r() - 0.5) * step * 0.5,
      headY,
      r: rad,
      arm: raised ? { side, hx: (10 + r() * 24) * side, hy: headY - 26 - r() * 34 } : null,
      group: (["a", "b", "c"] as const)[i % 3],
    };
  });
}

const CROWD_FAR = makeCrowd(5, 30, 180, 78, 18, 10, 6);
const CROWD_NEAR = makeCrowd(17, 20, 180, 62, 24, 15, 7);

function Crowd({ people, fill, className }: { people: Person[]; fill: string; className: string }) {
  return (
    <svg className={`crowd ${className}`} viewBox="0 0 1440 180" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {(["a", "b", "c"] as const).map((g) => (
        <g key={g} className={`bob-${g}`} fill={fill} stroke={fill} strokeLinecap="round">
          {people
            .filter((p) => p.group === g)
            .map((p, i) => {
              const sy = p.headY + p.r + 14; // shoulder line
              const rx = p.r * 2.1;
              return (
                <g key={i}>
                  {p.arm && (
                    <>
                      <path d={`M${p.cx + p.arm.side * rx * 0.62},${sy + 4} L${p.cx + p.arm.side * rx * 0.62 + p.arm.hx},${p.arm.hy}`} fill="none" strokeWidth={p.r * 0.55} />
                      <circle cx={p.cx + p.arm.side * rx * 0.62 + p.arm.hx} cy={p.arm.hy} r={p.r * 0.42} stroke="none" />
                    </>
                  )}
                  <circle cx={p.cx} cy={p.headY} r={p.r} stroke="none" />
                  <ellipse cx={p.cx} cy={sy + 6} rx={rx} ry={rx * 0.85} stroke="none" />
                  <rect x={p.cx - rx} y={sy + 6} width={rx * 2} height={180} stroke="none" />
                </g>
              );
            })}
        </g>
      ))}
    </svg>
  );
}

/**
 * Splash / entry screen (formerly the standalone "dj-deck" site).
 * Visitors choose "Enter With Music" or "Enter Quietly".
 * The click handler runs synchronously so the browser allows audio to start.
 */
export default function Splash() {
  const [mode, setMode] = useState<"idle" | "music" | "quiet">("idle");
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLElement>(null);
  const ballRef = useRef<DiscoBall | null>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const partyStart = useRef<number | null>(null);

  // Beat clock for party mode: beats since "Enter With Music" was pressed (128 BPM, like the left deck).
  const getBeat = () => (partyStart.current === null ? 0 : ((performance.now() - partyStart.current) / 1000) * (128 / 60));

  // The page underneath is real, crawlable HTML. While the splash is up we keep it
  // out of the tab order and tell the CSS to hold the hero animation (see global.css).
  useEffect(() => {
    const root = document.documentElement;
    const page = document.getElementById("page");
    root.classList.add("splash-mounted");
    page?.setAttribute("inert", "");
    // move keyboard focus to the first choice
    rootRef.current?.querySelector<HTMLButtonElement>(".enter-music")?.focus({ preventScroll: true });
    return () => {
      page?.removeAttribute("inert");
    };
  }, []);

  const finish = () => {
    const root = document.documentElement;
    root.classList.remove("splash-pending");
    root.classList.add("splash-done");
    document.getElementById("page")?.removeAttribute("inert");
    setGone(true);
  };

  // The disco ball: hangs above the intro and throws spots of light across the screen (coloured beams too, in
  // party mode). Loaded lazily so the splash itself appears instantly.
  useEffect(() => {
    let cancelled = false;

    import("@/lib/discoBall")
      .then(({ mountDiscoBall }) =>
        mountDiscoBall({ host: mainRef.current ?? undefined, target: introRef.current }),
      )
      .then((ball) => {
        if (!ball) return;
        if (cancelled) {
          ball.destroy();
          return;
        }
        ballRef.current = ball;
        if (partyStart.current !== null) ball.setParty(true, getBeat); // they pressed Enter before it loaded
      })
      .catch(() => {
        /* no ball: the splash works fine without it */
      });

    return () => {
      cancelled = true;
      ballRef.current?.destroy();
      ballRef.current = null;
    };
  }, []);

  // Pressing "Enter With Music" throws the party: coloured beams, and the room pulses on the beat.
  useEffect(() => {
    if (mode !== "music") return;
    ballRef.current?.setParty(true, getBeat);
    const ROOM = ["#6B2BD9", "#A01F78", "#2E2FB0", "#8A2BE2"];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let lastBar = -1;
    const frame = () => {
      const room = roomRef.current;
      if (room) {
        const beat = getBeat();
        const pulse = reduce ? 0.4 : Math.exp(-(beat % 4) * 1.8);
        room.style.opacity = (0.05 + pulse * 0.16).toFixed(3);
        const bar = Math.floor(beat / 4);
        if (bar !== lastBar) {
          lastBar = bar;
          room.style.backgroundColor = ROOM[bar % ROOM.length];
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const enter = (withMusic: boolean) => {
    if (mode !== "idle") return;
    if (withMusic) partyStart.current = performance.now();
    setMode(withMusic ? "music" : "quiet");
    if (withMusic) audio.start(); // inside the click event, so the browser allows audio
    // with music the exit is held longer, and fades more slowly, so the party gets its moment
    window.setTimeout(() => setLeaving(true), withMusic ? 2000 : 350);
    window.setTimeout(finish, withMusic ? 3300 : 1250);
  };

  const status =
    mode === "music"
      ? "Music on • entering the show"
      : mode === "quiet"
        ? "Quiet mode • sound is off"
        : "Choose your experience";

  if (gone) return null;

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-label={`Welcome to ${siteConfig.djName}`} className={`dj-splash ${mode === "music" ? "music" : ""} ${mode === "quiet" ? "quiet" : ""} ${leaving ? "leaving" : ""}`}>
      <main className="splash" ref={mainRef}>
        <div className="stage" aria-hidden="true">
          <div className="stage-haze haze-l" />
          <div className="stage-haze haze-r" />
          <div className="beam beam-l" />
          <div className="beam beam-r" />
          <Twinkles lights={TWINKLES_BACK} className="twinkles-back" />
          <div className="stage-floor" />
          <div className="room-wrap"><div className="room" ref={roomRef} /></div>
          <Crowd people={CROWD_FAR} fill="#0c0818" className="crowd-far" />
          <Crowd people={CROWD_NEAR} fill="#05030a" className="crowd-near" />
        </div>
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        <header className="intro" ref={introRef}>
          <p className="eyebrow">
            <span className="eyebrow-line" /> SOUND • LIGHT • EXPERIENCE <span className="eyebrow-line" />
          </p>
          <p className="splash-title">
            Premier DJ services serving the <span>Lower Valley, Tri-Cities</span> and surrounding areas.
          </p>
          <p className="tagline">{siteConfig.tagline}.</p>

          <div className="entry-actions" aria-label="Choose how to enter">
            <button className="enter-button enter-music" type="button" onClick={() => enter(true)}>
              <span className="button-icon">♫</span> Enter With Music
            </button>
            <button className="enter-button enter-quiet" type="button" onClick={() => enter(false)}>
              <span className="button-icon">◌</span> Enter Quietly
            </button>
          </div>
          <p className="entry-status" aria-live="polite">{status}</p>
        </header>

        <div className="console-stage">
        <div className="console-glow" aria-hidden="true" />
        <section className="console" aria-label={`${siteConfig.djName} turntable visual`}>
          <Deck side="left" heading="NOW SPINNING" title="YOUR NIGHT. YOUR SOUND." artist={`${siteConfig.djName.toUpperCase()} • LIVE MIX`} bpm={128} progressAlt={false} />

          <div className="mixer">
            <div className="mixer-brand">
              DJ<span>-</span>MANDO
            </div>
            <div className="mixer-sub">THE SOUND OF YOUR CELEBRATION</div>
            <div className="mixer-display">
              <div className="display-top">
                <span>MASTER</span>
                <span className="display-live"><i /> LIVE VISUAL</span>
              </div>
              <div className="visualizer" aria-hidden="true">
                <div className="bars bars-a" />
                <div className="bars bars-b" />
              </div>
              <div className="display-bottom">
                <span>LEFT CHANNEL</span>
                <span>RIGHT CHANNEL</span>
              </div>
            </div>
            <div className="mixer-controls" aria-hidden="true">
              <div className="knob-row"><i /><i /><i /></div>
              <div className="fader-row"><span /><span /><span /></div>
              <div className="mixer-lights">
                {Array.from({ length: 12 }, (_, i) => <i key={i} />)}
              </div>
            </div>
            <div className="mixer-footer">CRAFTED FOR THE MOMENT</div>
          </div>

          <Deck side="right" heading="UP NEXT" title="THE NEXT GREAT MEMORY" artist="YOUR FAVORITE SONGS • YOUR WAY" bpm={124} progressAlt />
        </section>
        </div>

        <footer className="page-footer">
          <span>DJ-MANDO</span>
          <span className="footer-rule" />
          <span>LOWER VALLEY • TRI-CITIES • BEYOND</span>
        </footer>

        <Twinkles lights={TWINKLES_FRONT} className="twinkles-front" />
        <div className="vignette" aria-hidden="true" />
      </main>
    </div>
  );
}

function Deck({
  side, heading, title, artist, bpm, progressAlt,
}: { side: "left" | "right"; heading: string; title: string; artist: string; bpm: number; progressAlt: boolean }) {
  return (
    <div className={`deck deck-${side}`}>
      <div className="deck-topline">
        <span>PRO PERFORMANCE SYSTEM</span>
        <span className="led"><i /> READY</span>
      </div>
      <div className="track-screen">
        <div className="screen-heading"><span className="screen-dot" /> {heading}</div>
        <div className="track-title">{title}</div>
        <div className="track-artist">{artist}</div>
        <div className="screen-bottom">
          <span>STEREO OUTPUT</span>
          <span>{bpm} <small>BPM</small></span>
        </div>
        <div className="screen-progress"><span className={progressAlt ? "progress-alt" : ""} /></div>
      </div>
      <div className="platter-wrap">
        <div className="platter">
          <div className="record">
            <div className="vinyl-grooves" />
            <div className="vinyl-label"><span>DJ</span><b>M</b><small>MANDO</small></div>
          </div>
          <div className="tonearm"><span className="needle" /></div>
        </div>
      </div>
      <div className="deck-footer"><span>DIRECT DRIVE</span><span>33⅓ RPM</span><span>QUARTZ LOCK</span></div>
    </div>
  );
}
