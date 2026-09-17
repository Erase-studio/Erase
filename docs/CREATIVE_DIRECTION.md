# Erase: creative direction and experience architecture

Covers phases 1–3: research, direction, architecture. Implementation follows this document.

---

## 1. What the references actually do

### Emotion Agency (emotion-agency.com)
- **Memorable because** the entire homepage is one continuous WebGL world (a violet landscape with water, rocks and a particle sculpture). Scroll doesn't move the page. It moves the camera and morphs the particles (logo → blob → cube → sphere → heart → ring), and each shape is tied to a chapter ("Approach", "Vibes", "Design", "Our people").
- **Feels expensive because** a single art direction holds everything together: one hue family, a condensed serif display with an italic accent word, and tracked mono captions. Headlines arrive through a curved, distorted text reveal, and captions scramble in like glitched code.
- **Interaction:** an audio/no-audio gate, a floating pill nav that docks to the bottom, a settings panel, and an AI assistant. The page ends with "keep scrolling to reveal the next page," so the footer turns into a page transition.
- **Don't copy:** the 3D world, the particle morphs, the violet palette, serif-plus-italic headlines, the scramble captions or the audio gate. That look is theirs. What it teaches is that **one continuous metaphor carried through every chapter** beats a stack of unrelated sections.

### K95 (k95.it)
- **Memorable because** there's no hero copy at all. The homepage *is* the portfolio: a 3D ring/spiral tunnel of project thumbnails orbiting a voxel rose on International-Klein-style blue, with a toggle between the "Rings" and "Spiral" layouts.
- **Feels expensive because** of total commitment to one saturated colour and one bold idea. The Studio page sets scattered typographic compositions ("HOW / in our / studio / WE / COOK / design") on a strict grid.
- **Lesson:** confidence means showing the work first and letting layout carry the personality. **Don't copy:** the blue, the 3D gallery, the voxel object.

### Persona Studio (persona.studio)
- A black hero with an iridescent 3D head and a full-bleed wordmark, then a calm editorial body, large project cards, a client list, a noticeboard and journal.
- **Lesson:** the most conventional of the three. It shows that a restrained, readable body after one loud opening still reads as premium. It's also a warning: "3D head + wordmark" is now a genre.

