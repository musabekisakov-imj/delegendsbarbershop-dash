# Customer-site reference analysis

Detailed steal/avoid breakdown of four high-end barbershop websites, written for the kirpykla.lt context (Lithuanian + EU market, multi-office, single-tenant brand owned by the dashboard tenant).

The goal is to be specific. "Use good typography" is not advice. "Set body line-height to 1.55–1.65 with -0.005em tracking, like Murdock does" is.

---

## 1. Murdock London — `murdocklondon.com`

**One-line read:** Heritage British grooming presented as a feature in a Sunday broadsheet.

### Steal

- **Generous serif display + grotesk body pairing.** Murdock uses a quiet sans for navigation and short copy, then drops into a confident serif for headlines and pull-quotes. This signals "we have things to say" without yelling. For kirpykla.lt: pair a serif like Fraunces, Tiempos, or PP Editorial with a grotesk like Inter Tight or GT America. Reserve the serif strictly for h1/h2 and editorial paragraphs longer than two lines — never for navigation or buttons.
- **Service detail as long-form.** Each service has a real description with technique notes, duration, and what the client should expect. They treat services like recipes, not menu items. Steal the structure: name → 3–5 sentence description → duration → price (with VAT) → "what to expect" sub-section. This also helps SEO.
- **Restrained colour palette.** Off-white background, deep ink for text, a single muted accent (theirs is oxblood). Three colours. No gradients. The visual restraint forces typography to do the work.
- **Booking integrated, not separated.** "Book" appears in the top-right of nav AND inline in service cards AND in the footer. They never make you hunt for it. Three entry points minimum.

### Avoid

