import { useSyncExternalStore } from "react";
import { musicTracks } from "@/config";
import * as engine from "@/lib/audio";

/** React hook over the framework-free audio engine (used by the islands). */
export function useMusic() {
  const s = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
  return {
    ...s,
    tracks: musicTracks,
    start: engine.start,
    toggle: engine.toggle,
    next: engine.next,
    prev: engine.prev,
    toggleMute: engine.toggleMute,
    setVolume: engine.setVolume,
    toggleShuffle: engine.toggleShuffle,
  };
}
