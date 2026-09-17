/**
 * Case studies, keyed by work slug. Kept short on purpose: the page shows, it doesn't explain.
 * Concept studies describe intent, never results, clients or numbers.
 */

export type CaseStudy = {
  lede: string;
  problem: { title: string; body: string };
  idea: { title: string; body: string };
  quote: string;
  decisions: { title: string; body: string }[];
  palette: { name: string; hex: string }[];
  type: { name: string; sample: string; note: string };
};

export const cases: Record<string, CaseStudy> = {
  erase: {
    lede: "Our own site. It opens on the website every agency ships, drawn in dust, and lets you tear through it.",
    problem: { title: "Every agency site says the same thing.", body: "Gradient blob. Logo wall. “Digital experiences.”" },
    idea: { title: "Turn the template to dust.", body: "One world of particles that becomes whatever each section needs." },
    quote: "Don’t say it’s different. Show the template falling apart.",
    decisions: [
      { title: "One world", body: "A single WebGL scene behind every page." },
      { title: "Dust as material", body: "Every shape is the same grains, re-formed." },
      { title: "Day and night", body: "Charcoal on paper, light in the dark." },
      { title: "Type stays quiet", body: "Small labels, few words, big air." },
    ],
    palette: [
      { name: "Paper", hex: "#ECEBE6" },
      { name: "Graphite", hex: "#0B0C0E" },
      { name: "Erase blue", hex: "#3D63FF" },
      { name: "Charcoal", hex: "#121316" },
    ],
    type: { name: "Mona Sans", sample: "We turn templates to dust.", note: "wght 500 · Geist Mono for labels" },
  },
  "khumbu-route": {
    lede: "A Himalayan trekking site that sells the route: its altitude, its days, its price.",
    problem: { title: "The same prayer flag on every site.", body: "Prices hidden behind enquiry forms." },
    idea: { title: "The elevation profile is the hero.", body: "Scrub the climb day by day." },
    quote: "Sell the climb, not the view.",
    decisions: [
      { title: "Price first", body: "Before the form, not after." },
      { title: "Days, not paragraphs", body: "Each stop on the profile." },
      { title: "Bad signal ready", body: "Light pages at 4,000 m." },
      { title: "Bone & moss", body: "Colours from trail maps." },
    ],
    palette: [
      { name: "Moss ink", hex: "#1B2A24" },
      { name: "Bone", hex: "#EDEBE3" },
      { name: "Lichen", hex: "#5F7A6B" },
      { name: "Summit", hex: "#D9481F" },
    ],
    type: { name: "Mona Sans Condensed", sample: "5,364 m", note: "wdth 75 for numbers" },
  },
  tessel: {
    lede: "An architecture portfolio where every project opens like a set of drawings.",
    problem: { title: "Photography buries the thinking.", body: "The plans end up as unread PDFs." },
    idea: { title: "Index by plan.", body: "Compare buildings like architects do." },
    quote: "The drawing is the argument.",
    decisions: [
      { title: "One scale", body: "Every plan at 1:200." },
      { title: "Light type", body: "Weight 300, so lines lead." },
      { title: "Strict grid", body: "Twelve columns. No exceptions." },
      { title: "Easy updates", body: "A project in ten minutes." },
    ],
    palette: [
      { name: "Trace", hex: "#F2F1ED" },
      { name: "Ink", hex: "#141414" },
      { name: "Concrete", hex: "#E4E2DC" },
      { name: "Graphite", hex: "#6E6C66" },
    ],
    type: { name: "Mona Sans Light", sample: "Plans first.", note: "wght 300 · wdth 88" },
  },
  mirelle: {
    lede: "A skincare store where the ingredient list is the navigation.",
    problem: { title: "Pastel bottles, hidden percentages.", body: "Shipping costs revealed at checkout." },
    idea: { title: "Read the label first.", body: "Actives and prices above the fold." },
    quote: "Trust is a percentage you can see.",
    decisions: [
      { title: "Shop by ingredient", body: "Each active is a collection." },
      { title: "No surprise shipping", body: "Cost next to the button." },
      { title: "Three-step checkout", body: "Built for thumbs." },
      { title: "Indigo, not blush", body: "Clinical and confident." },
    ],
    palette: [
      { name: "Milk", hex: "#F4F2EE" },
      { name: "Indigo", hex: "#2B3990" },
      { name: "Ink", hex: "#1F1B3D" },
      { name: "Glass", hex: "#DCDAE8" },
    ],
    type: { name: "Mona Sans", sample: "5 · 2 · 0.2 · 4", note: "wght 640 · wdth 94" },
  },
};
