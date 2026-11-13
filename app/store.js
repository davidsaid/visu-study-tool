/* VISU · learner progress in localStorage, one key per collection. Defines window.VISU_STORE.

   Keys: 'visu-progress-v1' for the vertebrate collection (the key used before there were collections,
   so existing progress needs no migration) and 'visu-progress-v1:<id>' for any other collection.
   'visu-collection' remembers which collection is open (app/collection.js). 'visu-undo-v1' ('visu-undo-v1:<id>') keeps the
   progress as it was before the last restored copy changed it, so Ajustes can go back to it.

   Stored shape (also the "progress" member of an exported file):
   { schemaVersion, createdAt, settings, cards, log, days, badges, mocks, stats, meta, ui }
   - cards["lynx_pardinus:genus"] = { p: progress counter (Easy/Medium/Hard), m: FSRS state (Hard without hints only) }
     cards["order:Accipitriformes:group"] = the same, for naming a group from several photos (since schemaVersion 2)
     p = { seen, ok, streak, due, first, last }    m = { due, s, d, ed, sd, reps, lapses, ls, st, last }  (times in ms)
   - log: append-only, one row per answered box:
     { ts, card, game: foto|hoja|mock|cual|grupo|par, level: 1|2|3, rating: FSRS rating or null, hints, conf: guess|unsure|sure|null,
       kind: right|misspelling|wrong|wrong_species, with: [species] (wrong_species, and the pair's other species in 'par'), typed (wrong answers only) }
   - days["2026-11-01"] = answers that day (streak); badges[id] = { tier, at }; mocks = finished Mock VISU results. */
(function () {
'use strict';
const E = window.VISU_ENGINE;
const BASE = 'visu-progress-v1';
const COLLECTION = window.VISU_COLLECTION || 'vertebrados';
const KEY = COLLECTION === 'vertebrados' ? BASE : `${BASE}:${COLLECTION}`;
const S = { ok: true, data: null, error: null, key: KEY, collection: COLLECTION };
/* Restoring a copy first keeps this browser's progress here, so the change can be undone ('visu-undo-v1', or
   'visu-undo-v1:<id>'; a different prefix, so it is never taken for a collection's progress). */
const UNDO_KEY = KEY.replace(BASE, 'visu-undo-v1');

/* A collection opened for the first time keeps the language, theme and "seen the notice" of another one. */
function inheritPrefs(P) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k !== KEY && (k === BASE || k.startsWith(BASE + ':'))) {
        const o = JSON.parse(localStorage.getItem(k));
        if (o && typeof o === 'object') {
          const st = o.settings || {};
          if (st.lang === 'en' || st.lang === 'es') P.settings.lang = st.lang;
          if (['auto', 'light', 'dark'].includes(st.theme)) P.settings.theme = st.theme;
          if (o.meta && o.meta.seenNotice === true) P.meta.seenNotice = true;
          return;
        }
      }
    }
  } catch (e) { /* unreadable: keep the defaults */ }
}

function probe() {
  if (/[?&]nostorage=1/.test(location.search)) return false;   // test hook: simulate a browser that blocks storage
  try { const ls = window.localStorage, t = '__visu_probe'; ls.setItem(t, '1'); ls.removeItem(t); return true; } catch (e) { return false; }
}
S.load = function () {
  const now = Date.now();
  S.ok = probe();
  let raw = null;
  if (S.ok) { try { raw = localStorage.getItem(KEY); } catch (e) { S.ok = false; } }
  let parsed = null;
  if (raw) { try { parsed = JSON.parse(raw); } catch (e) { S.error = 'corrupt'; } }
  S.data = parsed ? E.normalizeProgress(parsed, now) : E.emptyProgress(now);
  if (!raw && S.ok) inheritPrefs(S.data);
  return S.data;
};
S.save = function () {
  if (!S.ok) return false;
  try { localStorage.setItem(KEY, JSON.stringify(S.data)); S.error = null; return true; }
  catch (e) { S.error = e && e.name === 'QuotaExceededError' ? 'quota' : 'write'; return false; }
};
S.replace = function (progress) { S.data = progress; return S.save(); };   // also used to store a merged copy (E.mergeProgress)
/* Keeps the current progress before an import changes it. True if kept; false if the browser refused (then the caller
   stops); null when this browser can't store anything anyway. info = { how: 'merge'|'replace', copyAt }. */
