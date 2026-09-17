/**
 * The Proof chapter.
 *
 * Honesty rule: `kind` must say what a piece actually is. "Concept study" means
 * work Erase designed without a client, to show range. Swap concepts out for
 * shipped client work as it lands. Never relabel a concept as a client project.
 */

export type WorkKind = "Live" | "Concept study" | "Client";

export type Work = {
  slug: string;
  title: string;
  kind: WorkKind;
  sector: string;
  year: string;
  brief: string;
  tags: string[];
  mini: "erase" | "khumbu" | "tessel" | "mirelle";
  /** Sheet colours, so each project owns its page for a moment. */
  tone: { bg: string; fg: string; muted: string };
  href?: string;
};

export const work: Work[] = [
  {
    slug: "erase",
    title: "Erase",
    kind: "Live",
    sector: "Our own studio",
    year: "2026",
    brief:
      "Our own studio site: the template, turned to dust.",
    tags: ["Art direction", "Interaction", "Next.js"],
    mini: "erase",
    tone: { bg: "#111213", fg: "#E9EAEC", muted: "#8B8E94" },
    href: "#intro",
  },
  {
    slug: "khumbu-route",
    title: "Khumbu Route",
    kind: "Concept study",
    sector: "Adventure travel",
    year: "2026",
    brief:
      "A trekking site that sells the climb, not the view.",
    tags: ["Booking flow", "Data design", "Performance"],
    mini: "khumbu",
    tone: { bg: "#1B2A24", fg: "#EDEBE3", muted: "#9DB0A5" },
  },
  {
    slug: "tessel",
    title: "Tessel",
    kind: "Concept study",
    sector: "Architecture practice",
    year: "2026",
    brief:
      "An architecture portfolio that leads with the plan.",
    tags: ["Portfolio", "Editorial grid", "Headless CMS"],
    mini: "tessel",
    tone: { bg: "#E4E2DC", fg: "#161616", muted: "#6E6C66" },
  },
  {
    slug: "mirelle",
    title: "Mirelle",
    kind: "Concept study",
    sector: "Skincare e-commerce",
    year: "2026",
    brief:
      "A skincare store that shows its percentages first.",
    tags: ["E-commerce", "Product UX", "Shopify"],
    mini: "mirelle",
    tone: { bg: "#2B3990", fg: "#F3F1FA", muted: "#AEB5E3" },
  },
];
