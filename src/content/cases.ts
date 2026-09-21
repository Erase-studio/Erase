/**
 * Case studies, keyed by work slug. Each one is the same five turns: what was
 * broken, how we came at it, what we built, what happened, and what we'd do
 * differently. The short headlines are ours; everything else is the record.
 */

export type CaseStudy = {
  problem: { title: string; body: string };
  approach: { title: string; body: string };
  built: { title: string; body: string }[];
  result: string;
  hindsight: string;
  /** What the last chapter is called, when it isn't a look back. */
  closer?: string;
};

export const cases: Record<string, CaseStudy> = {
  "the-lukla": {
    problem: {
      title: "A busy yellow flyer for a menu.",
      body: "The printed menu was hard to read on a phone, and nearly every visitor is on one. The name (Lukla, the Nepali town where Everest treks begin) and the Niagara Falls location both had to come through without cliché, and calling, directions and the menu each had to be one tap away.",
    },
    approach: {
      title: "Calm, hand-made, food first.",
      body: "The palette comes from the dining room itself: paper white, a pale wash, the periwinkle of the wall as an accent and a deep navy ink. The restaurant’s own dishes, cut out and shot from above, are one set used everywhere, framed by a shaded render of real Everest-region terrain instead of flat vector peaks.",
    },
    built: [
      { title: "Food-first hero", body: "A thali rises from the bottom of a blue card, framed by the range, with plates that drift on scroll." },
      { title: "Menu flipbook", body: "All 16 pages redrawn and bound as a real page-turning book. Swipe on phones, a spread on laptops, deep links to sections." },
      { title: "Open right now", body: "Live open or closed status in the header, with today’s hours highlighted wherever hours appear." },
      { title: "Google reviews", body: "Self-scrolling, with a progress bar, a pause button, swipe, and pause on hover or focus." },
      { title: "One tap away", body: "A phone action bar keeps Menu and Call to order in reach, and steps aside at the footer." },
      { title: "Gallery and contact", body: "A lightbox gallery that fills itself from a folder, and a contact page with call, WhatsApp, map, hours and FAQ." },
    ],
    result:
      "A five-page site built for phones, a full digital menu of over 100 dishes at current prices in place of the printed flyer, and a system of colours, type and plate imagery the restaurant can grow into.",
    hindsight:
      "Every tap target is at least 44px, no text is smaller than 12px, nothing scrolls sideways, and the page is readable before any JavaScript arrives. The whole menu also exists as text, for screen readers and search engines.",
    closer: "The details",
  },
  sunuwa: {
    problem: {
      title: "Complaints die in transit.",
      body: "A citizen reports a broken water line at the ward office, the paper gets logged in a register, and whether it ever reaches the drinking-water division depends on who is at the desk that day. There is no routing logic, no deduplication, and no way for the citizen to know what happened next.",
    },
    approach: {
      title: "Route it like a classifier.",
      body: "Complaint routing is a classification-plus-clustering problem. An LLM layer (Groq-hosted Llama for speed, Gemini for the harder multilingual cases) classifies each complaint against the municipality’s actual departments, while a clustering pass groups near-duplicates, so ten complaints about the same pothole become one ticket with ten reporters. Signal, not noise.",
    },
    built: [
      { title: "Citizen portal", body: "Nepali and English. A complaint filed in plain language, with photos, in under two minutes." },
      { title: "Routing engine", body: "Maps free-text complaints to the right municipal department, with a confidence score and a human-review fallback." },
      { title: "Duplicate clustering", body: "Over complaint embeddings, so repeated reports raise priority instead of splitting attention." },
      { title: "Ward dashboard", body: "Status tracking for officials that citizens can see too, closing the feedback loop." },
    ],
    result:
      "Runner-up at CivicCode Hackathon 2026. The demo ran on real complaint categories from an actual ward’s registry structure, and routing held up against deliberately messy, colloquial Nepali. The clustering layer collapsed a seeded batch of duplicates into single prioritised tickets, exactly as designed.",
    hindsight:
      "We’d design the offline-first flow before the dashboard. Ward offices lose connectivity constantly, and the demo quietly assumed a stable connection. The real product needs to queue and sync.",
  },
  harvo: {
    problem: {
      title: "Farmers lose margin twice.",
      body: "Smallholder farmers lose to middlemen who set opaque prices, and to spoilage while produce waits for a buyer. The farmers hit hardest are often the least comfortable with text-heavy apps, so a form-based marketplace solves the wrong problem.",
    },
    approach: {
      title: "Voice first, in Nepali.",
      body: "A farmer speaks a listing (crop, quantity, harvest date) and the app structures it. On the buyer side, a spoilage score estimated from crop type, harvest date and storage conditions turns “how fresh is this really?” into a number both sides can price against.",
    },
    built: [
      { title: "Voice listings", body: "A Nepali voice interface, so a listing is a 20-second conversation rather than a form." },
      { title: "Spoilage score", body: "Estimates remaining shelf life and flags listings that need an urgent sale, nudging time-sensitive pricing." },
      { title: "Direct market", body: "Farmer and buyer talk to each other, with no intermediary pricing layer in between." },
    ],
    result:
      "A working marketplace where the whole farmer journey (list by voice, get matched, agree a price) runs end to end in Nepali. The spoilage score changed buyer behaviour in testing: urgent listings moved first, which is exactly the incentive the market needed.",
    hindsight:
      "We’d test the voice flow with farmers earlier. Our first prompts assumed standard Nepali; real users code-switch and use crop names that vary by district, and the vocabulary layer had to be rebuilt around that.",
  },
  sajhadoctor: {
    problem: {
      title: "The nearest doctor is a bus ride away.",
      body: "For much of rural Nepal, seeing a doctor costs a day of travel and a day of wages, so treatable conditions wait until they’re emergencies. Telehealth exists, but it assumes English, fast connections and a health-system literacy that shuts out the people who need it most.",
    },
    approach: {
      title: "Design for the constraint.",
      body: "Not around it. Nepali first and English second, light enough for weak connections, and structured so someone who has never had a remote consultation can get from symptom to appointment without help.",
    },
    built: [
      { title: "Consultation flow", body: "Symptom intake, doctor matching and booking, every screen written in plain-language Nepali first." },
      { title: "Low-bandwidth mode", body: "Degrades gracefully: text-first consultations when video won’t hold, with async follow-up." },
      { title: "Doctor dashboard", body: "For managing rural consultations and prescribing with local pharmacy availability in mind." },
    ],
    result:
      "A complete consultation loop running in both languages. The decision that mattered most was the humblest: the text-first fallback makes it usable on connections where every video-first platform simply fails.",
    hindsight:
      "We’d bring in a practising rural health worker from week one. Our intake questions were medically reasonable but in the wrong order for how patients actually describe symptoms, and a nurse fixed it in about ten minutes.",
  },
  nepalprep: {
    problem: {
      title: "CEE prep is scattered everywhere.",
      body: "Every year tens of thousands of students sit the CEE, Nepal’s medical-college entrance exam, and prepare from photocopied question banks, disorganised Facebook groups and PDFs, with no way to tell whether they’re actually improving.",
    },
    approach: {
      title: "One free app for the whole loop.",
      body: "Topic-wise practice, realistic timed mocks and real analytics in one place. Firebase holds auth and the data that must last (scores, study trackers); the quiz in progress (order, timer, bookmarks, answers) lives in localStorage, so it’s instant and costs nothing to save on every tap.",
    },
    built: [
      { title: "Question bank", body: "Subject, chapter, sub-topic, with instant feedback and a full explanation on every question." },
      { title: "Random mix", body: "Shuffles a whole subject for interleaved, exam-like practice instead of block memorisation." },
      { title: "Mock exams", body: "Full-length, two hours, 100 questions from the live bank, scored instantly." },
      { title: "Auto-save", body: "Checkpoints after every question, so a closed tab never means lost work." },
      { title: "Statistics", body: "Accuracy by subject, time per question, weak topics, and a Bikram Sambat heatmap of study days." },
      { title: "Streaks and tracker", body: "Day streaks and a per-chapter study tracker with deadlines, synced to the cloud." },
    ],
    result:
      "A free, fully responsive platform covering the whole CEE loop (practice, mock exam, analytics), with email and Google sign-in behind mandatory verification, and a dark mode that follows the system.",
    hindsight:
      "We’d put the Firebase client config in environment variables from day one. It isn’t a secret by design (Firestore rules and domain allowlisting do the protecting), but treating it that way from the start is the right habit, not a retrofit.",
  },
};
