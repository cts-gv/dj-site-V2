// ============================================================
// DJ-Mando Site Configuration
// Edit values below to update content across the entire site.
// ============================================================

export const siteConfig = {
  // --- Brand ---
  djName: "DJ-Mando",
  tagline: "Turning Moments Into Memories",
  slogan: "Unforgettable beats for every celebration",

  // --- Contact ---
  phone: "(555) 123-4567",
  email: "booking@dj-mando.com",
  instagram: "https://instagram.com/djmando",
  facebook: "https://facebook.com/djmando",
  tiktok: "https://tiktok.com/@djmando",

  // --- Contact form (Formspree) ---
  // 1. Create a form at https://formspree.io  2. Paste its endpoint URL here.
  // Until you do, the form shows a "not configured yet" message instead of sending.
  formspreeEndpoint: "https://formspree.io/f/YOUR_FORM_ID",

  // --- SEO ---
  // Used for the <title>, meta description, social-share cards and structured data.
  // Keep the title under ~60 characters and the description under ~160.
  seo: {
    title: "DJ-Mando | Wedding & Event DJ in the Tri-Cities, WA",
    description:
      "Professional DJ for weddings, quinceaneras, corporate events and private parties in the Lower Valley and Tri-Cities, WA. Request your date today.",
    ogImage: "og-image.png", // 1200x630 file in /public
    ogImageAlt: "DJ-Mando - wedding and event DJ serving the Tri-Cities, WA",
  },

  // --- Service area (shown on the page and in the LocalBusiness structured data) ---
  // EDIT THESE to match where you actually work.
  region: "the Lower Valley and Tri-Cities, WA",
  serviceAreas: [
    "Kennewick",
    "Pasco",
    "Richland",
    "West Richland",
    "Prosser",
    "Grandview",
    "Sunnyside",
  ] as string[],

  // --- Services (one block of real text per service helps search engines understand the page) ---
  services: [
    {
      title: "Wedding DJ",
      text: "Reception music from dinner to the last dance, handled by one DJ. MC services cover introductions and toasts, and the set moves from dinner jazz to a full dance floor as the night builds.",
    },
    {
      title: "Quinceanera DJ",
      text: "Traditional waltzes blended with the latest hits, from Latin favorites to Top 40, so every generation has a reason to dance.",
    },
    {
      title: "Corporate Event DJ",
      text: "Sophisticated background music for arrivals and dinner that turns into a full dance party for galas, grand openings and company celebrations.",
    },
    {
      title: "Private Party DJ",
      text: "Birthdays and private celebrations with an open-format set: Top 40, Latin, hip-hop, throwbacks, EDM and country, adjusted to the crowd in real time.",
    },
  ] as { title: string; text: string }[],

  // --- Hero Video ---
  // Video plays as the hero section background. Poster shows before video loads.
  heroVideoUrl: `${import.meta.env.BASE_URL}video/hero.mp4`, // file in /public/video
  heroPosterImage: `${import.meta.env.BASE_URL}images/hero-poster.jpg`, // first frame of the video, in /public/images

  // --- Music ---
  // How loud the music is when it starts: 0 (silent) to 1 (full volume).
  // Visitors can still change it with the volume slider (on phones they use their own volume buttons).
  musicStartVolume: 0.2,

  // --- About Section ---
  aboutImage: "https://images.pexels.com/photos/19641136/pexels-photo-19641136.jpeg?auto=compress&cs=tinysrgb&w=900",
  aboutTitle: "About DJ-Mando",
  aboutText:
    "With over a decade behind the decks, DJ-Mando has been the heartbeat of countless celebrations. From intimate weddings to high-energy corporate parties and elegant quinceaneras, every set is crafted to match the vibe of your event. No two crowds are the same — and neither are the mixes. Every song is chosen in real-time based on what the dance floor demands, keeping your guests on their feet all night long.",

  // --- Stats Cards ---
  stats: [
    { value: "500+", label: "Events Performed", icon: "Calendar" },
    { value: "50,000+", label: "Songs Played", icon: "Music" },
    { value: "10", label: "Years of Experience", icon: "Award" },
    { value: "100%", label: "Client Satisfaction", icon: "Smile" },
  ] as { value: string; label: string; icon: string }[],

  // --- Event Portfolio ---
  events: [
    {
      title: "Sarah & Mike's Wedding",
      category: "Wedding",
      date: "June 2025",
      image: "https://images.pexels.com/photos/29081017/pexels-photo-29081017.jpeg?auto=compress&cs=tinysrgb&w=800",
      description: "A magical evening under the stars with a packed dance floor from first dance to last call.",
      songsPlayed: 145,
      guests: 180,
    },
    {
      title: "TechCorp Annual Gala",
      category: "Corporate",
      date: "December 2024",
      image: "https://images.pexels.com/photos/14636315/pexels-photo-14636315.jpeg?auto=compress&cs=tinysrgb&w=800",
      description: "High-energy after-party for 300+ employees featuring a custom mix of throwback hits and modern beats.",
      songsPlayed: 210,
      guests: 320,
    },
    {
      title: "Isabella's Quinceanera",
      category: "Quinceanera",
      date: "March 2025",
      image: "https://images.pexels.com/photos/17931369/pexels-photo-17931369.jpeg?auto=compress&cs=tinysrgb&w=800",
      description: "A beautiful celebration blending traditional waltzes with the latest hits for an unforgettable night.",
      songsPlayed: 175,
      guests: 150,
    },
    {
      title: "Rooftop Birthday Bash",
      category: "Private Party",
      date: "August 2025",
      image: "https://images.pexels.com/photos/12283306/pexels-photo-12283306.jpeg?auto=compress&cs=tinysrgb&w=800",
      description: "An exclusive rooftop party with city views, a curated open-format set, and dancing until 2 AM.",
      songsPlayed: 190,
      guests: 75,
    },
    {
      title: "Hotel Grand Opening",
      category: "Corporate",
      date: "September 2024",
      image: "https://images.pexels.com/photos/16985187/pexels-photo-16985187.jpeg?auto=compress&cs=tinysrgb&w=800",
      description: "Sophisticated background beats transitioning to a full dance party for the launch of a boutique hotel.",
      songsPlayed: 120,
      guests: 250,
    },
    {
      title: "Emily & James Wedding",
      category: "Wedding",
      date: "October 2024",
      image: "https://images.pexels.com/photos/10408275/pexels-photo-10408275.jpeg?auto=compress&cs=tinysrgb&w=800",
      description: "A romantic reception with a seamless flow from dinner jazz to an all-out dance party.",
      songsPlayed: 160,
      guests: 200,
    },
  ] as {
    title: string;
    category: string;
    date: string;
    image: string;
    description: string;
    songsPlayed: number;
    guests: number;
  }[],

  // --- Why Us Section ---
  whyUs: [
    {
      icon: "Music",
      title: "Custom Playlists",
      text: "Every setlist is tailored to your taste. You pick the vibe, we handle the rest — with live adjustments based on the crowd's energy.",
    },
    {
      icon: "Clock",
      title: "Punctual & Professional",
      text: "Arrive early, set up on time, and deliver from the first beat to the last. Reliability is non-negotiable.",
    },
    {
      icon: "Mic",
      title: "MC Services Included",
      text: "Need announcements or crowd engagement? Full MC services come standard — introductions, toasts, and more.",
    },
    {
      icon: "Sparkles",
      title: "Premium Sound & Lighting",
      text: "Professional-grade speakers, wireless mics, and dynamic lighting rigs that transform any venue.",
    },
    {
      icon: "Headphones",
      title: "Open-Format DJ",
      text: "Top 40, Latin, hip-hop, throwbacks, EDM, country — if your crowd wants it, we've got it covered.",
    },
    {
      icon: "ShieldCheck",
      title: "Fully Insured",
      text: "Liability insured and contract-backed for your peace of mind. Every booking is protected.",
    },
  ] as { icon: string; title: string; text: string }[],

  // --- Event Types for Contact Form ---
  eventTypes: [
    "Wedding",
    "Private Party",
    "Quinceanera",
    "Corporate Event",
    "Other",
  ],
};

