# Music

These five tracks are original placeholder music (synthesized, no samples), safe to use until you add your own.

## Adding your own songs
1. Drop your .mp3 files into this folder (`public/audio/`).
2. Open `src/config.ts` and edit the `musicTracks` list at the bottom (title, artist, file name).
3. Delete the placeholder entries/files you no longer want.

Tips
- Keep files in this folder (same site) so the equalizer can read the audio. Files hosted on another domain will still play, but the equalizer switches to a simulated animation.
- 128 kbps MP3 is plenty for a website and keeps loading fast.
- Tracks shuffle automatically, so add as many as you like.
