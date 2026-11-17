import { useEffect } from "react";
import { useMusic } from "@/lib/useMusic";
import MusicPlayer from "@/components/islands/MusicPlayer";
import Visualizer from "@/components/islands/Visualizer";

/**
 * Bottom dock: player controls + equalizer. Renders nothing until the visitor
 * has started music. While visible it adds `music-started` to <html>, which
 * gives the page bottom padding (see global.css) so the dock never covers content.
 */
export default function MusicDock() {
  const { hasStarted } = useMusic();

  useEffect(() => {
    document.documentElement.classList.toggle("music-started", hasStarted);
  }, [hasStarted]);

  if (!hasStarted) return null;

  return (
    <div
      className="dock-in fixed inset-x-0 bottom-0 z-40 flex flex-col border-t border-white/10 bg-black/95 backdrop-blur-md sm:flex-row"
      style={{ height: "var(--dock-h)" }}
      role="region"
      aria-label="Music player"
    >
      <MusicPlayer />
      <Visualizer />
    </div>
  );
}
