/* VISU · learning screens for animals not met yet: "Primer vistazo" (a first look at a group, nothing graded).
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
/* What Today suggests: the order with the most species not seen yet (at least two with photos). */
App.nextLook = function () {
  const unseen = id => !App.skills().some(k => P().cards[E.cardId(id, k)]);
  const best = E.groupItems(M(), M().withPhotos, ['order']).map(g => ({ node: g.node, n: g.members.filter(unseen).length, total: g.members.length }))
    .filter(g => g.total > 1 && g.n > 0 && App.canLook(g.node)).sort((a, b) => b.n - a.n)[0];
  return best || null;
};

function speciesSlide(id) {
  const s = App.sp(id), c = (M().content.species || {})[id], marks = c ? I.list(c.field_marks).slice(0, 3) : [];
  const es = (rank, v) => (App.esForm(rank, v) ? ` · ${esc(App.esForm(rank, v))}` : '');
  return `<div class="look-slide">${App.carousel(id, { key: 'look', credit: true })}
    <div class="look-text"><p class="kicker"><span>${esc(s.class)}${es('class', s.class)}</span><span>${esc(s.order)}${es('order', s.order)}</span></p>
      <h2 class="look-name">${esc(App.spName(id))}</h2><p class="binom"><i>${esc(s.binomial)}</i></p>
      ${marks.length ? `<ul class="small list-tight">${marks.map(t => `<li>${esc(t)}</li>`).join('')}</ul>${App.draftTag(c.status === 'draft')}` : ''}
      <p class="mt">${App.cardLink(id, '')}</p></div></div>`;
}
function orderSlide(node) {
  const [rank, val] = node.split(':'), es = App.esForm(rank, val), g = (M().content.groups || {})[node];
  const sp = E.scopePool(M(), node), traits = g ? I.list(g.traits).slice(0, 4) : [];
  return `<div class="look-order"><p class="kicker"><span>${L('Orden', 'Order')}</span><span>${sp.length} ${sp.length === 1 ? L('especie', 'species') : L('especies', 'species')}</span></p>
    <h2 class="look-name"><i>${esc(val)}</i>${es ? ` · ${esc(es)}` : ''}</h2>
    <div class="rev-grid group-grid ${sp.length === 1 ? 'one' : ''}">${sp.slice(0, 4).map((id, i) => `<div class="rev-opt">${App.carousel(id, { key: `look-${i}`, credit: true })}
      <span class="cap"><a href="#${esc(App.routeFor(id))}">${esc(App.spName(id))}</a><br><i>${esc(App.sp(id).binomial)}</i></span></div>`).join('')}</div>
    ${traits.length ? `<p class="eyebrow mt">${L('Lo que tienen en común', 'What they have in common')}</p><ul class="small list-tight">${traits.map(t => `<li>${esc(t)}</li>`).join('')}</ul>${App.draftTag(g.status === 'draft')}` : ''}
    <div class="row mt">${App.canLook(node) ? `<a class="btn compact" href="#${esc(App.lookRoute(node))}">${L('Primer vistazo de este orden', 'First look at this order')}</a>` : ''}
      <a class="btn compact" href="#${esc(App.routeFor(node))}">${L('Abrir el grupo', 'Open the group')}</a></div></div>`;
}
V.vistazo = function (node) {
  App.focusMode(true);
  if (!look || look.node !== node) look = { node, slides: slidesOf(node), i: 0 };
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
    : `${cls ? orderSlide(slides[look.i]) : speciesSlide(slides[look.i])}${nav}`;
  App.main().innerHTML = `<div class="session-wrap">${App.sessTop(Math.min(look.i, n) / n, n, Math.min(look.i, n - 1), App.routeFor(node))}
    <p class="eyebrow">${L('Primer vistazo', 'First look')} · ${cls ? L('sus órdenes', 'its orders') : L('sus especies', 'its species')}</p><h1>${name}</h1>
    <p class="small muted">${L('Sin preguntas ni notas: solo mirar y leer. Pasa las fotos de cada animal.', 'No questions, no marks: just look and read. Flip through each animal’s photos.')}</p>
    ${body}</div><div id="aside-m"></div>`;
  App.aside().innerHTML = '';
};
const step = d => { look.i = Math.max(0, Math.min(look.slides.length, look.i + d)); V.vistazo(look.node); App.main().focus(); window.scrollTo(0, 0); };
App.on('click', '#lookprev', () => step(-1));
App.on('click', '#looknext', () => step(1));
App.on('click', '#lookagain', () => { look.i = 0; V.vistazo(look.node); });
App.on('click', '[data-lookcheck]', b => { P().ui.scope = look.node; if (b.dataset.lookcheck === 'foto') SET().level = 1; else SET().game = 'grupo'; Store.save(); });
App.lookState = () => look;
})();
