/* VISU · study engine: grading, scheduling, mastery, distractors, sessions, badges, export.
   No DOM and no storage here: every function takes the data it needs and returns a value
   (applyAnswer returns a new card instead of mutating). Needs window.FSRS (vendor/ts-fsrs).
   Defines window.VISU_ENGINE. */
(function () {
'use strict';
const SKILLS = ['class', 'order', 'genus', 'species', 'common'];
const SPECIES_SKILLS = ['genus', 'species', 'common', 'binomial'];   // a valid other value names another animal
const DAY = 864e5, MIN = 6e4;
const SCHEMA_VERSION = 3;   // 2 (2026-11-02): group cards ('order:X:group') and the 'grupo' game; 3: the 'par' drill in the log

/* ---------------------------------------------------------------- data model */
function buildModel(bestiary, media, content) {
  const tree = (bestiary && bestiary.tree) || {};
  const nodes = tree.nodes || {};
  const species = (bestiary && bestiary.species) || {};
  const root = tree.root && nodes[tree.root] ? tree.root : Object.keys(nodes).find(k => !nodes[k].parent) || null;
  media = media || {};
  content = content || {};

  /* Tree order (depth first) introduces new species order by order. */
  const order = [];
  const seen = new Set();
  (function walk(id) {
    const n = nodes[id]; if (!n || seen.has(id)) return; seen.add(id);
    if (species[id]) order.push(id);
    (n.children || []).forEach(walk);
  })(root);
  Object.keys(species).forEach(id => { if (!order.includes(id)) order.push(id); });

  /* Exam photos (set "exam") are held out of practice: only the mock exam shows them, so it asks about
     photos she has never seen. Every other screen uses `photos`. */
  const photos = {}, examPhotos = {};
  order.forEach(id => {
    const all = (Array.isArray(media[id]) ? media[id] : []).filter(p => p && p.file);
    photos[id] = all.filter(p => p.set !== 'exam');
    examPhotos[id] = all.filter(p => p.set === 'exam');
  });

  const M = {
    bestiary, media, content, nodes, species, root, order, photos, examPhotos,
    deepPath: tree.deep_path || [],
    sources: (bestiary && bestiary.sources) || {},
    withPhotos: order.filter(id => photos[id].length),
    _under: {}, _path: {}, values: {}
  };
  addClassRoots(M);
  /* Distinct values of each skill, keyed by detect key, with the species holding each one. */
  SKILLS.concat('binomial').forEach(k => {
    const byKey = new Map();
    order.forEach(id => {
      const v = answerFor(M, id, k); if (!v) return;
      const dk = detectKey(v, k);
      if (!byKey.has(dk)) byKey.set(dk, { value: v, species: [] });
      byKey.get(dk).species.push(id);
    });
    M.values[k] = byKey;
  });
  return M;
}

/* The list's classes, in tree order, as roots for the explorer's study mode. A class that is not a clade (the
   grade Reptilia) gets a virtual node whose children are the largest groups holding only its species. It has
   no parent, so paths and kinship still follow the real tree; like every class, it has a badge. */
function addClassRoots(M) {
  const classes = [];
  M.order.forEach(id => { const c = M.species[id].class; if (c && !classes.includes(c)) classes.push(c); });
  M.classRoots = classes.map(c => {
    const id = `class:${c}`;
    if (M.nodes[id]) return id;
    const kids = [];
    (function walk(x) {
      const n = M.nodes[x]; if (!n || M.species[x]) return;
      const sp = speciesUnder(M, x);
      if (sp.length && sp.every(s => M.species[s].class === c)) kids.push(x); else (n.children || []).forEach(walk);
    })(M.root);
    const g = ((M.bestiary && M.bestiary.tree && M.bestiary.tree.grades) || {})[c];
    M.nodes = Object.assign({}, M.nodes, { [id]: { id, parent: null, children: kids, rank: 'class', scientific: c, name: g ? { es: g.es, en: g.en } : null, grade: c, virtual: true } });
    M._under = {};
    return id;
  });
}
/* A node's path in study mode: from its class root down. Null for nodes above the classes. */
function studyPath(M, id) {
  const sp = speciesUnder(M, id);
  const c = sp.length && sp.every(s => M.species[s].class === M.species[sp[0]].class) ? M.species[sp[0]].class : null;
  const root = c && `class:${c}`;
  if (!root || !M.nodes[root]) return null;
  const p = pathTo(M, id);
  if (!M.nodes[root].virtual) return p.slice(p.indexOf(root));
  if (id === root) return [root];
  const i = p.findIndex(x => M.nodes[root].children.includes(x));
  return i < 0 ? null : [root].concat(p.slice(i));
}
function answerFor(M, id, skill) {
  const s = M.species[id]; if (!s) return '';
  const genus = s.genus || (s.binomial || '').split(' ')[0];
  const epithet = s.epithet || (s.binomial || '').split(' ').slice(1).join(' ');
  switch (skill) {
    case 'class': return s.class || '';
    case 'order': return s.order || '';
    case 'genus': return genus || '';
    case 'species': return epithet || '';
    case 'common': return s.common_es || '';
    case 'binomial': return s.binomial || `${genus} ${epithet}`.trim();
  }
  return '';
}

function pathTo(M, id) {
  if (M._path[id]) return M._path[id];
  const p = []; const guard = new Set();
  for (let c = id; c && M.nodes[c] && !guard.has(c); c = M.nodes[c].parent) { guard.add(c); p.unshift(c); }
  return (M._path[id] = p);
}
function speciesUnder(M, id) {
  if (M._under[id]) return M._under[id];
  const n = M.nodes[id];
  const out = !n ? (M.species[id] ? [id] : []) : M.species[id] ? [id] : (n.children || []).reduce((a, c) => a.concat(speciesUnder(M, c)), []);
  return (M._under[id] = out);
}
function lca(M, a, b) {
  const pb = new Set(pathTo(M, b)), pa = pathTo(M, a);
  for (let i = pa.length - 1; i >= 0; i--) if (pb.has(pa[i])) return pa[i];
  return M.root;
}
/* Branches between two species in the tree. Species missing from the tree fall back to rank distance. */
function treeDist(M, a, b) {
  if (M.nodes[a] && M.nodes[b]) {
    const da = pathTo(M, a).length, db = pathTo(M, b).length, dl = pathTo(M, lca(M, a, b)).length;
    return da + db - 2 * dl;
  }
  const A = M.species[a], B = M.species[b];
  if (!A || !B) return 99;
  if (answerFor(M, a, 'genus') === answerFor(M, b, 'genus')) return 2;
  if (A.order === B.order) return 4;
  if (A.class === B.class) return 8;
  return 16;
}

/* ---------------------------------------------------------------- grading */
/* Spelling counts: only case, surrounding spaces and runs of spaces are forgiven.
   NFC only unifies how keyboards encode "é"; it does not fold accents. */
function gradeKey(s) { return String(s == null ? '' : s).normalize('NFC').toLocaleLowerCase('es').trim().replace(/\s+/g, ' '); }
/* Internal only, to tell a misspelling from another species: also strips diacritics (ñ→n, ü→u).
   For orders it also strips -iformes, so a typo in the suffix still finds the order it names. */
function detectKey(s, skill) {
  let k = gradeKey(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (skill === 'order') k = k.replace(/i?formes?$/, '');
  return k;
}
/* Optimal string alignment distance: Levenshtein plus adjacent transpositions. */
function osa(a, b) {
  const A = Array.from(a), B = Array.from(b), n = A.length, m = B.length;
  if (!n) return m; if (!m) return n;
  const d = [];
  for (let i = 0; i <= n; i++) { d[i] = [i]; }
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const cost = A[i - 1] === B[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[n][m];
}
const threshold = len => (len <= 4 ? 0 : len <= 8 ? 1 : 2);

/* Returns { kind: 'right' | 'misspelling' | 'wrong_species' | 'wrong', with?: [speciesId], value? }.
   The intent router (software-design §3.5) only decides what is logged as a confusion;
   anything but 'right' is graded wrong. */
function classify(M, given, id, skill) {
  const target = answerFor(M, id, skill);
  const g = gradeKey(given);
  if (!g) return { kind: 'wrong', blank: true };
  if (g === gradeKey(target)) return { kind: 'right' };
  const dk = detectKey(given, skill), tk = detectKey(target, skill);
  /* Distances use the whole name (an order's stem alone is often 3–4 letters, which would allow no typo at all). */
  const df = detectKey(given), tf = detectKey(target), d = osa(df, tf), close = d <= threshold(Array.from(tf).length);
  const vals = M.values[skill] || new Map();
  const hit = dk !== tk ? vals.get(dk) : null;
  /* Epithets repeat across genera (europaeus, europaea), so a near miss of the right one is a typo, not a confusion. */
  if (hit && !(skill === 'species' && close)) {
    const others = hit.species.filter(x => x !== id);
    if (SPECIES_SKILLS.includes(skill) && others.length) return { kind: 'wrong_species', with: others, value: hit.value };
    return { kind: 'wrong', value: hit.value };
  }
  if (close) {
    if (hit) return { kind: 'misspelling' };
    for (const [k, v] of vals) { if (k !== tk && osa(df, detectKey(v.value)) < d) return { kind: 'wrong' }; }   // a closer value: not a typo of this one (a tie goes to the target)
    return { kind: 'misspelling' };
  }
  return { kind: 'wrong' };
}

/* ---------------------------------------------------------------- randomness */
function rngFrom(seed) {   // mulberry32; seeded in tests, Math.random otherwise
  if (seed == null) return Math.random;
  let a = typeof seed === 'number' ? seed : Array.from(String(seed)).reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------------------------------------------------------------- distractors */
/* Reverse game ("¿Cuál es?"): Easy = other classes; Medium = same class, other order;
   Hard = same order or genus. Short tiers fall back to the closest species available. */
function reverseDistractors(M, t, level, pool, rng) {
  rng = rng || Math.random;
  const T = M.species[t], genus = answerFor(M, t, 'genus');
  const cands = shuffle((pool || M.withPhotos).filter(x => x !== t && M.species[x]), rng);
  const tier = {
    1: x => M.species[x].class !== T.class,
    2: x => M.species[x].class === T.class && M.species[x].order !== T.order,
    3: x => M.species[x].order === T.order || answerFor(M, x, 'genus') === genus
  }[level];
  let primary = cands.filter(tier);
  if (level === 1) {   // spread the options across different classes
    const used = new Set(), first = [];
    primary.forEach(x => { if (!used.has(M.species[x].class)) { used.add(M.species[x].class); first.push(x); } });
    primary = first.concat(primary.filter(x => !first.includes(x)));
  } else {
    primary.sort((a, b) => (level === 3 ? (answerFor(M, b, 'genus') === genus) - (answerFor(M, a, 'genus') === genus) : 0) || treeDist(M, t, a) - treeDist(M, t, b));
  }
  const out = primary.slice(0, 3);
  if (out.length < 3) {
    const rest = cands.filter(x => !out.includes(x)).sort((a, b) => level === 1 ? treeDist(M, t, b) - treeDist(M, t, a) : treeDist(M, t, a) - treeDist(M, t, b));
    out.push(...rest.slice(0, 3 - out.length));
  }
  return out;
}

/* Easy multiple choice for one skill: 4 options, values of that skill only, never equal to the answer. */
function mcOptions(M, id, skill, rng) {
  rng = rng || Math.random;
  const correct = answerFor(M, id, skill), ck = gradeKey(correct), S = M.species[id];
  const picks = [], keys = new Set([ck]);
  const add = (value, sp) => { const k = gradeKey(value); if (!value || keys.has(k) || picks.length >= 3) return; keys.add(k); picks.push({ value, species: sp }); };
  if (skill === 'class') {
    shuffle(Array.from(M.values.class.values()), rng).forEach(v => add(v.value, null));
  } else if (skill === 'order') {
    const vals = shuffle(Array.from(M.values.order.values()), rng);
    vals.filter(v => M.species[v.species[0]].class === S.class).forEach(v => add(v.value, null));
    vals.forEach(v => add(v.value, null));
  } else {
    /* Species-naming skills: look-alikes first (same class, nearest in the tree), then anything. */
    const others = shuffle(M.order.filter(x => x !== id), rng);
    const near = others.filter(x => M.species[x].class === S.class).sort((a, b) => treeDist(M, id, a) - treeDist(M, id, b));
    const pool = near.slice(0, 12);
    shuffle(pool, rng).forEach(x => add(answerFor(M, x, skill), x));
    others.forEach(x => add(answerFor(M, x, skill), x));
  }
  const options = shuffle([{ value: correct, species: SPECIES_SKILLS.includes(skill) ? id : null }].concat(picks), rng);
  return { correct, options };
}

/* ---------------------------------------------------------------- scheduling */
let _f = null;
function scheduler() {
  if (!_f) _f = window.FSRS.fsrs(window.FSRS.generatorParameters({ enable_fuzz: false, request_retention: 0.9 }));
  return _f;
}
const STATE_NEW = 0;
function toFsrs(m, now) {
  if (!m) return window.FSRS.createEmptyCard(new Date(now));
  return { due: new Date(m.due), stability: m.s, difficulty: m.d, elapsed_days: m.ed || 0, scheduled_days: m.sd || 0,
    reps: m.reps || 0, lapses: m.lapses || 0, learning_steps: m.ls || 0, state: m.st, last_review: m.last ? new Date(m.last) : undefined };
}
function fromFsrs(c) {
  return { due: +c.due, s: c.stability, d: c.difficulty, ed: c.elapsed_days, sd: c.scheduled_days, reps: c.reps, lapses: c.lapses,
    ls: c.learning_steps, st: c.state, last: c.last_review ? +c.last_review : null };
}

/* FSRS rating for an answer that counts toward mastery (Hard, no hints).
   A first correct answer is never rated Easy: Easy's initial stability (~8 d) would make
   a card "dominada" after one lucky answer. */
function rating(kind, conf, isNew) {
  const R = window.FSRS.Rating;
  if (kind !== 'right') return R.Again;
  if (conf === 'guess') return R.Hard;
  if (conf === 'sure' && !isNew) return R.Easy;
  return R.Good;
}
/* Easy and Medium only feed the light progress counter. Its intervals re-show a card
   within the session after a miss or a guess, then tomorrow, then in three days. */
function progressInterval(kind, conf, streak) {
  if (kind !== 'right') return MIN;
  if (conf === 'guess') return 10 * MIN;
  return streak <= 1 ? 10 * MIN : streak === 2 ? DAY : 3 * DAY;
}
const countsForMastery = a => a.level === 3 && !a.hints;

/* a = { level: 1|2|3, kind, hints, conf }. Returns { card, rating } with a new card object. */
function applyAnswer(card, a, now) {
  const prev = card || {};
  const p = Object.assign({ seen: 0, ok: 0, streak: 0, due: 0, first: now, last: 0 }, prev.p);
  let m = prev.m || null, r = null;
  p.seen++; p.last = now;
  if (a.kind === 'right') { p.ok++; if (a.conf !== 'guess') p.streak++; } else p.streak = 0;
  p.due = now + progressInterval(a.kind, a.conf, p.streak);
  if (countsForMastery(a)) {
    const isNew = !m || m.st === STATE_NEW;
    r = rating(a.kind, a.conf, isNew);
    m = fromFsrs(scheduler().next(toFsrs(m, now), new Date(now), r).card);
    p.due = m.due;   // after a Hard answer FSRS alone decides when it returns
  }
  return { card: { p, m }, rating: r };
}
function dueOf(card) {
  if (!card) return null;
  const ds = [card.p && card.p.due, card.m && card.m.due].filter(x => x != null && x > 0);
  return ds.length ? Math.min.apply(null, ds) : null;
}

/* ---------------------------------------------------------------- mastery */
function retrievability(m, at) {
  if (!m || m.st === STATE_NEW || !m.last || !(m.s > 0)) return 0;
  return scheduler().forgetting_curve(Math.max(0, (at - m.last) / DAY), m.s);
}
const cardMastered = (card, at) => !!(card && card.m && retrievability(card.m, at) >= 0.9 && card.m.s >= 7);
/* Visible progress per card: Easy/Medium streaks give up to 0.5; the FSRS state from Hard
   answers gives the other 0.5; only a mastered card reaches 1. */
function cardMeter(card, at) {
  if (!card) return 0;
  if (cardMastered(card, at)) return 1;
  const easy = Math.min(0.5, 0.25 * ((card.p && card.p.streak) || 0));
  const hard = card.m ? 0.5 * retrievability(card.m, at) * Math.min(1, card.m.s / 7) : 0;
  return Math.min(0.99, easy + hard);
}
const cardId = (sp, skill) => `${sp}:${skill}`;

function speciesStats(M, P, id, skills, at) {
  const cards = skills.map(k => P.cards[cardId(id, k)]);
  const meter = cards.reduce((a, c) => a + cardMeter(c, at), 0) / skills.length;
  const seen = cards.some(c => c && c.p && c.p.seen);
  const bronze = cards.every(c => c && c.p && c.p.ok > 0);
  const mastered = cards.every(c => cardMastered(c, at));
  const gold = mastered && cards.every(c => c.m.s >= 21);
  return { meter, seen, mastered, tier: gold ? 'gold' : mastered ? 'silver' : bronze ? 'bronze' : seen ? 'seen' : 'none' };
}
function groupStats(M, P, node, skills, at) {
  const sp = speciesUnder(M, node);
  let meter = 0, mastered = 0, seen = 0;
  sp.forEach(id => { const s = speciesStats(M, P, id, skills, at); meter += s.meter; if (s.mastered) mastered++; if (s.seen) seen++; });
  return { total: sp.length, meter: sp.length ? meter / sp.length : 0, mastered, seen, G: sp.length ? mastered / sp.length : 0 };
}
/* Exam readiness: mean retrievability of every exam card forecast at the exam date
   (or a week from now when no date is set). Unseen cards count as 0. */
function readiness(M, P, skills, at) {
  let sum = 0, n = 0;
  M.order.forEach(id => skills.forEach(k => { const c = P.cards[cardId(id, k)]; sum += c && c.m ? retrievability(c.m, at) : 0; n++; }));
  return n ? sum / n : 0;
}
function readinessAt(P, now) {
  const d = P.settings.examDate ? new Date(P.settings.examDate + 'T09:00:00').getTime() : NaN;
  return d > now ? d : now + 7 * DAY;
}

/* ---------------------------------------------------------------- sessions */
const ymd = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return +d; };

function scopePool(M, scope) {
  const base = M.withPhotos;
  if (!scope || !M.nodes[scope]) return base;
  const under = new Set(speciesUnder(M, scope));
  return base.filter(id => under.has(id));
}
/* Species in groups whose "Primer vistazo" was finished. */
function lookedSpecies(M, P) {
  const out = new Set(), solos = soloLooks(M);
  const ch = changeLook(M);
  ((P.ui && P.ui.looked) || []).forEach(node => { (M.nodes[node] ? speciesUnder(M, node) : solos[node] || (ch && ch.node === node ? ch.ids : [])).forEach(id => out.add(id)); });
  return out;
}
/* Species alone in their order (counting species with photos) have no order to look at, so their first look comes in three
   batches: fish, birds and the other tetrapods. Keys are 'solos:<batch>'; species in tree order; empty batches left out. */
const SOLO_BATCHES = ['solos:peces', 'solos:aves', 'solos:tetrapodos'];
function soloLooks(M) {
  if (M._solos) return M._solos;
  const perOrder = {}, tetra = new Set(speciesUnder(M, 'clade:tetrapoda')), by = {};
  M.withPhotos.forEach(id => { const o = M.species[id].order; perOrder[o] = (perOrder[o] || 0) + 1; });
  M.withPhotos.filter(id => perOrder[M.species[id].order] === 1).forEach(id => {
    const k = !tetra.has(id) ? SOLO_BATCHES[0] : M.species[id].class === 'Aves' ? SOLO_BATCHES[1] : SOLO_BATCHES[2];
    (by[k] = by[k] || []).push(id);
  });
  const out = {}; SOLO_BATCHES.filter(k => by[k]).forEach(k => { out[k] = by[k]; });   // batches in this order, the order Today offers them
  return (M._solos = out);
}
/* Species whose answer changed in a new version of the list (changes.csv), for students who learnt the old one: one
   first-look batch keyed by the latest change date ('cambios:2026-11-04'), so a later change makes it new again. */
function changeLook(M) {
  if (M._changes !== undefined) return M._changes;
  const ids = M.withPhotos.filter(id => (M.species[id].changes || []).length);
  const date = ids.flatMap(id => M.species[id].changes.map(c => c.date)).sort().pop();
  return (M._changes = ids.length ? { node: 'cambios:' + date, ids, date } : null);
}
/* ---------------------------------------------------------------- quiz order */
/* Exposure first, correctness second (David, 2026-11-13), in every practice game except the mock. The species she has seen
   the fewest times come first; a tie goes to the one seen least recently, so nothing she has just seen comes straight back,
   whatever she answered. Correctness decides which species are in play and breaks the remaining ties:
   'views' (Menos vistas): all of them, the weakest first. 'mistakes' (Más fallos): species with an open mistake (a box whose
   last answer was wrong), the most open mistakes first. 'progress' (Menos progreso): species not mastered, the lowest meter
   first. Answers still reschedule cards; due dates break what is left, then chance. */
const SORTS = ['views', 'mistakes', 'progress'];
const sortOf = opts => (SORTS.includes(opts.sortBy) ? opts.sortBy : 'views');
/* A quiz asks at most two boxes per species, so it covers more species (David, 2026-11-13). */
const BOXES_PER_SPECIES = 2;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const dueOrInf = c => { const d = dueOf(c); return d == null ? Infinity : d; };
const BOX_GAMES = ['foto', 'hoja', 'mock'];   // the games that answer a species' box (not ¿Cuál es? or ¿Este o este?)
/* Per species, from the log: answers before views were counted (per box, the most), the last time it was shown, and per
   card whether its last answer in a box game was wrong (an open mistake). */
function logFacts(P) {
  const from = (P.meta && P.meta.viewsFrom) || 0, perBox = {}, last = {}, open = {};
  P.log.forEach(r => {
    const sp = r.card.split(':')[0];
    if (!isGroupCard(r.card)) {
      last[sp] = Math.max(last[sp] || 0, r.ts);
      if (r.ts < from) perBox[r.card] = (perBox[r.card] || 0) + 1;
    }
    if (isGroupCard(r.card) || BOX_GAMES.includes(r.game) || r.game === 'grupo') open[r.card] = r.kind !== 'right';
  });
  const early = {};
  Object.keys(perBox).forEach(k => { const sp = k.split(':')[0]; early[sp] = Math.max(early[sp] || 0, perBox[k]); });
  return { early, last, open };
}
/* How many times each species has been shown with its name: P.views (first-look slides, opened cards, quiz appearances)
   plus the answers from before views were counted. A species in a finished first look counts at least once. */
function exposures(M, P, skills, facts) {
  const looked = lookedSpecies(M, P), views = P.views || {}, f = facts || logFacts(P), out = {};
  M.order.forEach(id => { out[id] = Math.max(views[id] || 0, looked.has(id) ? 1 : 0) + (f.early[id] || 0); });
  return out;
}
/* Seen at least once (the 1 % shown on cards and rings): viewed, in a finished first look, or answered. */
function speciesViewed(M, P, id) {
  if ((P.views && P.views[id]) || SKILLS.some(k => P.cards[cardId(id, k)])) return true;
  const key = ((P.ui && P.ui.looked) || []).join('|');
  if (!M._looked || M._looked.key !== key) M._looked = { key, set: lookedSpecies(M, P) };
  return M._looked.set.has(id);
}
const lastSeen = (P, f, id) => Math.max((P.viewedAt && P.viewedAt[id]) || 0, f.last[id] || 0);
const openBoxes = (f, id, skills) => skills.filter(k => f.open[cardId(id, k)]);
/* `pool` in the chosen order, without the species out of play (`keepAll`: with them, after the others).
   opts = { sortBy, skills, now, rng, keepAll }. */
function rankSpecies(M, P, pool, opts) {
  const sort = sortOf(opts), skills = opts.skills, now = opts.now, f = logFacts(P), seen = exposures(M, P, skills, f);
  const inPlay = sort === 'mistakes' ? id => openBoxes(f, id, skills).length > 0 : sort === 'progress' ? id => !speciesStats(M, P, id, skills, now).mastered : () => true;
  const measure = id => (sort === 'mistakes' ? -openBoxes(f, id, skills).length : speciesStats(M, P, id, skills, now).meter);
  const due = id => skills.reduce((a, k) => Math.min(a, dueOrInf(P.cards[cardId(id, k)])), Infinity);
  return shuffle(opts.keepAll ? pool : pool.filter(inPlay), opts.rng || Math.random).map(id => ({ id, o: inPlay(id) ? 0 : 1, v: seen[id], l: lastSeen(P, f, id), k: measure(id), d: due(id) }))
    .sort((a, b) => a.o - b.o || cmp(a.v, b.v) || cmp(a.l, b.l) || cmp(a.k, b.k) || cmp(a.d, b.d)).map(r => r.id);
}
/* A species' boxes for one quiz: its open mistakes first under "most mistakes", then the lowest progress, then the
   earliest due; ties at random. */
function weakestBoxes(P, id, opts, f) {
  const by = sortOf(opts) === 'mistakes';
  return shuffle(opts.skills, opts.rng || Math.random).map(k => { const c = P.cards[cardId(id, k)]; return { k, m: by && f.open[cardId(id, k)] ? 0 : 1, v: cardMeter(c, opts.now), d: dueOrInf(c) }; })
    .sort((a, b) => cmp(a.m, b.m) || cmp(a.v, b.v) || cmp(a.d, b.d)).map(x => x.k);
}
/* Photo → one box: species in the chosen order, up to two boxes each, until the session is full. The check after a
   first look (`introduce`) always takes the fewest views first: the species just seen. `pool`: a first look's own
   species (the single-species batches). */
function buildSession(M, P, opts) {
  const size = opts.size || 20, rng = opts.rng || Math.random;
  const o = Object.assign({}, opts, { rng, sortBy: opts.introduce ? 'views' : opts.sortBy });
  const per = Math.min(BOXES_PER_SPECIES, o.skills.length), f = logFacts(P), items = [];
  for (const id of rankSpecies(M, P, opts.pool || scopePool(M, opts.scope), o)) {
    if (items.length >= size) break;
    weakestBoxes(P, id, o, f).slice(0, Math.min(per, size - items.length)).forEach(k => items.push({ sp: id, skill: k }));
  }
  return spreadSpecies(shuffle(items, rng));
}
/* "¿Qué grupo es?": several photos of one class or order, and the student names the group. A group card is
   "<node id>:group" (e.g. "order:Accipitriformes:group") and has the same { p, m } state as a species card.
   Each item carries a member species (`sp`), which grading, hints and options use, and every member with a photo. */
const GROUP_SKILLS = ['class', 'order'];
const groupCardId = node => `${node}:group`;
const isGroupCard = k => /:group$/.test(k);
function groupItems(M, pool, skills) {
  const out = new Map();
  pool.forEach(id => GROUP_SKILLS.filter(k => skills.includes(k)).forEach(k => {
    const node = `${k}:${answerFor(M, id, k)}`, card = groupCardId(node);
    if (!out.has(card)) out.set(card, { sp: id, skill: k, node, card, members: [] });
    out.get(card).members.push(id);
  }));
  /* A group holding the whole pool (the class when practising one class) would be no question. */
  return Array.from(out.values()).filter(g => g.members.length < pool.length || pool.length === 1);
}
/* Groups by the same rule as species, on the group's own card: the times it was asked, then the least recently asked;
   in play under "most mistakes", groups whose last answer was wrong; under "least progress", groups not mastered.
   Remaining ties: the earliest due, then classes before orders and larger groups first, so the first questions show
   several different animals. No daily limit on new groups (David, 2026-11-13). The check after a first look
   (`introduce`) always goes by views. */
function buildGroupSession(M, P, opts) {
  const now = opts.now, size = opts.size || 20, rng = opts.rng || Math.random, sort = opts.introduce ? 'views' : sortOf(opts), f = logFacts(P);
  const card = g => P.cards[g.card], pp = g => (card(g) && card(g).p) || {};
  const inPlay = sort === 'mistakes' ? g => !!f.open[g.card] : sort === 'progress' ? g => !cardMastered(card(g), now) : () => true;
  return shuffle(groupItems(M, scopePool(M, opts.scope), opts.skills).filter(inPlay), rng)
    .map(g => ({ g, v: pp(g).seen || 0, l: pp(g).last || 0, k: cardMeter(card(g), now), d: dueOrInf(card(g)) }))
    .sort((a, b) => cmp(a.v, b.v) || cmp(a.l, b.l) || cmp(a.k, b.k) || cmp(a.d, b.d) || GROUP_SKILLS.indexOf(a.g.skill) - GROUP_SKILLS.indexOf(b.g.skill) || b.g.members.length - a.g.members.length).map(x => x.g).slice(0, size);
}
/* "¿Cuál sobra?": three species of one order and one of another. The odd one is from another class (Easy), from
   the same class (Medium) or the closest species of another order (Hard). Only orders with three species with photos.
   The three are the order's first species in the chosen order (species out of play after those in play), and the
   orders whose three come first go first. */
function buildOddOne(M, P, opts) {
  const rng = opts.rng || Math.random, lv = opts.level || 2, pool = scopePool(M, opts.scope);
  const pos = new Map(rankSpecies(M, P, pool, Object.assign({}, opts, { rng, keepAll: true })).map((id, i) => [id, i]));
  const groups = groupItems(M, pool, ['order']).filter(g => g.members.length >= 3)
    .map(g => { const best = g.members.slice().sort((a, b) => pos.get(a) - pos.get(b)).slice(0, 3); return { g, best, k: best.reduce((a, id) => a + pos.get(id), 0) }; })
    .sort((a, b) => a.k - b.k).slice(0, opts.size || 10);
  return groups.map(({ g, best }) => {
    const three = shuffle(best, rng), T = M.species[three[0]];
    const others = M.withPhotos.filter(x => M.species[x].order !== T.order);
    let cand = lv === 1 ? others.filter(x => M.species[x].class !== T.class) : lv === 2 ? others.filter(x => M.species[x].class === T.class) : [];
    if (!cand.length) {
      const d = x => Math.min.apply(null, three.map(y => treeDist(M, x, y)));
      cand = others.map(x => [x, d(x)]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(a => a[0]);
    }
    const odd = cand[Math.floor(rng() * cand.length)];
    return { node: g.node, three, odd, opts: shuffle(three.concat(odd), rng) };
  });
}
/* "¿Este o este?": pairs of species to tell apart: the student's own confusions (any wrong_species answer), most recent
   first, and look-alike pairs from the cards; a confusion is settled after three right answers in a row in this drill.
   The pairs then follow the species rule: the fewest views of the two together, then the least recently seen; under
   "most mistakes" only her open confusions and pairs with an open mistake are in play, under "least progress" only
   pairs with a species not mastered; on a remaining tie her own confusions first. Drill rows log the other species of
   the pair in `with`, right or wrong. */
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
function pairStates(M, P) {
  const st = new Map();
  P.log.forEach(r => {
    const sp = r.card.split(':')[0], o = r.with && r.with[0];
    if (!o || !M.species[sp] || !M.species[o] || sp === o || (r.game !== 'par' && r.kind !== 'wrong_species')) return;
    const k = pairKey(sp, o), e = st.get(k) || { a: sp, b: o, at: 0, n: 0, streak: 0 };
    if (r.game === 'par' && r.kind === 'right') e.streak++;
    else { e.n++; e.at = r.ts; e.streak = 0; }
    st.set(k, e);
  });
  return st;
}
const openConfusions = (M, P) => Array.from(pairStates(M, P).values()).filter(e => e.n > 0 && e.streak < 3).sort((x, y) => y.at - x.at);
function buildPairs(M, P, opts) {
  const rng = opts.rng || Math.random, size = opts.size || 10, st = pairStates(M, P), photo = id => M.photos[id] && M.photos[id].length;
  const mine = openConfusions(M, P).filter(e => photo(e.a) && photo(e.b)).map(e => ({ a: e.a, b: e.b, mine: true }));
  const byName = new Map(M.order.map(id => [M.species[id].binomial, id])), seen = new Set(mine.map(e => pairKey(e.a, e.b))), look = [];
  M.withPhotos.forEach(id => (((M.content.species || {})[id] || {}).lookalikes || []).forEach(x => {
    const o = x && byName.get(x.binomial), k = o && pairKey(id, o);
    if (o && o !== id && photo(o) && !seen.has(k) && !((st.get(k) || {}).streak >= 3)) { seen.add(k); look.push({ a: id, b: o, mine: false }); }
  }));
  const sort = sortOf(opts), skills = opts.skills || SKILLS, f = logFacts(P), shown = exposures(M, P, skills, f);
  const inPlay = sort === 'mistakes' ? p => p.mine || openBoxes(f, p.a, skills).length + openBoxes(f, p.b, skills).length > 0
    : sort === 'progress' ? p => [p.a, p.b].some(id => !speciesStats(M, P, id, skills, opts.now).mastered) : () => true;
  const all = mine.concat(shuffle(look, rng)).filter(inPlay).map((p, i) => ({ p, v: shown[p.a] + shown[p.b], l: Math.max(lastSeen(P, f, p.a), lastSeen(P, f, p.b)), i }));
  return all.sort((x, y) => cmp(x.v, y.v) || cmp(x.l, y.l) || x.i - y.i).slice(0, size).map(x => Object.assign(x.p, { show: rng() < 0.5 ? x.p.a : x.p.b }));
}
/* Avoid the same animal twice in a row: the second photo would give the answer away. */
function spreadSpecies(items) {
  const out = items.slice();
  for (let i = 1; i < out.length; i++) {
    if (out[i].sp !== out[i - 1].sp) continue;
    const j = out.findIndex((x, k) => k > i && x.sp !== out[i - 1].sp && (!out[k + 1] || out[k + 1].sp !== out[i].sp));
    if (j > 0) { const t = out[i]; out[i] = out[j]; out[j] = t; }
  }
  return out;
}
/* Exam sheet: one species per item, in the chosen order. */
function buildSheetSession(M, P, opts) {
  const o = Object.assign({}, opts, { sortBy: opts.introduce ? 'views' : opts.sortBy });
  return rankSpecies(M, P, opts.pool || scopePool(M, opts.scope), o).slice(0, opts.size || 10).map(sp => ({ sp, skill: 'sheet' }));
}
function buildMock(M, n, rng) { return shuffle(M.withPhotos, rng || Math.random).slice(0, n).map(sp => ({ sp, skill: 'sheet' })); }
/* "Mis fallos": the species cards she missed in the last `days` days that she hasn't since got right on two
   different days (successive relearning, research report). Most recent misses first, at most two boxes per species,
   then spread out. */
function buildMistakes(M, P, opts) {
  const now = opts.now, days = opts.days || 7, size = opts.size || 20, since = now - days * DAY;
  const photo = new Set(M.withPhotos), skills = new Set(opts.skills), state = {};
  P.log.forEach(r => {
    const [sp, skill] = String(r.card).split(':');
    if (isGroupCard(r.card) || !photo.has(sp) || !skills.has(skill) || r.game === 'cual' || r.game === 'par') return;
    const st = state[r.card] || (state[r.card] = { sp, skill, miss: 0, rightDays: new Set() });
    if (r.kind !== 'right') { st.miss = r.ts; st.rightDays = new Set(); } else if (st.miss) st.rightDays.add(ymd(r.ts));
  });
  const per = {}, items = Object.values(state).filter(s => s.miss >= since && s.rightDays.size < 2).sort((a, b) => b.miss - a.miss)
    .filter(s => (per[s.sp] = (per[s.sp] || 0) + 1) <= BOXES_PER_SPECIES);
  return spreadSpecies(shuffle(items.slice(0, size).map(s => ({ sp: s.sp, skill: s.skill })), opts.rng || Math.random));
}
/* "¿Cuál es?": only species with photos, in the chosen order. It schedules nothing, so it has no daily cap. */
function buildReverse(M, P, opts) {
  return rankSpecies(M, P, scopePool(M, opts.scope), opts).slice(0, opts.size || 10);
}

/* ---------------------------------------------------------------- streak and badges */
/* Consecutive study days. A single missed day is forgiven once a week (a "freeze");
   today does not break the streak until it is over. */
function streak(days, now) {
  let n = 0, lastFreeze = -99, i = 0;
  for (let t = startOfDay(now); i < 400; i++, t -= DAY) {
    const k = ymd(t + 12 * 36e5);
    if (days[k]) { n++; continue; }
    if (i === 0) continue;
    if (i - lastFreeze > 7 && n > 0 && days[ymd(t - DAY + 12 * 36e5)]) { lastFreeze = i; continue; }
    break;
  }
  return n;
}
function badgeDefs(M) {
  const defs = [];
  Object.keys(M.nodes).forEach(id => {
    const n = M.nodes[id];
    if (n.rank === 'class') defs.push({ id, kind: 'class', node: id });
  });
  Object.keys(M.nodes).forEach(id => {
    const n = M.nodes[id];
    if (n.rank === 'order' && speciesUnder(M, id).length >= 3) defs.push({ id, kind: 'order', node: id });
  });
  defs.push({ id: 'habit:first_page', kind: 'habit' }, { id: 'habit:streak7', kind: 'habit' }, { id: 'mock:passed', kind: 'mock' });
  return defs;
}
const CLASS_TIERS = [['gold', 1], ['silver', 0.9], ['bronze', 0.8]];
/* Progress toward every badge right now, and the tier it would earn. Earned badges are
   stored by the caller and never taken away. */
function badgeStatus(M, P, skills, now) {
  const out = {};
  badgeDefs(M).forEach(def => {
    let progress = 0, tier = null, extra = {};
    if (def.kind === 'class' || def.kind === 'order') {
      const g = groupStats(M, P, def.node, skills, now);
      extra = g;
      if (def.kind === 'class') { const t = CLASS_TIERS.find(([, th]) => g.G >= th); tier = t ? t[0] : null; progress = Math.min(1, g.G / 0.8); }
      else { tier = g.G >= 1 ? 'gold' : null; progress = g.G; }
    } else if (def.id === 'habit:first_page') { progress = Math.min(1, (P.stats.sessions || 0)); tier = progress >= 1 ? 'gold' : null; }
    else if (def.id === 'habit:streak7') { const s = streak(P.days, now); progress = Math.min(1, s / 7); tier = s >= 7 ? 'gold' : null; extra = { streak: s }; }
    else if (def.id === 'mock:passed') { const best = P.mocks.reduce((a, m) => Math.max(a, m.score10 || 0), 0); progress = Math.min(1, best / 5); tier = P.mocks.some(m => m.passed) ? 'gold' : null; extra = { best }; }
    out[def.id] = Object.assign({ def, progress, tier }, extra);
  });
  return out;
}
const TIER_RANK = { bronze: 1, silver: 2, gold: 3 };
/* Badges newly earned or upgraded since the stored state. */
function newlyEarned(status, earned) {
  return Object.keys(status).filter(id => status[id].tier && (!earned[id] || TIER_RANK[status[id].tier] > TIER_RANK[earned[id].tier]));
}
/* Mock VISU: graded out of 10 like a Spanish exam; 5 or more is a pass. */
function mockScore(items) {
  const total = items.length * SKILLS.length;
  const ok = items.reduce((a, it) => a + SKILLS.filter(k => it.ok && it.ok[k]).length, 0);
  const score10 = total ? Math.round(ok / total * 100) / 10 : 0;
  return { ok, total, score10, passed: score10 >= 5 };
}

/* ---------------------------------------------------------------- progress object, export, import */
function defaultSettings() {
  return { lang: 'es', theme: 'auto', level: 2, game: 'foto', skills: { class: true, order: true, genus: true, species: true, common: true },
    examDate: null, sessionSize: 20, mockSize: 20, revShowCommon: true, sortBy: 'views' };
}
function emptyProgress(now) {
  return { schemaVersion: SCHEMA_VERSION, createdAt: now, settings: defaultSettings(), cards: {}, log: [], days: {}, views: {}, viewedAt: {},
    badges: {}, mocks: [], stats: { sessions: 0 }, meta: { lastBackup: null, seenNotice: false, readiness: {}, viewsFrom: now }, ui: {} };
}
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);

/* Whitelist validation of a progress object. Everything here ends up in the DOM sooner or later,
   so only known keys with the expected type survive; numbers in strings are coerced and strings
   are length-limited. Each rejected value is pushed onto `issues`. */
const SPECIES_ID = /^[a-z0-9_-]{1,80}$/;
const CARD_ID = /^([a-z0-9_-]{1,80}:(class|order|genus|species|common)|(class|order):[A-Za-z0-9_.-]{1,80}:group)$/;
const NODE_ID = /^[A-Za-z0-9_.-]{1,80}(:[A-Za-z0-9_.-]{1,80})?$/;
const BADGE_ID = /^[a-z]+:[A-Za-z0-9_.-]{1,100}$/;   // the colon keeps "__proto__" out
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const TIME_MAX = 8.64e15;
const MAX_LOG = 100000, MAX_MOCKS = 20, MAX_MOCK_ITEMS = 200, MAX_TYPED = 80, MAX_LOOKED = 2000, MAX_VIEWS = 20000;
const own = (o, k) => isObj(o) && Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined;
const toNum = (v, min, max, int) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return int ? Math.round(n) : n;
};
const T = {
  int: (min, max) => v => toNum(v, min, max, true),
  num: (min, max) => v => toNum(v, min, max, false),
  time: v => (typeof v === 'string' && !/^\s*-?\d+(\.\d+)?\s*$/.test(v) ? (Number.isFinite(Date.parse(v)) ? Date.parse(v) : undefined) : toNum(v, 0, TIME_MAX, false)),
  bool: v => (typeof v === 'boolean' ? v : undefined),
  oneOf: list => v => (list.includes(v) ? v : undefined),
  id: re => v => (typeof v === 'string' && re.test(v) ? v : undefined),
  text: v => (typeof v === 'string' ? v.slice(0, MAX_TYPED) : undefined)
};
/* src[key] checked with `check`. Missing → dflt; null is kept when the default is null; invalid → dflt plus an issue. */
function field(src, key, check, dflt, issues, path) {
  if (!own(src, key)) return dflt;
  const v = src[key];
  if (v === null && dflt === null) return null;
  const out = check(v);
  if (out === undefined) { issues.push(path + key); return dflt; }
  return out;
}
function cleanCard(c, issues, path) {
  if (!isObj(c)) { issues.push(path); return null; }
  let p = null, m = null;
  if (isObj(c.p)) {
    p = {};
    ['seen', 'ok', 'streak'].forEach(k => { p[k] = field(c.p, k, T.int(0, 1e7), 0, issues, path + '.p.'); });
    ['due', 'first', 'last'].forEach(k => { p[k] = field(c.p, k, T.time, 0, issues, path + '.p.'); });
  } else if (own(c, 'p') && c.p !== null) issues.push(path + '.p');
  if (isObj(c.m)) {
    const r = [];
    m = { due: field(c.m, 'due', T.time, undefined, r, ''), s: field(c.m, 's', T.num(0, 1e6), undefined, r, ''), d: field(c.m, 'd', T.num(0, 11), undefined, r, ''),
      ed: field(c.m, 'ed', T.num(0, 1e6), 0, r, ''), sd: field(c.m, 'sd', T.num(0, 1e6), 0, r, ''), reps: field(c.m, 'reps', T.int(0, 1e7), 0, r, ''),
      lapses: field(c.m, 'lapses', T.int(0, 1e7), 0, r, ''), ls: field(c.m, 'ls', T.int(0, 100), 0, r, ''), st: field(c.m, 'st', T.int(0, 3), undefined, r, ''),
      last: field(c.m, 'last', T.time, null, r, '') };
    if (r.length || m.due === undefined || m.s === undefined || m.d === undefined || m.st === undefined) { issues.push(path + '.m'); m = null; }
  } else if (own(c, 'm') && c.m !== null) issues.push(path + '.m');
  return { p, m };
}
function cleanLogRow(r, issues, path) {
  const ts = field(r, 'ts', T.time, undefined, issues, path), card = field(r, 'card', T.id(CARD_ID), undefined, issues, path),
    kind = field(r, 'kind', T.oneOf(['right', 'misspelling', 'wrong', 'wrong_species']), undefined, issues, path);
  if (ts === undefined || card === undefined || kind === undefined) { issues.push(path + '(ts, card, kind)'); return null; }
  const row = { ts, card, game: field(r, 'game', T.oneOf(['foto', 'hoja', 'mock', 'cual', 'grupo', 'par']), null, issues, path),
    level: field(r, 'level', T.oneOf([1, 2, 3]), null, issues, path), rating: field(r, 'rating', T.int(0, 4), null, issues, path),
    hints: field(r, 'hints', T.int(0, 3), 0, issues, path), conf: field(r, 'conf', T.oneOf(['guess', 'unsure', 'sure']), null, issues, path), kind };
  if (own(r, 'with')) {
    if (Array.isArray(r.with) && r.with.length <= 5 && r.with.every(x => SPECIES_ID.test(x))) row.with = r.with.slice();
    else issues.push(path + 'with');
  }
  const typed = field(r, 'typed', T.text, undefined, issues, path);
  if (typed !== undefined) row.typed = typed;
  return row;
}
function cleanMock(mk, issues, path) {
  const at = field(mk, 'at', T.time, undefined, issues, path);
  if (at === undefined || !Array.isArray(mk.items) || mk.items.length > MAX_MOCK_ITEMS) { issues.push(path); return null; }
  const items = [];
  mk.items.forEach((x, i) => {
    const sp = field(x, 'sp', T.id(SPECIES_ID), undefined, issues, `${path}items[${i}].`);
    if (sp === undefined) { issues.push(`${path}items[${i}]`); return; }
    const typed = {}, ok = {};
    SKILLS.forEach(k => {
      const t = field(x.typed, k, T.text, undefined, issues, `${path}items[${i}].typed.`); if (t !== undefined) typed[k] = t;
      ok[k] = field(x.ok, k, T.bool, false, issues, `${path}items[${i}].ok.`);
    });
    const ph = field(x, 'ph', T.int(0, 99), undefined, issues, `${path}items[${i}].`);   // photo shown, since 2026-11-01
    const ex = field(x, 'ex', T.bool, false, issues, `${path}items[${i}].`);   // ph counts in the exam photos, since 2026-11-13
    const item = ph === undefined ? { sp, typed, ok } : { sp, typed, ok, ph };
    items.push(ex ? Object.assign(item, { ex }) : item);
  });
  const out = { id: field(mk, 'id', T.id(/^[\w-]{1,40}$/), null, issues, path), at };
  if (own(mk, 'skills')) {
    if (Array.isArray(mk.skills) && mk.skills.every(k => SKILLS.includes(k))) { if (mk.skills.length) out.skills = mk.skills.slice(); }
    else issues.push(path + 'skills');
  }
  return Object.assign(out, { items, ok: field(mk, 'ok', T.int(0, 1e4), 0, issues, path), total: field(mk, 'total', T.int(0, 1e4), 0, issues, path),
    score10: field(mk, 'score10', T.num(0, 10), 0, issues, path), passed: field(mk, 'passed', T.bool, false, issues, path) });
}
/* Fills defaults and keeps only what validates, so old files still load and nothing unexpected
   reaches the page. Used for localStorage at boot and for imported files; `issues` (optional)
   collects what was rejected so an import can refuse a tampered file. */
function normalizeProgress(p, now, issues) {
  issues = issues || [];
  const out = emptyProgress(now);
  if (!isObj(p)) { if (p != null) issues.push('progress'); return out; }
  out.createdAt = field(p, 'createdAt', T.time, now, issues, '');

  const s = isObj(p.settings) ? p.settings : {}, d = defaultSettings(), S = 'settings.';
  if (own(p, 'settings') && !isObj(p.settings)) issues.push('settings');
  out.settings = {
    lang: field(s, 'lang', T.oneOf(['es', 'en']), d.lang, issues, S), theme: field(s, 'theme', T.oneOf(['auto', 'light', 'dark']), d.theme, issues, S),
    level: field(s, 'level', T.oneOf([1, 2, 3]), d.level, issues, S), game: field(s, 'game', T.oneOf(['foto', 'cual', 'hoja', 'grupo']), d.game, issues, S),
    skills: {}, examDate: field(s, 'examDate', T.id(YMD), null, issues, S),
    sessionSize: field(s, 'sessionSize', T.int(5, 100), d.sessionSize, issues, S),
    mockSize: field(s, 'mockSize', T.int(5, 100), d.mockSize, issues, S), revShowCommon: field(s, 'revShowCommon', T.bool, d.revShowCommon, issues, S),
    sortBy: field(s, 'sortBy', T.oneOf(SORTS), d.sortBy, issues, S)   // since 2026-11-13
  };
  SKILLS.forEach(k => { out.settings.skills[k] = field(s.skills, k, T.bool, d.skills[k], issues, S + 'skills.'); });
  if (!SKILLS.some(k => out.settings.skills[k])) out.settings.skills = d.skills;

  if (isObj(p.cards)) Object.keys(p.cards).forEach(k => {
    if (!CARD_ID.test(k)) { issues.push('cards.' + k.slice(0, 40)); return; }
    const c = cleanCard(p.cards[k], issues, 'cards.' + k);
    if (c) out.cards[k] = c;
  });
  if (Array.isArray(p.log)) p.log.slice(-MAX_LOG).forEach((r, i) => { const row = cleanLogRow(r, issues, `log[${i}].`); if (row) out.log.push(row); });
  /* Views (since 2026-11-13): times each species was shown with its name, and when last. */
  [['views', T.int(0, 1e7)], ['viewedAt', T.time]].forEach(([key, check]) => {
    if (!own(p, key)) return;
    if (isObj(p[key]) && Object.keys(p[key]).length <= MAX_VIEWS) Object.keys(p[key]).forEach(k => {
      const n = SPECIES_ID.test(k) && k !== '__proto__' ? check(p[key][k]) : undefined;
      if (n === undefined) issues.push(key + '.' + k.slice(0, 40)); else out[key][k] = n;
    });
    else issues.push(key);
  });
  if (isObj(p.days)) Object.keys(p.days).forEach(k => { const n = YMD.test(k) ? toNum(p.days[k], 0, 1e6, true) : undefined; if (n === undefined) issues.push('days.' + k.slice(0, 20)); else out.days[k] = n; });
  if (isObj(p.badges)) Object.keys(p.badges).forEach(k => {
    const b = p.badges[k], tier = field(b, 'tier', T.oneOf(['bronze', 'silver', 'gold']), undefined, issues, `badges.${k.slice(0, 40)}.`),
      at = field(b, 'at', T.time, undefined, issues, `badges.${k.slice(0, 40)}.`);
    if (!BADGE_ID.test(k) || tier === undefined || at === undefined) { issues.push('badges.' + k.slice(0, 40)); return; }
    out.badges[k] = { tier, at };
  });
  if (Array.isArray(p.mocks)) p.mocks.slice(-MAX_MOCKS).forEach((m, i) => { const mk = cleanMock(m, issues, `mocks[${i}].`); if (mk) out.mocks.push(mk); });
  out.stats.sessions = field(p.stats, 'sessions', T.int(0, 1e7), 0, issues, 'stats.');
  const meta = isObj(p.meta) ? p.meta : {};
  out.meta.lastBackup = field(meta, 'lastBackup', T.time, null, issues, 'meta.');
  out.meta.seenNotice = field(meta, 'seenNotice', T.bool, false, issues, 'meta.');
  /* Answers logged before views were counted count as views (E.exposures). A copy from before then starts counting now. */
  out.meta.viewsFrom = own(p, 'views') ? field(meta, 'viewsFrom', T.time, 0, issues, 'meta.') : now;
  if (isObj(meta.readiness)) Object.keys(meta.readiness).forEach(k => { const n = YMD.test(k) ? toNum(meta.readiness[k], 0, 1, false) : undefined; if (n === undefined) issues.push('meta.readiness.' + k.slice(0, 20)); else out.meta.readiness[k] = n; });
  const ui = isObj(p.ui) ? p.ui : {};
  ['scope', 'exploreSel'].forEach(k => { const v = field(ui, k, T.id(NODE_ID), null, issues, 'ui.'); if (v !== null) out.ui[k] = v; });
  ['showDeep', 'showMid', 'studyTree'].forEach(k => { const v = field(ui, k, T.bool, undefined, issues, 'ui.'); if (v !== undefined) out.ui[k] = v; });
  if (own(ui, 'looked')) {   // groups whose "Primer vistazo" was finished, since 2026-11-02
    if (Array.isArray(ui.looked) && ui.looked.length <= MAX_LOOKED && ui.looked.every(v => typeof v === 'string' && NODE_ID.test(v))) out.ui.looked = ui.looked.slice();
    else issues.push('ui.looked');
  }
  return out;
}
/* Merges two progress objects of the same collection (two browsers, or a copy from the other one). Every answer is in
   the log, so the logs are joined without duplicates and a card answered in both is rebuilt by replaying its answers in
   time order; a card whose answers all come from one side keeps that side's state as it is. `base` is this browser's
   progress: its settings, theme and screen state stay. Merging the same copy twice changes nothing.
   Returns { progress, added: answers new to `base` }. */
const BADGE_RANK = { bronze: 1, silver: 2, gold: 3 };
const SCHEDULING_GAMES = ['foto', 'hoja', 'mock', 'grupo'];   // the games that record answers through applyAnswer
function mergeProgress(base, other, now) {
  const rowKey = r => JSON.stringify([r.ts, r.card, r.game, r.level, r.rating, r.hints, r.conf, r.kind, r.with || null, r.typed || null]);
  const keysA = new Set(base.log.map(rowKey));
  const out = JSON.parse(JSON.stringify(base));
  const extra = other.log.filter(r => !keysA.has(rowKey(r)));
  const seenExtra = new Set(), added = extra.filter(r => { const k = rowKey(r); if (seenExtra.has(k)) return false; seenExtra.add(k); return true; });
  out.log = base.log.concat(added).sort((a, b) => a.ts - b.ts).slice(-MAX_LOG);
  /* Cards: rows per card on each side decide which state wins, or whether to replay. */
  const keysB = new Set(other.log.map(rowKey)), byCard = {};
  out.log.forEach(r => { if (SCHEDULING_GAMES.includes(r.game)) (byCard[r.card] = byCard[r.card] || []).push(r); });
  const ids = new Set(Object.keys(base.cards).concat(Object.keys(other.cards), Object.keys(byCard)));
  ids.forEach(id => {
    const rows = byCard[id] || [], a = base.cards[id], b = other.cards[id];
    const allA = rows.every(r => keysA.has(rowKey(r))), allB = rows.every(r => keysB.has(rowKey(r)));
    if (a && allA) out.cards[id] = JSON.parse(JSON.stringify(a));
    else if (b && allB) out.cards[id] = JSON.parse(JSON.stringify(b));
    else if (rows.length) out.cards[id] = rows.reduce((c, r) => applyAnswer(c, { level: r.level, kind: r.kind, hints: r.hints || 0, conf: r.conf }, r.ts).card, null);
    else out.cards[id] = JSON.parse(JSON.stringify(((a && a.p && a.p.last) || 0) >= ((b && b.p && b.p.last) || 0) ? a || b : b));
  });
  /* Study days: the larger count of either side, or of the joined log (two browsers on the same day). */
  const logDays = {};
  out.log.forEach(r => { const d = ymd(r.ts); logDays[d] = (logDays[d] || 0) + 1; });
  Object.keys(other.views).forEach(id => { out.views[id] = Math.max(out.views[id] || 0, other.views[id]); });   // the larger count: both may hold the same views
  Object.keys(other.viewedAt).forEach(id => { out.viewedAt[id] = Math.max(out.viewedAt[id] || 0, other.viewedAt[id]); });
  out.meta.viewsFrom = Math.min(base.meta.viewsFrom || 0, other.meta.viewsFrom || 0);   // an older start counts fewer answers twice
  Object.keys(Object.assign({}, other.days, logDays)).forEach(d => { out.days[d] = Math.max(out.days[d] || 0, other.days[d] || 0, logDays[d] || 0); });
  Object.keys(other.badges).forEach(k => {
    const x = out.badges[k], y = other.badges[k];
    if (!x || BADGE_RANK[y.tier] > BADGE_RANK[x.tier] || (y.tier === x.tier && y.at < x.at)) out.badges[k] = Object.assign({}, y);
  });
  const mockKey = m => `${m.at}|${m.id || ''}`, mocks = new Set(out.mocks.map(mockKey));
  out.mocks = out.mocks.concat(other.mocks.filter(m => !mocks.has(mockKey(m))).map(m => JSON.parse(JSON.stringify(m)))).sort((a, b) => a.at - b.at).slice(-MAX_MOCKS);
  out.stats.sessions = Math.max(base.stats.sessions || 0, other.stats.sessions || 0);   // only "at least one" is used (habit:first_page)
  out.createdAt = Math.min(base.createdAt || now, other.createdAt || now);
  out.meta.seenNotice = base.meta.seenNotice || other.meta.seenNotice;
  Object.keys(other.meta.readiness).forEach(d => { out.meta.readiness[d] = Math.max(out.meta.readiness[d] || 0, other.meta.readiness[d]); });
  if (!out.settings.examDate && other.settings.examDate) out.settings.examDate = other.settings.examDate;
  const looked = (base.ui.looked || []).concat((other.ui.looked || []).filter(n => !(base.ui.looked || []).includes(n)));
  if (looked.length) out.ui.looked = looked.slice(0, MAX_LOOKED);
  return { progress: out, added: added.length };
}
function makeExport(P, now, edition, collection) {
  return { app: 'visu-study-tool', format: 'visu-progress', schemaVersion: SCHEMA_VERSION, exportedAt: new Date(now).toISOString(),
    collection: collection || 'vertebrados', edition: edition || null, progress: P };
}
/* Throws an Error with .code ('json' | 'not_visu' | 'newer' | 'invalid' | 'other_collection') for the UI to explain.
   'invalid': some value failed validation (hand-edited or crafted file); nothing is loaded.
   'other_collection': the copy belongs to another collection (err.collection); copies made before
   there were collections belong to 'vertebrados'. */
function parseImport(text, now, collection) {
  let d;
  try { d = JSON.parse(text); } catch (e) { const err = new Error('Not JSON'); err.code = 'json'; throw err; }
  if (!isObj(d) || d.app !== 'visu-study-tool' || !isObj(d.progress)) { const err = new Error('Not a VISU copy'); err.code = 'not_visu'; throw err; }
  if (typeof d.schemaVersion !== 'number' || d.schemaVersion > SCHEMA_VERSION) { const err = new Error('Newer schema'); err.code = 'newer'; throw err; }
  const from = typeof d.collection === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(d.collection) ? d.collection : 'vertebrados';
  if (collection && from !== collection) { const err = new Error('Other collection'); err.code = 'other_collection'; err.collection = from; throw err; }
  const issues = [];
  const P = normalizeProgress(d.progress, now, issues);
  if (issues.length) { const err = new Error('Invalid values: ' + issues.slice(0, 5).join(', ')); err.code = 'invalid'; err.issues = issues; throw err; }
  return { progress: P, exportedAt: d.exportedAt ? Date.parse(d.exportedAt) : null, answers: P.log.length };
}

window.VISU_ENGINE = {
  SKILLS, SCHEMA_VERSION, DAY, buildModel, answerFor, pathTo, speciesUnder, lca, treeDist, studyPath,
  gradeKey, osa, threshold, classify,
  rngFrom, shuffle, reverseDistractors, mcOptions,
  rating, applyAnswer, dueOf, retrievability, cardMastered, cardMeter, cardId, speciesStats, groupStats, readiness, readinessAt,
  ymd, startOfDay, SORTS, BOXES_PER_SPECIES, exposures, speciesViewed, rankSpecies, buildSession, GROUP_SKILLS, groupCardId, isGroupCard, groupItems, buildGroupSession, buildOddOne, openConfusions, buildPairs, buildSheetSession, buildMock, buildMistakes, buildReverse, scopePool, soloLooks, changeLook, mergeProgress,
  streak, badgeStatus, newlyEarned, mockScore,
  emptyProgress, normalizeProgress, makeExport, parseImport
};
})();
