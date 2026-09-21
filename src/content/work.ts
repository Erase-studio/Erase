/**
 * The Proof chapter: things we actually built.
 *
 * Honesty rule: `kind` says what a piece is right now. "Client" is work done
 * for a paying business; "Live" means you can open it today; "Open source"
 * means the code is public but there's no hosted version to visit. Results
 * on the case pages are what happened, nothing more.
 */

export type WorkKind = "Client" | "Live" | "Open source";

export type Work = {
  slug: string;
  title: string;
  /** The name as the product itself writes it, when that differs. */
  native?: string;
  kind: WorkKind;
  sector: string;
  year: string;
  brief: string;
  /** What it was built with. */
  tags: string[];
  award?: string;
  /** A real screenshot of the product, under /public. */
  shot: { src: string; light?: string; w: number; h: number };
  /** Sheet colours, so each project owns its page for a moment. */
  tone: { bg: string; fg: string; muted: string; accent: string };
  links: { live?: string; github?: string };
};

export const work: Work[] = [
  {
    slug: "the-lukla",
    title: "The Lukla",
    kind: "Client",
    sector: "Restaurant, Niagara Falls",
    year: "2026",
    brief: "A calm, hand-made site for a Himalayan and South Indian kitchen three minutes from Niagara Falls, with the whole menu as a page-turning book.",
    tags: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Framer Motion", "react-pageflip"],
    shot: { src: "/work/lukla.webp", w: 1519, h: 836 },
    tone: { bg: "#e8edf8", fg: "#14203d", muted: "#4d5a78", accent: "#7f8fd6" },
    links: {},
  },
  {
    slug: "sunuwa",
    title: "Sunuwa",
    native: "सुनुवा",
    kind: "Open source",
    sector: "Civic tech, AI routing",
    year: "2026",
    brief: "A civic complaint routing platform that gets citizen grievances to the right desk, not the nearest drawer.",
    tags: ["Next.js", "FastAPI", "Supabase", "Groq (Llama)", "Gemini", "ML clustering"],
    award: "Runner-up, CivicCode Hackathon 2026",
    shot: { src: "/work/sunuwa.webp", w: 1510, h: 871 },
    tone: { bg: "#121a15", fg: "#eef2ea", muted: "#a7b8a0", accent: "#9dbe8d" },
    links: { github: "https://github.com/CalyPx/Sunuwa" },
  },
  {
    slug: "harvo",
    title: "Harvo",
    kind: "Open source",
    sector: "Marketplace, voice AI",
    year: "2025",
    brief: "A farmer-to-vendor marketplace with a Nepali voice interface and AI spoilage scoring.",
    tags: ["Next.js", "FastAPI", "Nepali speech-to-text", "PostgreSQL"],
    shot: { src: "/work/harvo.webp", w: 1536, h: 867 },
    tone: { bg: "#0f171d", fg: "#e8f0f5", muted: "#9fb4c2", accent: "#7fb5d5" },
    links: { github: "https://github.com/CalyPx/Harvo" },
  },
  {
    slug: "sajhadoctor",
    title: "SajhaDoctor",
    kind: "Live",
    sector: "Telehealth, access",
    year: "2025",
    brief: "A bilingual telehealth platform built for rural Nepal, where the nearest doctor is a bus ride away.",
    tags: ["Next.js", "FastAPI", "Supabase", "WebRTC"],
    shot: { src: "/work/sajhadoctor.webp", w: 1524, h: 865 },
    tone: { bg: "#e9eee6", fg: "#141c16", muted: "#56644f", accent: "#9dbe8d" },
    links: { live: "https://sajhadoctor.vercel.app/", github: "https://github.com/CalyPx/SajhaDoctor" },
  },
  {
    slug: "nepalprep",
    title: "NepalPrep",
    kind: "Live",
    sector: "Ed-tech, exam prep",
    year: "2026",
    brief: "Nepal’s CEE prep platform: topic-wise MCQs, timed mock exams, past papers and real progress analytics, all free.",
    tags: ["React", "Vite", "Firebase Auth", "Firestore", "React Router", "CSS Modules"],
    shot: { src: "/work/nepalprep.webp", light: "/work/nepalprep-light.webp", w: 1516, h: 866 },
    tone: { bg: "#1a1510", fg: "#f3ece2", muted: "#b3a592", accent: "#e8a33d" },
    links: { live: "https://nepalprep.vercel.app/", github: "https://github.com/CalyPx/NepalPrep" },
  },
];

/** Where a project lives, as a browser bar would print it. */
export const hostOf = (w: Work) => (w.links.live ?? w.links.github ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
