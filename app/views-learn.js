/* VISU · learning screens for animals not met yet: "Primer vistazo" (a first look at a group, nothing graded) and
   "¿Cuál sobra?" (the odd one out among four photos) and "¿Este o este?" (one photo, two look-alikes).
   Loaded after views-practice.js, whose shared pieces it reuses through App. */
(function () {
'use strict';
const I = window.VISU_I18N, E = window.VISU_ENGINE, Store = window.VISU_STORE, App = window.VISU_APP;
const L = I.L, esc = I.esc;
const V = App.views;
const M = () => App.M, P = () => Store.data, SET = () => Store.data.settings;

/* ---------- PRIMER VISTAZO ---------- */
/* A class shows one slide per order (a few of its species and what they share); any other group, one slide per
   species (its photos, names and first field marks). The route carries the group, so a reload keeps it. */
let look = null;
App.lookRoute = node => 'vistazo-' + App.routeFor(node).replace(/^grupo-/, '');
App.canLook = node => { const n = M().nodes[node]; return !!n && !App.sp(node) && (n.rank === 'class' ? orderSlides(node).length > 1 : E.scopePool(M(), node).length > 1 && n.rank !== 'clade'); };
const orderSlides = node => E.groupItems(M(), E.scopePool(M(), node), ['order']).map(g => g.node);
function slidesOf(node) { return M().nodes[node].rank === 'class' ? orderSlides(node) : E.scopePool(M(), node); }
/* What Today suggests: the order with the most species not seen yet (at least two with photos), skipping the
   orders whose first look was finished. */
const looked = () => P().ui.looked || [];
App.nextLook = function () {
  const unseen = id => !App.skills().some(k => P().cards[E.cardId(id, k)]);
  const best = E.groupItems(M(), M().withPhotos, ['order']).map(g => ({ node: g.node, n: g.members.filter(unseen).length, total: g.members.length }))
    .filter(g => g.total > 1 && g.n > 0 && !looked().includes(g.node) && App.canLook(g.node)).sort((a, b) => b.n - a.n)[0];
  return best || null;
};

function speciesSlide(id) {
  const s = App.sp(id), c = (M().content.species || {})[id], marks = c ? I.list(c.field_marks).slice(0, 3) : [];
  const es = (rank, v) => (App.esForm(rank, v) ? ` · ${esc(App.esForm(rank, v))}` : '');
  return `<div class="look-slide">${App.carousel(id, { key: 'look', credit: true })}
    <div class="look-text"><p class="kicker"><span>${esc(s.class)}${es('class', s.class)}</span><span>${esc(s.order)}${es('order', s.order)}</span></p>
      <h2 class="look-name">${esc(App.spName(id))}</h2><p class="binom"><i>${esc(s.binomial)}</i></p>
      ${marks.length ? `<ul class="small list-tight">${marks.map(t => `<li>${esc(t)}</li>`).join('')}</ul>${App.draftTag(c.status === 'draft')}` : ''}
      ${App.nameKeyHTML(id, ['genus'])}
      <p class="mt">${App.cardLink(id, '')}</p></div></div>`;
}
/* What an order's name says. Many orders (every fish and bird order of the vertebrate list, 69 of 99) are a typical genus + "-iformes"
   ("shaped like"), so the ending is shown apart: learn the genus and the order follows (Strix → Strigiformes). */
function orderName(val, g) {
  const m = /^(.+?)(iformes|formes)$/.exec(val), text = g && g.etymology ? I.t(g.etymology) : '';
  if (!m && !text) return '';
  return `<section class="name-key mt"><p class="eyebrow">${L('Qué dice el nombre', 'What the name says')}</p>
    <p><i>${m ? `${esc(m[1])}<b class="suffix">${esc(m[2])}</b>` : esc(val)}</i>${text ? `: ${esc(text)}` : ''}</p>
    ${m ? `<p class="small muted">${L('<b>-formes</b> es latín, «con forma de». Muchos órdenes se nombran así (en vertebrados, todos los de peces y aves): un género típico del grupo más <i>-iformes</i> (a veces cambia la raíz: <i>Strix</i> → <i>Strig</i>-). Si recuerdas el género, el orden sale casi solo.',
        '<b>-formes</b> is Latin for “shaped like”. Many orders are named this way (in vertebrates, every fish and bird order): a typical genus of the group plus <i>-iformes</i> (sometimes the stem changes: <i>Strix</i> → <i>Strig</i>-). Remember the genus and the order nearly follows.')}</p>` : ''}
    ${text && g.status === 'draft' ? `<p class="tiny muted">${App.draftTag(true)}</p>` : ''}</section>`;
}
function orderSlide(node) {
  const [rank, val] = node.split(':'), es = App.esForm(rank, val), g = (M().content.groups || {})[node];
  const sp = E.scopePool(M(), node), traits = g ? I.list(g.traits).slice(0, 4) : [];
  return `<div class="look-order"><p class="kicker"><span>${L('Orden', 'Order')}</span><span>${sp.length} ${sp.length === 1 ? L('especie', 'species') : L('especies', 'species')}</span></p>
    <h2 class="look-name"><i>${esc(val)}</i>${es ? ` · ${esc(es)}` : ''}</h2>
    <div class="rev-grid group-grid ${sp.length === 1 ? 'one' : ''}">${sp.slice(0, 4).map((id, i) => `<div class="rev-opt">${App.carousel(id, { key: `look-${i}`, credit: true })}
      <span class="cap"><a href="#${esc(App.routeFor(id))}">${esc(App.spName(id))}</a><br><i>${esc(App.sp(id).binomial)}</i></span></div>`).join('')}</div>
    ${traits.length ? `<p class="eyebrow mt">${L('Lo que tienen en común', 'What they have in common')}</p><ul class="small list-tight">${traits.map(t => `<li>${esc(t)}</li>`).join('')}</ul>${App.draftTag(g.status === 'draft')}` : ''}
    ${orderName(val, g)}
    <div class="row mt">${App.canLook(node) ? `<a class="btn compact" href="#${esc(App.lookRoute(node))}">${L('Primer vistazo de este orden', 'First look at this order')}</a>` : ''}
      <a class="btn compact" href="#${esc(App.routeFor(node))}">${L('Abrir el grupo', 'Open the group')}</a></div></div>`;
}
V.vistazo = function (node) {
  App.focusMode(true);
  if (!look || look.node !== node) look = { node, slides: slidesOf(node), i: 0, quiz: null, asked: {} };
  const { slides } = look, n = slides.length, end = look.i >= n, cls = M().nodes[node].rank === 'class';
  const name = `<i>${esc(M().nodes[node].scientific || node)}</i>${App.esForm(M().nodes[node].rank, M().nodes[node].scientific) ? ` · ${esc(App.esForm(M().nodes[node].rank, M().nodes[node].scientific))}` : ''}`;
  const nav = `<div class="row look-nav"><button class="btn" id="lookprev" ${look.i ? '' : 'disabled'}>‹ ${L('Anterior', 'Previous')}</button>
    <button class="btn primary grow" id="looknext">${look.i === n - 1 ? L('Terminar', 'Finish') : `${L('Siguiente', 'Next')} ›`}</button></div>`;
  const check = cls ? `<a class="btn primary big" href="#grupos" data-lookcheck="grupo">${L('¿Qué grupo es? Sus órdenes', 'Which group is it? Its orders')}</a>`
    : `<a class="btn primary big" href="#sesion" data-lookcheck="foto">${L('Comprobar en Fácil', 'Check yourself on Easy')}</a>`;
  const body = end ? `<section class="card"><h2>${L('Ya les has echado un vistazo', 'You’ve had a first look')}</h2>
      <p class="small">${cls ? L(`Has visto los ${n} órdenes. Ahora, a ver si los reconoces: varias fotos de un orden y tú dices cuál es.`, `You’ve seen its ${n} orders. Now see if you recognise them: several photos of an order, and you name it.`)
        : L(`Has visto sus ${n} especies. Ahora, una ronda en Fácil (opción múltiple) con ellas: sube tu progreso sin presión.`, `You’ve seen its ${n} species. Now a round on Easy (multiple choice) with them: it raises your progress without pressure.`)}</p>
      <div class="actions">${check}<button class="btn big" id="lookagain">${L('Verlo otra vez', 'See it again')}</button><a class="btn big" href="#${esc(App.routeFor(node))}">${L('Abrir el grupo', 'Open the group')}</a></div></section>`
    : look.quiz ? quizHTML(look.quiz) : `${cls ? orderSlide(slides[look.i]) : speciesSlide(slides[look.i])}${nav}`;
  App.main().innerHTML = `<div class="session-wrap">${App.sessTop(Math.min(look.i, n) / n, n, Math.min(look.i, n - 1), App.routeFor(node))}
    <p class="eyebrow">${L('Primer vistazo', 'First look')} · ${cls ? L('sus órdenes', 'its orders') : L('sus especies', 'its species')}</p><h1>${name}</h1>
    <p class="small muted">${L(`Sin notas: mira y lee, y pasa las fotos de cada animal. Cada ${QUIZ_EVERY}, una pausa para ver si lo recuerdas.`, `No marks: look and read, and flip through each animal’s photos. Every ${QUIZ_EVERY}, a pause to see if you remember.`)}</p>
    ${body}</div><div id="aside-m"></div>`;
  App.aside().innerHTML = '';
};
/* Every few slides, a pause: which of the last ones was this? Naming what she has just seen teaches more than
   looking alone (Tanaka et al. 2005). Nothing is graded or saved; a miss shows the right one and allows one more try. */
const QUIZ_EVERY = 4;
function makeQuiz(chunk) {
  const cls = M().nodes[look.node].rank === 'class';
  const opts = chunk.map(x => ({ key: x, sp: cls ? E.shuffle(E.scopePool(M(), x), Math.random)[0] : x })).filter(o => o.sp);
  if (opts.length < 2) return null;
  const q = { cls, target: opts[Math.floor(Math.random() * opts.length)].key, picked: null, phase: 'ask', retried: false };
  return reshuffle(q, opts);
}
function reshuffle(q, opts) {
  q.opts = E.shuffle(opts.slice(), Math.random); q.photo = {};
  q.opts.forEach(o => { q.photo[o.sp] = App.randomPhoto(o.sp); });
  return q;
}
function quizHTML(q) {
  const shown = q.phase !== 'ask', right = q.picked === q.target;
  const what = q.cls ? L(`¿Cuál de estos es un <i>${esc(q.target.split(':')[1])}</i>?`, `Which of these is one of the <i>${esc(q.target.split(':')[1])}</i>?`)
    : L(`¿Cuál era ${esc(App.spName(q.target))} (<i>${esc(App.sp(q.target).binomial)}</i>)?`, `Which one was ${esc(App.spName(q.target))} (<i>${esc(App.sp(q.target).binomial)}</i>)?`);
  const grid = `<div class="rev-grid" role="group" aria-label="${L('Elige la foto', 'Pick the photo')}">${q.opts.map((o, i) => {
    let cls = 'rev-opt'; if (q.picked === o.key) cls += ' picked'; if (shown && o.key === q.target) cls += ' right'; else if (shown && q.picked === o.key) cls += ' wrong';
    const label = `${L('Foto', 'Photo')} ${i + 1}`;
    const pick = `<button type="button" class="rev-pick" data-lqpick="${esc(o.key)}" aria-pressed="${q.picked === o.key}" ${shown ? 'disabled' : ''} aria-label="${esc(L('Elegir', 'Pick') + ' · ' + label)}"></button><span class="n" aria-hidden="true">${i + 1}</span>`;
    const cap = shown ? `<span class="cap">${q.cls ? `<i>${esc(o.key.split(':')[1])}</i><br>` : ''}${esc(App.spName(o.sp))}</span>` : '';
    return `<div class="${cls}">${App.carousel(o.sp, { key: `lq-${i}`, idx: q.photo[o.sp], alt: label, inner: pick, credit: shown || undefined })}${cap}</div>`;
  }).join('')}</div>`;
  const bar = !shown ? `<div class="answer-space" aria-hidden="true"></div><div class="conf answer-bar"><button class="btn primary big grow" id="lqcheck" ${q.picked ? '' : 'disabled'}>${L('Comprobar', 'Check')}</button></div>`
    : `<div class="answer-space" aria-hidden="true"></div><div class="reveal-ok answer-bar ${right ? '' : 'partial'}" role="status"><p class="eyebrow">${right ? L('¡Eso es!', 'That’s it!') : L('Era la marcada en verde', 'It was the one marked in green')}</p>
      <div class="row mt">${!right && !q.retried ? `<button class="btn primary grow" id="lqagain">${L('Probar otra vez', 'Try again')}</button>` : ''}<button class="btn ${right || q.retried ? 'primary grow' : ''}" id="lqnext">${L('Seguir', 'Continue')} ›</button></div></div>`;
  return `<section class="look-quiz"><p class="eyebrow">${L('Pausa: ¿lo recuerdas?', 'Pause: do you remember?')}</p><h2>${what}</h2>
    <p class="small muted">${L('Sin nota: solo para fijarlo. Las fotos pueden ser otras que las que viste.', 'No marks: just to make it stick. The photos may differ from the ones you saw.')}</p>${grid}${bar}</section>`;
}
App.on('click', '[data-lqpick]', b => { if (Date.now() - (App.lastSwipe || 0) < 500) return; look.quiz.picked = b.dataset.lqpick; App.redraw(() => V.vistazo(look.node), `[data-lqpick="${CSS.escape(look.quiz.picked)}"]`); });
App.on('click', '#lqcheck', () => { if (!look.quiz.picked) return; look.quiz.phase = 'shown'; V.vistazo(look.node); });
App.on('click', '#lqagain', () => { const q = look.quiz; Object.assign(q, { phase: 'ask', picked: null, retried: true }); reshuffle(q, q.opts); V.vistazo(look.node); window.scrollTo(0, 0); });
App.on('click', '#lqnext', () => { look.quiz = null; step(1); });
const step = d => {
  const at = look.i + 1;
  if (d > 0 && !look.quiz && at % QUIZ_EVERY === 0 && !look.asked[at]) {   // after every QUIZ_EVERY-th slide, before moving on
    look.asked[at] = true;
    look.quiz = makeQuiz(look.slides.slice(at - QUIZ_EVERY, at));
    if (look.quiz) { V.vistazo(look.node); App.main().focus(); window.scrollTo(0, 0); return; }
  }
  look.i = Math.max(0, Math.min(look.slides.length, look.i + d));
  if (look.i === look.slides.length && !looked().includes(look.node)) { P().ui.looked = looked().concat(look.node); Store.save(); }
  V.vistazo(look.node); App.main().focus(); window.scrollTo(0, 0);
};
App.on('click', '#lookprev', () => step(-1));
App.on('click', '#looknext', () => step(1));
App.on('click', '#lookagain', () => { Object.assign(look, { i: 0, quiz: null, asked: {} }); V.vistazo(look.node); });
/* The check is one round on this group only: the saved practice group and level stay as they were. */
App.on('click', '[data-lookcheck]', b => { App.onceSession = { scope: look.node, level: b.dataset.lookcheck === 'foto' ? 1 : null }; });
App.lookState = () => look;

/* ---------- ¿CUÁL SOBRA? ---------- */
/* Pick the photo that is not of the same order as the other three. Practice only: it counts as a study day. */
let odd = null;
const oddLevelDesc = k => ({
  1: L('La que sobra es de otra clase.', 'The odd one is from another class.'),
  2: L('La que sobra es de la misma clase, pero de otro orden.', 'The odd one is from the same class, but another order.'),
  3: L('La que sobra es el pariente más cercano de otro orden.', 'The odd one is the closest relative from another order.')
}[k]);
App.newOdd = function (level) {
  const lv = level || SET().level, scope = P().ui.scope && M().nodes[P().ui.scope] ? P().ui.scope : null;
  const items = E.buildOddOne(M(), { level: lv, scope, size: 10 });
  odd = { level: lv, items: items.length ? items : E.buildOddOne(M(), { level: lv, size: 10 }), i: 0, ok: 0 };
  resetOdd();
  return odd;
};
App.oddState = () => odd;
function resetOdd() {
  const q = odd.items[odd.i];
  Object.assign(odd, { picked: null, phase: 'ask', photo: {} });
  if (q) q.opts.forEach(o => { odd.photo[o] = App.randomPhoto(o); });
}
const orderOf = id => `order:${App.sp(id).order}`;
V.sobra = function () {
  App.focusMode(true);
  const q = odd.items[odd.i], n = odd.items.length;
  if (!q) {
    App.main().innerHTML = `<div class="session-wrap">${App.sessTop(1, n, n - 1)}<p class="eyebrow">${L('¿Cuál sobra?', 'Odd one out')}</p>
      <h1>${n ? `${odd.ok}/${n} ${L('aciertos', 'correct')}` : L('No hay órdenes con tres especies con foto aquí', 'No order here has three species with photos')}</h1>
      <div class="actions"><button class="btn primary big" id="oddagain">${L('Otra ronda', 'Another round')}</button><a class="btn big" href="#hoy">${L('Volver a Hoy', 'Back to Today')}</a></div></div><div id="aside-m"></div>`;
    App.aside().innerHTML = '';
    return;
  }
  const rev = odd.phase === 'reveal', right = rev && odd.picked === q.odd;
  const levels = `<div class="row mb" role="group" aria-label="${L('Nivel', 'Level')}">${[1, 2, 3].map(k => `<button class="btn compact" data-oddlevel="${k}" aria-pressed="${odd.level === k}">${App.lvDots(k)}${I.lvName(k)}</button>`).join('')}</div>`;
  const grid = `<div class="rev-grid" role="group" aria-label="${L('Elige la que sobra', 'Pick the odd one')}">${q.opts.map((o, i) => {
    let cls = 'rev-opt'; if (odd.picked === o) cls += ' picked'; if (rev && o === q.odd) cls += ' right';
    const label = `${L('Foto', 'Photo')} ${i + 1}${rev ? ': ' + App.sp(o).binomial : ''}`;
    const pick = `<button type="button" class="rev-pick" data-oddpick="${esc(o)}" aria-pressed="${odd.picked === o}" ${rev ? 'disabled' : ''} aria-label="${esc(L('Elegir', 'Pick') + ' · ' + label)}"></button><span class="n" aria-hidden="true">${i + 1}</span>`;
    const cap = rev ? `<span class="cap"><a href="#${esc(App.routeFor(o))}">${esc(App.spName(o))}</a><br><i>${esc(App.sp(o).order)}</i></span>` : '';
    return `<div class="${cls}">${App.carousel(o, { key: `odd-${i}`, idx: odd.photo[o], alt: label, inner: pick, credit: rev || undefined })}${cap}</div>`;
  }).join('')}</div>${rev ? '' : App.creditLater()}`;
  const oo = orderOf(q.odd), last = odd.i === n - 1;
  const result = !rev ? `<button class="btn primary big mt" id="oddcheck" ${odd.picked ? '' : 'disabled'}>${L('Comprobar', 'Check')}</button>`
    : `<div class="mt" ${right ? 'role="status"' : 'role="alert"'}>${right ? '<div class="reveal-ok">' : ''}${right ? `<p class="eyebrow">${L('¡Correcto!', 'Correct!')}</p></div>` : App.mistakeHead(L('Esa no sobraba', 'That one belonged'),
        `${esc(App.spName(odd.picked))} ${L('es de', 'is in')} <i>${esc(App.sp(odd.picked).order)}</i>, ${L('como otras dos', 'like two others')}`)}
      <p>${L('Sobraba', 'The odd one was')} <b>${esc(App.spName(q.odd))}</b>, ${L('de', 'in')} <i>${esc(App.sp(q.odd).order)}</i>${App.sp(q.odd).class !== App.sp(q.three[0]).class ? ` (${L('clase', 'class')} <i>${esc(App.sp(q.odd).class)}</i>)` : ''}.</p>
      ${App.groupCompare(oo, q.node, [L('La que sobra', 'The odd one'), L('Las otras tres', 'The other three')])}
      <div class="actions"><button class="btn primary big" id="oddnext">${last ? L('Ver resultado', 'See result') : L('Siguiente', 'Next')}</button></div></div>`;
  App.main().innerHTML = `<div class="session-wrap">${App.sessTop((odd.i + (rev ? 1 : 0)) / n, n, odd.i)}
    <p class="eyebrow">${L('¿Cuál sobra?', 'Odd one out')}</p><h1 class="prompt">${L('Tres son del mismo orden. ¿Cuál no?', 'Three are from the same order. Which one isn’t?')}</h1>
    ${levels}<p class="tiny muted">${oddLevelDesc(odd.level)} ${L('No programa repasos: es para fijarse en lo que comparte cada orden.', 'It schedules no reviews: it trains what each order shares.')}</p>
    ${grid}${result}</div><div id="aside-m"></div>`;
  App.aside().innerHTML = '';
  q.opts.forEach((o, i) => { App.carouselStep[`odd-${i}`] = k => { odd.photo[o] = k; }; });
};
App.on('click', '[data-oddpick]', b => {
  if (Date.now() - (App.lastSwipe || 0) < 500) return;   // the tap that ends a swipe flips the photo, it doesn't pick
  odd.picked = b.dataset.oddpick;
  App.redraw(V.sobra, `[data-oddpick="${CSS.escape(odd.picked)}"]`);
});
App.on('click', '#oddcheck', () => {
  if (!odd.picked) return;
  odd.phase = 'reveal';
  if (odd.picked === odd.items[odd.i].odd) odd.ok++;
  Store.recordDay();
  V.sobra(); App.main().focus();
});
App.on('click', '#oddnext', () => { odd.i++; resetOdd(); V.sobra(); App.main().focus(); window.scrollTo(0, 0); });
App.on('click', '#oddagain', () => { App.newOdd(odd.level); V.sobra(); });
App.on('click', '[data-oddlevel]', b => { SET().level = +b.dataset.oddlevel; Store.save(); App.newOdd(SET().level); App.redraw(V.sobra, `[data-oddlevel="${SET().level}"]`); });

/* ---------- ¿ESTE O ESTE? ---------- */
/* One photo and the two species of a pair; the answer always shows them side by side, part by part. A miss comes
   back three cards later, once. Practice only: logged so a pair can be settled, nothing scheduled. */
let pairs = null;
App.newPairs = function () {
  pairs = { items: E.buildPairs(M(), P(), { size: 10 }), i: 0, ok: 0, settled: 0 };
  resetPair();
  return pairs;
};
App.pairState = () => pairs;
function resetPair() {
  const p = pairs.items[pairs.i];
  Object.assign(pairs, { picked: null, phase: 'ask' });
  if (p) { pairs.photo = App.randomPhoto(p.show); pairs.order = Math.random() < 0.5 ? [p.a, p.b] : [p.b, p.a]; }
}
V.parejas = function () {
  App.focusMode(true);
  const p = pairs.items[pairs.i], n = pairs.items.length;
  if (!p) {
    const open = E.openConfusions(M(), P()).length;
    App.main().innerHTML = `<div class="session-wrap">${App.sessTop(1, n, n - 1)}<p class="eyebrow">${L('¿Este o este?', 'This one or that one?')}</p>
      <h1>${n ? `${pairs.ok}/${n} ${L('aciertos', 'correct')}` : L('No hay parejas que practicar', 'No pairs to practise')}</h1>
      <p class="small">${open === 1 ? L('Te queda 1 confusión abierta. Una pareja se da por resuelta tras tres aciertos seguidos aquí.', '1 open confusion left. A pair is settled after three right answers in a row here.')
        : open ? L(`Te quedan ${open} confusiones abiertas. Una pareja se da por resuelta tras tres aciertos seguidos aquí.`, `${open} open confusions left. A pair is settled after three right answers in a row here.`)
        : L('No te queda ninguna confusión abierta.', 'No open confusions left.')}</p>
      <div class="actions"><button class="btn primary big" id="pairagain">${L('Otra ronda', 'Another round')}</button><a class="btn big" href="#hoy">${L('Volver a Hoy', 'Back to Today')}</a></div></div><div id="aside-m"></div>`;
    App.aside().innerHTML = '';
    return;
  }
  const rev = pairs.phase === 'reveal', other = p.show === p.a ? p.b : p.a, right = rev && pairs.picked === p.show;
  const opt = id => {
    let cls = 'opt'; if (pairs.picked === id) cls += ' picked'; if (rev) { if (id === p.show) cls += ' right'; else if (pairs.picked === id) cls += ' wrong'; }
    return `<button class="${cls}" data-pairpick="${esc(id)}" aria-pressed="${pairs.picked === id}" ${rev ? 'disabled' : ''}>${esc(App.spName(id))} · <i>${esc(App.sp(id).binomial)}</i></button>`;
  };
  const result = !rev ? `<button class="btn primary big mt" id="paircheck" ${pairs.picked ? '' : 'disabled'}>${L('Comprobar', 'Check')}</button>`
    : `<div class="mt" ${right ? 'role="status"' : 'role="alert"'}>${right ? `<div class="reveal-ok"><p class="eyebrow">${L('¡Correcto!', 'Correct!')}</p><h2>${esc(App.spName(p.show))}</h2></div>`
        : App.mistakeHead(L('Era la otra', 'It was the other one'), `${L('Es', 'It is')} ${esc(App.spName(p.show))}, ${L('no', 'not')} ${esc(App.spName(other))}`)}
      ${App.comparePlate(other, p.show, pairs.photo, undefined, right ? [L('La otra', 'The other one'), L('Esta foto', 'This photo')] : undefined)}
      <div class="actions"><button class="btn primary big" id="pairnext">${pairs.i === n - 1 ? L('Ver resultado', 'See result') : L('Siguiente', 'Next')}</button></div></div>`;
  App.main().innerHTML = `<div class="session-wrap">${App.sessTop((pairs.i + (rev ? 1 : 0)) / n, n, pairs.i)}
    <p class="eyebrow">${L('¿Este o este?', 'This one or that one?')}${p.mine ? ` · <span class="gold">${L('una confusión tuya', 'one of your confusions')}</span>` : ''}</p>
    ${rev ? '' : `<div class="quiz-photo">${App.carousel(p.show, { key: 'pair', idx: pairs.photo, alt: L('Foto del animal', 'Photo of the animal'), credit: 'later' })}</div>`}
    <p class="prompt">${L('¿Cuál de las dos es?', 'Which of the two is it?')}</p>
    <div class="options" role="group" aria-label="${L('Opciones', 'Options')}">${pairs.order.map(opt).join('')}</div>${result}</div><div id="aside-m"></div>`;
  App.aside().innerHTML = '';
};
App.carouselStep.pair = i => { pairs.photo = i; };
App.on('click', '[data-pairpick]', b => { pairs.picked = b.dataset.pairpick; App.redraw(V.parejas, `[data-pairpick="${CSS.escape(pairs.picked)}"]`); });
App.on('click', '#paircheck', () => {
  const p = pairs.items[pairs.i];
  if (!pairs.picked) return;
  const right = pairs.picked === p.show;
  pairs.phase = 'reveal';
  if (right) pairs.ok++;
  else if (!p.requeued) pairs.items.splice(Math.min(pairs.items.length, pairs.i + 4), 0, Object.assign({}, p, { requeued: true, show: Math.random() < 0.5 ? p.a : p.b }));
  Store.recordPair({ shown: p.show, other: p.show === p.a ? p.b : p.a, right });
  V.parejas(); App.main().focus();
});
App.on('click', '#pairnext', () => { pairs.i++; resetPair(); V.parejas(); App.main().focus(); window.scrollTo(0, 0); });
App.on('click', '#pairagain', () => { App.newPairs(); V.parejas(); });
})();