- **Their photography is dated.** Mid-2010s "lifestyle" aesthetic — soft focus, warm Instagram filters. For 2026 it reads tired. Use sharper, contemporary photography (more like Aesop's product shots than typical "barbershop interior").
- **Mobile is an afterthought.** Hero scaling on mobile is awkward; serif headlines crash into nav. Build mobile-first instead.
- **Heavy reliance on lifestyle copy ("the modern gentleman …").** This trope is exhausted. Write specifically: "30-minute scissor cut" beats "the considered approach to grooming" every day.

### Verdict for kirpykla.lt
Use as the **typography and information architecture model**. Don't copy the visual mood — Murdock is older British, kirpykla.lt is contemporary Baltic. The structure is timeless, the surface is dated.

---

## 2. Ruffians — `ruffians.co.uk`

**One-line read:** Editorial magazine that happens to also cut hair.

### Steal

- **Image-led hero with no headline overlay.** Ruffians frequently runs a full-bleed photograph as the entire hero, then puts the headline in a separate band underneath. This avoids the "text floating on busy photo" problem most barbershop sites have. For kirpykla.lt: in the editorial variant, run a full-width photo (e.g., a barber at work, low key lighting), then a title section directly below on a flat colour band.
- **Staff bios written as profiles, not LinkedIn.** Each barber has a 2–3 paragraph profile — where they trained, what they specialize in, the favourite cut they do. Photographs are environmental (in the chair, mirror reflection, hands working) not corporate headshots. This sells human craft over "service".
- **Strong eyebrow/kicker labels.** Small uppercase labels above headlines ("APPRENTICE", "WEST END", "EST. 2014") give every section a sense of place and pace. Cheap to implement, huge editorial gain. The git log shows you already do this — keep it.
- **Booking flow is multi-step but every step is one decision.** Office → service → barber → time → confirm. Each screen has exactly one job. Don't combine.

### Avoid

- **Too much text on the homepage.** They write essays where 80 words would suffice. The fold above-fold should not contain a paragraph longer than 3 lines on desktop.
- **Slow time-to-first-byte.** Ruffians has a heavy stack of CMS + analytics that makes the site sluggish. Your Next.js + RSC setup is faster — keep it that way, don't add Sentry-level analytics until needed.
- **Inconsistent grid.** Some sections are 12-col, some are arbitrary. Pick one grid (12-col with 24px gutter) and hold the line everywhere.

### Verdict for kirpykla.lt
Best **content tone reference**. Your "PARLOUR" iteration in git was research-driven from this; lean into it for the team and services pages.

---

## 3. Hawthorne — `hawthorne.co`

**One-line read:** Tech-startup minimalism applied to grooming.

### Steal

- **Stark grid discipline.** Cards are exact same height. Padding is exactly 24px or 48px, never an in-between number. Spacing is 4-, 8-, or 16-pixel multiples. Easy rule, professional result. Implement as Tailwind spacing tokens and never use arbitrary values.
- **Single accent colour across the whole brand.** They pick one (a muted amber) and use it for: links, focus rings, primary buttons, hover underlines. Nothing else gets coloured. This makes the design feel system-level, not improvised.
- **Tabular numerals everywhere prices and times appear.** Prices "€ 28" and durations "30 min" use `font-feature-settings: "tnum"`. This is a small detail that reads professional — uneven digit widths look amateurish. Apply to all `<time>`, all prices, all booking-flow numbers.
- **Empty states are designed.** Every "no appointments yet" or "no reviews" screen has a designed empty state with a useful next action, not just blank space. Your dashboard already does this — apply the same discipline to customer-site empty states (search with no results, services not yet loaded, etc.).

### Avoid

- **Coldness.** Hawthorne can feel sterile — the discipline tips into "spreadsheet" territory. A barbershop is a tactile, physical, social space. Don't fully erase the warmth. Pair their grid discipline with photography that has a pulse (people, hands, hair, scissors mid-air).
- **Over-reliance on icons.** They put a Heroicon next to every section heading. By the third one it stops adding meaning. Use icons sparingly: one or two on the homepage, none in body content.
- **No personality in copy.** "Premium grooming experience" is meaningless. Replace with specifics: "We sharpen our scissors weekly" tells you more than any abstract claim.

### Verdict for kirpykla.lt
Use as the **systems reference** — spacing scale, colour discipline, numeric typography. Don't borrow the tone — Lithuania's market expects more warmth and specificity than Hawthorne's tech-bro register.

---

## 4. Blind Barber — `blindbarber.com`

**One-line read:** Speakeasy energy, lime accent, late-night NYC.

### Steal

- **One striking accent against deep dark.** Their site is near-black with a single saturated accent (theirs is a yellow-lime). The contrast does almost all the brand-recognition work. For kirpykla.lt's "HALL" iteration: lime accent against ink-black already lands here — push it further, don't dilute.
- **Marquee/ticker strips between sections.** A horizontally-scrolling row of stats, locations, or services adds energy and movement without being a full carousel (which is heavy). You already have a stats marquee in `customer-site/components/shared/stats-marquee.tsx`. Keep using it as a section separator.
- **Photo treatment: high-contrast, slightly desaturated, dramatic shadows.** Cinema-style colour grade. Use a consistent LUT across all photography so the team page, hero, and locations feel like the same world. Adobe Camera Raw "Cinematic" preset or similar.
- **Multi-location handled with confidence.** Each office gets its own miniature site within the site — own hero photo, own opening hours, own barbers list. They don't try to flatten "we have many offices" into one page. For kirpykla.lt with 2 offices, give each its own `/locations/<slug>` with a real photo and the office's own staff.

### Avoid

- **Hard-to-read body copy.** They run small white-on-black text at 14px. At 14px on a dark background, after 30 seconds your eyes complain. Go 16–17px minimum and pull the white slightly off-pure-white (`#EDECE7` not `#FFFFFF`) to soften retinal burn.
- **Music on hover sound effects.** Cute for a minute, hostile for the next ten. Skip.
- **Their booking flow is buried.** You have to scroll past the manifesto to find "book". Don't repeat — always have "Book" in a sticky element.

### Verdict for kirpykla.lt
Best **palette and movement reference** for the dark variant. Your "HALL" iteration was research-driven from here; the structure is right, just resist the hostile body-text decisions.

---

## Summary cheat sheet

| Source | Take | Skip |
|---|---|---|
| Murdock | Serif/sans pairing, long-form services, 3-colour palette | Dated photography, lifestyle copy, weak mobile |
| Ruffians | Image-led hero, eyebrow labels, staff profiles | Wall of text, slow load, inconsistent grid |
| Hawthorne | Grid discipline, single accent, tabular numerals, empty states | Coldness, icon overuse, abstract copy |
| Blind Barber | Dark + neon accent, marquee, cinematic photo grade, per-location pages | Tiny body text, sound effects, buried booking |

## What this means for kirpykla.lt specifically

Your git history shows you already did the research — STUDIO, HOURS, PARLOUR, STAFF, HALL are real explorations. The next move isn't to keep iterating; it's to **commit to one direction** and present 2–3 finished options to the client, not 5 in-progress ones.

The three variants in this folder (`01-atelier.html`, `02-studio-black.html`, `03-workshop.html`) are written as fully-formed positions, not iterations of one idea. Show the client all three at the May 6 checkpoint and ask them to pick. That conversation is more productive than "do you like this version better than yesterday's?"

A final note on local context: kirpykla.lt is a Lithuanian word, and Lithuania (and the Baltics generally) responds well to design that reads "European" rather than "American". The "Atelier" variant leans hardest into that and is the safest bet if the client is hesitant. "Studio Black" is the brave choice. "Workshop" is the differentiator if there's no other dark/utilitarian barbershop in their city.
