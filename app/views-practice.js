/* VISU · practice views: Today, level picker, photo → name session, exam sheet,
   "¿Cuál es?" reverse game, Mock VISU and the summaries. */
(function () {
'use strict';
const I = window.VISU_I18N, E = window.VISU_ENGINE, Store = window.VISU_STORE, App = window.VISU_APP;
const L = I.L, esc = I.esc, pct = I.pct, ICON = App.ICON;
const V = App.views;
const M = () => App.M, P = () => Store.data, SET = () => Store.data.settings;
const DAY = E.DAY;

/* ---------- shared bits ---------- */
function statsOf(id) { return E.speciesStats(M(), P(), id, App.skills(), Date.now()); }
App.statsOf = statsOf;
function lastConfusion() {
  const log = P().log;
  for (let i = log.length - 1; i >= 0; i--) {
    const r = log[i];
    if (r.kind === 'wrong_species' && r.with && r.with.length) { const sp = r.card.split(':')[0]; if (App.sp(sp) && App.sp(r.with[0])) return { correct: sp, yours: r.with[0], ts: r.ts }; }
  }
  return null;
}
/* The authored note for a confusable pair: the correct card's look-alike note, else the other card's. */
function pairNote(yours, correct) {
  const C = M().content.species || {};
  const by = (a, b) => { const c = C[a]; if (!c || !Array.isArray(c.lookalikes)) return null; return c.lookalikes.find(x => x && x.binomial === App.sp(b).binomial) || null; };
  const t = by(correct, yours) || by(yours, correct);
  return t ? { text: I.t(t), draft: (C[correct] || C[yours] || {}).status === 'draft' } : null;
}
/* A short tip for a pair: its authored note, else the correct card's first field marks. */
function pairTip(yours, correct) {
  const C = M().content.species || {}, fm = C[correct] && I.list(C[correct].field_marks);
  return pairNote(yours, correct) || (fm && fm.length ? { text: fm.slice(0, 3).join(' · '), draft: C[correct].status === 'draft' } : null);
}
/* Two species' field marks lined up by body part (content field_marks.parts), then their size and activity facts.
   Only parts both cards describe make a row. Each mark sits in its first such part; when one side has no mark of its
   own in a row, it borrows its first mark about that part. A row of borrowed marks only is dropped. */
const DIFF_FACTS = ['length', 'mass', 'activity'];
function diffRows(yours, correct) {
  const marks = id => {
    const fm = ((M().content.species || {})[id] || {}).field_marks, ps = fm && Array.isArray(fm.parts) ? fm.parts : [];
    return I.list(fm).map((t, i) => ({ t, ps: ps[i] || [] }));
  };
  const A = marks(yours), B = marks(correct), has = (ms, p) => ms.some(m => m.ps.includes(p));
  const shared = Object.keys(I.PART).filter(p => has(A, p) && has(B, p));
  const cell = (ms, p) => {
    const own = ms.filter(m => m.ps.find(x => shared.includes(x)) === p);
    return { own: own.length > 0, text: (own.length ? own : ms.filter(m => m.ps.includes(p)).slice(0, 1)).map(m => m.t).join(' · ') };
  };
  const fact = (id, f) => { const x = (App.sp(id).facts || []).find(v => v && v.field === f); return x && I.t(x); };
  return shared.map(p => [L(...I.PART[p]), cell(A, p), cell(B, p)]).filter(([, a, b]) => a.own || b.own).map(([l, a, b]) => [l, a.text, b.text])
    .concat(DIFF_FACTS.map(f => [I.fieldName(f), fact(yours, f), fact(correct, f)]).filter(r => r[1] && r[2] && r[1] !== r[2]));
}
function diffHTML(yours, correct) {
  const rows = diffRows(yours, correct);
  if (!rows.length) return '';
  const C = M().content.species || {}, draft = [yours, correct].some(id => (C[id] || {}).status === 'draft');
  const name = id => `<a href="#${esc(App.routeFor(id))}">${esc(App.spName(id))}</a>`;
  return `<p class="eyebrow mt">${L('Compara parte por parte', 'Compare part by part')}</p>
    <div class="diff">${rows.map(([lab, y, c]) => `<p class="dlab">${esc(lab)}</p><p class="yours">${esc(y)}</p><p class="correct">${esc(c)}</p>`).join('')}</div>
    <p class="tiny muted diff-src">${L('Rasgos y datos de las fichas de', 'Field marks and facts from the cards of')} ${name(yours)} ${L('y', 'and')} ${name(correct)}${L(', con sus fuentes.', ', with their sources.')} ${App.draftTag(draft)}</p>`;
}
function sessTop(prog, total, idx, exitTo) {
  return `<div class="sess-top"><a class="iconbtn" href="#${exitTo || 'hoy'}" aria-label="${L('Salir de la sesión', 'Leave session')}">${ICON.close}</a>
    <div class="bar" role="progressbar" aria-label="${L('Progreso de la sesión', 'Session progress')}" aria-valuenow="${Math.round(prog * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${prog * 100}%"></span></div>
    <span class="small"><b>${Math.min(idx + 1, total)}</b>/${total}</span></div>`;
}
function confBlock(conf, ready, label) {
  const b = (k, es, en) => `<button type="button" class="opt${conf === k ? ' picked' : ''}" data-conf="${k}" aria-pressed="${conf === k}">${L(es, en)}</button>`;
  return `<div class="conf" role="group" aria-labelledby="confq"><h3 id="confq">${L('Antes de ver la solución: ¿cuánta seguridad tienes?',
      'Before the answer: how sure are you?')}</h3>
    <p class="small muted">${label ? L(`Tu respuesta ya está fijada; puedes cambiar tu seguridad hasta que pulses «${label}». Tu seguridad ajusta cuándo vuelve la tarjeta.`, `Your answer is locked in; you can change your confidence until you press “${label}”. Your confidence tunes when the card comes back.`)
      : L('Puedes cambiar de idea hasta que pulses «Comprobar». Tu seguridad ajusta cuándo vuelve la tarjeta.',
          'You can change your mind until you press “Check”. Your confidence tunes when the card comes back.')}</p>
    <div class="options">${b('guess', 'Lo adivino', 'I’m guessing')}${b('unsure', 'Dudo', 'Not sure')}${b('sure', 'Lo sé seguro', 'I know it')}</div>
    <button type="button" class="btn primary big" id="submitbtn" ${ready && conf ? '' : 'disabled'}>${label || L('Comprobar', 'Check')}</button>
    ${ready && !conf ? `<p class="tiny muted">${L('Elige tu seguridad para comprobar.', 'Pick how sure you are to check.')}</p>` : ''}</div>`;
}
function backIn(due, requeued) {
  if (requeued) return L('Vuelve en esta sesión, dentro de unas pocas tarjetas', 'It comes back in this session, a few cards from now');
  if (!due) return '';
  return `${L('Volverá en', 'Back in')} <b>${I.inTime(due - Date.now())}</b>`;
}
const clockIcon = () => ICON.clock.replace('<svg', '<svg class="inline-ic"');
const route = () => (location.hash || '#hoy').slice(1);
const nextLabel = last => (last ? L('Ver resumen', 'See summary') : L('Siguiente', 'Next'));
const sciWrap = (sci, v) => (sci ? `<i>${esc(v)}</i>` : esc(v));
const diffRow = (typed, correct, sci) => `<div class="diffrow"><span class="small muted">${L('Escribiste', 'You typed')}</span><span class="diff ${sci ? 'sci' : ''}">${esc(typed)}</span>
  <span class="small muted">${L('Correcto', 'Correct')}</span><span class="diff ${sci ? 'sci' : ''}">${esc(correct)}</span></div>`;
const keyBox = (text, draft) => `<section class="key"><p class="eyebrow">${L('La clave', 'The key')}</p><p class="tip">${esc(text)}</p>${draft ? `<p class="tiny muted">${App.draftTag(true)}</p>` : ''}</section>`;
function binHL(a, b, cls) { return a.split(' ').map((w, i) => (w === (b.split(' ')[i] || '') ? esc(w) : `<span class="${cls}">${esc(w)}</span>`)).join(' '); }

/* Atlas comparison plate: what she answered next to the right animal, with the key to tell them apart. */
/* `idx` / `yoursIdx`: the photos the student saw (of the correct species, and of the one picked in
   "¿Cuál es?"), so they stay on screen and get their credit. */
function comparePlate(yours, correct, idx, yoursIdx, tags) {
  const fig = (id, cls, tag) => `<figure class="${cls}"><div class="lbl"><span>${tag}</span><span>${L('progreso', 'progress')} ${pct(statsOf(id).meter)}</span></div>
    ${App.carousel(id, { key: `cmp-${cls}`, idx: id === correct ? idx : yoursIdx, credit: true })}
    <figcaption><div class="vern"><a href="#${esc(App.routeFor(id))}">${esc(App.sp(id).common_es)}</a></div>
      <div class="bin">${binHL(App.sp(id).binomial, App.sp(cls === 'yours' ? correct : yours).binomial, cls === 'yours' ? 'hl-bad' : 'hl-good')}</div>
      <div class="tiny muted">${esc(App.sp(id).order)} · ${esc(App.sp(id).class)}</div></figcaption></figure>`;
  const tip = pairNote(yours, correct), diff = diffHTML(yours, correct), split = E.lca(M(), yours, correct);
  const [ta, tb] = tags || [L('Tu respuesta', 'Your answer'), L('Respuesta correcta', 'Correct answer')];
  return `<div class="twoup">${fig(yours, 'yours', ta)}${fig(correct, 'correct', tb)}</div>
  <section class="key"><p class="eyebrow">${L('La clave', 'The key')}</p>
    ${tip ? `<p class="tip">${esc(tip.text)}</p>${tip.draft ? `<p class="tiny muted">${App.draftTag(true)}</p>` : ''}` : ''}${diff}
    ${tip || diff ? '' : `<p class="small muted">${L('Pista de esta pareja: pendiente de redactar. Mientras, compara las dos fichas.', 'Tip for this pair: not written yet. Meanwhile, compare the two cards.')}</p>`}
    ${split ? `<p class="tiny muted">${L('En el árbol se separan en', 'In the tree they split at')} <a href="#${esc(App.routeFor(split))}">${esc(App.label(split))}</a>.</p>` : ''}</section>`;
}
function calloutsHTML(conf, due, requeued) {
  const t = { sure: L('Dijiste «Lo sé seguro»: un error con mucha seguridad es el que más se repite en el examen, así que vuelve pronto.',
      'You said “I know it”: a confident error is the one most likely to repeat in the exam, so it comes back soon.'),
    unsure: L('Dijiste «Dudo»: tu instinto avisaba. Fíate de la pista la próxima vez.',
        'You said “Not sure”: your instinct was warning you. Trust the tip next time.'),
    guess: L('Lo has adivinado: la tratamos como nueva y vuelve pronto.', 'You guessed: it is treated as new and returns soon.') }[conf || 'guess'];
  return `<div class="callouts"><div class="callout confidence">${ICON.gauge}<div><b>${L('Tu seguridad', 'Your confidence')}</b><p class="small">${t}</p></div></div>
    <div class="callout again">${ICON.clock}<div><b>${L('La verás de nuevo', 'You’ll see it again')}</b><p class="small">${backIn(due, requeued)}. ${L('Después, cada vez más espaciada.', 'Then at growing intervals.')}</p></div></div></div>`;
}

/* ---------- HOY ---------- */
function sparkline(vals, w, h) {
  const mn = Math.min.apply(null, vals) - .02, mx = Math.max.apply(null, vals) + .02;
  const pts = vals.map((v, i) => [2 + i * (w - 4) / Math.max(1, vals.length - 1), h - 2 - (v - mn) / (mx - mn || 1) * (h - 4)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const last = pts[pts.length - 1];
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" role="img" aria-label="${L('Tendencia de la preparación', 'Readiness trend')}"><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2"/><circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="var(--accent)"/></svg>`;
}
function weekDots(now) {
  const d = new Date(now); const dow = (d.getDay() + 6) % 7; const mon = E.startOfDay(now) - dow * DAY;
  const names = I.lang === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return `<div class="week">${names.map((n, i) => { const k = E.ymd(mon + i * DAY + 12 * 36e5); return `<span class="${P().days[k] ? 'done' : i === dow ? 'today' : ''}" title="${k}">${n}</span>`; }).join('')}</div>`;
}
function nextBadge() {
  const st = E.badgeStatus(M(), P(), App.skills(), Date.now());
  const orders = Object.values(st).filter(b => b.def.kind === 'order' && !b.tier);
  if (!orders.length) return null;
  orders.sort((a, b) => (b.seen > 0) - (a.seen > 0) || b.progress - a.progress || b.meter - a.meter);
  return orders[0];
}
V.hoy = function () {
  App.focusMode(false);
  const now = Date.now(), set = SET(), skills = App.skills(), fresh = P().log.length === 0;
  const plan = E.todayPlan(M(), P(), { now, skills });
  const total = Math.min(set.sessionSize, plan.dueNow + plan.newAvailable);
  const mins = Math.max(1, Math.round((Math.min(plan.dueNow, total) * 12 + Math.max(0, total - plan.dueNow) * 25) / 60));
  const at = E.readinessAt(P(), now), r = E.readiness(M(), P(), skills, at);
  if (!fresh) { P().meta.readiness[E.ymd(now)] = Math.round(r * 1000) / 1000; Store.save(); }
  const hist = Object.keys(P().meta.readiness).sort().slice(-14).map(k => P().meta.readiness[k]);
  const hardN = P().log.filter(x => x.level === 3 && !x.hints && x.game !== 'cual').length;
  const st = E.streak(P().days, now);
  const examDays = set.examDate ? Math.ceil((new Date(set.examDate + 'T09:00:00') - now) / DAY) : null;
  const dateStr = new Date(now).toLocaleDateString(I.locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  const nb = nextBadge(), look = App.nextLook(), openConf = E.openConfusions(M(), P()).length;
  const dueGroups = E.groupItems(M(), M().withPhotos, skills).filter(g => { const d = E.dueOf(P().cards[g.card]); return d != null && d <= now; }).length;
  const nbMissing = nb ? E.speciesUnder(M(), nb.def.node).filter(id => !statsOf(id).mastered) : [];
  const dueW = total ? Math.min(plan.dueNow, total) / total * 100 : 0;
  const scopeNote = P().ui.scope && M().nodes[P().ui.scope] ? `<p class="lvl-now">${L('Practicando solo', 'Practising only')}: <b>${esc(App.label(P().ui.scope))}</b> · <a href="#nivel">${L('cambiar', 'change')}</a></p>` : '';
  let sessionBody;
  if (fresh) sessionBody = `<h2 id="sesh">${L('Empieza por aquí', 'Start here')}</h2>
    <p class="small">${L(`Te presentamos ${Math.min(set.newPerDay, M().withPhotos.length)} especies nuevas al día, orden a orden. Cada una tiene cinco casillas: clase, orden, género, especie y nombre vulgar.`, `We introduce ${Math.min(set.newPerDay, M().withPhotos.length)} new species a day, order by order. Each one has five boxes: class, order, genus, species and common name.`)}</p>
    <a class="btn primary big" href="#nivel">${L('Elegir nivel y empezar', 'Choose a level and start')}</a>`;
  else if (!total) sessionBody = `<h2 id="sesh">${L('Nada pendiente ahora', 'Nothing due right now')}</h2>
    <p class="small">${plan.dueToday ? L(`${plan.dueToday} repasos vuelven más tarde hoy.`, `${plan.dueToday} reviews come back later today.`) : L('Has hecho los repasos y las nuevas de hoy.',
        'You’ve done today’s reviews and new cards.')} ${L('Puedes repasar igualmente.', 'You can review anyway.')} <a href="#como-funciona-plan">${L('Cómo funciona tu plan', 'How your plan works')}</a></p>
    <a class="btn primary big" href="#sesion-repaso">${L('Repasar igualmente', 'Review anyway')}</a>`;
  else sessionBody = `<h2 id="sesh">${total} ${L('tarjetas', 'cards')} · ≈ ${mins} min</h2>
    <div class="split" aria-hidden="true"><span class="due" style="width:${dueW}%"></span><span class="new" style="width:${100 - dueW}%"></span></div>
    <div class="legend"><span><i class="dot due"></i>${Math.min(plan.dueNow, total)} ${L('repasos pendientes', 'reviews due')}</span><span><i class="dot new"></i>${Math.max(0, total - plan.dueNow)} ${L('nuevas', 'new')}</span></div>
    <a class="btn primary big" href="#nivel">${L('Elegir nivel y empezar', 'Choose a level and start')}</a>
    <p class="lvl-now">${L('Último nivel', 'Last level')}: <b>${I.lvName(set.level)}</b> · <a href="#sesion">${L('repetir sin preguntar', 'repeat without asking')}</a> · <a href="#como-funciona-plan">${L('Cómo funciona tu plan', 'How your plan works')}</a></p>`;
  App.main().innerHTML = `
  <div class="today-head"><div><p class="eyebrow">${esc(dateStr)}</p><h1>${fresh ? L('Te damos la bienvenida a la Herramienta de estudio para VISU',
      'Welcome to the VISU Study Tool') : L('Esto es lo que toca hoy', 'Here’s today’s plan')}</h1></div>
    <p class="small muted right">${examDays != null && examDays >= 0 ? `${L('Examen en', 'Exam in')} <b>${examDays} ${examDays === 1 ? L('día', 'day') : L('días', 'days')}</b>` : `<a href="#ajustes">${L('Fijar la fecha del examen', 'Set the exam date')}</a>`}</p></div>
  <section class="card session-card" aria-labelledby="sesh"><p class="eyebrow">${L('Sesión de hoy', 'Today’s session')}</p>${sessionBody}${scopeNote}</section>
  <section class="card"><p class="eyebrow">${L('Otras formas de practicar', 'Other ways to practise')}</p><div class="games">
    ${look ? `<a class="game" href="#${esc(App.lookRoute(look.node))}">${ICON.explorar}<span><b>${L('Primer vistazo', 'First look')}: <i>${esc(look.node.split(':')[1])}</i></b><span class="small muted">${L(`Mira sus especies una a una, sin preguntas. Tiene ${look.n} que aún no has visto.`,
        `Look at its species one by one, no questions. ${look.n} you haven’t seen yet.`)}</span></span><span class="arrow" aria-hidden="true">›</span></a>` : ''}
    <a class="game" href="#grupos">${ICON.groupPhotos}<span><b>${L('¿Qué grupo es?', 'Which group is it?')}</b><span class="small muted">${L('Varias fotos de un mismo grupo: nombra su clase u orden. Para empezar a conocer el bestiario.',
        'Several photos from one group: name its class or order. A way to get to know the list.')}${dueGroups ? ` <b>${L(`${dueGroups} para repasar.`, `${dueGroups} due.`)}</b>` : ''}</span></span><span class="arrow" aria-hidden="true">›</span></a>
    <a class="game" href="#parejas">${ICON.pair}<span><b>${L('¿Este o este?', 'This one or that one?')}</b><span class="small muted">${L('Una foto y dos especies que se parecen: ¿cuál es? Empieza por las que tú has confundido.',
        'One photo and two look-alike species: which is it? Your own confusions come first.')}${openConf ? ` <b>${openConf === 1 ? L('1 confusión abierta.', '1 open confusion.') : L(`${openConf} confusiones abiertas.`, `${openConf} open confusions.`)}</b>` : ''}</span></span><span class="arrow" aria-hidden="true">›</span></a>
    <a class="game" href="#sobra">${ICON.oddOne}<span><b>${L('¿Cuál sobra?', 'Odd one out')}</b><span class="small muted">${L('Cuatro fotos: tres son del mismo orden y una no. Para fijarte en lo que comparte cada orden.',
        'Four photos: three share an order and one doesn’t. To notice what each order has in common.')}</span></span><span class="arrow" aria-hidden="true">›</span></a>
    <a class="game" href="#cual-es">${ICON.namePhoto}<span><b>${L('¿Cuál es?', 'Which one is it?')}</b><span class="small muted">${L('Ves un nombre científico y eliges la foto correcta entre cuatro.',
        'See a scientific name and pick the right photo out of four.')}</span></span><span class="arrow" aria-hidden="true">›</span></a>
    <a class="game" href="#hoja">${ICON.sheet}<span><b>${L('Hoja de examen', 'Exam sheet')}</b><span class="small muted">${L('Una foto, cinco casillas: clase, orden, género, especie y nombre vulgar.',
        'One photo, five boxes: class, order, genus, species and common name.')}</span></span><span class="arrow" aria-hidden="true">›</span></a>
    <a class="game" href="#simulacro">${ICON.gauge}<span><b>${L('Simulacro de VISU', 'Mock VISU')}</b><span class="small muted">${L(`${Math.min(set.mockSize, M().withPhotos.length)} fotos con la hoja completa y sin correcciones hasta el final.`, `${Math.min(set.mockSize, M().withPhotos.length)} photos with the full sheet and no feedback until the end.`)}</span></span><span class="arrow" aria-hidden="true">›</span></a>
  </div></section>
  <div class="kpis">
    <section class="card" aria-labelledby="rd"><p class="eyebrow" id="rd">${L('Preparación', 'Readiness')}</p>
      <div class="big-num">${pct(r)}</div>
      ${hist.length >= 2 ? `<p class="trend">${hist[hist.length - 1] - hist[0] >= 0 ? '+' : ''}${Math.round((hist[hist.length - 1] - hist[0]) * 100)} ${L(`en ${hist.length} días`, `over ${hist.length} days`)}</p>${sparkline(hist, 160, 36)}` : `<p class="tiny muted">${fresh ? L('Empieza en 0 %. Sube con las respuestas en Difícil.',
          'It starts at 0%. It rises with answers on Hard.') : L('La tendencia aparece a partir del segundo día.',
          'The trend appears from the second day.')}</p>`}
      <p class="tiny muted">${L('Lo que recordarías', 'What you’d remember')} ${set.examDate && examDays >= 0 ? L('el día del examen', 'on exam day') : L('dentro de 7 días', 'in 7 days')}, ${L('según FSRS', 'per FSRS')}. ${L('Respuestas en Difícil', 'Answers on Hard')}: ${hardN}</p></section>
    <section class="card" aria-labelledby="st"><p class="eyebrow" id="st">${L('Racha', 'Streak')}</p>
      <div class="big-num gold">${st} <span class="small">${st === 1 ? L('día', 'day') : L('días', 'days')}</span></div>${weekDots(now)}
      <p class="tiny muted mt">${L('Un día sin estudiar a la semana gasta un comodín; la racha sigue.',
          'One missed day a week spends a freeze; the streak survives.')}</p></section>
  </div>
  ${nb ? `<section class="card next-badge" aria-labelledby="nb">${App.medalSVG(M().nodes[nb.def.node].scientific, nb.progress, 64)}
    <div><p class="eyebrow" id="nb">${L('Insignia a tu alcance', 'Badge within reach')}</p><h2>${L('Dominio de', 'Mastery of')} ${esc(M().nodes[nb.def.node].scientific)}</h2>
      <p class="small">${L(`Domina sus ${nb.total} especies. Te faltan ${nbMissing.length}:`, `Master its ${nb.total} species. ${nbMissing.length} to go:`)}</p>
      <div class="thumbs">${nbMissing.slice(0, 12).map(id => `<a href="#${esc(App.routeFor(id))}" title="${esc(App.spName(id))}">${App.tile(id)}</a>`).join('')}</div></div></section>` : ''}
  <div id="aside-m"></div>`;
  const conf = lastConfusion();
  const tiers = { seen: 0, bronze: 0, silver: 0, gold: 0 };
  M().order.forEach(id => { const t = statsOf(id).tier; if (t !== 'none') tiers.seen++; if (t === 'bronze' || t === 'silver' || t === 'gold') tiers.bronze++; if (t === 'silver' || t === 'gold') tiers.silver++; if (t === 'gold') tiers.gold++; });
  const nSp = M().order.length;
  App.asideHost().innerHTML = `
  <section class="card"><p class="eyebrow">${L('Confusión pendiente', 'Open confusion')}</p>
    ${conf ? `<div class="confusion-mini"><figure>${App.tile(conf.yours, null, 'r43')}<figcaption class="small"><i>${esc(App.sp(conf.yours).binomial)}</i></figcaption></figure><span class="vs">vs</span>
    <figure>${App.tile(conf.correct, null, 'r43')}<figcaption class="small"><i>${esc(App.sp(conf.correct).binomial)}</i></figcaption></figure></div>
    ${(() => { const t = pairTip(conf.yours, conf.correct); return t ? `<p class="small">${esc(t.text)}</p>` : ''; })()}
    <div class="row">${App.cardLink(conf.correct, '')}<a class="btn" href="#parejas">${L('Practicar tus confusiones', 'Practise your confusions')}</a></div>`
    : `<p class="small muted">${L('Aún no hay ninguna. Cuando confundas dos especies, aparecerán aquí juntas, con la clave para distinguirlas.',
        'None yet. When you mix up two species, they’ll show up here side by side, with the key to tell them apart.')}</p>`}</section>
  <section class="card"><p class="eyebrow">${L('Tu colección', 'Your collection')}</p>
    <p><b>${tiers.seen}</b> ${L(`de ${nSp} especies vistas`, `of ${nSp} species seen`)}</p><div class="bar"><span style="width:${tiers.seen / nSp * 100}%"></span></div>
    <div class="tiers"><div class="tier"><b>${tiers.bronze}</b>${L('bronce', 'bronze')}</div><div class="tier"><b>${tiers.silver}</b>${L('plata', 'silver')}</div><div class="tier"><b>${tiers.gold}</b>${L('oro', 'gold')}</div></div>
    <p class="tiny muted">${L('Bronce: las cinco casillas acertadas una vez. Plata: las cinco dominadas. Oro: dominadas con 21 días de estabilidad.',
        'Bronze: all five boxes right once. Silver: all five mastered. Gold: mastered with 21 days of stability.')}</p>
    ${M().withPhotos.length < nSp ? `<p class="tiny muted">${L(`${nSp - M().withPhotos.length} especies aún no tienen foto y no salen en los juegos.`, `${nSp - M().withPhotos.length} species have no photo yet and don’t appear in the games.`)}</p>` : ''}
    <a class="btn ghost mt" href="#explorar">${L('Ver el árbol', 'See the tree')}</a></section>`;
};

/* ---------- NIVEL ---------- */
function levelMock(k) {
  if (k === 1) return `<svg class="mock" viewBox="0 0 92 54" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" opacity=".7"><rect x="2" y="3" width="42" height="21" rx="5"/><rect x="48" y="3" width="42" height="21" rx="5"/><rect x="2" y="29" width="42" height="21" rx="5"/><rect x="48" y="29" width="42" height="21" rx="5" stroke="var(--accent)" stroke-width="2.5"/></g></svg>`;
  if (k === 2) return `<svg class="mock" viewBox="0 0 92 54" aria-hidden="true"><rect x="2" y="4" width="88" height="22" rx="5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".7"/><text x="9" y="19" font-size="11" font-style="italic" fill="currentColor">Lynx par|</text><rect x="2" y="32" width="46" height="19" rx="9.5" fill="var(--gold-soft)" stroke="var(--gold)" stroke-dasharray="3 2"/><text x="11" y="45" font-size="10" font-weight="700" fill="var(--gold)">${L('Pista', 'Hint')}</text></svg>`;
  return `<svg class="mock" viewBox="0 0 92 54" aria-hidden="true"><rect x="2" y="14" width="88" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><text x="9" y="30" font-size="11" font-style="italic" fill="currentColor">Lynx pardinus</text></svg>`;
}
/* What each level means in "¿Cuál es?": how close the other three photos are in the tree. Shown on the level
   picker and in the game. */
const revLevelDesc = k => ({
  1: L('Las otras fotos son de otras clases. Puedes mostrar u ocultar el nombre vulgar.',
      'The other photos are from other classes. You can show or hide the common name.'),
  2: L('Las otras fotos son de la misma clase, pero de otro orden.', 'The other photos are from the same class, but another order.'),
  3: L('Las otras fotos son del mismo orden o del mismo género (o lo más cercano que haya).',
      'The other photos are from the same order or genus (or the closest available).')
}[k]);
const REV_NOTE = () => L('«¿Cuál es?» entrena el reconocimiento: queda anotado, pero no programa repasos ni cuenta para «dominada».',
    '“Which one is it?” trains recognition: it is logged but schedules no reviews and doesn’t count toward “mastered”.');
function revAside(inGame) {
  return `<section class="card"><p class="eyebrow">${L('Cómo se eligen las otras fotos', 'How the other photos are chosen')}</p>
    <p class="small">${L('Por la distancia en el árbol: cuanto más difícil el nivel, más cerca están las opciones.',
        'By distance in the tree: the harder the level, the closer the options.')}</p>
    <ul class="small list-tight">${[1, 2, 3].map(k => `<li><b>${I.lvName(k)}</b>: ${revLevelDesc(k)}</li>`).join('')}</ul>
    <p class="small muted">${L('Solo salen especies con foto.',
        'Only species with photos appear.')}</p>${inGame ? `<a class="btn" href="#nivel">${L('Cambiar de nivel', 'Change level')}</a>` : ''}</section>`;
}
const gameIcon = ic => ic.replace('<svg', '<svg class="mock game-ic"');
V.nivel = function () {
  App.focusMode(false);
  const set = SET(), scope = P().ui.scope && M().nodes[P().ui.scope] ? P().ui.scope : null;
  const games = [['foto', L('Foto → nombre', 'Photo → name'), L('Ves una foto y respondes una casilla.',
      'See a photo and answer one box.'), ICON.photoName],
    ['grupo', L('¿Qué grupo es?', 'Which group is it?'), L('Ves varias fotos y nombras su clase u orden.', 'See several photos and name their class or order.'), ICON.groupPhotos],
    ['cual', L('¿Cuál es?', 'Which one is it?'), L('Ves un nombre y eliges la foto.', 'See a name and pick the photo.'), ICON.namePhoto],
    ['hoja', L('Hoja de examen', 'Exam sheet'), L('Las cinco casillas a la vez, siempre sin ayudas.',
        'All five boxes at once, always without help.'), ICON.sheet]];
  const sheet = set.game === 'hoja', rev = set.game === 'cual';
  App.main().innerHTML = `<div class="session-wrap"><p class="eyebrow">${L('Antes de empezar', 'Before you start')}</p><h1>${L('¿Cómo quieres practicar hoy?',
      'How do you want to practise today?')}</h1>
    ${scope ? `<div class="note-box info">${L('Practicas solo', 'Practising only')} <b>${esc(App.label(scope))}</b> (${E.scopePool(M(), scope).length} ${L('especies con foto', 'species with photos')}). <button class="linkbtn" id="clearscope">${L('Practicar todo', 'Practise everything')}</button></div>` : ''}
    <h2 class="mt-lg">${L('1. Juego', '1. Game')}</h2>
    <div class="seg-cards" role="group" aria-label="${L('Juego', 'Game')}">${games.map(([k, t, d, ic]) => `<button class="pick" data-game="${k}" aria-pressed="${set.game === k}"><span class="t">${t}</span><span class="d">${d}</span>${gameIcon(ic)}</button>`).join('')}</div>
    <h2>${L('2. Nivel', '2. Level')}</h2>
    <div class="seg-cards ${sheet ? 'dim' : ''}" role="group" aria-label="${L('Nivel', 'Level')}" ${sheet ? 'aria-disabled="true"' : ''}>${[1, 2, 3].map(k => `<button class="pick" data-level="${k}" aria-pressed="${set.level === k}" ${sheet ? 'disabled' : ''}><span class="t">${App.lvDots(k)}${I.lvName(k)}</span><span class="d">${rev ? revLevelDesc(k) : I.lvDes(k)}</span>${rev ? levelMock(1) : levelMock(k)}</button>`).join('')}</div>
    <div class="note-box"><b>${L('Regla', 'Rule')}:</b> ${rev ? REV_NOTE() : I.MASTERY_RULE()}</div>
    <div class="note-box info">${rev ? L('Antes de ver la solución te preguntamos cuánta seguridad tenías: «Lo adivino», «Dudo» o «Lo sé seguro». Queda anotado junto a tu respuesta.',
        'Before the answer we ask how sure you were: “I’m guessing”, “Not sure” or “I know it”. It is logged with your answer.') : L('En todos los niveles, antes de ver la solución te preguntamos cuánta seguridad tenías: «Lo adivino», «Dudo» o «Lo sé seguro». Así repasas antes lo que creías saber y no sabías.',
        'On every level, before the answer we ask how sure you were: “I’m guessing”, “Not sure” or “I know it”. That way you revisit sooner what you thought you knew but didn’t.')}</div>
    <a class="btn primary big" id="startbtn" href="#${{ cual: 'cual-es', hoja: 'hoja', grupo: 'grupos' }[set.game] || 'sesion'}">${sheet ? L('Empezar la hoja de examen', 'Start the exam sheet') : L(`Empezar en ${I.lvName(set.level)}`, `Start on ${I.lvName(set.level)}`)}</a></div><div id="aside-m"></div>`;
  App.aside().innerHTML = !App.DESK.matches ? '' : rev ? revAside(false) : `<section class="card"><p class="eyebrow">${L('Qué entrena cada nivel', 'What each level trains')}</p>
    <p class="small"><b>${I.lvName(1)}</b>: ${L('reconocer. Ideal para especies nuevas.', 'recognition. Good for new species.')}</p>
    <p class="small"><b>${I.lvName(2)}</b>: ${L('recordar y escribir, con red. Cada pista que pides queda anotada.',
        'recall and spelling, with a safety net. Every hint you ask for is recorded.')}</p>
    <p class="small"><b>${I.lvName(3)}</b>: ${L('lo mismo que pide el examen: foto y respuesta escrita, y la ortografía cuenta.',
        'exactly what the exam asks: a photo and a typed answer, and spelling counts.')}</p></section>`;
};
App.on('click', '[data-game]', b => { SET().game = b.dataset.game; Store.save(); App.redraw(V.nivel, `[data-game="${b.dataset.game}"]`); });
App.on('click', '[data-level]', b => { SET().level = +b.dataset.level; Store.save(); App.redraw(V.nivel, `[data-level="${b.dataset.level}"]`); });
App.on('click', '#clearscope', () => { P().ui.scope = null; Store.save(); V.nivel(); });

/* ---------- SESSION (photo → one box, or the exam sheet) ---------- */
let sess = null;
App.sessionState = () => sess;
App.newSession = function (game, opts) {
  opts = opts || {};
  const once = App.onceSession || {};   // a one-off round (the check after a first look) overrides the saved group and level
  App.onceSession = null;
  const now = Date.now(), set = SET(), skills = App.skills(), saved = once.scope || P().ui.scope, scope = saved && M().nodes[saved] ? saved : null;
  const base = { now, skills, scope, size: set.sessionSize, force: !!opts.force, introduce: !!once.scope };
  const items = game === 'hoja' ? E.buildSheetSession(M(), P(), Object.assign(base, { size: Math.max(5, Math.round(set.sessionSize / 2)) }))
    : game === 'grupo' ? E.buildGroupSession(M(), P(), base) : E.buildSession(M(), P(), base);
  sess = { game, level: game === 'hoja' ? 3 : once.level || set.level, items, i: 0, results: [], startedAt: now, done: false };
  resetItem();
  return sess;
};
function resetItem() {
  Object.assign(sess, { phase: 'ask', picked: null, typed: '', hints: 0, conf: null, sheet: {}, res: null, outcome: null, mc: null, sheetRes: null });
  const it = sess.items[sess.i];
  if (it && sess.game !== 'hoja' && sess.level === 1) sess.mc = E.mcOptions(M(), it.sp, it.skill);
  if (it && it.card) {   // a group: up to four of its species, each on a random photo
    sess.gshow = E.shuffle(it.members, Math.random).slice(0, 4);
    sess.gphoto = {}; sess.gshow.forEach(id => { sess.gphoto[id] = App.randomPhoto(id); });
  } else if (it) sess.photoIdx = App.randomPhoto(it.sp);
}
const curItem = () => sess.items[sess.i];
const mode = () => (sess.game === 'hoja' ? 'sheet' : sess.level === 1 ? 'mc' : 'typed');
function promptText(it) {
  if (it.card) {
    const many = sess.gshow.length > 1;
    return it.skill === 'class' ? (many ? L('¿De qué clase son estos animales?', 'Which class are these animals?') : L('¿A qué clase pertenece?', 'Which class does it belong to?'))
      : many ? L('¿De qué orden son estos animales?', 'Which order are these animals?') : L('¿De qué orden es?', 'Which order is it?');
  }
  if (it.skill === 'sheet') return L('Rellena las casillas, como en el examen', 'Fill in the boxes, as in the exam');
  return { class: L('¿A qué clase pertenece?', 'Which class does it belong to?'), order: L('¿De qué orden es?', 'Which order is it?'),
    genus: L('¿De qué género es?', 'Which genus is it?'), species: L('¿Qué especie es? Escribe solo el epíteto específico',
        'Which species is it? Type only the specific epithet'),
    common: L('¿Cuál es su nombre vulgar?', 'What’s its common name?') }[it.skill];
}
const MASK_KEEP = /[aeiouáéíóúü]/i;
function hintHTML(ans, n) {
  const words = ans.split(' ');
  if (n === 1) return `<span class="muted small">1</span><span>${L('Empieza por', 'Starts with')} <b class="mask">${esc(Array.from(ans)[0])}</b></span>`;
  if (n === 2) return `<span class="muted small">2</span><span><span class="mask">${esc(words.map(w => Array.from(w).map((c, j) => (j === 0 ? c : '_')).join('')).join('  '))}</span><br><span class="small muted">${words.map(w => Array.from(w).length).join(' + ')} ${L('letras', 'letters')}</span></span>`;
  return `<span class="muted small">3</span><span class="mask">${esc(words.map(w => Array.from(w).map((c, j) => (j === 0 || MASK_KEEP.test(c) ? c : '_')).join('')).join('  '))}</span>`;
}
const levelPill = lv => `<span class="skillpill mode">${App.lvDots(lv)}${I.lvName(lv)}</span>`;
const sciSkill = k => k === 'genus' || k === 'species';

V.session = function () {
  App.focusMode(true);
  if (!sess || !sess.items.length) return emptySession();
  if (sess.i >= sess.items.length) { location.hash = 'resumen'; return; }
  const it = curItem(), m = mode(), total = sess.items.length;
  if (it.card) sess.gshow.forEach((id, i) => { App.carouselStep[`grp-${i}`] = k => { sess.gphoto[id] = k; }; });
  const prog = (sess.i + (sess.phase === 'reveal' ? 1 : 0)) / total;
  const top = sessTop(prog, total, sess.i);
  if (sess.phase === 'reveal' && m !== 'sheet' && sess.res.kind !== 'right') {
    App.main().innerHTML = `<div class="session-wrap">${top}${feedbackHTML(it)}</div><div id="aside-m"></div>`;
    App.aside().innerHTML = App.DESK.matches ? sessionAside(it) : '';
    return;
  }
  const locked = sess.phase !== 'ask';
  const pills = `<div class="row">${levelPill(sess.level)}<span class="skillpill">${it.skill === 'sheet' ? L('Hoja de examen', 'Exam sheet') : I.sk(it.skill)}</span></div>`;
  let body = '';
  if (m === 'mc') {
    const sci = it.skill !== 'common';
    body = `<div class="options" role="group" aria-label="${L('Opciones', 'Options')}">${sess.mc.options.map((o, i) => {
      let cls = 'opt'; if (sess.picked === i) cls += ' picked';
      if (sess.phase === 'reveal') { if (o.value === sess.mc.correct) cls += ' right'; else if (sess.picked === i) cls += ' wrong'; }
      return `<button class="${cls}" data-opt="${i}" aria-pressed="${sess.picked === i}" ${locked ? 'disabled' : ''}>${sci ? `<i>${esc(o.value)}</i>` : esc(o.value)}</button>`;
    }).join('')}</div>`;
  } else if (m === 'typed') {
    const ans = E.answerFor(M(), it.sp, it.skill);
    body = `<form class="typed" id="typedform"><label class="sr" for="typedin">${esc(promptText(it))}</label>
      <input id="typedin" class="${it.skill !== 'common' ? 'sci' : ''}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(sess.typed)}" ${locked ? 'disabled' : ''} placeholder="…">
      <button class="btn primary" ${locked ? 'disabled' : ''}>${L('Comprobar', 'Check')}</button></form>`;
    if (sess.level === 2) {
      body += `<div class="hintrow"><button class="hintbtn" id="hintbtn" ${locked || sess.hints >= 3 ? 'disabled' : ''} aria-describedby="hintnote">${ICON.bulb}${sess.hints === 0 ? L('Pista', 'Hint') : sess.hints < 3 ? L(`Otra pista (${sess.hints + 1} de 3)`, `Another hint (${sess.hints + 1} of 3)`) : L('No hay más pistas', 'No more hints')}</button>
        <span class="tiny muted" id="hintnote">${sess.hints ? L(`Pistas usadas: ${sess.hints}. Queda anotado.`, `Hints used: ${sess.hints}. This is recorded.`) : L('Usar una pista queda anotado.', 'Using a hint is recorded.')}</span></div>
        ${sess.hints ? `<ol class="hints">${[1, 2, 3].slice(0, sess.hints).map(k => `<li>${hintHTML(ans, k)}</li>`).join('')}</ol>` : ''}`;
    } else body += `<p class="tiny muted mt">${L('Sin ayudas. Esta respuesta cuenta para «dominada».',
        'No help. This answer counts toward “mastered”.')}</p>`;
    if (!locked) body += `<button class="linkbtn" id="dunno">${L('No lo sé: enséñamelo', 'I don’t know: show me')}</button>`;
  } else body = sheetHTML(it, locked);
  let after = '';
  if (sess.phase === 'confidence') after = confBlock(sess.conf, true, m === 'mc' ? '' : L('Ver la solución', 'Show the answer'));
  else if (m === 'mc' && sess.phase === 'ask' && sess.picked != null) after = confBlock(sess.conf, true);
  if (sess.phase === 'reveal') after = m === 'sheet' ? sheetResultHTML(it) : revealOK(it);
  App.main().innerHTML = `<div class="session-wrap">${top}
    ${it.card ? groupGrid(sess.phase === 'reveal') : `<div class="quiz-photo">${quizPhoto(it, L('Foto del animal que hay que identificar', 'Photo of the animal to identify'))}</div>`}
    ${pills}<p class="prompt">${esc(promptText(it))}</p>${body}${after}</div><div id="aside-m"></div>`;
  App.aside().innerHTML = App.DESK.matches ? sessionAside(it) : '';
  const ti = document.getElementById('typedin');
  if (ti && !ti.disabled && sess.phase === 'ask' && App.DESK.matches) ti.focus({ preventScroll: true });
};
/* At every level she can flip through every photo of the animal, starting on a random one: a single
   photo can be hard to read (David, 2026-11-01). */
/* The credit waits for the answer: its caption would give the name away. */
function quizPhoto(it, alt) {
  return App.carousel(it.sp, { key: 'quiz', alt, idx: sess.photoIdx, credit: sess.phase === 'reveal' ? true : 'later' });
}
App.carouselStep.quiz = i => { sess.photoIdx = i; };
/* "¿Qué grupo es?": the group's photos as a grid of carousels. Names and credits wait for the answer. */
function groupGrid(reveal) {
  return `<div class="rev-grid group-grid ${sess.gshow.length === 1 ? 'one' : ''}" role="group" aria-label="${L('Fotos del grupo', 'Photos of the group')}">${sess.gshow.map((id, i) => {
    const alt = `${L('Foto', 'Photo')} ${i + 1}${reveal ? ': ' + App.sp(id).binomial : ''}`;
    return `<div class="rev-opt">${App.carousel(id, { key: `grp-${i}`, idx: sess.gphoto[id], alt, credit: reveal || undefined })}
      ${reveal ? `<span class="cap"><a href="#${esc(App.routeFor(id))}"><i>${esc(App.sp(id).binomial)}</i></a><br>${esc(App.sp(id).common_es)}</span>` : ''}</div>`;
  }).join('')}</div>${reveal ? '' : App.creditLater()}`;
}
const groupLink = (node, cls) => (M().nodes[node] ? `<a class="btn ${cls}" href="#${esc(App.routeFor(node))}">${L('Abrir el grupo', 'Open the group')}</a>` : '');
/* A group's name (with its Spanish form), a few of its species and what they have in common, from its card. */
function groupBlock(node, cls, tag) {
  const [rank, val] = node.split(':'), es = App.esForm(rank, val), g = (M().content.groups || {})[node];
  const sp = M().withPhotos.filter(id => E.answerFor(M(), id, rank) === val), traits = g ? I.list(g.traits).slice(0, 4) : [];
  const name = `<i>${esc(val)}</i>${es ? ` · ${esc(es)}` : ''}`;
  return `<div class="${cls}"><div class="lbl"><span>${tag}</span></div>
    <p class="vern">${M().nodes[node] ? `<a href="#${esc(App.routeFor(node))}">${name}</a>` : name}</p>
    <div class="thumbs">${sp.slice(0, 4).map(id => `<a href="#${esc(App.routeFor(id))}" title="${esc(App.spName(id))}">${App.tile(id)}</a>`).join('')}</div>
    ${traits.length ? `<ul class="small list-tight">${traits.map(t => `<li>${esc(t)}</li>`).join('')}</ul>${App.draftTag(g.status === 'draft')}` : ''}</div>`;
}
/* After naming the wrong group: both groups side by side, then the right one's "do not confuse with". */
function groupCompare(other, node, tags) {
  const g = (M().content.groups || {})[node], [ta, tb] = tags || [L('Tu respuesta', 'Your answer'), L('Respuesta correcta', 'Correct answer')];
  return `<div class="twoup group-cmp">${groupBlock(other, 'yours', ta)}${groupBlock(node, 'correct', tb)}</div>
    ${g && g.contrast && I.t(g.contrast) ? keyBox(I.t(g.contrast), g.status === 'draft') : ''}`;
}
function emptySession() {
  App.main().innerHTML = `<div class="session-wrap">${sessTop(0, 0, 0)}<h1>${L('No hay tarjetas para esta sesión', 'No cards for this session')}</h1>
    <p>${M().withPhotos.length ? L('Ya has hecho los repasos y las nuevas de hoy. Puedes repasar igualmente o cambiar de grupo.',
        'You’ve done today’s reviews and new cards. You can review anyway or change the group.') : L('Todavía no hay ninguna especie con foto.',
        'There are no species with photos yet.')} <a href="#como-funciona-plan">${L('Cómo funciona tu plan', 'How your plan works')}</a></p>
    <div class="actions"><a class="btn primary big" href="#${sess && sess.game === 'grupo' ? 'grupos-repaso' : 'sesion-repaso'}">${L('Repasar igualmente', 'Review anyway')}</a>
      <a class="btn big" href="#hoy">${L('Volver a Hoy', 'Back to Today')}</a></div></div><div id="aside-m"></div>`;
}
function sessionAside(it) {
  const up = sess.items.slice(sess.i + 1, sess.i + 9);
  return `<section class="card"><p class="eyebrow">${L('Nivel de esta sesión', 'This session’s level')}</p><p><b>${App.lvDots(sess.level)}${I.lvName(sess.level)}</b></p>
    <p class="small muted">${sess.game === 'hoja' ? L('Hoja de examen: siempre sin ayudas.', 'Exam sheet: always without help.') : I.lvDes(sess.level)}</p>
    <p class="small">${I.MASTERY_RULE()}</p><a class="btn" href="#nivel">${L('Cambiar de nivel', 'Change level')}</a></section>
  ${sess.phase !== 'reveal' ? '' : it.card ? `<section class="card"><p class="eyebrow">${L('Reconocer este grupo', 'Recognising this group')}</p>${groupBar(it.card)}</section>`
    : `<section class="card"><p class="eyebrow">${L('Tus casillas de este animal', 'Your boxes for this animal')}</p>${skillBars([it.sp])}</section>`}
  <section class="card"><p class="eyebrow">${L('Siguientes', 'Up next')}</p><div class="thumbs">${up.map(d => `<span>${App.tile(d.sp, L('Tarjeta pendiente', 'Upcoming card'))}</span>`).join('')
    || `<span class="small muted bare">${L('Última tarjeta', 'Last card')}</span>`}</div></section>`;
}
function skillBars(ids) {
  const now = Date.now(), set = SET();
  const bar = k => {
    const v = ids.reduce((a, x) => a + E.cardMeter(P().cards[E.cardId(x, k)], now), 0) / Math.max(1, ids.length), off = set.skills[k] ? '' : 'off';
    return `<span class="${off}">${I.sk(k)}</span><div class="bar ${off}"><span style="width:${v * 100}%"></span></div><span class="tiny muted">${pct(v)}</span>`;
  };
  return `<div class="skillbars">${E.SKILLS.map(bar).join('')}</div>`;
}
App.skillBars = skillBars;
/* Shared with the learning screens (views-learn.js). */
Object.assign(App, { groupBlock: (...a) => groupBlock(...a), groupCompare: (...a) => groupCompare(...a), comparePlate: (...a) => comparePlate(...a),
  diffHTML: (...a) => diffHTML(...a), sessTop: (...a) => sessTop(...a), levelPill: lv => levelPill(lv) });
const groupBar = card => { const v = E.cardMeter(P().cards[card], Date.now()); return `<div class="bar"><span style="width:${v * 100}%"></span></div><p class="tiny muted">${pct(v)}</p>`; };
App.groupBar = groupBar;

const fieldInput = (k, value, locked) => `<input id="f-${k}" data-field="${k}" class="${sciSkill(k) ? 'sci' : ''}" value="${esc(value || '')}" ${locked ? 'disabled' : ''}
  autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">`;
function sheetHTML(it, locked) {
  const rev = sess.phase === 'reveal', skills = App.skills();
  return `<form id="sheetform" class="sheet" novalidate>${skills.map(k => {
    const res = rev ? sess.sheetRes[k] : null;
    const st = res ? (res.kind === 'right' ? 'right' : 'wrong') : '';
    const mark = !res ? '' : res.kind === 'right' ? `<span class="ok-mark">✓ ${L('Correcto', 'Correct')}</span>`
      : diffRow((sess.sheet[k] || '').trim() || '—', E.answerFor(M(), it.sp, k), sciSkill(k));
    return `<div class="f ${st}"><label for="f-${k}">${I.sk(k)}</label>${fieldInput(k, sess.sheet[k], locked)}${mark ? `<div class="mark">${mark}</div>` : ''}</div>`;
  }).join('')}<p class="rule">${L('Cuentan la ortografía y las tildes; las mayúsculas, no.', 'Spelling and accents count; capitals don’t.')}</p>
  ${locked ? '' : `<button class="btn primary big">${L('Entregar hoja', 'Hand in sheet')}</button>`}</form>`;
}
function sheetResultHTML(it) {
  const skills = App.skills(), s = App.sp(it.sp);
  const ok = skills.filter(k => sess.sheetRes[k].kind === 'right').length;
  const other = sess.sheetRes._binomial;
  const last = sess.i === sess.items.length - 1;
  return `<div class="reveal-ok ${ok < skills.length ? 'partial' : ''}" role="status"><p class="eyebrow">${L('Hoja corregida', 'Sheet marked')}</p>
    <h2>${ok}/${skills.length} ${L('casillas correctas', 'boxes correct')}</h2><p class="small"><i>${esc(s.binomial)}</i> · ${esc(s.common_es)}</p>
    <p class="small">${L('En la hoja no hay ayudas: cada casilla cuenta para «dominada». Las falladas vuelven por separado.',
        'The sheet has no help: every box counts toward “mastered”. Missed boxes come back separately.')}</p></div>
    ${other && other.kind === 'wrong_species' ? `<h2 class="mt-lg">${L('Has escrito otra especie', 'You wrote a different species')}</h2>${comparePlate(other.with[0], it.sp, sess.photoIdx)}` : ''}
    ${App.nameKeyHTML(it.sp, skills.filter(k => sess.sheetRes[k].kind !== 'right'), other && other.kind === 'wrong_species' ? [other.with[0]] : [])}
    <div class="actions"><button class="btn primary big" id="nextbtn">${nextLabel(last)}</button>${App.cardLink(it.sp)}</div>`;
}
function levelCountNote() {
  if (sess.level === 3) return L('En Difícil: esta respuesta cuenta para «dominada».', 'On Hard: this answer counts toward “mastered”.');
  if (sess.level === 2 && sess.hints) return L(`Con ${sess.hints} ${sess.hints === 1 ? 'pista' : 'pistas'}: sube tu progreso, pero no cuenta para «dominada». Queda anotado.`, `With ${sess.hints} hint${sess.hints === 1 ? '' : 's'}: it raises your progress but doesn’t count toward “mastered”. This is recorded.`);
  return L(`En ${I.lvName(sess.level)}: cuenta como progreso. Para «dominada», acierta en Difícil.`, `On ${I.lvName(sess.level)}: counts as progress. For “mastered”, get it right on Hard.`);
}
function revealOK(it) {
  const s = App.sp(it.sp), last = sess.i === sess.items.length - 1;
  if (it.card) {
    return `<div class="reveal-ok" role="status"><p class="eyebrow">${L('¡Correcto!', 'Correct!')}</p>
      <div class="group-cmp mt">${groupBlock(it.node, 'correct', L('Lo que tienen en común', 'What they have in common'))}</div>
      <p class="small">${levelCountNote()}</p><p class="small">${clockIcon()} ${backIn(sess.outcome && sess.outcome.due, sess.outcome && sess.outcome.requeued)}.</p>
      <div class="row mt"><button class="btn primary grow" id="nextbtn">${nextLabel(last)}</button>${groupLink(it.node, '')}</div></div>`;
  }
  return `<div class="reveal-ok" role="status"><p class="eyebrow">${L('¡Correcto!', 'Correct!')}</p>
    <h2><i>${esc(s.binomial)}</i> · ${esc(s.common_es)}</h2><p class="small">${esc(s.class)} › ${esc(s.order)}</p>
    <p class="small">${levelCountNote()}</p>
    <p class="small">${clockIcon()} ${backIn(sess.outcome && sess.outcome.due, sess.outcome && sess.outcome.requeued)}.</p>
    <div class="row mt"><button class="btn primary grow" id="nextbtn">${nextLabel(last)}</button>${App.cardLink(it.sp, '')}</div></div>`;
}
function feedbackHTML(it) {
  const r = sess.res, s = App.sp(it.sp), ans = E.answerFor(M(), it.sp, it.skill), sci = it.skill !== 'common';
  const left = sess.items.length - sess.i - 1;
  const nextBtn = `<button class="btn primary big" id="nextbtn">${left <= 0 ? L('Ver resumen', 'See summary') : L(`Seguir · quedan ${left}`, `Continue · ${left} left`)}</button>`;
  const given = sess.mc ? (sess.picked != null ? sess.mc.options[sess.picked].value : '') : sess.typed.trim();
  const after = (extra) => `${calloutsHTML(sess.conf, sess.outcome && sess.outcome.due, sess.outcome && sess.outcome.requeued)}
    <div class="actions">${nextBtn}${it.card ? groupLink(it.node, 'big') : App.cardLink(it.sp)}${extra || ''}</div>`;
  if (r.kind === 'misspelling') {
    /* A misspelling shows only what she typed next to the correct spelling. No explanation. */
    return `<div role="alert">${App.mistakeHead(L('Ortografía', 'Spelling'), L('No es la grafía correcta', 'Not the right spelling'))}
      <section class="card mt">${diffRow(given, ans, sci)}</section>
      ${App.nameKeyHTML(it.sp, [it.skill])}${it.card ? groupGrid(true) : `<div class="quiz-photo narrow">${quizPhoto(it)}</div>`}${after()}</div>`;
  }
  if (r.kind === 'wrong_species' && r.with && App.sp(r.with[0])) {
    const verb = sess.mc ? L('Has elegido', 'You picked') : L('Has escrito', 'You wrote'), tree = E.lca(M(), r.with[0], it.sp) || it.sp;
    return `<div role="alert">${App.mistakeHead(L('Otra especie', 'Another species'), `${verb} ${sciWrap(sci, given)}; ${L('era', 'it was')} ${sciWrap(sci, ans)}`)}
      ${comparePlate(r.with[0], it.sp, sess.photoIdx)}${App.nameKeyHTML(it.sp, [it.skill], [r.with[0]])}
      ${after(`<a class="btn big" href="#${esc(App.routeFor(tree))}">${L('Comparar en el árbol', 'Compare in the tree')}</a>`)}</div>`;
  }
  const g = (M().content.groups || {})[`order:${s.order}`];
  const title = given ? `${L('Respondiste', 'You answered')} ${sciWrap(sci, given)}; ${L('es', 'it is')} ${sciWrap(sci, ans)}` : `${L('Es', 'It is')} ${sciWrap(sci, ans)}`;
  if (it.card) {
    const other = r.value && `${it.skill}:${r.value}` !== it.node ? `${it.skill}:${r.value}` : null;
    return `<div role="alert">${App.mistakeHead(L('Fallo', 'Miss'), title)}${groupGrid(true)}
      ${other ? groupCompare(other, it.node) : `<div class="group-cmp mt">${groupBlock(it.node, 'correct', L('Lo que tienen en común', 'What they have in common'))}</div>`}
      ${App.nameKeyHTML(it.sp, [it.skill], other ? [M().withPhotos.find(id => E.answerFor(M(), id, it.skill) === r.value)].filter(Boolean) : [], it.skill)}${after()}</div>`;
  }
  return `<div role="alert">${App.mistakeHead(L('Fallo', 'Miss'), title)}
    <div class="quiz-photo mt">${quizPhoto(it)}</div>
    <p><b>${esc(s.common_es)}</b> · <i>${esc(s.binomial)}</i> · ${esc(s.order)} · ${esc(s.class)}</p>
    ${App.nameKeyHTML(it.sp, [it.skill])}${g && g.contrast ? keyBox(I.t(g.contrast), g.status === 'draft') : ''}${after()}</div>`;
}
/* Session controls. "¿Cuál es?" shares the confidence buttons and the check button; route() tells them apart. */
const onCual = () => route() === 'cual-es';
App.on('click', '[data-opt]', b => { sess.picked = +b.dataset.opt; App.redraw(V.session, `[data-opt="${sess.picked}"]`); });
App.on('click', '[data-conf]', b => {
  const st = onCual() ? rsess : sess;
  st.conf = b.dataset.conf;
  App.redraw(onCual() ? V.cual : V.session, `[data-conf="${st.conf}"]`);
});
App.on('click', '#submitbtn', () => {
  if (onCual()) return checkReverse();
  if (sess.conf && (sess.phase === 'confidence' || sess.picked != null)) resolve(curItem());
});
App.on('submit', '#typedform', (f, e) => {
  e.preventDefault();
  sess.typed = document.getElementById('typedin').value;
  if (!sess.typed.trim()) return;
  sess.phase = 'confidence'; App.redraw(V.session, '[data-conf]');
});
App.on('click', '#hintbtn', () => {
  sess.typed = document.getElementById('typedin').value;
  sess.hints = Math.min(3, sess.hints + 1);
  App.redraw(V.session, '#typedin');
  const h = App.main().querySelector('.hints li:last-child > :last-child');
  if (h) document.getElementById('live').textContent = L('Pista', 'Hint') + ': ' + h.textContent;
});
App.on('click', '#dunno', () => { sess.typed = ''; sess.conf = 'guess'; resolve(curItem()); });
App.on('submit', '#sheetform', (f, e) => {
  e.preventDefault();
  f.querySelectorAll('[data-field]').forEach(i => { sess.sheet[i.dataset.field] = i.value; });
  sess.phase = 'confidence'; App.redraw(V.session, '[data-conf]');
});
App.on('click', '#nextbtn', () => next());
function judge(it) {
  if (mode() === 'mc') {
    const o = sess.mc.options[sess.picked];
    if (E.gradeKey(o.value) === E.gradeKey(sess.mc.correct)) return { kind: 'right' };
    return o.species && o.species !== it.sp ? { kind: 'wrong_species', with: [o.species], value: o.value } : { kind: 'wrong', value: o.value };
  }
  return E.classify(M(), sess.typed, it.sp, it.skill);
}
function resolve(it) {
  const now = Date.now();
  if (mode() === 'sheet') {
    sess.sheetRes = {};
    let requeue = false;
    App.skills().forEach(k => {
      const r = E.classify(M(), sess.sheet[k] || '', it.sp, k);
      sess.sheetRes[k] = r;
      Store.recordAnswer({ sp: it.sp, skill: k, level: 3, kind: r.kind, hints: 0, conf: sess.conf, game: 'hoja', typed: sess.sheet[k], with: r.with }, now);
      if (r.kind !== 'right') requeue = true;
    });
    const typedBin = `${(sess.sheet.genus || '').trim()} ${(sess.sheet.species || '').trim()}`.trim();
    if (typedBin) sess.sheetRes._binomial = E.classify(M(), typedBin, it.sp, 'binomial');
    sess.results.push({ sp: it.sp, skill: 'sheet', ok: App.skills().filter(k => sess.sheetRes[k].kind === 'right').length, of: App.skills().length });
    sess.res = { kind: requeue ? 'wrong' : 'right' };
  } else {
    sess.res = judge(it);
    const typed = mode() === 'mc' ? sess.mc.options[sess.picked].value : sess.typed;
    const rec = Store.recordAnswer({ sp: it.sp, skill: it.skill, level: sess.level, kind: sess.res.kind, hints: sess.hints, conf: sess.conf,
      game: it.card ? 'grupo' : 'foto', card: it.card, typed, with: sess.res.with }, now);
    let requeued = false;
    if ((sess.res.kind !== 'right' || sess.conf === 'guess') && (it.requeued || 0) < 2) {
      const at = Math.min(sess.items.length, sess.i + 1 + E.requeueGap());
      sess.items.splice(at, 0, Object.assign({}, it, { requeued: (it.requeued || 0) + 1 }));
      requeued = true;
    }
    sess.outcome = { due: rec.due, requeued };
    sess.results.push({ sp: it.sp, skill: it.skill, kind: sess.res.kind, node: it.card && it.node });
  }
  sess.phase = 'reveal';
  V.session();
  App.main().focus();
}
function next() {
  if (sess.i >= sess.items.length - 1) { finishSession(); location.hash = 'resumen'; return; }
  sess.i++; resetItem(); V.session(); App.main().focus(); window.scrollTo(0, 0);
}
function finishSession() {
  if (sess.done) return;
  sess.done = true;
  P().stats.sessions = (P().stats.sessions || 0) + 1;
  sess.newBadges = App.awardBadges();
  Store.save();
}
/* Stores newly earned (or upgraded) badges; earned badges are never removed. */
App.awardBadges = function () {
  const now = Date.now(), st = E.badgeStatus(M(), P(), App.skills(), now);
  const ids = E.newlyEarned(st, P().badges);
  ids.forEach(id => { P().badges[id] = { tier: st[id].tier, at: now }; });
  if (ids.length) Store.save();
  return ids;
};

/* ---------- SUMMARY ---------- */
V.resumen = function () {
  App.focusMode(false);
  if (!sess || !sess.results.length) { location.hash = 'hoy'; return; }
  if (!sess.done) finishSession();
  const res = sess.results, sheet = sess.game === 'hoja';
  const ok = sheet ? res.reduce((a, r) => a + r.ok, 0) : res.filter(r => r.kind === 'right').length;
  const of = sheet ? res.reduce((a, r) => a + r.of, 0) : res.length;
  const misses = sheet ? [] : res.filter(r => r.kind !== 'right');
  const st = E.streak(P().days, Date.now());
  App.main().innerHTML = `<p class="eyebrow">${L('Sesión terminada', 'Session complete')}</p><h1>${L('Hecho: racha salvada', 'Done: streak kept')}</h1>
  <div class="kpis mt-lg"><section class="card"><p class="eyebrow">${sheet ? L('Casillas correctas', 'Boxes correct') : L('Aciertos', 'Correct')}</p><div class="big-num">${ok}/${of}</div><p class="small">${App.lvDots(sess.level)}${I.lvName(sess.level)}</p></section>
    <section class="card"><p class="eyebrow">${L('Racha', 'Streak')}</p><div class="big-num gold">${st}</div><p class="small">${st === 1 ? L('día', 'day') : L('días', 'days')}</p></section></div>
  <div class="note-box">${sess.level === 3 ? L(`Tus ${ok} aciertos en Difícil cuentan para «dominada».`, `Your ${ok} correct answers on Hard count toward “mastered”.`) : L('Estos aciertos suben tu progreso. Para «dominada», repítelos en Difícil.',
      'These answers raise your progress. For “mastered”, repeat them on Hard.')}</div>
  ${sess.newBadges && sess.newBadges.length ? `<section class="card"><h2>${L('Insignia nueva', 'New badge')}</h2><div class="earned-list">${sess.newBadges.map(id => `<div class="item">${App.medalSVG(App.badgeText(id), 1, 44)}<b>${esc(App.badgeName(id))}</b></div>`).join('')}</div></section>` : ''}
  ${misses.length ? `<section class="card"><h2>${L('Para repasar', 'To review')}</h2><div class="thumbs">${misses.slice(0, 12).map(r => r.node
      ? `<a href="#${esc(App.routeFor(r.node))}" title="${esc(App.label(r.node))}">${App.tile(r.sp)}</a>` : `<a href="#${esc(App.routeFor(r.sp))}" title="${esc(App.spName(r.sp))}">${App.tile(r.sp)}</a>`).join('')}</div></section>` : ''}
  <div class="actions"><a class="btn primary big" href="#nivel">${L('Otra ronda', 'Another round')}</a><a class="btn big" href="#hoy">${L('Volver a Hoy', 'Back to Today')}</a></div><div id="aside-m"></div>`;
  App.aside().innerHTML = '';
};

/* ---------- ¿CUÁL ES? ---------- */
let rsess = null;
App.newReverse = function () {
  const now = Date.now(), lv = SET().level, scope = P().ui.scope && M().nodes[P().ui.scope] ? P().ui.scope : null;
  const items = E.buildReverse(M(), P(), { now, scope, size: 10 });
  rsess = { level: lv, items, i: 0, results: [], done: false };
  resetRev();
  return rsess;
};
App.reverseState = () => rsess;
function resetRev() {
  Object.assign(rsess, { phase: 'ask', picked: null, conf: null });
  const t = rsess.items[rsess.i];
  rsess.opts = t ? E.shuffle([t].concat(E.reverseDistractors(M(), t, rsess.level, M().withPhotos)), Math.random) : [];
  rsess.photo = {}; rsess.opts.forEach(o => { rsess.photo[o] = App.randomPhoto(o); });
}
V.cual = function () {
  App.focusMode(true);
  if (!rsess || !rsess.items.length) {
    App.main().innerHTML = `<div class="session-wrap">${sessTop(0, 0, 0)}<h1>${L('Faltan fotos', 'Not enough photos')}</h1><p>${L('Este juego necesita especies con foto.',
        'This game needs species with photos.')}</p><a class="btn" href="#hoy">${L('Volver a Hoy', 'Back to Today')}</a></div><div id="aside-m"></div>`;
    return;
  }
  const deck = rsess.items, t = deck[rsess.i], s = App.sp(t), opts = rsess.opts;
  const prog = (rsess.i + (rsess.phase === 'reveal' ? 1 : 0)) / deck.length;
  const locked = rsess.phase !== 'ask', rev = rsess.phase === 'reveal';
  const wrong = rev && rsess.picked !== t;
  const easy = rsess.level === 1, showCommon = easy && SET().revShowCommon;
  let body = `<div class="rev-prompt"><p class="eyebrow">${L('¿Cuál es?', 'Which one is it?')}</p><div class="binom">${esc(s.binomial)}</div>${showCommon || rev ? `<div class="vern">${esc(s.common_es)}</div>` : ''}
    ${easy && !rev ? `<label class="vern-toggle"><input type="checkbox" id="vernchk" ${SET().revShowCommon ? 'checked' : ''}> ${L('Mostrar el nombre vulgar (más fácil)',
        'Show the common name (easier)')}</label>` : ''}</div>
    <div class="row mb">${levelPill(rsess.level)}<span class="tiny muted">${revLevelDesc(rsess.level)}</span></div>`;
  if (!wrong) {
    body += `<div class="rev-grid" role="group" aria-label="${L('Elige la foto', 'Pick the photo')}">${opts.map((o, i) => {
      let cls = 'rev-opt'; if (rsess.picked === o) cls += ' picked'; if (rev && o === t) cls += ' right';
      /* Each option is a carousel: the arrows flip its photos, a tap anywhere else on the photo picks it. */
      const label = `${L('Foto', 'Photo')} ${i + 1}${rev ? ': ' + App.sp(o).binomial : ''}`;
      const pick = `<button type="button" class="rev-pick" data-pick="${esc(o)}" aria-pressed="${rsess.picked === o}" ${locked ? 'disabled' : ''}
        aria-label="${esc(L('Elegir', 'Pick') + ' · ' + label)}"></button><span class="n" aria-hidden="true">${i + 1}</span>`;
      const cap = rev ? `<span class="cap"><i>${esc(App.sp(o).binomial)}</i><br>${esc(App.sp(o).common_es)}</span>` : '';
      return `<div class="${cls}">${App.carousel(o, { key: `rev-${i}`, idx: rsess.photo[o], alt: label, inner: pick, credit: rev || undefined })}${cap}</div>`;
    }).join('')}</div>`;
  }
  if (rsess.phase === 'ask' && rsess.picked) body += confBlock(rsess.conf, true);
  const last = rsess.i === deck.length - 1;
  const nextBtn = `<button class="btn primary big" id="revnext">${last ? L('Terminar', 'Finish') : L('Siguiente', 'Next')}</button>`;
  if (rev && !wrong) body += `<div class="reveal-ok" role="status"><p class="eyebrow">${L('¡Correcto!', 'Correct!')}</p><h2><i>${esc(s.binomial)}</i> · ${esc(s.common_es)}</h2>
    <p class="small">${REV_NOTE()}</p><div class="actions">${nextBtn}${App.cardLink(t)}</div></div>`;
  if (wrong) {
    const p = rsess.picked, split = E.lca(M(), p, t), sameG = E.answerFor(M(), p, 'genus') === E.answerFor(M(), t, 'genus');
    const ep = x => esc(E.answerFor(M(), x, 'species'));
    const kin = sameG ? L(` y comparten el género <i>${esc(s.genus)}</i>. Mira la especie: <i>${ep(t)}</i>, no <i>${ep(p)}</i>.`,
      ` and share the genus <i>${esc(s.genus)}</i>. Look at the species: <i>${ep(t)}</i>, not <i>${ep(p)}</i>.`) : '.';
    body += `<div role="alert">${App.mistakeHead(L('Esa no era', 'Not that one'), `${L('Elegiste', 'You picked')} <i>${esc(App.sp(p).binomial)}</i>`)}
      ${comparePlate(p, t, rsess.photo[t], rsess.photo[p])}${App.nameKeyHTML(t, ['genus'], [p])}
      <div class="split-note">${ICON.tree}<span>${L('Parentesco', 'Kinship')}: ${L('las dos están en', 'both are in')} <b>${esc(App.label(split))}</b>${kin}
        ${L('Distancia en el árbol', 'Tree distance')}: ${E.treeDist(M(), p, t)} ${L('ramas', 'branches')}.</span></div>
      <div class="actions">${nextBtn}<a class="btn big" href="#${esc(App.routeFor(split))}">${L('Ver el grupo en el árbol', 'See the group in the tree')}</a></div></div>`;
  }
  App.main().innerHTML = `<div class="session-wrap">${sessTop(prog, deck.length, rsess.i)}${body}</div><div id="aside-m"></div>`;
  App.aside().innerHTML = App.DESK.matches ? revAside(true) : '';
  opts.forEach((o, i) => { App.carouselStep[`rev-${i}`] = k => { rsess.photo[o] = k; }; });
};
function checkReverse() {
  const t = rsess.items[rsess.i];
  if (!rsess.picked || !rsess.conf) return;
  rsess.phase = 'reveal';
  const right = rsess.picked === t;
  rsess.results.push(right);
  Store.recordReverse({ sp: t, level: rsess.level, kind: right ? 'right' : 'wrong_species', conf: rsess.conf, with: right ? null : rsess.picked });
  V.cual(); App.main().focus();
}
App.on('click', '[data-pick]', b => {
  if (Date.now() - (App.lastSwipe || 0) < 500) return;   // the tap that ends a swipe flips the photo, it doesn't pick
  rsess.picked = b.dataset.pick;
  App.redraw(V.cual, `[data-pick="${CSS.escape(rsess.picked)}"]`);
});
App.on('change', '#vernchk', c => { SET().revShowCommon = c.checked; Store.save(); App.redraw(V.cual, '#vernchk'); });
App.on('click', '#revnext', () => {
  if (rsess.i === rsess.items.length - 1) {
    if (!rsess.done) { rsess.done = true; P().stats.sessions = (P().stats.sessions || 0) + 1; App.awardBadges(); Store.save(); }
    location.hash = 'hoy'; return;
  }
  rsess.i++; resetRev(); V.cual(); window.scrollTo(0, 0); App.main().focus();
});

/* ---------- SIMULACRO (Mock VISU) ---------- */
let msess = null;
App.newMock = function () {
  const n = Math.min(SET().mockSize, M().withPhotos.length);
  msess = { id: 'mock-' + Date.now().toString(36), items: E.buildMock(M(), n).map(x => Object.assign(x, { photoIdx: App.randomPhoto(x.sp) })), i: 0, answers: [], startedAt: Date.now() };
  return msess;
};
App.mockState = () => msess;
/* The results show the last photo she looked at. */
App.carouselStep.mock = i => { const it = msess && msess.items[msess.i]; if (it) it.photoIdx = i; };
V.simulacro = function () {
  App.focusMode(true);
  if (!msess || !msess.items.length) {
    App.main().innerHTML = `<div class="session-wrap"><h1>${L('Faltan fotos', 'Not enough photos')}</h1><a class="btn" href="#hoy">${L('Volver a Hoy', 'Back to Today')}</a></div><div id="aside-m"></div>`;
    return;
  }
  const it = msess.items[msess.i], total = msess.items.length, last = msess.i === total - 1, skills = App.skills();
  App.main().innerHTML = `<div class="session-wrap">${sessTop(msess.i / total, total, msess.i)}
    <div class="row">${levelPill(3)}<span class="skillpill">${L('Simulacro', 'Mock VISU')}</span><span class="tiny muted">${L('Sin correcciones hasta el final.', 'No feedback until the end.')}</span></div>
    <div class="quiz-photo mt">${App.carousel(it.sp, { key: 'mock', alt: L('Foto del animal que hay que identificar',
        'Photo of the animal to identify'), idx: it.photoIdx })}</div>
    <form id="mockform" class="sheet" novalidate>${skills.map(k => `<div class="f"><label for="f-${k}">${I.sk(k)}</label>${fieldInput(k, '', false)}</div>`).join('')}
      <p class="rule">${L('Cuentan la ortografía y las tildes; las mayúsculas, no.', 'Spelling and accents count; capitals don’t.')}</p>
      <button class="btn primary big">${last ? L('Terminar y corregir', 'Finish and mark') : L('Siguiente', 'Next')}</button></form></div><div id="aside-m"></div>`;
  App.aside().innerHTML = App.DESK.matches ? `<section class="card"><p class="eyebrow">${L('Simulacro de VISU', 'Mock VISU')}</p><p class="small">${L('Como el examen: la hoja completa y ninguna ayuda. Puedes pasar las fotos del animal. La nota sale al final, sobre 10; con un 5 está superado.',
      'Like the exam: the full sheet and no help. You can flip through the animal’s photos. The mark comes at the end, out of 10; 5 is a pass.')}</p><p class="small">${L('Cada casilla cuenta como respuesta en Difícil.',
      'Every box counts as an answer on Hard.')}</p></section>` : '';
  const first = App.main().querySelector('#mockform input'); if (first && App.DESK.matches) first.focus({ preventScroll: true });
};
App.on('submit', '#mockform', (f, e) => {
  e.preventDefault();
  const it = msess.items[msess.i], typed = {}, ok = {}, now = Date.now();
  f.querySelectorAll('[data-field]').forEach(i => { typed[i.dataset.field] = i.value; });
  App.skills().forEach(k => {
    const r = E.classify(M(), typed[k] || '', it.sp, k);
    ok[k] = r.kind === 'right';
    Store.recordAnswer({ sp: it.sp, skill: k, level: 3, kind: r.kind, hints: 0, conf: null, game: 'mock', typed: typed[k], with: r.with }, now);
  });
  msess.answers.push({ sp: it.sp, typed, ok, ph: it.photoIdx });
  if (msess.i === msess.items.length - 1) { finishMock(); location.hash = 'simulacro-resultados'; return; }
  msess.i++; V.simulacro(); window.scrollTo(0, 0);
});
function finishMock() {
  const sc = E.mockScore(msess.answers);
  const rec = Object.assign({ id: msess.id, at: Date.now(), skills: App.skills(), items: msess.answers }, sc);
  P().mocks.push(rec);
  if (P().mocks.length > 20) P().mocks.splice(0, P().mocks.length - 20);
  P().stats.sessions = (P().stats.sessions || 0) + 1;
  msess.newBadges = App.awardBadges();
  Store.save();
  msess.done = true;
}
V.simulacroResultados = function () {
  App.focusMode(false);
  const mk = P().mocks[P().mocks.length - 1];
  if (!mk) {
    App.main().innerHTML = `<h1>${L('Aún no has hecho ningún simulacro', 'No mock yet')}</h1><a class="btn primary" href="#simulacro">${L('Hacer un simulacro', 'Take a mock')}</a><div id="aside-m"></div>`;
    return;
  }
  const score = m => esc(String(m.score10).replace('.', I.lang === 'es' ? ',' : '.'));
  const row = x => {
    const n = skills.filter(k => x.ok[k]).length, sp = App.sp(x.sp), ps = App.photosOf(x.sp);
    const miss = k => `<div class="diffrow"><span class="muted small">${I.sk(k)}</span><span class="diff ${sciSkill(k) ? 'sci' : ''}">${esc((x.typed[k] || '').trim()) || '—'}</span>
      <span class="muted small">${L('Correcto', 'Correct')}</span><span class="diff ${sciSkill(k) ? 'sci' : ''}">${esc(E.answerFor(M(), x.sp, k))}</span></div>`;
    return `<li class="${n === skills.length ? 'allok' : ''}"><a href="#${esc(App.routeFor(x.sp))}">${App.tile(x.sp, App.spName(x.sp), '', x.ph || 0)}</a>
      <div><p><b>${esc(sp ? sp.common_es : x.sp)}</b> · <i>${esc(sp ? sp.binomial : '')}</i> · ${n}/${skills.length}</p>
      ${skills.filter(k => !x.ok[k]).map(miss).join('')}${App.credit(ps[(x.ph || 0) % Math.max(1, ps.length)])}</div></li>`;
  };
  const skills = mk.skills || App.skills();
  const per = skills.map(k => [k, mk.items.filter(x => x.ok[k]).length / Math.max(1, mk.items.length)]);
  const newB = msess && msess.id === mk.id ? msess.newBadges || [] : [];
  App.main().innerHTML = `<p class="eyebrow">${L('Simulacro de VISU', 'Mock VISU')} · ${esc(I.fmtDate(mk.at))}</p>
    <h1>${mk.passed ? L('Simulacro superado', 'Mock passed') : L('Aún no: sigue practicando', 'Not yet: keep practising')}</h1>
    <div class="kpis mt-lg"><section class="card"><p class="eyebrow">${L('Nota', 'Mark')}</p><div class="big-num ${mk.passed ? '' : 'gold'}">${score(mk)}<span class="small">/10</span></div><p class="small">${esc(mk.ok)}/${esc(mk.total)} ${L('casillas correctas', 'boxes correct')}</p></section>
      <section class="card"><p class="eyebrow">${L('Por casilla', 'By box')}</p><div class="skillbars">${per.map(([k, v]) => `<span>${I.sk(k)}</span><div class="bar"><span style="width:${v * 100}%"></span></div><span class="tiny muted">${pct(v)}</span>`).join('')}</div></section></div>
    ${newB.length ? `<section class="card"><h2>${L('Insignia nueva', 'New badge')}</h2><div class="earned-list">${newB.map(id => `<div class="item">${App.medalSVG(App.badgeText(id), 1, 44)}<b>${esc(App.badgeName(id))}</b></div>`).join('')}</div></section>` : ''}
    <section class="card"><h2>${L('Tu hoja, foto a foto', 'Your sheet, photo by photo')}</h2>
      <ol class="mock-list">${mk.items.map(row).join('')}</ol></section>
    <div class="actions"><a class="btn primary big" href="#simulacro">${L('Otro simulacro', 'Another mock')}</a><a class="btn big" href="#hoy">${L('Volver a Hoy', 'Back to Today')}</a></div><div id="aside-m"></div>`;
  App.aside().innerHTML = App.DESK.matches ? `<section class="card"><p class="eyebrow">${L('Simulacros anteriores', 'Earlier mocks')}</p>${P().mocks.slice(-8).reverse().map(m => `<p class="small">${esc(I.fmtDate(m.at, { day: 'numeric', month: 'short' }))} · <b>${score(m)}</b>/10 ${m.passed ? '✓' : ''}</p>`).join('')}</section>` : '';
};
})();
