/**
 * The words every agency site already has.
 *
 * Nothing here is invented to be funny — it is the vocabulary you get if you
 * read thirty homepages in a row. Seed 0 is the set the crumpled template on
 * the home page has always used, so that moment never changes; every other
 * seed deals a fresh one, which is what the Generic Generator in the labs is
 * for. Deterministic, so a template you liked can be dealt again.
 */

function pick<T>(list: T[], seed: number, salt: number): T {
  if (seed === 0) return list[0];
  // A small integer hash: same seed, same sentence, every time.
  let h = (Math.imul(seed, 2654435761) + salt * 40503) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  h = Math.imul(h, 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return list[h % list.length];
}

const BRANDS = ["Agency®", "Nexora®", "Vertex™", "Lumina®", "Northbound®", "Apex Labs™", "Kinetiq®", "Halo Digital®", "Brightside™", "Forge & Co.®"];

const NAVS = [
  ["Services", "Solutions", "Work", "About", "Blog"],
  ["Platform", "Solutions", "Customers", "Pricing", "Resources"],
  ["What we do", "Case studies", "Insights", "Careers", "Contact"],
  ["Product", "Industries", "Partners", "Company", "Docs"],
];

const BADGES = [
  "✨ New: AI-powered solutions  →",
  "🚀 Now with AI-driven insights  →",
  "✨ Introducing our 2026 platform  →",
  "⚡ New: automation that scales  →",
  "🎉 Series B announced  →",
];

/** [desktop lines, mobile lines] — the same claim, broken two ways. */
const HEADLINES: [string[], string[]][] = [
  [
    ["We transform ideas into", "digital experiences."],
    ["We transform", "ideas into digital", "experiences."],
  ],
  [
    ["Elevating brands through", "innovative design."],
    ["Elevating brands", "through innovative", "design."],
  ],
  [
    ["Where strategy meets", "seamless execution."],
    ["Where strategy", "meets seamless", "execution."],
  ],
  [
    ["Empowering teams to", "build what's next."],
    ["Empowering teams", "to build what's", "next."],
  ],
  [
    ["Your vision, delivered at", "the speed of now."],
    ["Your vision,", "delivered at the", "speed of now."],
  ],
  [
    ["Unlock growth with", "end-to-end solutions."],
    ["Unlock growth", "with end-to-end", "solutions."],
  ],
];

const SUBS: [string[], string[]][] = [
  [
    ["Where creativity meets technology. Innovative solutions tailored", "to your vision, powered by our passion and expertise."],
    ["Where creativity meets technology.", "Innovative solutions, tailored", "to your vision."],
  ],
  [
    ["A full-service partner for ambitious brands. We combine strategy,", "design and technology to deliver measurable results."],
    ["A full-service partner for", "ambitious brands, combining", "strategy and design."],
  ],
  [
    ["We craft best-in-class digital products that drive engagement,", "accelerate growth and delight users at every touchpoint."],
    ["Best-in-class digital products", "that drive engagement", "and accelerate growth."],
  ],
  [
    ["From discovery to launch and beyond, our team of experts works", "alongside yours to turn complexity into clarity."],
    ["From discovery to launch,", "our experts turn complexity", "into clarity."],
  ],
];

const PROOFS = [
  "TRUSTED BY 500+ COMPANIES WORLDWIDE",
  "TRUSTED BY OVER 2,000 TEAMS GLOBALLY",
  "POWERING 10,000+ BRANDS EVERY DAY",
  "LOVED BY INDUSTRY LEADERS EVERYWHERE",
];

const CARDS: string[][] = [
  ["Lightning fast", "Scalable growth", "Smart solutions"],
  ["Built to scale", "Data-driven", "Always on"],
  ["Seamless onboarding", "Enterprise ready", "Insight at a glance"],
  ["Future-proof", "Human-centred", "Results you can see"],
];

const ACTIONS: [string, string][] = [
  ["Get started →", "Learn more"],
  ["Book a demo →", "Talk to sales"],
  ["Start free trial →", "See how it works"],
  ["Get in touch →", "Our work"],
];

export type GenericCopy = {
  brand: string;
  nav: string[];
  badge: string;
  headline: [string[], string[]];
  sub: [string[], string[]];
  proof: string;
  cards: string[];
  actions: [string, string];
};

export function genericCopy(seed = 0): GenericCopy {
  return {
    brand: pick(BRANDS, seed, 1),
    nav: pick(NAVS, seed, 2),
    badge: pick(BADGES, seed, 3),
    headline: pick(HEADLINES, seed, 4),
    sub: pick(SUBS, seed, 5),
    proof: pick(PROOFS, seed, 6),
    cards: pick(CARDS, seed, 7),
    actions: pick(ACTIONS, seed, 8),
  };
}
