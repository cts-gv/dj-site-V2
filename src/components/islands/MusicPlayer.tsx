import { Pause, Play, SkipBack, SkipForward, Shuffle, Volume2, VolumeX } from "lucide-react";
import { useMusic } from "@/lib/useMusic";

/**
 * Compact player controls. Lives in the bottom dock (see App.tsx) next to the
 * equalizer, so it never floats on top of the page content.
 */
export default function MusicPlayer() {
  const m = useMusic();
  const track = m.tracks[m.current];

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 px-3 sm:h-full sm:w-[470px] sm:gap-3 sm:border-r sm:border-white/10 sm:px-5">
      {/* spinning disc */}
      <div
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[repeating-radial-gradient(circle,#111_0_2px,#222_2px_3px)] ring-1 ring-white/10 sm:h-10 sm:w-10 ${
          m.isPlaying ? "animate-[spin_5s_linear_infinite]" : ""
        }`}
      >
        <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-white">{track?.title}</p>
        <p className="truncate text-xs leading-tight text-gray-400">{track?.artist}</p>
      </div>

      <div className="flex shrink-0 items-center">
        <button
          onClick={m.toggleShuffle}
          className={`rounded-full p-2 transition hover:bg-white/10 ${m.shuffle ? "text-violet-300" : "text-gray-500"}`}
          aria-label={m.shuffle ? "Shuffle on" : "Shuffle off"}
          aria-pressed={m.shuffle}
          title={m.shuffle ? "Shuffle on" : "Shuffle off"}
        >
          <Shuffle className="h-4 w-4" />
        </button>
        <button onClick={m.prev} className="rounded-full p-2 text-gray-200 transition hover:bg-white/10" aria-label="Previous track">
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          onClick={m.toggle}
          className="mx-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/30 transition hover:scale-105"
          aria-label={m.isPlaying ? "Pause" : "Play"}
        >
          {m.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
        </button>
        <button onClick={m.next} className="rounded-full p-2 text-gray-200 transition hover:bg-white/10" aria-label="Next track">
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

      {/* volume: hidden on phones (hardware buttons) */}
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <button onClick={m.toggleMute} className="rounded-full p-2 text-gray-300 transition hover:bg-white/10" aria-label={m.muted ? "Unmute" : "Mute"}>
          {m.muted || m.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={m.muted ? 0 : m.volume}
          onChange={(e) => m.setVolume(Number(e.target.value))}
          className="h-1 w-20 cursor-pointer accent-violet-500"
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
