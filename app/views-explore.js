/* VISU · Explorar (progressive-disclosure tree), species and group cards, badges. */
(function () {
'use strict';
const I = window.VISU_I18N, E = window.VISU_ENGINE, Store = window.VISU_STORE, App = window.VISU_APP;
const L = I.L, esc = I.esc, pct = I.pct;
const V = App.views;
const M = () => App.M, P = () => Store.data, UI = () => Store.data.ui;

const groupOf = id => E.groupStats(M(), P(), id, App.skills(), Date.now());
const rowMeter = id => (App.sp(id) ? App.statsOf(id).meter : groupOf(id).meter);
const tag = (cls, text) => `<span class="tag ${cls}">${text}</span>`;

/* ---------- tree ---------- */
function rankTag(id) {
  const n = M().nodes[id];
  if (n.rank === 'class') return n.virtual ? tag('grade', `${L('clase', 'class')} · ${L('grado', 'grade')}`) : tag('teacher', L('clase', 'class'));
  if (n.rank === 'order' || n.rank === 'infraorder') {
    return App.isGradeNode(id) ? tag('grade', `${I.rankName(n.rank)} · Reptilia*`) : tag('teacher', I.rankName(n.rank));
  }
  return App.holdsGrade(id) ? tag('grade', `${L('incluye', 'holds')} Reptilia*`) : '';
}
function trow(id, kind) {
  const n = M().nodes[id], isSp = !!App.sp(id);
  const g = isSp ? null : groupOf(id), meter = rowMeter(id), vern = App.nodeName(id);
  const lab = isSp ? `<b>${esc(App.spName(id))}</b><span class="sub"><i>${esc(App.sp(id).binomial)}</i></span>`
    : `<b>${esc(n.scientific || id)}</b>${vern && vern !== n.scientific ? `<span class="alt">${esc(vern)}</span>` : ''}${rankTag(id)}`;
  const aria = `${App.label(id)} · ${isSp ? pct(meter) : `${g.mastered} ${L('de', 'of')} ${g.total} ${L('dominadas', 'mastered')}`}`;
  return `<a class="trow ${kind} ${App.isGradeNode(id) && !isSp ? 'grade' : ''}" href="#${esc(App.routeFor(id))}" data-row="${esc(id)}"
    ${kind === 'sel' ? 'aria-current="true"' : ''} ${isSp ? '' : `aria-expanded="${kind !== 'kid'}"`} aria-label="${esc(aria)}">
    <span class="chev" aria-hidden="true">${isSp ? '' : kind === 'kid' ? '▸' : '▾'}</span>${App.ring(meter)}<span class="lab">${lab}</span>
    <span class="cnt" aria-hidden="true">${isSp ? pct(meter) : `${g.mastered}/${g.total}`}</span></a>`;
}
/* Study mode starts at the list's classes, each the root of its own tree, so the eye goes to what sets
   groups apart rather than to the deep path above them. Nodes above the classes show the classes alone. */
const studyMode = () => !!UI().studyTree;
function treeHTML(sel) {
  const study = studyMode(), roots = M().classRoots || [];
  const path = study ? E.studyPath(M(), sel) || [] : E.pathTo(M(), sel);
  const kids = ((M().nodes[sel] && M().nodes[sel].children) || []).filter(c => M().nodes[c] || App.sp(c));
  const items = !UI().showMid && path.length > 6
    ? [{ id: path[0] }, { mid: path.slice(1, path.length - 5) }].concat(path.slice(-5).map(id => ({ id })))
    : path.map(id => ({ id }));
  const nest = k => {
    const it = items[k];
    if (!it) return '';
    if (it.mid) {
      return `<li><button class="tmid" data-mid aria-expanded="false">⋯ <span><b>${it.mid.length} ${L('niveles intermedios', 'levels in between')}</b>
        · ${esc(App.label(it.mid[0]))} › … › ${esc(App.label(it.mid[it.mid.length - 1]))}</span></button><ul>${nest(k + 1)}</ul></li>`;
    }
    if (it.id !== sel) return `<li>${trow(it.id, 'anc')}<ul>${nest(k + 1)}</ul></li>`;
    const jump = App.sp(sel) ? L('Ver la ficha ↓', 'See the card ↓') : L('Ver la ficha del grupo ↓', 'See the group card ↓');
    return `<li>${trow(sel, 'sel')}<button class="jump-card linkbtn" data-jump>${jump}</button>
      ${kids.length ? `<ul>${kids.map(c => `<li>${trow(c, 'kid')}</li>`).join('')}</ul>` : ''}</li>`;
  };
  const fold = UI().showMid && path.length > 6
    ? `<button class="tmid" data-mid aria-expanded="true">▴ ${L('Plegar los niveles intermedios', 'Fold the levels in between')}</button>` : '';
  if (study) {
    const top = roots.map(r => (path[0] === r ? nest(0) : `<li>${trow(r, 'kid')}</li>`)).join('');
    return `${fold}<p class="tiny muted study-note">${L(`Las ${roots.length} clases de la lista, cada una como raíz de su propio árbol.`,
      `The list’s ${roots.length} classes, each the root of its own tree.`)}</p><ul>${top}</ul>`;
  }
  const deep = M().deepPath.filter(d => d && (d.scientific || d.es)), dn = d => I.t(d) || d.scientific;
  const deepBtn = !deep.length ? '' : `<button class="tdeep" data-deep aria-expanded="${!!UI().showDeep}">${UI().showDeep ? '▾' : '▸'}
    <span><b>${L('Camino profundo', 'Deep path')}</b> · ${esc(dn(deep[0]))} › … › ${esc(dn(deep[deep.length - 1]))} (${deep.length} ${L('niveles', 'levels')})</span></button>
    ${UI().showDeep ? `<ol class="deep-list">${deep.map(d => `<li><i>${esc(d.scientific || '')}</i> · ${esc(dn(d))}</li>`).join('')}</ol>` : ''}`;
  return `${deepBtn}${fold}<ul>${nest(0)}</ul>`;
}
const cardHost = () => document.getElementById(App.DESK.matches ? 'card-d' : 'card-m');
V.explore = function (id, fromClick) {
  App.focusMode(false);
  if (!M().nodes[id] && !App.sp(id)) id = M().root;
  UI().exploreSel = id; Store.save();
  document.getElementById('app').classList.add('explore');
  const mode = (v, label) => `<button data-treemode="${v}" aria-pressed="${studyMode() === (v === 'study')}">${label}</button>`;
  const legend = [[0, L('sin ver', 'unseen')], [0.5, L('progreso', 'progress')], [1, L('dominada', 'mastered')]].map(([v, t]) => `<span>${App.ring(v)} ${t}</span>`).join('')
    + (Object.values(M().nodes).some(n => n.grade) ? `<span><span class="hatchkey"></span>${L('Reptilia* del temario: un grado, no un clado', 'Syllabus Reptilia*: a grade, not a clade')}</span>` : '');
  App.main().innerHTML = `<div class="tree-wrap"><p class="eyebrow">${L('Explorar', 'Explore')}</p><h1>${L('El árbol, rama a rama', 'The tree, one branch at a time')}</h1>
    <p class="small muted">${L('Ves el camino hasta tu selección y un nivel por debajo. Toca un grupo para abrirlo; toca uno de arriba para volver.',
        'You see the path to your selection and one level below it. Tap a group to open it; tap one above to go back.')}</p>
    <div class="seg tree-mode" role="group" aria-label="${L('Vista del árbol', 'Tree view')}">${mode('study', L('Modo estudio: por clases', 'Study mode: by class'))}${mode('full', L('Árbol completo', 'Full tree'))}</div>
    <nav class="tree" aria-label="${L('Árbol filogenético', 'Phylogenetic tree')}" id="tree">${treeHTML(id)}</nav>
    <div class="tree-legend">${legend}</div>
    ${P().log.length ? '' : `<p class="tiny muted">${L('Todo empieza a cero: los anillos se llenan a medida que practicas.',
        'Everything starts at zero: the rings fill up as you practise.')}</p>`}</div><div id="card-m" class="card-host" tabindex="-1"></div>`;
  App.aside().innerHTML = App.DESK.matches ? '<div class="card-host" id="card-d" tabindex="-1"></div>' : '';
  const host = cardHost();
  const back = App.returnTo ? `<a class="btn primary back-to-practice" href="#${esc(App.returnTo)}">← ${L('Volver a la práctica', 'Back to practice')}</a>` : '';
  host.innerHTML = back + (App.sp(id) ? speciesCard(id) : groupCard(id));
  if (back && !App.DESK.matches) host.scrollIntoView({ block: 'start' });   // on a phone the card is below the tree
  if (fromClick) {
    const r = document.querySelector('#tree .trow.sel'); if (r) r.focus({ preventScroll: true });
    if (App.DESK.matches) App.aside().scrollTop = 0;
  }
};
const reExplore = focusSel => App.redraw(() => V.explore(UI().exploreSel), focusSel);
App.on('click', '[data-treemode]', b => { UI().studyTree = b.dataset.treemode === 'study'; Store.save(); reExplore(`[data-treemode="${b.dataset.treemode}"]`); });
App.on('click', '[data-mid]', () => { UI().showMid = !UI().showMid; Store.save(); reExplore('#tree [data-mid]'); });
App.on('click', '[data-deep]', () => { UI().showDeep = !UI().showDeep; Store.save(); reExplore('#tree [data-deep]'); });
App.on('click', '[data-jump]', () => {
  const host = cardHost();
  host.scrollIntoView({ behavior: App.REDUCED.matches ? 'auto' : 'smooth' }); host.focus({ preventScroll: true });
});

/* ---------- citations: one numbering per card ---------- */
function citer() {
  const order = [];
  App.citeReg = {};
  const num = (key, src) => { let i = order.indexOf(key); if (i < 0) { order.push(key); App.citeReg[key] = src; i = order.length - 1; } return i + 1; };
  const btn = (key, src) => `<button class="cite" type="button" data-src="${esc(key)}" aria-label="${L('Fuente', 'Source')} ${num(key, src)}: ${esc(src.title || key)}">${num(key, src)}</button>`;
  const ref = k => {
    const r = App.citeReg[k];
    return `<li id="ref-${esc(k)}"><b>${esc(r.title || k)}</b>.${r.license ? ` ${L('Licencia', 'Licence')}: ${esc(r.license)}.` : ''}
      ${r.retrieved ? ` ${L('Consultado', 'Retrieved')}: ${esc(r.retrieved)}.` : ''} ${I.url(r.url) ? App.extLink(r.url, esc(r.url)) : ''}</li>`;
  };
  return {
    order,
    bestiary: ids => (ids || []).filter(s => M().sources[s]).map(s => btn('b-' + s, M().sources[s])).join(''),
    content: (sid, list) => (list || []).map((s, i) => (s && (s.title || s.url) ? btn(`c-${sid}-${i}`, s) : '')).join(''),
    refs: () => `<ol>${order.map(ref).join('')}</ol>`
  };
}

/* ---------- cards ---------- */
function exam5(id) {
  const box = k => {
    const v = E.answerFor(M(), id, k), es = k === 'class' || k === 'order' ? App.esForm(k, v) : '';
    return `<div><span>${I.sk(k)}</span><b class="${k === 'genus' || k === 'species' ? 'sci' : ''}">${esc(v)}</b>${es ? `<small class="es-form">${esc(es)}</small>` : ''}</div>`;
  };
  return `<div class="exam5" role="group" aria-label="${L('Las cinco casillas del examen', 'The five exam boxes')}">${E.SKILLS.map(box).join('')}</div>`;
}
function gradeBand(id) {
  if (!(App.isGradeNode(id) || App.holdsGrade(id))) return '';
  return `<div class="grade-band"><b>Reptilia* · ${L('grado parafilético', 'paraphyletic grade')}</b><br>${L('La lista agrupa Squamata, Sphenodontia, Chelonia y Crocodylia como clase Reptilia. No es un clado: los cocodrilos están más cerca de las aves que de los lagartos. En el examen escribe «Reptilia»; el árbol muestra dónde están de verdad.',
      'The list groups Squamata, Sphenodontia, Chelonia and Crocodylia as class Reptilia. It is not a clade: crocodiles are closer to birds than to lizards. Write “Reptilia” in the exam; the tree shows where they really sit.')}</div>`;
}
const YT_ID = [/[?&]v=([\w-]{6,})/, /youtu\.be\/([\w-]{6,})/, /youtube\.com\/(?:embed|shorts)\/([\w-]{6,})/];
function videoBox(id) {
  const v = App.sp(id).video;
  if (!v || !I.url(v.url) || v.status === 'broken') return '';
  /* YouTube refuses embeds that don't say which site they're on (error 153). A downloaded copy opened as a
     file has no site address to send, so there the video only opens on YouTube. */
  const yt = v.status !== 'link_only' && location.protocol !== 'file:' ? YT_ID.map(r => (v.url.match(r) || [])[1]).find(Boolean) : null;
  const start = (v.url.match(/[?&]t=(\d+)/) || [])[1];
  const host = (() => { try { return new URL(v.url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } })();
  const channel = v.channel ? App.extLink(v.channel_url, esc(v.channel)) : '';
  const play = yt ? `<p class="small">${L('El vídeo está en YouTube. No se carga nada hasta que pulses el botón; al pulsarlo, tu navegador se conecta con YouTube y le dice la dirección de esta web (no la de la ficha), que YouTube exige para reproducirlo.',
        'The video is on YouTube. Nothing loads until you press the button; when you do, your browser connects to YouTube and tells it this site’s address (not the card’s), which YouTube requires to play it.')}</p>
    <div class="row"><button class="btn primary" data-video="${esc(yt)}" data-start="${esc(start || '')}">${L('Cargar el vídeo de YouTube', 'Load the YouTube video')}</button>
      ${App.extLink(v.url, L('Abrir en YouTube ↗', 'Open on YouTube ↗'), 'btn')}</div>`
    : `<p class="small">${L('Este vídeo no se puede ver dentro de esta web; se abre en', 'This video can’t play inside this site; it opens on')}${host ? ` ${esc(host)}` : ''}.</p>
    ${App.extLink(v.url, L('Abrir el vídeo ↗', 'Open the video ↗'), 'btn')}`;
  return `<h2 class="sec">${L('Vídeo', 'Video')}</h2><div class="video-box">${play}
    <p class="tiny muted">${v.title ? `«${esc(v.title)}»` : L('Vídeo', 'Video')}${channel ? `, ${L('de', 'by')} ${channel}` : ''}${v.checked ? ` · ${L('enlace comprobado el', 'link checked on')} ${esc(v.checked)}` : ''}.</p></div>`;
}
App.on('click', '[data-video]', b => {
  const st = b.dataset.start ? `&start=${encodeURIComponent(b.dataset.start)}` : '';
  b.closest('.video-box').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.video)}?autoplay=1${st}" title="${L('Vídeo', 'Video')}"
    allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
});
App.on('click', '[data-practise]', b => { P().ui.scope = b.dataset.practise; Store.save(); location.hash = 'nivel'; });
App.on('click', '[data-groupgame]', b => { P().ui.scope = b.dataset.groupgame; P().settings.game = 'grupo'; Store.save(); location.hash = 'grupos'; });

const FIELD_LABEL = { class: ['Clase', 'Class'], order: ['Orden', 'Order'], genus: ['Género', 'Genus'], species: ['Especie', 'Species'], epithet: ['Especie', 'Species'],
  common: ['Nombre vulgar', 'Common name'], common_es: ['Nombre vulgar', 'Common name'], binomial: ['Nombre científico', 'Scientific name'] };
function correctionsHTML(list) {
  if (!Array.isArray(list) || !list.length) return '';
  const conf = { certain: L('segura', 'certain'), suggested: L('sugerida', 'suggested'), contested: L('discutida', 'contested') };
  /* A 'course' note: another collection's course writes this differently. The answer stays the shared one,
     so the card says which one the tool accepts instead of telling the student what to write. */
  const item = c => {
    const field = `<b>${esc(FIELD_LABEL[c.field] ? L(...FIELD_LABEL[c.field]) : c.field)}</b>`, was = esc(c.bestiary_value), now = esc(c.suggested_value);
    const course = c.confidence === 'course', where = esc(App.collectionName(c.collection));
    const head = course ? `${field}: ${L(`en el curso de «${where}» se escribe`, `the “${where}” course writes`)} <b>${now}</b>`
      : `${field}: ${L('el bestiario dice', 'the bestiary says')} <b>${was}</b>; ${L('autoridad actual', 'current authority')}: <b>${now}</b>${c.confidence ? ` ${tag('', esc(conf[c.confidence] || c.confidence))}` : ''}`;
    const rule = course ? L(`Esta herramienta acepta «${was}», la respuesta común a todas las colecciones.`, `This tool accepts “${was}”, the answer shared by every collection.`)
      : L('En el examen se escribe lo que dice el bestiario.', 'In the exam, write what the bestiary says.');
    return `<div class="correction"><p>${head}</p>${c.note && I.t(c.note) ? `<p class="small">${esc(I.t(c.note))}</p>` : ''}
      <p class="tiny muted">${rule} ${I.url(c.source_url) ? App.extLink(c.source_url, L('Fuente ↗', 'Source ↗')) : ''}</p></div>`;
  };
  return `<section class="corrections"><h2 class="sec">${L('Notas sobre el bestiario', 'Notes on the bestiary')}</h2>${list.map(item).join('')}</section>`;
}
/* "Report an error": a prefilled GitHub issue. A plain link: nothing is sent until she submits it on GitHub. */
function reportLink(id) {
  const n = M().nodes[id] || {}, title = `${L('Error en la ficha', 'Error on the card')}: ${n.scientific || id} (${App.collection()})`;
  const body = L(`Ficha: ${id}\nColección: ${App.collection()}\n\n¿Qué está mal y qué debería decir? Si puedes, añade una fuente.\n`,
    `Card: ${id}\nCollection: ${App.collection()}\n\nWhat is wrong, and what should it say? Add a source if you can.\n`);
  const url = `${I.REPO_URL}/issues/new?labels=${encodeURIComponent('ficha')}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  return `<p class="tiny muted report-error">${L('¿Has visto un error en esta ficha? Sobre todo en los textos marcados como «borrador», que aún no ha revisado una persona.',
      'Spotted an error on this card? Especially in texts marked “draft”, which no person has checked yet.')} ${App.extLink(url, L('Avísanos en GitHub ↗', 'Tell us on GitHub ↗'))}</p>`;
}
/* The gallery remembers each species' photo; its thumbnails jump the photo widget, which keeps them in step. */
const galleryIdx = {};
function figureHTML(id) {
  const ps = App.photosOf(id), idx = Math.min(galleryIdx[id] || 0, Math.max(0, ps.length - 1));
  const thumb = (p, i) => `<button type="button" class="gthumb" data-gal="${i}" aria-pressed="${i === idx}" aria-label="${L('Foto', 'Photo')} ${i + 1}">${App.tile(id, '', '', i)}</button>`;
  return `<figure class="pinfig" id="gal-${esc(id)}">${App.carousel(id, { key: 'gal', idx, credit: true })}
    ${ps.length > 1 ? `<div class="gallery" role="group" aria-label="${L('Más fotos', 'More photos')}">${ps.map(thumb).join('')}</div>` : ''}</figure>`;
}
App.carouselStep.gal = (i, car) => {
  galleryIdx[car.dataset.sp] = i;
  car.closest('figure').querySelectorAll('[data-gal]').forEach(t => t.setAttribute('aria-pressed', String(+t.dataset.gal === i)));
};
App.on('click', '[data-gal]', b => App.carouselShow(b.closest('figure').querySelector('.car'), +b.dataset.gal));

function iucnCode(f) { const v = String((f && (f.es || f.en || f.value)) || '').trim().toUpperCase(); return I.IUCN[v] ? v : null; }
const iucnText = c => `${L('UICN', 'IUCN')}: ${L(...I.IUCN[c])}`;
function factValue(f) {
  const c = f.field === 'iucn' && iucnCode(f);
  return c ? `<span class="iucn">${c}</span>${L(...I.IUCN[c])}` : esc(I.t(f));
}
/* "What the name says": class, order and scientific name, each with its etymology, as memory aids. */
function namesHTML(id, cite) {
  const rows = [['class', L('Clase', 'Class')], ['order', L('Orden', 'Order')], ['genus', L('Género y especie', 'Genus and species')]]
    .map(([k, lab]) => [lab, App.nameMeaning(id, k)]).filter(r => r[1]);
  if (!rows.length) return '';
  const row = ([lab, m]) => `<dt>${lab} <i>${esc(m.name)}</i>${m.es ? `<span class="es-form">${L('en español', 'in Spanish')}: ${esc(m.es)}</span>` : ''}</dt>
    <dd>${m.text ? esc(m.text) + cite.content(m.key, m.sources) : ''}</dd>`;
  return `<h2 class="sec">${L('Qué dice el nombre', 'What the name says')} ${App.draftTag(rows.some(r => r[1].draft))}</h2>
    <dl class="names-dl">${rows.map(row).join('')}</dl>`;
}
function speciesCard(id) {
  const s = App.sp(id), c = (M().content.species || {})[id] || null, cite = citer();
  const draft = App.draftTag(c && c.status === 'draft');
  const facts = (Array.isArray(s.facts) ? s.facts : []).filter(f => f && Array.isArray(f.src) && f.src.length && (f.es || f.en));
  const iu = iucnCode(facts.find(f => f.field === 'iucn')), es = facts.find(f => f.field === 'spain');
  const st = App.statsOf(id), other = I.lang === 'es' ? s.common_en : s.common_es;
  const withEs = (rank, v, shown) => `${shown}${App.esForm(rank, v) ? ` · ${esc(App.esForm(rank, v))}` : ''}`;
  const kicker = `<p class="kicker"><span>${L('Clase', 'Class')} ${withEs('class', s.class, App.isGradeNode(id) ? '<span class="gr">Reptilia*</span>' : esc(s.class))}</span>
    <span>${L('Orden', 'Order')} ${withEs('order', s.order, esc(s.order))}</span>${s.infraorder ? `<span>${esc(s.infraorder)}</span>` : ''}${s.family ? `<span>${esc(s.family)}</span>` : ''}</p>`;
  const head = `${kicker}<h1 class="ptitle" tabindex="-1">${esc(App.spName(id))}</h1>
    <p class="binom"><i>${esc(s.binomial)}</i>${s.authority ? ` <span class="auth">${esc(s.authority)}</span>` : ''}</p>
    ${other && other !== App.spName(id) ? `<p class="alt">${I.lang === 'es' ? 'EN' : 'ES'}: ${esc(other)}</p>` : ''}${exam5(id)}`;
  const status = `<div class="status-row">${iu ? `<span class="stat"><span class="iucn ${iu}">${iu}</span>${iucnText(iu)}</span>` : ''}${es ? `<span class="stat">${esc(I.t(es))}</span>` : ''}
    <span class="stat">${App.ring(st.meter, 18)} ${L('Progreso', 'Progress')} ${pct(st.meter)}${st.mastered ? ' · ' + L('dominada', 'mastered') : ''}</span>
    ${App.hasPhoto(id) ? `<button class="btn compact" data-practise="${esc(id)}">${L('Practicar', 'Practise')}</button>` : ''}</div>`;
  const fact = f => `<dt>${esc(I.fieldName(f.field))}</dt><dd>${factValue(f)}${cite.bestiary(f.src)}${f.note ? `<span class="tiny muted"> · ${esc(I.t(f.note))}</span>` : ''}</dd>`;
  const factsHTML = facts.length ? `<section class="facts"><h2 class="sec first">${L('Datos', 'Facts')}</h2><dl>${facts.map(fact).join('')}</dl></section>` : '';
  let body = `<div class="entry-grid ${factsHTML ? 'has-facts' : ''}"><div>${figureHTML(id)}</div>${factsHTML}</div>${namesHTML(id, cite)}`;
  if (c) {
    const cs = cite.content(id, c.sources), marks = I.list(c.field_marks), triv = I.list(c.trivia);
    const look = Array.isArray(c.lookalikes) ? c.lookalikes.filter(x => x && x.binomial) : [];
    const lookItem = x => {
      const cid = M().order.find(k => App.sp(k).binomial === x.binomial), href = cid && `#${esc(App.routeFor(cid))}`;
      const pic = cid ? `<a href="${href}">${App.tile(cid, App.spName(cid))}</a>`
        : `<span class="tile"><span class="ph"><span>${esc(x.binomial.charAt(0))}.<small>${L('fuera del bestiario', 'not in the bestiary')}</small></span></span></span>`;
      return `<div class="conf-item">${pic}<div><p><b>${cid ? `<a href="${href}">${esc(App.spName(cid))}</a> · ` : ''}<i>${esc(x.binomial)}</i></b></p><p>${esc(I.t(x))}</p></div></div>`;
    };
    if (marks.length) body += `<h2 class="sec">${L('Rasgos de campo', 'Field marks')}${cs} ${draft}</h2>
      <ol class="marks">${marks.map((x, i) => `<li><span class="num">${i + 1}</span><span>${esc(x)}</span></li>`).join('')}</ol>`;
    if (look.length) body += `<h2 class="sec">${L('Con qué se confunde', 'Look-alikes')}${cs}</h2><div class="conf-list">${look.map(lookItem).join('')}</div>`;
    if (c.dimorphism && I.t(c.dimorphism)) body += `<h2 class="sec">${L('Dimorfismo sexual', 'Sexual dimorphism')}${cs}</h2><p class="etym">${esc(I.t(c.dimorphism))}</p>`;
    if (triv.length) body += `<h2 class="sec">${L('Curiosidades', 'Trivia')}${cs}</h2><ul class="small">${triv.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  } else {
    body += `<div class="pending"><h3>${L('Ficha en preparación', 'Card in preparation')}</h3><p class="small">${L('Los rasgos de campo, las especies con que se confunde y la etimología de esta especie aún no están escritos. Ya puedes practicar sus cinco casillas.',
        'This species’ field marks, look-alikes and etymology aren’t written yet. You can already practise its five boxes.')}</p></div>`;
  }
  const photoRef = p => `<li class="photo-ref"><b>${L('Fotografía', 'Photograph')}</b>: ${esc(p.author || '')}${p.license ? `, ${App.extLink(p.license_url, esc(p.license))}` : ''}.
    ${I.url(p.source_url) ? App.extLink(p.source_url, `${esc(App.sourceName(p))} ↗`) : ''}</li>`;
  const photoRefs = App.photosOf(id).map(photoRef).join('');
  return `<article class="plate">${head}${status}${draft && !c.field_marks ? `<p>${draft}</p>` : ''}${gradeBand(id)}${correctionsHTML(s.corrections)}${body}${videoBox(id)}
    <h2 class="sec">${L('Tus cinco casillas', 'Your five boxes')}</h2>${App.skillBars([id])}<p class="tiny muted">${I.MASTERY_RULE()}</p>
    <section class="refs"><h2 class="sec">${L('Referencias', 'References')}</h2>${cite.order.length ? cite.refs() : ''}${photoRefs ? `<ol>${photoRefs}</ol>` : ''}
    <p class="tiny muted">${L('Clase, orden, nombre científico y nombre vulgar', 'Class, order, scientific and common name')}:
      ${L('lista de la colección', 'the collection’s list')} «${esc(App.collectionName(App.collection()))}»${M().bestiary.edition ? ` (${esc(M().bestiary.edition)})` : ''}.</p>
    ${reportLink(id)}</section></article>`;
}
const hasBadge = id => { const n = M().nodes[id]; return n.rank === 'class' || (n.rank === 'order' && E.speciesUnder(M(), id).length >= 3); };
function plateFig(s, k) {
  return `<a href="#${esc(App.routeFor(s))}">${App.tile(s, App.spName(s))}<span class="figno">Fig. ${k}</span><span class="v">${esc(App.spName(s))}</span>
    <span class="b">${esc(App.sp(s).binomial)}</span><span class="m"><span style="width:${App.statsOf(s).meter * 100}%"></span></span></a>`;
}
function groupCard(id) {
  const n = M().nodes[id], g = (M().content.groups || {})[id] || null, sp = E.speciesUnder(M(), id), gs = groupOf(id), cite = citer();
  const cls = App.isGradeNode(id) ? '<span class="gr">Reptilia*</span>' : esc(App.sp(sp[0]) ? App.sp(sp[0]).class : '');
  const rk = { clade: L('Clado', 'Clade'), class: L('Clase (temario)', 'Class (syllabus)'), infraorder: L('Infraorden (temario)', 'Infraorder (syllabus)') }[n.rank]
    || `${L('Orden (temario)', 'Order (syllabus)')} · ${L('clase', 'class')} ${cls}`;
  const badge = hasBadge(id), earned = P().badges[id], prog = n.rank === 'class' ? Math.min(1, gs.G / 0.8) : gs.G;
  const vern = App.nodeName(id), draft = App.draftTag(g && g.status === 'draft'), cs = g ? cite.content(id, g.sources) : '';
  const traits = g ? I.list(g.traits) : [], contrast = g && g.contrast && I.t(g.contrast);
  let h = `<article class="plate"><p class="kicker"><span>${rk}</span><span>${sp.length} ${L('especies del bestiario', 'bestiary species')}</span>
      <span>${sp.filter(App.hasPhoto).length} ${L('con foto', 'with photo')}</span></p>
    <h1 class="ptitle" tabindex="-1">${esc(n.scientific || id)}</h1>${vern && vern !== n.scientific ? `<p class="alt lg">${esc(vern)}</p>` : ''}${gradeBand(id)}
    ${g && g.summary && I.t(g.summary) ? `<p class="etym mt">${esc(I.t(g.summary))}${cs} ${draft}</p>` : ''}
    ${g && g.etymology && I.t(g.etymology) ? `<div class="name-key"><p class="eyebrow">${L('Qué dice el nombre', 'What the name says')}</p><p>${esc(I.t(g.etymology))}${cs}</p></div>` : ''}
    <div class="mast-box">${badge ? App.medalSVG(n.scientific, earned ? 1 : prog, 64, { earned: !!earned }) : App.ring(gs.meter, 56)}<div><div class="pctn">${pct(gs.meter)}</div>
      <p class="small tight">${gs.mastered} ${L('de', 'of')} ${gs.total} ${L('especies dominadas', 'species mastered')}</p>
      ${badge ? `<p class="small tight"><b>${L('Insignia', 'Badge')}:</b> ${esc(App.badgeName(id))} · ${earned ? L('conseguida', 'earned') : pct(prog)}</p>` : ''}
      ${n.rank === 'class' || n.rank === 'order' ? `<p class="small tight"><b>${L('Reconocer el grupo', 'Recognising the group')}:</b> ${pct(E.cardMeter(P().cards[E.groupCardId(id)], Date.now()))}</p>` : ''}
      ${sp.some(App.hasPhoto) ? `<button class="btn primary practise-btn" data-practise="${esc(id)}">${L('Practicar este grupo', 'Practise this group')}</button>` : ''}
      ${E.groupItems(M(), E.scopePool(M(), id), App.skills()).length > 1 ? `<button class="btn practise-btn" data-groupgame="${esc(id)}">${L('¿Qué grupo es? Sus órdenes', 'Which group is it? Its orders')}</button>` : ''}</div></div>
    ${App.skillBars(sp)}`;
  if (traits.length || contrast) {
    h += `<h2 class="sec">${L('Rasgos diagnósticos', 'Diagnostic traits')}${cs} ${draft}</h2>
      ${traits.length ? `<ol class="callist">${traits.map((t, i) => `<li><span class="num">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>` : ''}
      ${contrast ? `<div class="contrast"><b>${L('No confundir con', 'Do not confuse with')}</b><p>${esc(contrast)}</p></div>` : ''}`;
  } else if (!g) {
    h += `<div class="pending"><h3>${L('Resumen en preparación', 'Summary in preparation')}</h3><p class="small">${L('El resumen, los rasgos diagnósticos y «no confundir con» de este grupo aún no están escritos.',
        'This group’s summary, diagnostic traits and “do not confuse with” aren’t written yet.')}</p></div>`;
  }
  h += `<h2 class="sec">${L('Lámina: todas las especies', 'Plate: every species')} <span class="tiny muted count">${sp.length}</span></h2>`;
  if (n.rank === 'order' || n.rank === 'infraorder' || sp.length <= 12) h += `<div class="plates">${sp.map((s, i) => plateFig(s, i + 1)).join('')}</div>`;
  else {
    /* Larger groups: one plate per order, numbered continuously. */
    let k = 0;
    const groups = [];
    (function walk(x) { const nx = M().nodes[x]; if (!nx) return; if (nx.rank === 'order' || App.sp(x)) groups.push(x); else (nx.children || []).forEach(walk); })(id);
    groups.forEach(o => {
      const os = E.speciesUnder(M(), o);
      h += `<div class="order-h"><h3><a href="#${esc(App.routeFor(o))}">${esc(App.label(o))}</a></h3>${App.sp(o) ? '' : rankTag(o)}<span class="tiny muted">${os.length} · ${pct(rowMeter(o))}</span></div>
        <div class="plates">${os.map(s => plateFig(s, ++k)).join('')}</div>`;
    });
  }
  h += `<p class="tiny muted mt-lg">${L('Las miniaturas muestran la foto entera, sin recortar.', 'Thumbnails show the whole photo, uncropped.')}</p>`;
  h += `<section class="refs">${cite.order.length ? `<h2 class="sec">${L('Referencias', 'References')}</h2>${cite.refs()}` : ''}${reportLink(id)}</section>`;
  return h + '</article>';
}

