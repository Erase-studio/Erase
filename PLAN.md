# Erase — the plan

A read of [lusion.co/about](https://lusion.co/about/), an audit of this site as it stands
today, and the build order to get from "very good" to "they'll remember it."

Measured 20 Sep 2026 against the production build (`next build` + `next start`),
GPU Chrome, 1440×900 and 390×844.

---

## Part 1 — What Lusion is actually doing

Ignore the render quality for a second. Underneath the astronaut, Lusion's About
page is eight reusable mechanics. These are the transferable parts.

### 1. One cinematic scene owns the first three screens
The hero isn't a section, it's a **place**: a crater, a beam, a figure, a descending
particle cloud. Scrolling doesn't move you past it, it moves you *through* it. Type
never sits in the middle — it's pinned to the corners (`WE ARE / A CREATIVE
PRODUCTION STUDIO` bottom-left, `CRAFTING UNIQUE DIGITAL EXPERIENCES` bottom-right)
so the scene stays the subject.

**Take:** corner-anchored type over a scene that persists for several screens.
**Leave:** the sci-fi imagery. That's their world, not ours.

### 2. Registration marks
Tiny `+` crosses pinned at a fixed horizontal line, edge to edge. They never move.
They cost nothing and they make every screen read as *composed* rather than laid out.

**Take:** wholesale. Ours should be pencil ticks, not crosses.

### 3. Clone-roll on every piece of interactive text
Every nav label, button and headline letter exists **twice** in the DOM
(`header-menu-link-text` + `header-menu-link-text-clone`), transitioning
`color 0.4s, transform 0.4s cubic-bezier(0.4, 0, 0.1, 1)`. On hover the real label
rolls up and out while the clone rolls in from below.

**We already have this** (`components/ui/Roll.tsx`). We use it on 4 elements.
They use it on ~40. That's the whole difference.

### 4. The menu is a dropdown, not a takeover
`MENU ··` becomes `CLOSE ⋮` and three rounded cards stack down from the button:
nav links (a dot marks the current page), a newsletter card, then a black
`LABS ↗` card. The page behind keeps running. It's 340px wide. It never hijacks you.

**Take:** this. Our full-screen menu stops Lenis, steals focus, and covers a page
the visitor was already reading — for five links.

### 5. Data as design
`AWARDS 58` / `ARTICLES 03` / `TALKS 5`. Zero-padded three-digit counts (`001`,
`016`) in a mono face, in ruled tabular rows, with a giant ghost-grey word sliding
behind at a different scroll rate. No illustration, no icons. It's a spreadsheet,
and it's the most confident part of the page.

**Take:** the form exactly. **Leave:** the content — we have no awards and we will
not invent any. See "The Ledger" below for what goes in those rows instead.

### 6. One physical metaphor, dealt
Area of Expertise is a **deck of playing cards** that fans, flies along a visible
curved path, and deals into four upright cards — `STRATEGY ♠ / CREATIVE / TECH /
PRODUCTION` — each with its service list as the card's face and a mirrored glyph
bottom-right, like a real court card. Full-bleed electric blue behind it.

This is the single best idea on the page: **an object everyone already knows how to
read, used to carry dry list content.** No particles.

### 7. One accent colour, used four times
Monochrome throughout, then: the blue circular arrow on TEAM, the blue expertise
section, the blue dot-wave on the CTA. That's it. The restraint is why the blue
lands.

**We already do this** (`--color-blue: #3d63ff`). Ours is close to correct.

### 8. The footer is a doorway
Below the real footer: `KEEP SCROLLING TO LEARN MORE` → `OUR PROJECTS` →
`NEXT PAGE →` with a line that fills as you keep pushing. Keep scrolling and it
takes you there. The site becomes one continuous document with no dead ends.

**Take:** this, on every page. It's cheap and it changes how the whole site feels.

---

## Part 2 — Where we stand

### What's already at that level
Genuinely. This isn't padding.

- **The crumple.** A real generic template, screenshotted, crumpled into paper by a
  cloth sim, thrown away. Lusion has nothing that specific to who they are.
- **The dive.** A tunnel built from procedurally drawn wireframe templates, rubbed
  out as you fly, with a live counter. It's our equivalent of their crater and it's
  more *argued* — it means something.
- **The contact letter.** Fill-in-the-blanks prose instead of a form. Better than
  Lusion's contact page.
- **The sound design.** 968 lines of real synthesis, scene-aware, discrete.
- **Zero raster images on the entire site.** Every visual is drawn at runtime —
  posters, miniatures, wireframes, textures. That's a real engineering flex.
- **SEO hygiene.** Correct per-route canonicals, sitemap, robots, JSON-LD.
- **Honest content.** Concept studies are labelled concept studies.

### What's measurably broken

| | home | contact |
|---|---|---|
| JS downloaded | **1 553 KB** | **1 530 KB** |
| FPS while scrolling (desktop GPU) | **45** | 94 |
| FPS at 4× CPU throttle | **38** | 76 |
| Worst long task | **766 ms** (960 ms throttled) | 219 ms |
| Page height (desktop) | **22 705 px** | 2 029 px |

**1. Every route downloads the entire 3D engine.**
729 KB of three.js in two chunks, plus 139 KB of GSAP + ScrollTrigger + club
plugins, on *every* page. `StageCanvas` does `Promise.all` over all six views —
Hero, Line, Crumple, Stack, Dive — regardless of what the route actually contains.
The contact page needs exactly one of them (the pencil line) and pays for all six.

**2. There is a ~1-second main-thread block on the home page.**
766 ms on a desktop GPU, 960 ms throttled. Contact, which builds one view, blocks
for 219 ms. The gap is view construction — every texture atlas (`drawTemplate`,
`posters`, `diveArt`, `clicheAtlas`, `stickerAtlas`) is drawn to a canvas
synchronously at boot, including the dive's, which the visitor won't reach for
twenty screens. That's an INP failure on any real phone.

**3. The home page is 22 705 px — about 25 screens.** Mobile is 19 519 px. No one
reaches the dive. The best thing we built is behind a twenty-screen walk.

**4. `viewport.themeColor` is `#ecebe6` and `colorScheme: "light"`, but the site now
defaults to dark with a `#000` background.** On a phone the browser chrome renders
paper-coloured above a black page, and form controls are forced light.

**5. `ogl` is in `dependencies` and imported nowhere.**

**6. `SoundDirector` runs `document.elementFromPoint` on a 250 ms interval forever**
— a forced layout four times a second, on every page, for the life of the session.

**7. Only 5 `:focus-visible` rules across ~4 300 lines of CSS.** For a site this
interaction-heavy, keyboard users are getting almost nothing.

### What's generic

- **`/studio` is the weakest page on the site** — headline, a tool list, four text
  rules, footer. 3 415 px. No people, no story, no object, nothing to touch. This is
  the page that maps directly onto Lusion's About, and right now it loses badly.
- **`/services` repeats the home page.** "Everything a website needs. One studio."
  and the same six service rows appear on both.
- **`/work` is thinner than one case study** (2 909 px, four items, one of which is
  this site).
- **The case studies never show the work.** Chapter tabs, a strike-through headline,
  a pull quote, colour swatches, a type spec — and no artefact. A studio site has to
  show the screen.
- **Roll hover is used on 4 elements.** Everything else is a colour fade.
- **No registration marks, no tabular data, no full-bleed colour break, no
  next-page doorway.**

### What's missing outright
People. A labs page. Per-case OG images. A reason to come back.

---

## Part 3 — The build order

Four phases. Phase 0 is not optional; everything after it is upside.

### Phase 0 — Make it fast (do this first, ~2 days)

Nothing creative ships until the engine is right. Every item below is measurable.

**0.1 — Route-scoped view loading.** `StageCanvas` should scan for `[data-view]`
*first*, then import only the views present, in parallel with `Stage` itself.
→ Contact/work/services stop downloading ~730 KB.
*Files:* `components/stage/StageCanvas.tsx`

**0.2 — Build the dive lazily.** Construct `DiveView` (and its five texture
atlases) when the dive section is within two viewports, not at boot.
→ Kills the bulk of the 766 ms block.
*Files:* `StageCanvas.tsx`, `lib/stage/DiveView.ts`

**0.3 — Slice atlas generation.** `drawTemplate`, `posters`, `diveArt` draw big
canvases synchronously. Chunk them across `requestIdleCallback` frames, or move
them to an `OffscreenCanvas` worker.
→ Target: no task over 120 ms anywhere on the site.

**0.4 — Split the GSAP plugins.** `SplitText`, `ScrambleTextPlugin` and
`DrawSVGPlugin` are loaded on every route in the root bundle. Import them where
they're used.
*Files:* `lib/gsap.ts`

**0.5 — Replace the 250 ms poll** in `SoundDirector` with an `IntersectionObserver`
over `[data-sound]`.

**0.6 — Fix `themeColor` / `colorScheme`** to follow the active theme (two
`<meta name="theme-color" media="(prefers-color-scheme: …)">` tags).

**0.7 — `next.config.ts` is empty.** Add `poweredByHeader: false`,
`experimental.optimizePackageImports: ["gsap", "three"]`, and immutable cache
headers for `/_next/static`.

**0.8 — Drop `ogl`.** Subset the fonts: Mona Sans variable with the `wdth` axis is
most of the 118 KB. Keep the axis only if we're actually animating width.

**0.9 — A capability gate.** `deviceMemory < 4` or a coarse pointer under 768 px →
skip the heavy views and let the CSS fallbacks carry it. The site must be *good* on
a £150 phone, not merely functional.

**0.10 — Budget in CI.** Fail the build if first-load JS on any route exceeds
180 KB brotli, or any route's worst long task exceeds 150 ms. You can't hold a
budget you don't measure.

**Exit criteria:** every route under 180 KB brotli first-load; no task over 150 ms;
home holds 60 fps at 4× throttle.

---

### Phase 1 — The spine (~3 days)

Structural changes that make everything after them land harder.

**1.1 — Cut the home page from 22 705 px to ~14 000 px.** Specifically:
- `ProcessPath` — four numbered stops with a sketch sheet each. Collapse to one
  horizontal pinned track: four cards, one sheet, ~1.5 screens instead of 5.
- `ServiceRows` — cut to three lines and a link. The full list lives on `/services`.
- `Statement` and `Crumple` — merge. The statement should be *printed on* the
  template that gets crumpled.
→ The dive arrives around screen 11 instead of screen 20.

**1.2 — The next-page doorway.** Below the footer on every route: a rule, a label,
the next page's name, and a line that fills as you keep scrolling. Past 100% it
navigates through the existing `PageTransition`.
Order: Home → Work → Services → Studio → Labs → Contact → Home.
*New:* `components/site/NextDoor.tsx`

**1.3 — Registration ticks.** A fixed overlay of small pencil ticks at a constant
horizontal line, edge to edge, above the ripple field and below the content. One
component, ~30 lines, changes every screen on the site.
*New:* `components/system/Ticks.tsx`

**1.4 — Roll everywhere.** Audit every `<a>` and `<button>`. Every one of them gets
`<Roll>`. Every card gets a graphite lift. Every list row gets a rule that draws in
from the left. This is the cheapest, highest-return change on this list.

**1.5 — Menu → dropdown.** Replace the full-screen takeover with a stack of cards
anchored under the MENU pill: links (dot on the current page), a "what we're
building" card, and a black `LABS ↗` card. Stop calling `lenis.stop()`.
*Files:* `components/system/Nav.tsx`

**1.6 — De-duplicate `/services` and home.** Home teases, `/services` explains.
One shared source in `content/`, two different presentations.

---

### Phase 2 — The set pieces

The parts people screenshot. Three of them. Each is a day or two.

**2.1 — The pencil case.** *(our answer to their card deck)*
`/services`, full-bleed blue. Six worn erasers lie in a tray — each one shaped by
the job it does: the strategy one squared off at the corners, the SEO one worn to a
sliver, the art-direction one barely used. Scroll and they lift, turn, and settle
into a row of upright cards, each face carrying its service list. Hover and that
eraser turns to show its worn edge.

Why it beats the card deck for us: a deck is a borrowed metaphor. An eraser worn
differently by each kind of work **is the brand's own argument**, in an object.
*Uses:* `lib/stage/objects.ts` (the eraser geometry already exists), a new
`SuiteView`, one instanced mesh, no new textures.

**2.2 — The Ledger.** *(our answer to AWARDS 58)*
`/studio`. Tabular, mono, zero-padded, with a giant ghost word sliding behind at
half scroll rate. Rows of **real, measured numbers** — never claims:

```
BUILD          001   Lighthouse performance, this site        100
               002   Largest contentful paint                 0.4 s
               003   JavaScript shipped, home                 —— KB
               004   Raster images on this site               000
SHIP           005   Brief to live preview, median            —— days
               006   Templates started from                   000
```

The numbers come from a `metrics.json` written by CI on every deploy, not typed by
hand. A studio that argues performance is design and then *shows its own numbers,
measured, updating* — nobody does this. It is the single most credible thing we
could put on the site, and it's honest by construction.

**2.3 — The two of us.**
`/studio` needs people; we have no photos and won't fake any. So: two portraits
**drawn in graphite**, assembling stroke by stroke as they scroll into view
(`DrawSVGPlugin`, already in the bundle), with a real split of who does what and
what each of you is actually like to work with. Below them, one honest line about
being two people and what that means for scope.

---

### Phase 3 — The surprise

The three swings. Ordered by how likely they are to get the site shared.

**3.1 — "Erase your homepage." ★ the big one**
A device on `/` (or its own route, linked from the nav):

> *Drop a screenshot of your current site.*

They drag in an image. It renders to canvas. Then **their cursor rubs it away** —
the real rub engine we already have in `lib/rub.ts`, graphite crumbs and all.
Underneath, as the pixels go, a handwritten note appears:

> *What's left is the part worth keeping. Let's talk about the rest.*

…and the contact letter is prefilled with the filename.

Entirely client-side — `FileReader` → canvas, nothing uploaded, nothing stored, no
server, no privacy question to answer. It is the brand's entire thesis turned into
something the visitor *does to their own site*. This is the thing that gets posted.

**3.2 — `/labs` — the offcuts.**
We have a drawer full of real interactive machinery already written: the rub
engine, the ripple field, the cloth-crumple sim, the template generator, the poster
generator, the sound engine, the dive tunnel. `/labs` is a grid of cards, each one a
small live canvas you can poke, each with a line on how it works.

It's ~80% built already. It gives the black `LABS ↗` card in the menu somewhere to
go. And it's the most honest possible proof of "built, not assembled."

**3.3 — The Generic Generator.**
A button that procedurally generates a brand-new generic agency landing page —
`drawTemplate.ts` already does the drawing; add a wordlist so the headline is a
fresh cliché every time ("We transform ideas into digital experiences" /
"Elevating brands through innovation"). Press it again, get another one. Then
erase it.

Infinite content, zero assets, and it makes the joke the whole site is built on
land in two seconds.

---

### Also: fix the work

**Case studies need an artefact.** Every case page should open with a device frame
containing the mini **scrolling live** — we already render these miniatures, we're
just showing them as a static thumbnail. Make it read as a site, not a swatch.

**Per-case OG images.** `opengraph-image.tsx` exists at the root only; every case
link shares the same card. Add a dynamic one per `/work/[slug]` using that project's
`tone` colours and poster.

**`/work` needs more in it.** Four items, one of which is this site. Either build
two more concept studies, or restructure the index so four items feel deliberate
rather than thin — full-bleed rows, one per screen, each in its own colour.

---

### Pre-launch blockers (carried from before, still open)

- `site.url` → real domain
- `site.email` → real inbox (the mailto fallback and the API route both use it)
- `founders[]` → real names, initials, roles
- `site.social[]` → real URLs, or the links stay hidden
- Budget bands on `/contact` → confirm the real numbers
- Decide: does sound default on or off before the visitor answers the prompt?

---

## Part 4 — What to build first

If you only do one phase: **Phase 0**, then **2.2 The Ledger**, then **3.1 Erase
your homepage**.

That order gives you a site that is measurably faster than anyone you're competing
with, that *proves* it in a table of its own numbers, and that hands every visitor
the brand's argument to try on their own homepage. The rest is polish on top of a
position no one else is holding.

Lusion wins on spectacle. We are not going to out-render a studio with a 3D
production pipeline, and we shouldn't try. We win on **subtraction** — a site that
is faster, quieter, funnier and more honest, and that does one thing to the visitor
that they can't unsee.

---

## Status — 21 Sep 2026

### Built
Everything in Phases 0–3, plus a production pass:

- **Speed** — 3D loads per box, near the viewport, compiled off the main thread;
  light probe skipped on phones and slow machines; audio engine loads on first
  touch; unused plugins and `ogl` removed; `npm run check` enforces a JS budget
  and writes `src/content/metrics.json`.
- **Spine** — dropdown menu, next-page doorway, registration ticks, roll hovers,
  home cut by ~23 %, services de-duplicated.
- **Set pieces** — the eraser tray on `/services`, the ledger on `/studio`,
  `/erase-it`. (`/labs` and the two-person section were built, then removed at
  the owner's request.)
- **Production** — `error.tsx`, `global-error.tsx`, `manifest.webmanifest`,
  generated `apple-icon`, `/favicon.ico` served, security headers, contact API
  with origin check, size cap and rate limit, per-case OG images, contrast-safe
  `--blue-ink` for small blue text, light theme checked.

### Measured (Lighthouse 12, mobile emulation unless noted)
| | perf | a11y | best practices | SEO |
|---|---|---|---|---|
| every page | 70–74 | 100 (`/work` 96) | 100 (`/work` 96) | 100 |
| home, desktop preset | 78 | 100 | 100 | 100 |

### Still open — needs a decision or real data
1. **The loading screen caps mobile performance at ~72.** Largest contentful
   paint is ~3.4 s on a first visit because the page's headline is revealed after
   the loader opens. It's a design choice; shortening or removing the first-visit
   loader is the only large lever left.
2. **`/work` a11y/best-practices 96** — tiny text inside the drawn site
   previews (they're illustrations). Fixing it means changing the concept
   palettes or rendering the previews as images.
3. **Placeholders** — domain, inbox, social links, budget bands,
   `RESEND_API_KEY` / `CONTACT_FROM` for the contact form.
4. **The contact rate limit is in-memory** — fine on one server, per-instance on
   serverless. Use a shared store (e.g. Upstash) if spam becomes real.
5. **Lean 3D mode** hasn't been seen on a real low-end phone yet.
