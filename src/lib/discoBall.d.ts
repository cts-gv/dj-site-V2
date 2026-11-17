export interface DiscoBallOptions {
  /** Element the ball hangs inside (must be position: relative/absolute). Defaults to document.body. */
  host?: HTMLElement;
  /** The ball hangs above this element and never covers it. */
  target?: HTMLElement | null;
  /** Called every frame that bright light is falling somewhere: [x1, y1, x2, y2, ...] in viewport pixels. */
  onLight?: (points: number[]) => void;
  /** Called if the ball could not start (no WebGL) or its GL context was lost. */
  onFailed?: () => void;
  onReady?: () => void;
  /** false: the ball throws no spots of light onto the screen (party-mode beams still show). Default true. */
  spots?: boolean;
  /** Milliseconds after mounting before the ball drops in. Default 400. */
  dropDelay?: number;
}

export interface DiscoBall {
  /** Party mode: coloured beams and lights, driven by a beat clock that returns beats since the start. */
  setParty(on: boolean, getBeat?: () => number): void;
  pause(paused: boolean): void;
  /** 'low' halves the light spots and renders them at lower resolution (for slow machines). */
  setQuality(q: "high" | "low"): void;
  dropIn(): void;
  relayout(): void;
  /** Removes everything the ball added and frees its GPU memory. */
  destroy(): void;
}

export function mountDiscoBall(opts?: DiscoBallOptions): Promise<DiscoBall | null>;