/* ---------- BADGES ---------- */
const HABIT = { 'habit:first_page': ['Primera página', 'First page', 'I'], 'habit:streak7': ['Racha de 7 días', '7-day streak', '7'], 'mock:passed': ['Simulacro superado', 'Mock passed', '5/10'] };
App.badgeName = id => {
  const n = M().nodes[id];
  if (n) return n.rank === 'class' ? L(`Clase ${n.scientific}`, `Class ${n.scientific}`) : L(`Dominio de ${n.scientific}`, `Mastery of ${n.scientific}`);
  return HABIT[id] ? L(HABIT[id][0], HABIT[id][1]) : id;
};
App.badgeText = id => { const n = M().nodes[id]; return n ? n.scientific : HABIT[id] ? HABIT[id][2] : '★'; };
const TIER_NAME = { bronze: ['bronce', 'bronze'], silver: ['plata', 'silver'], gold: ['oro', 'gold'] }, TIER_RANK = { bronze: 1, silver: 2, gold: 3 };
V.insignias = function () {
  App.focusMode(false);
  App.awardBadges();
  const st = E.badgeStatus(M(), P(), App.skills(), Date.now()), earned = P().badges, all = Object.values(st);
  const next = all.filter(b => !earned[b.def.id]).sort((a, b) => b.progress - a.progress).slice(0, 3);
  const desc = b => ({
    class: L('Bronce al dominar el 80 % de sus especies, plata al 90 % y oro al 100 %.', 'Bronze at 80% of its species mastered, silver at 90% and gold at 100%.'),
    order: L('Domina todas sus especies.', 'Master all its species.'),
    'habit:first_page': L('Termina tu primera sesión.', 'Finish your first session.'),
    'habit:streak7': L('Estudia 7 días seguidos (un comodín por semana).', 'Study 7 days in a row (one freeze a week).'),
    'mock:passed': L('Saca un 5 o más en un simulacro.', 'Score 5 or more in a mock.')
  })[b.def.node ? b.def.kind : b.def.id];
  const medal = b => {
    const e = earned[b.def.id], stale = e && (!b.tier || TIER_RANK[b.tier] < TIER_RANK[e.tier]);
    const href = b.def.node ? `#${esc(App.routeFor(b.def.node))}` : b.def.id === 'mock:passed' ? '#simulacro' : '#hoy';
    const state = e ? `${L('conseguida', 'earned')}${e.tier && b.def.kind === 'class' ? ' · ' + L(...TIER_NAME[e.tier]) : ''}${stale ? ' · ' + L('pide repaso', 'needs review') : ''}` : pct(b.progress);
    return `<a class="medal" href="${href}">${App.medalSVG(App.badgeText(b.def.id), e ? 1 : b.progress, 76, { earned: !!e, stale })}
      <div class="nm">${esc(App.badgeName(b.def.id))}${b.def.node && App.isGradeNode(b.def.node) ? '*' : ''}</div><div class="pc">${state}</div></a>`;
  };
  const nextItem = b => `<div class="next-item"><div class="row"><b class="grow">${esc(App.badgeName(b.def.id))}</b><span class="small">${pct(b.progress)}</span></div>
    <div class="bar"><span style="width:${b.progress * 100}%"></span></div><p class="tiny muted">${desc(b)}</p></div>`;
  const earnedIds = Object.keys(earned).filter(id => st[id] || !M().nodes[id]);
  const earnedItem = id => `<div class="item">${App.medalSVG(App.badgeText(id), 1, 44)}<b>${esc(App.badgeName(id))}</b><span class="tiny muted">${esc(I.fmtDate(earned[id].at))}</span></div>`;
  App.main().innerHTML = `<p class="eyebrow">${L('Insignias', 'Badges')}</p><h1>${L('Cada insignia es una rama del árbol', 'Every badge is a branch of the tree')}</h1>
    <p class="small muted">${L('Domina las especies bajo un nodo y la rama es tuya. Sin clasificaciones: solo compites contigo.',
        'Master the species under a node and the branch is yours. No leaderboards: you only compete with yourself.')}</p>
    <section class="card"><h2>${L('Próximas', 'Next up')}</h2>${next.map(nextItem).join('')}</section>
    <section class="card"><h2>${L('Hábitos', 'Habits')}</h2><div class="medals">${all.filter(b => !b.def.node).map(medal).join('')}</div></section>
    <section class="card"><h2>${L('Ramas del árbol', 'Tree branches')}</h2><p class="tiny muted">${L('Las clases y los órdenes con 3 especies o más.', 'Classes, and orders with 3 or more species.')}</p>
      <div class="medals">${all.filter(b => b.def.node).map(medal).join('')}</div>
      <p class="tiny muted">* ${L('La clase Reptilia del temario y sus órdenes: un grado parafilético, no un clado.',
          'The syllabus class Reptilia and its orders: a paraphyletic grade, not a clade.')}</p></section>
    <section class="card"><h2>${L('Conseguidas', 'Earned')}</h2>${earnedIds.length ? `<div class="earned-list">${earnedIds.map(earnedItem).join('')}</div>`
      : `<p class="small muted">${L('Todavía ninguna. La primera llega al terminar tu primera sesión.', 'None yet. The first one comes when you finish your first session.')}</p>`}</section>
    <div id="aside-m"></div>`;
  App.asideHost().innerHTML = `<section class="card"><p class="eyebrow">${L('Cómo se ganan', 'How they’re earned')}</p>
    <p class="small">${L('Una especie está dominada cuando sus casillas del examen están dominadas: FSRS predice que las recuerdas con un 90 % de probabilidad y su estabilidad pasa de 7 días.',
      'A species is mastered when its exam boxes are: FSRS predicts you recall them with 90% probability and their stability exceeds 7 days.')}</p>
    <p class="small">${I.MASTERY_RULE()}</p>
    <p class="small">${L('Las insignias ganadas no se pierden; si el dominio baja, piden un repaso.', 'Earned badges are never taken away; if mastery drops, they ask for a review.')}</p></section>`;
};
})();
