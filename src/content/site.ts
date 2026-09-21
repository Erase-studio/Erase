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
  based: "Nepal",
  // Only rendered when a URL is present.
  social: [
    { label: "Instagram", href: "" }, // REPLACE
    { label: "LinkedIn", href: "" }, // REPLACE
    { label: "Awwwards", href: "" }, // REPLACE
  ],
} as const;
