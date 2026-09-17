# Erase

The Erase studio website. The homepage opens as the average agency website, and the visitor rubs it out.

Creative direction, research and the experience architecture live in [docs/CREATIVE_DIRECTION.md](docs/CREATIVE_DIRECTION.md).

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Before launch: replace placeholders

Everything below is marked `REPLACE` in the source.

| What | Where |
|------|-------|
| Production domain | `src/content/site.ts` → `url` |
| Contact email | `src/content/site.ts` → `email` |
| Founder names, initials, optional photo (shown on the hover card) | `src/content/site.ts` → `founders`. While `name` is empty the site shows `alias` ("The designer"). |
| Social links (hidden until set) | `src/content/site.ts` → `social` |
| Project sheets | `src/content/work.ts`. Concept studies are labelled as such. Replace them with shipped client work as it lands, and never relabel a concept as a client project. |
| Case studies | `src/content/cases.ts`, one entry per work slug |

One promise in the copy is worth confirming: "Send us your website. We'll tell you what we'd erase first." Also check the typical week ranges in Process.

## Contact form

`POST /api/contact` sends through [Resend](https://resend.com) when configured:

```
RESEND_API_KEY=...
CONTACT_TO=you@yourdomain.com        # defaults to site.email
CONTACT_FROM="Erase <website@yourdomain.com>"   # must be a verified sender
```

Without a key the route answers `503`, and the form opens the visitor's email app with the message prefilled. It never shows "sent" unless the message was delivered.

## How it's built

- **Next.js 16 (App Router), TypeScript, Tailwind v4.** The homepage is prerendered static.
- **GSAP + ScrollTrigger** for the scrubbed, pinned chapters (Proof, Process) and the line reveals.
- **Lenis** for inertial scroll on fine pointers only. Touch devices and reduced motion keep native scroll.
- **No WebGL.** The signature eraser is 2D canvas compositing (`src/components/erase/`).
- **Fonts:** Mona Sans (variable weight and width; the width axis drives most of the motion) and Geist Mono for labels.

```
src/
  app/                 layout, page, api/contact, OG image, sitemap, robots, 404
  content/             site.ts, work.ts: all editable copy and data
  components/
    erase/             drawTemplate (the fake agency site), EraseLayer (brush, crumbs, sweep)
    chapters/          Hero, Vocabulary, Proof, Inside, Process, People, Contact, Footer
    work/              PreviewFrame + Minis (coded miniature websites, sized in cqw)
    system/            Nav + menu, Cursor, SmoothScroll, ChapterFx (scroll grammar)
    ui/                Magnetic, Lines
  styles/              chapter and mini-site CSS
```

### Motion rules
- Exits erase (a slanted band), entrances write in (masked lines). The band angle is the same everywhere.
- Chapters that tell a sequence are pinned and scrubbed with rest beats, with no snapping.
- Only primary CTAs are magnetic.
- `prefers-reduced-motion` skips the intro, pins, reveals and smoothing entirely.
- The intro plays once per browser session. "Miss the template? Put it back" in the footer replays it.
