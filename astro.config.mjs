import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // IMPORTANT: set this to your real domain. It is used for the canonical URL,
  // social-share links, sitemap.xml and robots.txt.
  site: "https://cts-gv.github.io",
  // Use "/" for a custom domain. For https://<user>.github.io/<repo>/ use "/<repo>".
  base: "/dj-site-V2/",
  integrations: [react(), sitemap()],
  vite: {
    build: {
      // three.js is lazy-loaded for the splash disco ball, so its chunk size is expected
      chunkSizeWarningLimit: 750,
    },
  },
});
