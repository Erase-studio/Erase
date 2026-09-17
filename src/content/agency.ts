/**
 * What the agency sells and how. Everything a client needs to decide to get in touch.
 * Timelines are typical ranges: confirm them before launch (REPLACE if they differ).
 */

export type Service = {
  id: string;
  name: string;
  short: string;
  deliverables: string[];
  /** Which illustration skin represents it (see components/agency/Skin). */
  skin: 0 | 1 | 2 | 3 | 4 | 5;
};

export const services: Service[] = [
  {
    id: "strategy",
    name: "Strategy & copy",
    short: "Positioning, sitemap and words that sell before a pixel is placed.",
    deliverables: ["Discovery workshop", "Competitor audit", "Sitemap & user flows", "Messaging & page copy"],
    skin: 3,
  },
  {
    id: "ux",
    name: "UX & interface",
    short: "Interfaces built around one question: what should the visitor do next?",
    deliverables: ["Wireframes", "Responsive UI design", "Design system", "Clickable prototype"],
    skin: 2,
  },
  {
    id: "art-direction",
    name: "Art direction",
    short: "A visual identity for the web that nobody could mistake for a template.",
    deliverables: ["Art direction", "Type & colour system", "Imagery & iconography", "Web brand guidelines"],
    skin: 5,
  },
  {
    id: "motion",
    name: "Motion & 3D",
    short: "Interaction, scroll choreography and WebGL where it earns its place.",
    deliverables: ["Micro-interactions", "Scroll storytelling", "WebGL & 3D", "Page transitions"],
    skin: 4,
  },
  {
    id: "development",
    name: "Development",
    short: "Hand-coded, fast and accessible builds on Next.js, Shopify or a headless CMS.",
    deliverables: ["Next.js & React", "Shopify & e-commerce", "Headless CMS", "Integrations & APIs"],
    skin: 0,
  },
  {
    id: "growth",
    name: "SEO, care & growth",
    short: "Launch is the start: technical SEO, analytics, hosting and ongoing improvement.",
    deliverables: ["Technical SEO", "Analytics & tracking", "Hosting & maintenance", "Conversion optimisation"],
    skin: 1,
  },
];

export const engagements = [
  {
    id: "launch",
    name: "Launch",
    for: "New brands and new websites",
    summary: "A complete website, from strategy to go-live.",
    includes: ["Strategy & sitemap", "Art direction & UI", "Development & CMS", "SEO setup & launch"],
    timeline: "6–10 weeks", // REPLACE if needed
  },
  {
    id: "rebuild",
    name: "Rebuild",
    for: "Brands that have outgrown their site",
    summary: "Redesign and re-platform without losing what already works.",
    includes: ["Site & analytics audit", "Redesign", "Content migration", "Redirects & SEO protection"],
    timeline: "8–12 weeks", // REPLACE if needed
    featured: true,
  },
  {
    id: "partner",
    name: "Partner",
    for: "Growing teams shipping every month",
    summary: "An embedded design and development team, on retainer.",
    includes: ["Reserved monthly capacity", "New pages & features", "Conversion testing", "Priority support"],
    timeline: "Monthly", // REPLACE if needed
  },
];

export const faqs = [
  {
    q: "How much does a website cost?",
    a: "Every project is scoped individually. Tell us your goals and budget range and we’ll come back with a clear, fixed-scope proposal.",
  },
  {
    q: "How long does a project take?",
    a: "Most new websites launch in 6–10 weeks. Timing depends on scope and how ready your content is.",
  },
  {
    q: "Do you use templates or page builders?",
    a: "No. Every site is designed and coded from scratch, so it loads fast, ranks well and looks like nobody else.",
  },
  {
    q: "Will we be able to edit the website ourselves?",
    a: "Yes. Every site ships with a CMS set up around your content, plus a handover session for your team.",
  },
  {
    q: "Do you work with international clients?",
    a: "Yes. We work remotely across time zones, with scheduled calls and live preview links throughout the project.",
  },
  {
    q: "What happens after launch?",
    a: "Choose a care plan for hosting, updates and ongoing improvement, or we hand everything over to your team.",
  },
];

export const principles = [
  { title: "One team, start to finish", body: "Strategy, design and code in the same room. Nothing lost in handoffs." },
  { title: "Built, not assembled", body: "No themes or page builders. Custom code that’s fast and yours to own." },
  { title: "Performance is design", body: "Speed, accessibility and SEO are designed in from day one, not bolted on." },
  { title: "Clear from day one", body: "Fixed scope, weekly check-ins and a live preview link you can open anytime." },
];

export const stack = ["Figma", "Next.js", "React", "TypeScript", "GSAP", "Three.js", "Shopify", "Sanity", "Vercel"];

export const budgets = ["Under $5k", "$5k–15k", "$15k–40k", "$40k+"]; // REPLACE with your real bands
export const timelines = ["ASAP", "1–3 months", "3–6 months", "Flexible"];
