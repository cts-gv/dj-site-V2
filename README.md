# DJ-Mando website (Astro)

A single-page, search-engine-friendly site. All content is plain HTML in the page source; only the
entry splash (disco ball) and the music player are interactive.

## Run it

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs the finished site to dist/
npm run preview    # serve dist/ locally
```

## Edit the content

Almost everything lives in **`src/config.ts`**: name, tagline, phone, email, socials, about text, stats,
services, portfolio events, "why us" cards, service areas, SEO title/description, and the music playlist.

## Contact form (Formspree)

1. Create a form at <https://formspree.io> and copy its endpoint (looks like `https://formspree.io/f/abcdwxyz`).
2. Paste it into `formspreeEndpoint` in `src/config.ts`.
3. Until you do, the form shows "isn't connected yet" instead of sending.

The form also works with JavaScript off (the browser posts straight to Formspree), and includes a hidden
spam-trap field (`_gotcha`). Formspree's free plan emails *you*; it doesn't send an automatic confirmation
to the visitor, so the success message doesn't promise one.

## Before you go live (important)

- [ ] **`site` in `astro.config.mjs`** is your real domain (canonical URLs, sitemap, share links).
      Custom domain: leave `base: "/"`. Project page (`user.github.io/repo`): set `base: "/repo"`.
- [ ] **Replace placeholder contact info** in `src/config.ts`: phone `(555) 123-4567`, email, and the
      Instagram / Facebook / TikTok URLs. These also feed the structured data Google reads, so wrong values hurt.
- [ ] **Service areas** in `src/config.ts` (`serviceAreas`, `region`): list where you actually work.
- [ ] **Portfolio events and stats** are sample content (names, dates, guest counts). Use real ones.
- [ ] **Hero video / photos** are remote placeholders (Mixkit / Pexels). Swap for your own; see `src/assets/README.md`.
- [ ] **Music**: replace the placeholder tracks in `public/audio/` and `musicTracks` in `src/config.ts`.
- [ ] `public/og-image.png` (1200x630) is what shows when the link is shared. Replace with a real photo if you like.

## After launch (the part that actually moves rankings)

- Add the site in **Google Search Console** and submit `https://YOUR-DOMAIN/sitemap-index.xml`.
- Claim/complete your **Google Business Profile** (service-area business) using the same name, phone and email as the site.
- Test with Google's Rich Results Test and PageSpeed Insights.
- Keep your name/phone/email identical everywhere (site, Business Profile, social, directories).

## How it works

| Path | Purpose |
| --- | --- |
| `src/pages/index.astro` | The page: sections in order, plus the two interactive islands |
| `src/layouts/Layout.astro` | `<head>`: title, description, canonical, Open Graph, LocalBusiness JSON-LD |
| `src/components/*.astro` | Navbar, Hero, About, Stats, Services, Portfolio, WhyUs, Contact, Footer (static HTML) |
| `src/components/islands/` | React: `Splash` (entry screen + disco ball), `MusicDock` (player + equalizer) |
| `src/lib/audio.ts` | Music engine shared by the nav button, splash and dock. Audio is only fetched after a visitor opts in |
| `src/styles/` | Tailwind entry, splash styling, hero name animation |
| `src/pages/robots.txt.ts` | Generates `robots.txt` (points at the sitemap) |

**Splash behaviour:** the page underneath is real HTML from the first byte. An inline script adds
`splash-pending` to `<html>` only when JavaScript runs; the splash then overlays the page. If JavaScript is
off, or the splash fails to load within 6 seconds, the page is shown normally. Search engines index the
page content, never a blank screen.

**Deploy:** pushing to `main` builds and publishes with GitHub Pages (`.github/workflows/deploy.yml`).

## Credits

Disco ball based on work by Lucy Bichakhchyan (<https://bichakhchyan.com/>); see the header of `src/lib/discoBall.js`.

## Splash backdrop notes
- The splash has twinkling lights (`TWINKLES_BACK` / `TWINKLES_FRONT` in `src/components/islands/Splash.tsx`, styled in
  the "TWINKLING LIGHTS" block at the end of `src/styles/splash.css`). The old dust, bokeh and film grain were removed.
- The disco ball throws spots of light across the screen. `mountDiscoBall({ spots: false })` switches them off.
- There is deliberately no automatic "low quality" mode that changes the splash while it is on screen: it used to
  freeze and snap the two light beams after a few seconds, which looked like the page glitching.

## Hero video
`public/video/hero.mp4` (1080p, H.264, no audio, about 2.4 MB, `faststart`) and `public/images/hero-poster.jpg` (its first
frame, so the fade from poster to video is seamless). To replace the video, re-encode with:

    ffmpeg -i input.mp4 -an -c:v libx264 -preset slow -crf 26 -profile:v high -pix_fmt yuv420p -vf "scale=1920:-2" -movflags +faststart hero.mp4
    ffmpeg -i hero.mp4 -frames:v 1 -q:v 5 hero-poster.jpg

## Music volume
The starting volume is `musicStartVolume` in `src/config.ts` (0 = silent, 1 = full). The volume is applied with a Web Audio
gain node (see `src/lib/audio.ts`) because iOS ignores `audio.volume`; if Web Audio is unavailable it falls back to `audio.volume`.