S.saveUndo = function (info) {
  if (!S.ok) return null;
  try { localStorage.setItem(UNDO_KEY, JSON.stringify({ at: Date.now(), how: info.how, copyAt: info.copyAt || null, progress: S.data })); return true; }
  catch (e) { return false; }
};
/* The kept progress, validated like any copy: { at, how, copyAt, answers, progress }, or null. */
S.undoInfo = function () {
  let u = null;
  try { u = JSON.parse(localStorage.getItem(UNDO_KEY)); } catch (e) { return null; }
  if (!u || typeof u !== 'object' || !u.progress) return null;
  const progress = E.normalizeProgress(u.progress, Date.now());
  return { at: +u.at || null, how: u.how === 'merge' ? 'merge' : 'replace', copyAt: +u.copyAt || null, answers: progress.log.length, progress };
};
/* Goes back to the kept progress and forgets it. */
S.undoImport = function () {
  const u = S.undoInfo(); if (!u) return false;
  S.data = u.progress;
  const ok = S.save();
  if (ok) { try { localStorage.removeItem(UNDO_KEY); } catch (e) { /* stays offered */ } }
  return ok;
};
/* Opens another collection: remembered for next time, then the page reloads with its data. */
S.switchCollection = function (id) {
  let remembered = false;
  try { localStorage.setItem('visu-collection', id); remembered = true; } catch (e) { /* storage blocked */ }
  const target = location.pathname + (remembered ? '' : `?c=${encodeURIComponent(id)}`);
  if (location.pathname + location.search === target) { location.hash = 'hoy'; location.reload(); }   // only the hash would change: no reload otherwise
  else location.replace(target + '#hoy');
};
S.wipe = function () {
  const keep = S.data.settings;
  S.data = E.emptyProgress(Date.now());
  S.data.settings = Object.assign(S.data.settings, { lang: keep.lang, theme: keep.theme });
  S.data.meta.seenNotice = true;
  if (S.ok) { try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ } }
  return S.save();
};

/* Records one answered box and saves. a = { sp, skill, level, kind, hints, conf, game, typed, with, card? };
   `card` names a group card, otherwise the card is the species' box. */
S.recordAnswer = function (a, now) {
  now = now || Date.now();
  const P = S.data, id = a.card || E.cardId(a.sp, a.skill);
  const res = E.applyAnswer(P.cards[id], { level: a.level, kind: a.kind, hints: a.hints || 0, conf: a.conf || null }, now);
  P.cards[id] = res.card;
  const row = { ts: now, card: id, game: a.game, level: a.level, rating: res.rating, hints: a.hints || 0, conf: a.conf || null, kind: a.kind };
  if (a.kind === 'wrong_species' && a.with && a.with.length) row.with = a.with.slice(0, 5);
  if (a.kind !== 'right' && a.typed) row.typed = String(a.typed).slice(0, 80);
  P.log.push(row);
  const day = E.ymd(now);
  P.days[day] = (P.days[day] || 0) + 1;
  S.save();
  return { card: res.card, rating: res.rating, due: E.dueOf(res.card) };
};
/* "¿Cuál es?" is a scaffold: it is logged and counts as a study day, but schedules nothing. */
S.recordReverse = function (a, now) {
  now = now || Date.now();
  const P = S.data;
  const row = { ts: now, card: E.cardId(a.sp, 'species'), game: 'cual', level: a.level, rating: null, hints: 0, conf: a.conf || null, kind: a.kind };
  if (a.with) row.with = [a.with];
  P.log.push(row);
  const day = E.ymd(now);
  P.days[day] = (P.days[day] || 0) + 1;
  S.save();
};

/* "¿Este o este?" logs the photo's species and the other one of the pair; it schedules nothing. a = { shown, other, right }. */
S.recordPair = function (a, now) {
  now = now || Date.now();
  S.data.log.push({ ts: now, card: E.cardId(a.shown, 'species'), game: 'par', level: null, rating: null, hints: 0, conf: null,
    kind: a.right ? 'right' : 'wrong_species', with: [a.other] });
  S.recordDay(now);
};
/* Games that schedule nothing and log nothing ("¿Cuál sobra?") still count as a study day. */
S.recordDay = function (now) {
  const day = E.ymd(now || Date.now());
  S.data.days[day] = (S.data.days[day] || 0) + 1;
  S.save();
};

window.VISU_STORE = S;
})();
