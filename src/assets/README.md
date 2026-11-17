# Self-hosted images

Drop photos here (jpg, png, webp, avif), then use the path *relative to this folder* in `src/config.ts`,
e.g. `image: "events/wedding.jpg"`. At build time Astro resizes them, converts them to WebP and serves them
from your own domain. Images with an `https://` URL (the Pexels placeholders) are used as-is.
