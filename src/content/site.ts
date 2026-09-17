/**
 * Everything a founder should be able to change without touching a component.
 * Values marked REPLACE are placeholders and must be confirmed before launch.
 */

export const site = {
  name: "Erase",
  url: "https://erase.studio", // REPLACE: production domain
  email: "hello@erase.studio", // REPLACE: real inbox (also used by the mailto fallback)
  description:
    "Erase is a web design and development agency. We design, build and grow high-performance websites for ambitious brands.",
  tagline: "Web design & development agency",
  availability: "Booking projects now", // REPLACE when you're full
  based: "Nepal",
  // Only rendered when a URL is present.
  social: [
    { label: "Instagram", href: "" }, // REPLACE
    { label: "LinkedIn", href: "" }, // REPLACE
    { label: "Awwwards", href: "" }, // REPLACE
  ],
} as const;

export const chapters = [
  { id: "intro", index: "00", label: "Intro" },
  { id: "vocabulary", index: "01", label: "Vocabulary" },
  { id: "proof", index: "02", label: "Proof" },
  { id: "inside", index: "03", label: "Layers" },
  { id: "process", index: "04", label: "Process" },
  { id: "contact", index: "05", label: "Contact" },
] as const;

export type ChapterId = (typeof chapters)[number]["id"];

export const navLinks = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/#process", label: "Process" },
  { href: "/studio", label: "Studio" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * While `name` is empty the site shows `alias` ("The designer"), which reads as
 * intentional. Fill in real names, initials and an optional photo before launch.
 */
export const founders: {
  name: string;
  alias: string;
  initials: string;
  role: string;
  photo: string;
}[] = [
  {
    name: "", // REPLACE
    alias: "The designer",
    initials: "D", // REPLACE with initials
    role: "Design & direction",
    photo: "", // optional: /founders/name.jpg
  },
  {
    name: "", // REPLACE
    alias: "The developer",
    initials: "</>", // REPLACE with initials
    role: "Engineering & performance",
    photo: "",
  },
];
