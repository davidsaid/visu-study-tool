# The web app

Plain HTML, CSS and JavaScript, with no build step. `index.html` loads classic scripts in this
order: `data/collections.js`, `app/collection.js` (which writes the script tags of the open
collection's `data/<id>/*.js`; see `docs/data-format.md`), `vendor/ts-fsrs-5.4.2.umd.js`, then the
files below. There are no ES modules and no `fetch()`, so the site works when `index.html` is
opened from a downloaded folder (`file://`) and on GitHub Pages. Nothing loads from another host
except a species' YouTube video, and only after a click (`youtube-nocookie.com`).

| File | Holds |
|------|-------|
| `collection.js` | Picks the collection (`visu-collection` in localStorage, or `?c=<id>`) and loads its data |
| `i18n.js` | `L(es, en)`, bilingual helpers, fixed labels (skills, levels, fact fields, IUCN) |
| `engine.js` | Grading, the intent router, FSRS scheduling, mastery, distractors, session building, streak, badges, export/import. No DOM, no storage |
| `store.js` | The progress object in `localStorage`, one key per collection (`visu-progress-v1` for vertebrados, `visu-progress-v1:<id>` for the others); its shape is documented at the top of the file |
| `ui.js` | Shell, photos, rings and medals, export/import buttons, citation popover, first-visit notice |
| `views-practice.js` | Today, level picker, photo → name session, exam sheet, "¿Cuál es?", Mock VISU, summaries |
| `views-explore.js` | The progressive-disclosure tree (full, or study mode rooted at the list's classes), species and group cards, badges |
| `views-info.js` | "Cómo funciona" and settings |
| `main.js` | Boot and the hash router |
| `style.css` | The approved prototype 5 stylesheet, plus a short block of additions at the end |

Tests: open `tests/engine.html` (engine assertions; prints `RESULT: PASS` or
`RESULT: FAIL n/m`). `tests/harness.html?s=<scenario>` drives the app in an iframe for
screenshots and the persistence check; from `file://` it needs Chrome's
`--allow-file-access-from-files`. `bash tests/run-scenarios.sh <chrome> <site>` runs the scenarios
with their expected results; `<site>` is a throwaway copy with a second, test-only collection,
built by `.venv/bin/python tests/fixture_site.py <dir>`.

## Decisions taken while building (2026-11-01)

| Decision | Why |
|----------|-----|
| **Two states per card.** `m` is the FSRS state, updated only by answers on Hard without hints (Hard sessions, the exam sheet, Mock VISU). `p` is a light counter updated by every answer | The mastery rule: only Hard without hints counts toward "dominada" |
| Easy and Medium re-show a miss or a guess within the session (re-queued 3–5 cards later, at most twice) and schedule the card again at 10 min, 1 day, then 3 days | They must still drive practice without touching FSRS |
| A card is due at the earlier of the two due dates. After a Hard answer, FSRS alone decides | One simple rule for the Today counts |
| Visible progress per card: Easy/Medium streaks give up to 50 %; the FSRS state gives the rest; only a mastered card shows 100 % | "Easy and Medium raise visible progress" without faking mastery |
| Card mastered: FSRS retrievability ≥ 0.90 and stability ≥ 7 days. Species tiers bronze / silver / gold as in `learning-design.md` | From `software-design.md` §3.6 |
| FSRS rating on Hard: wrong → Again; guessed → Hard; unsure → Good; sure → Easy, except on a card's first review, where sure → Good | Easy on a first review gives ~8 days of stability, which would mark a card "dominada" after one answer |
| A valid other class or order typed in its box is logged as `wrong`, not `wrong_species` | It names a whole group, not one confusable species |
| "¿Cuál es?" is logged but schedules nothing | It is a recognition scaffold (`software-design.md` §3.2) |
| Medium distractors that run short fall back to the closest species available, like Hard | The brief only defined the fallback for Hard |
| Mock VISU: marked out of 10; 5 or more passes ("Simulacro superado") | The Spanish pass mark |
| Badges: class badges at 80 / 90 / 100 % of species mastered; "Dominio de" ("Mastery of") for orders with ≥ 3 species at 100 %; "Primera página" (first finished session); "Racha de 7 días" (one missed day a week forgiven). Earned badges are stored and never removed | v1 scope from the brief |
| Readiness: mean FSRS retrievability over every exam card of all species, forecast at the exam date or 7 days ahead; unseen cards count 0. A daily snapshot feeds the trend line | `learning-design.md`, "Exam readiness" |
| **Collections.** One site, one collection open at a time; switching (Ajustes) remembers the choice and reloads with the other collection's data. Each collection keeps its own progress and copies; a copy is refused by another collection, with its name | David, 2026-11-01: invertebrate and arthropod exams will follow. Reloading keeps every view free of "which collection" logic |
| The vertebrate collection keeps the old storage key | Existing progress needs no migration |
| Videos are credited to their channel (title, channel link, date checked); no video comes from the bestiary document as such | David, 2026-11-01: GitHub holds only our code and compiled information |
| A card opened from a practice screen ("Abrir ficha", the species names in a comparison) shows "Volver a la práctica"; going back, by that button or the browser's back, resumes the same question. On a phone the card scrolls into view | David, 2026-11-01: see the animal's details from the mistake screen without losing the session |
| Every card ends with a "report an error" link: a prefilled GitHub issue (card id and collection, nothing else) | David, 2026-11-01: students review the draft texts as they study |
| Every question draws its photo at random (repeats allowed): photo → name at every level, the exam sheet, the mock and the "¿Cuál es?" tiles. The draw is kept while that question is on screen | David, 2026-11-01: learn the animal's features, not a picture's composition or its place in a session |
| Every photo question shows all the animal's photos in a carousel (arrows, counter, swipe, arrow keys), starting on a random one: species card, every level, the exam sheet and the mock. Flipping redraws only the photo, so typed answers stay | David, 2026-11-01: some photos are hard to identify. (Until then Medium, Hard and the sheet showed one photo, as the exam does) |
| Only species with photos appear in the games; Today says how many have none | A photo question without a photo is impossible |
| A missing photo file shows the "no photo yet" placeholder | Media can be regenerated independently of `data/<collection>/media.js` |
| Default theme auto (follows the system's light or dark setting); light and dark can be chosen in Ajustes | David, 2026-11-01. The prototype was signed off in light |
| `?nostorage=1` simulates a browser that blocks storage | To test the warning banner |

Progress read from localStorage or an imported file goes through the whitelist validator
`normalizeProgress` (see `docs/data-format.md`, "Learner progress"), and every value rendered
into HTML goes through `I.esc`; links from data go through `I.url` (http/https only).

Not done in v1: confusion-log driven duels, merge on import (import replaces, after
validation), raising retention near the exam date, photo pins.