### Wider sweep (basement.studio, lusion.co, locomotive.ca, plus the Awwwards SOTY/SOTD pattern set)
Patterns that consistently read as premium:
1. **One owned idea** (basement's pixel-dither 3D, Lusion's physics playground, Locomotive's editorial restraint), not a buffet of effects.
2. **Type as image:** full-bleed wordmarks, variable axes, extreme scale contrast.
3. **Scroll as a timeline:** pinned chapters and scrubbed transforms rather than things fading in as they enter.
4. **Contextual UI:** navigation and cursor that change with what you're looking at.
5. **Honest loading:** short, or doubling as the intro itself.
6. **Restraint in the body copy:** calm reading sections between loud moments.

Patterns that now read as *template*: particle blobs, iridescent 3D heads, fake loading percentages, "Let's talk" pills everywhere, identical marquee service lists, awards walls. A two-person studio can't honestly show an awards wall anyway.

---

## 2. Three directions

### A. "The Default, Erased"
The site opens as the most generic agency website imaginable: gradient blob, "We transform ideas into digital experiences", a "Get started" button, logo-cloud placeholders. Your cursor is an eraser. Wherever it moves, the template rubs away (with crumbs) to reveal the real Erase underneath. Past a threshold, or on scroll, the eraser finishes the job in one decisive sweep. The rest of the site keeps the grammar: clichés get erased and rewritten in the manifesto, project sheets erase away to reveal the next, and drafts in non-photo-blue pencil become finished interfaces in the process section.

- **Strengths:** It fuses the name, the positioning ("nothing generic") and the proof into one gesture. It's witty without being childish, and the first five seconds explain who they are, what they do and why they're different. It's technically a 2D canvas, so it's fast on every device. Every later motion has a *reason* ("why does this move?" → "because this is where something gets erased").
- **Weaknesses:** Done badly, it's a scratch card. It depends on the fidelity of the fake template and the feel of the brush. The joke has to pay off in a hero that's genuinely strong, or it undercuts itself.

### B. "Blank Page"
The site starts empty and builds itself as you scroll: a cursor blinks, guides draw in, a wireframe forms, colour arrives, code compiles, and it ends as the finished page. The story is process-as-spectacle.

- **Strengths:** Shows craft literally. Great for technically minded clients.
- **Weaknesses:** "The site assembles itself" has been done many times. The first impression is *empty*, so the "whoa" comes late, and the name "Erase" goes unused. Long scroll before any payoff hurts conversion.

### C. "Signal / Noise"
A cinematic dark WebGL field: type dissolves into noise under the cursor and re-forms, and projects emerge from static.

- **Strengths:** Instant spectacle, the highest short-term "whoa."
- **Weaknesses:** Heavy (Three.js, shaders) and fragile on low-end mobile. It sits in the same aesthetic neighbourhood as Emotion and Lusion, so a two-person team would be competing on those studios' home turf. "Meaningless particles" is on the banned list, and the metaphor connects to "Erase" only loosely.

### Decision: **A, borrowing B's draft-to-final idea for the Process chapter.**
It's the only direction where the brand name *is* the interaction and the interaction *is* the argument. It's also the most honest fit: a small team can't out-spectacle Lusion, but it can out-think a template.

**Guardrails so it doesn't become a scratch card:**
- The template layer is rendered with real fidelity (system font, soft shadows, a blurred gradient blob) and labelled like a figure ("Fig. 1: the average agency website").
- The brush has physical behaviour: interpolated strokes, pressure from velocity, small graphite crumbs that fall and fade.
- The payoff is a decisive, choreographed auto-sweep followed by a typographic reveal, not a coverage bar.
- There's no progress meter, no score and no "you did it" message.
- Touch devices get an auto-played sweep (no fighting the scroll gesture), and reduced motion gets the final state immediately.

---

## 3. System

### Palette: pencil, paper, graphite and non-photo blue
The subject's own tools. Designers sketch in **non-photo blue** because it disappears in reproduction: it's the colour of the draft, the thing that gets erased. That becomes the only accent.

| Token      | Hex       | Role |
|------------|-----------|------|
| `graphite` | `#111213` | Dark chapters, primary text on light |
| `lead`     | `#26282C` | Rules and surfaces on dark |
| `sheet`    | `#E9EAEC` | Light chapters (cool paper, not cream) |
| `smudge`   | `#8B8E94` | Secondary text on dark |
| `pencil`   | `#55585E` | Secondary text on light |
| `blueline` | `#79C8EE` | The draft/erase accent: cursor, focus rings, sketches, highlights |

Dark chapters are for *experience* (hero, work, founders); light chapters are for *reading* (vocabulary, capabilities, process). The change between them is itself an erase wipe.

### Typography: two families
- **Mona Sans (variable, `wght` 200–900, `wdth` 75–125)** for display and body. The width axis is the kinetic tool: headlines compress as they're erased and expand as they're written. Capability rows widen on hover. One family, huge range.
- **Geist Mono** for utility only: figure labels, indices, form hints and the live section indicator. It stays small and uppercase.

Scale: display at `clamp(4rem, 15vw, 16rem)` with tight −0.04em tracking, H2 at `clamp(2.5rem, 7vw, 7rem)`, body at 17–19px with 1.5 line height, and mono labels at 11–12px with +0.08em tracking.

### Layout
A 12-column grid with 16px mobile and 32–48px desktop gutters. Asymmetry is deliberate: headlines hang from the left edge, and supporting copy sits in columns 8–12. Sections are chapters, and chapters are numbered because the site *is* a sequence.

### Motion language: "rub out, write in"
- **Exit** = erase: a slanted band sweeps across (clip-path), or type compresses on `wdth` while fading.
- **Enter** = write: lines reveal from a mask along the reading direction, stagger 60ms, ease `expo.out` at 0.9–1.1s.
- **Scrub, don't trigger** for chapter transitions (the scroll is the pencil). One-shot triggers are reserved for small text reveals.
- **Magnetism only on primary CTAs.** Nothing else wobbles.
- **Easing vocabulary:** `expo.out` for reveals, `power3.inOut` for wipes, and springs only for the cursor.

### Interaction language
- The cursor is a small blueline dot with a lagging ring. It becomes the eraser (a rounded-rectangle tip) in the hero, and takes labels ("Drag", "Open", "Email") on meaningful targets. It's only enabled on fine pointers.
- Hover shifts the width axis rather than colour.
- Focus states are a 2px blueline outline with an offset, everywhere.

### Navigation
- A slim fixed bar. Left: the "Erase" wordmark. Centre: a **live chapter indicator** (`02 / Vocabulary`) that shows where you are in the story. Right: a magnetic "Start a project" button and a "Menu" toggle.
- The menu is a full-screen sheet that wipes in along the erase band, with giant chapter links, the email and a single sentence.
- Mobile: the wordmark, chapter indicator and Menu stay in the bar; the CTA moves into the menu.

---

## 4. Experience architecture (homepage)

| # | Chapter | Theme | Job | Signature behaviour |
|---|---------|-------|-----|---------------------|
| 00 | **Intro: The Default** | Canvas over dark | Who / what / why in 5s | Cursor erases the template, crumbs fall, then the auto-sweep. The real hero reads "Nothing generic left." |
| 01 | **Vocabulary** | Sheet | What we believe | Scrubbed: each agency cliché is struck, erased and rewritten as a plain promise |
| 02 | **Proof** | Graphite | What we build | Pinned stack of project "sheets"; scroll erases the top sheet to reveal the next. Coded miniature websites, not screenshots |
| 03 | **Inside a website** | Sheet | Capabilities | Typographic index; rows expand on the width axis and reveal scope |
| 04 | **Process** | Sheet → Blueline | How we work | Pinned: a single frame moves from blueline sketch → wireframe → design → live as four steps advance |
| 05 | **Two people** | Graphite | Who | Founders, the Nepal story, "no middle layer" |
| 06 | **Blank page** | Graphite | Convert | "Send us your website. We'll tell you what we'd erase first." A short brief form that erases itself on send |
| — | Footer | Graphite | Close | Full-bleed wordmark; "Miss the template? Put it back." restores the hero |

CTAs: the nav button (persistent), the end of Proof ("Your site could be the next sheet"), the end of Process, and the contact chapter.

### Honesty rules baked into the content
- No client logos, testimonials, stats or awards.
- The first project is **this website** (real). The other entries are **clearly labelled concept studies**, work designed by Erase to show range. Replace or supplement them with shipped client work as it lands (`src/content/work.ts`).
- Founder names, email and socials live in `src/content/site.ts` and are marked for replacement.

### Mobile strategy
- **Hero:** the erase sweep auto-plays shortly after load, since a touch drag would fight the scroll. The template still appears for a beat so the joke lands.
- **Proof:** no pinning. Sheets stack vertically, and each frame reveals with a single erase wipe as it enters.
- **Process:** no pinning. Each step carries its own frame state.
- **Motion:** reduced (shorter distances, no magnetism, no custom cursor). Lenis is disabled on touch, so native scroll stays in charge.

### Tech (every dependency justified)
- **Next.js (App Router) + TypeScript + Tailwind v4.** Static output, metadata/OG/sitemap, `next/font` for zero-CLS variable fonts.
- **GSAP + ScrollTrigger.** Scrubbed, pinned timelines are the core of three chapters. Hand-rolling this reliably costs more than the ~45KB.
- **Lenis.** Consistent inertial scroll that stays in sync with ScrollTrigger scrubs on desktop; off on touch and reduced motion.
- **No Three.js/WebGL.** The signature is 2D canvas compositing (`destination-out`), which is cheaper and runs on every device.
- **Contact:** a route handler sends through Resend when `RESEND_API_KEY` is set. Otherwise the form opens a prefilled email instead of pretending it sent.