export type SiteConfig = typeof siteConfig;

// ============================================================
// Music Player
// Drop your own files into /public/audio and list them here.
// Audio is only downloaded after a visitor chooses "Enter With Music" or "Play music".
// `src` is relative to the site root (no leading slash).
// Tracks shuffle automatically; one song never plays on repeat.
// The tracks below are original placeholder music.
//
// Clips: every track plays only a short clip, then fades out and the next one fades in.
//   startSeconds  - where in the song the clip begins (default for all tracks)
//   lengthSeconds - how long each clip plays, no matter how long the file is
//   fadeSeconds   - length of the fade-in and the fade-out
// A track can override the start with its own `start` (in seconds), e.g.
//   { title: "My Mix", artist: "DJ-Mando", src: "audio/my-mix.mp3", start: 62 }
// If a file is shorter than start + length, the clip is moved earlier so it still fits.
// ============================================================
export const musicClip = {
  startSeconds: 30,
  lengthSeconds: 20,
  fadeSeconds: 1.5,
};

export const musicTracks: { title: string; artist: string; src: string; start?: number }[] = [
  { title: "Neon Nights", artist: "DJ-Mando (placeholder)", src: "audio/mix1.mp3" },
  { title: "Golden Hour", artist: "DJ-Mando (placeholder)", src: "audio/mix2.mp3" },
  { title: "Block Party", artist: "DJ-Mando (placeholder)", src: "audio/mix3.mp3" },
  { title: "Midnight Drive", artist: "DJ-Mando (placeholder)", src: "audio/mix4.mp3" },
  { title: "Fiesta Latina", artist: "DJ-Mando (placeholder)", src: "audio/fiesta-latina.mp3" },
];
