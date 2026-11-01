/* VISU · Explorar (progressive-disclosure tree), species and group cards, badges. */
(function () {
'use strict';
const I = window.VISU_I18N, E = window.VISU_ENGINE, Store = window.VISU_STORE, App = window.VISU_APP;
const L = I.L, esc = I.esc, pct = I.pct, ICON = App.ICON;
const V = App.views;
const M = () => App.M, P = () => Store.data, UI = () => Store.data.ui;

const groupOf = id => E.groupStats(M(), P(), id, App.skills(), Date.now());
const rowMeter = id => (App.sp(id) ? App.statsOf(id).meter : groupOf(id).meter);

/* ---------- tree ---------- */
function rankTag(id) {
  const n = M().nodes[id];
  if (n.rank === 'class') return n.virtual ? `<span class="tag grade">${L('clase', 'class')} · ${L('grado', 'grade')}</span>` : `<span class="tag teacher">${L('clase', 'class')}</span>`;
  if (n.rank === 'order' || n.rank === 'infraorder') return App.isGradeNode(id) ? `<span class="tag grade">${I.rankName(n.rank)} · Reptilia*</span>` : `<span class="tag teacher">${I.rankName(n.rank)}</span>`;
  if (App.holdsGrade(id)) return `<span class="tag grade">${L('incluye', 'holds')} Reptilia*</span>`;
  return '';
}
function trow(id, kind) {
  const n = M().nodes[id], isSp = !!App.sp(id);
  const g = isSp ? null : groupOf(id), meter = rowMeter(id);
  const chev = isSp ? '' : kind === 'kid' ? '▸' : '▾';
  const vern = App.nodeName(id);
  const lab = isSp ? `<b>${esc(App.spName(id))}</b><span class="sub"><i>${esc(App.sp(id).binomial)}</i></span>`
    : `<b>${esc(n.scientific || id)}</b>${vern && vern !== n.scientific ? `<span class="alt">${esc(vern)}</span>` : ''}${rankTag(id)}`;
  const aria = `${App.label(id)}${isSp ? ` · ${pct(meter)}` : ` · ${g.mastered} ${L('de', 'of')} ${g.total} ${L('dominadas', 'mastered')}`}`;
  return `<a class="trow ${kind} ${App.isGradeNode(id) && !isSp ? 'grade' : ''}" href="#${esc(App.routeFor(id))}" ${kind === 'sel' ? 'aria-current="true"' : ''} ${isSp ? '' : `aria-expanded="${kind !== 'kid'}"`} aria-label="${esc(aria)}" data-row="${esc(id)}">
    <span class="chev" aria-hidden="true">${chev}</span>${App.ring(meter)}<span class="lab">${lab}</span><span class="cnt" aria-hidden="true">${isSp ? pct(meter) : `${g.mastered}/${g.total}`}</span></a>`;
}
/* Study mode starts at the list's classes, each the root of its own tree, so the eye goes to what sets
   groups apart rather than to the deep path above them. Nodes above the classes show the classes alone. */
const studyMode = () => !!UI().studyTree;
function treeHTML(sel) {
  const study = studyMode(), roots = M().classRoots || [];
  const path = study ? E.studyPath(M(), sel) || [] : E.pathTo(M(), sel), kids = (M().nodes[sel] && M().nodes[sel].children) || [];
  const compress = !UI().showMid && path.length > 6;
  const items = compress ? [{ id: path[0] }, { mid: path.slice(1, path.length - 5) }].concat(path.slice(-5).map(id => ({ id }))) : path.map(id => ({ id }));
  const nest = k => {
    const it = items[k];
    if (!it) return '';
    if (it.mid) return `<li><button class="tmid" data-mid aria-expanded="false">⋯ <span><b>${it.mid.length} ${L('niveles intermedios', 'levels in between')}</b> · ${esc(App.label(it.mid[0]))} › … › ${esc(App.label(it.mid[it.mid.length - 1]))}</span></button><ul>${nest(k + 1)}</ul></li>`;
    if (it.id === sel) return `<li>${trow(sel, 'sel')}<button class="jump-card linkbtn" data-jump>${App.sp(sel) ? L('Ver la ficha ↓', 'See the card ↓') : L('Ver la ficha del grupo ↓', 'See the group card ↓')}</button>${kids.length ? `<ul>${kids.filter(c => M().nodes[c] || App.sp(c)).map(c => `<li>${trow(c, 'kid')}</li>`).join('')}</ul>` : ''}</li>`;
    return `<li>${trow(it.id, 'anc')}<ul>${nest(k + 1)}</ul></li>`;
  };
  if (study) {
    const top = roots.map(r => (path[0] === r ? nest(0) : `<li>${trow(r, 'kid')}</li>`)).join('');
    return `${UI().showMid && path.length > 6 ? `<button class="tmid" data-mid aria-expanded="true">▴ ${L('Plegar los niveles intermedios', 'Fold the levels in between')}</button>` : ''}
      <p class="tiny muted study-note">${L(`Las ${roots.length} clases de la lista, cada una como raíz de su propio árbol.`, `The list’s ${roots.length} classes, each the root of its own tree.`)}</p><ul>${top}</ul>`;
  }
  const deep = M().deepPath.filter(d => d && (d.scientific || d.es));
  const dn = d => I.t(d) || d.scientific;
  return `${deep.length ? `<button class="tdeep" data-deep aria-expanded="${!!UI().showDeep}">${UI().showDeep ? '▾' : '▸'} <span><b>${L('Camino profundo', 'Deep path')}</b> · ${esc(dn(deep[0]))} › … › ${esc(dn(deep[deep.length - 1]))} (${deep.length} ${L('niveles', 'levels')})</span></button>
    ${UI().showDeep ? `<ol class="deep-list">${deep.map(d => `<li><i>${esc(d.scientific || '')}</i> · ${esc(dn(d))}</li>`).join('')}</ol>` : ''}` : ''}
    ${UI().showMid && path.length > 6 ? `<button class="tmid" data-mid aria-expanded="true">▴ ${L('Plegar los niveles intermedios', 'Fold the levels in between')}</button>` : ''}
    <ul>${nest(0)}</ul>`;
}
V.explore = function (id, fromClick) {
  App.focusMode(false);
  if (!M().nodes[id] && !App.sp(id)) id = M().root;
  UI().exploreSel = id; Store.save();
  document.getElementById('app').classList.add('explore');
  App.main().innerHTML = `<div class="tree-wrap"><p class="eyebrow">${L('Explorar', 'Explore')}</p><h1>${L('El árbol, rama a rama', 'The tree, one branch at a time')}</h1>
    <p class="small muted">${L('Ves el camino hasta tu selección y un nivel por debajo. Toca un grupo para abrirlo; toca uno de arriba para volver.', 'You see the path to your selection and one level below it. Tap a group to open it; tap one above to go back.')}</p>
    <div class="seg tree-mode" role="group" aria-label="${L('Vista del árbol', 'Tree view')}"><button data-treemode="study" aria-pressed="${studyMode()}">${L('Modo estudio: por clases', 'Study mode: by class')}</button><button data-treemode="full" aria-pressed="${!studyMode()}">${L('Árbol completo', 'Full tree')}</button></div>
    <nav class="tree" aria-label="${L('Árbol filogenético', 'Phylogenetic tree')}" id="tree">${treeHTML(id)}</nav>
    <div class="tree-legend"><span>${App.ring(0)} ${L('sin ver', 'unseen')}</span><span>${App.ring(.5)} ${L('progreso', 'progress')}</span><span>${App.ring(1)} ${L('dominada', 'mastered')}</span>${Object.values(M().nodes).some(n => n.grade) ? `<span><span class="hatchkey"></span>${L('Reptilia* del temario: un grado, no un clado', 'Syllabus Reptilia*: a grade, not a clade')}</span>` : ''}</div>
    ${P().log.length ? '' : `<p class="tiny muted">${L('Todo empieza a cero: los anillos se llenan a medida que practicas.', 'Everything starts at zero: the rings fill up as you practise.')}</p>`}</div><div id="card-m" class="card-host" tabindex="-1"></div>`;
  const host = App.DESK.matches ? (App.aside().innerHTML = '<div class="card-host" id="card-d" tabindex="-1"></div>', document.getElementById('card-d')) : document.getElementById('card-m');
  const back = App.returnTo ? `<a class="btn primary back-to-practice" href="#${esc(App.returnTo)}">← ${L('Volver a la práctica', 'Back to practice')}</a>` : '';
  host.innerHTML = back + (App.sp(id) ? speciesCard(id) : groupCard(id));
  bindCard(host, id);
  if (back && !App.DESK.matches) host.scrollIntoView({ block: 'start' });   // on a phone the card is below the tree
  document.querySelectorAll('[data-treemode]').forEach(b => b.onclick = () => { UI().studyTree = b.dataset.treemode === 'study'; Store.save(); V.explore(id); const f = document.querySelector(`[data-treemode="${b.dataset.treemode}"]`); if (f) f.focus(); });
  const tree = document.getElementById('tree');
  tree.querySelectorAll('[data-mid]').forEach(b => b.onclick = () => { UI().showMid = !UI().showMid; Store.save(); V.explore(id); focusTree('[data-mid]'); });
  const dp = tree.querySelector('[data-deep]'); if (dp) dp.onclick = () => { UI().showDeep = !UI().showDeep; Store.save(); V.explore(id); focusTree('[data-deep]'); };
  const jb = tree.querySelector('[data-jump]'); if (jb) jb.onclick = () => { host.scrollIntoView({ behavior: App.REDUCED.matches ? 'auto' : 'smooth' }); host.focus({ preventScroll: true }); };
  if (fromClick) { const r = tree.querySelector('.trow.sel'); if (r) r.focus({ preventScroll: true }); if (App.DESK.matches) App.aside().scrollTop = 0; }
};
function focusTree(sel) { const el = document.querySelector('#tree ' + sel); if (el) el.focus(); }

/* ---------- citations: one numbering per card ---------- */
function citer() {
  const order = [];
  App.citeReg = {};
  const num = (key, src) => { let i = order.indexOf(key); if (i < 0) { order.push(key); App.citeReg[key] = src; i = order.length - 1; } return i + 1; };
  const btn = (key, src) => `<button class="cite" type="button" data-src="${esc(key)}" aria-label="${L('Fuente', 'Source')} ${num(key, src)}: ${esc(src.title || key)}">${num(key, src)}</button>`;
  return {
    order,
    bestiary: ids => (ids || []).filter(s => M().sources[s]).map(s => btn('b-' + s, M().sources[s])).join(''),
    content: (sid, list) => (list || []).map((s, i) => (s && (s.title || s.url) ? btn(`c-${sid}-${i}`, s) : '')).join(''),
    refs: () => `<ol>${order.map(k => { const r = App.citeReg[k]; return `<li id="ref-${esc(k)}"><b>${esc(r.title || k)}</b>.${r.license ? ` ${L('Licencia', 'Licence')}: ${esc(r.license)}.` : ''}${r.retrieved ? ` ${L('Consultado', 'Retrieved')}: ${esc(r.retrieved)}.` : ''} ${I.url(r.url) ? `<a href="${esc(I.url(r.url))}" target="_blank" rel="noopener">${esc(r.url)}</a>` : ''}</li>`; }).join('')}</ol>`
  };
}

/* ---------- cards ---------- */
function exam5(id) {
  return `<div class="exam5" role="group" aria-label="${L('Las cinco casillas del examen', 'The five exam boxes')}">${E.SKILLS.map(k => { const v = E.answerFor(M(), id, k), es = k === 'class' || k === 'order' ? App.esForm(k, v) : ''; return `<div><span>${I.sk(k)}</span><b class="${k === 'genus' || k === 'species' ? 'sci' : ''}">${esc(v)}</b>${es ? `<small class="es-form">${esc(es)}</small>` : ''}</div>`; }).join('')}</div>`;
}
function gradeBand(id) {
  if (!(App.isGradeNode(id) || App.holdsGrade(id))) return '';
  return `<div class="grade-band"><b>Reptilia* · ${L('grado parafilético', 'paraphyletic grade')}</b><br>${L('La lista agrupa Squamata, Sphenodontia, Chelonia y Crocodylia como clase Reptilia. No es un clado: los cocodrilos están más cerca de las aves que de los lagartos. En el examen escribe «Reptilia»; el árbol muestra dónde están de verdad.', 'The list groups Squamata, Sphenodontia, Chelonia and Crocodylia as class Reptilia. It is not a clade: crocodiles are closer to birds than to lizards. Write “Reptilia” in the exam; the tree shows where they really sit.')}</div>`;
}
function videoBox(id) {
  const v = App.sp(id).video;
  if (!v || !I.url(v.url) || v.status === 'broken') return '';
  /* YouTube refuses embeds that don't say which site they're on (error 153). A downloaded copy opened as a
     file has no site address to send, so there the video only opens on YouTube. */
  const yt = v.status !== 'link_only' && location.protocol !== 'file:' ? ((v.url.match(/[?&]v=([\w-]{6,})/) || v.url.match(/youtu\.be\/([\w-]{6,})/) || v.url.match(/youtube\.com\/(?:embed|shorts)\/([\w-]{6,})/) || [])[1]) : null;
  const start = (v.url.match(/[?&]t=(\d+)/) || [])[1];
  const host = (() => { try { return new URL(v.url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } })();
  const channel = v.channel ? (I.url(v.channel_url) ? `<a href="${esc(I.url(v.channel_url))}" target="_blank" rel="noopener">${esc(v.channel)}</a>` : esc(v.channel)) : '';
  return `<h2 class="sec">${L('Vídeo', 'Video')}</h2><div class="video-box">
    ${yt ? `<p class="small">${L('El vídeo está en YouTube. No se carga nada hasta que pulses el botón; al pulsarlo, tu navegador se conecta con YouTube y le dice la dirección de esta web (no la de la ficha), que YouTube exige para reproducirlo.', 'The video is on YouTube. Nothing loads until you press the button; when you do, your browser connects to YouTube and tells it this site’s address (not the card’s), which YouTube requires to play it.')}</p>
    <div class="row"><button class="btn primary" data-video="${esc(yt)}" data-start="${esc(start || '')}">${L('Cargar el vídeo de YouTube', 'Load the YouTube video')}</button><a class="btn" href="${esc(I.url(v.url))}" target="_blank" rel="noopener">${L('Abrir en YouTube ↗', 'Open on YouTube ↗')}</a></div>`
    : `<p class="small">${L('Este vídeo no se puede ver dentro de esta web; se abre en', 'This video can’t play inside this site; it opens on')}${host ? ` ${esc(host)}` : ''}.</p><a class="btn" href="${esc(I.url(v.url))}" target="_blank" rel="noopener">${L('Abrir el vídeo ↗', 'Open the video ↗')}</a>`}
    <p class="tiny muted">${v.title ? `«${esc(v.title)}»` : L('Vídeo', 'Video')}${channel ? `, ${L('de', 'by')} ${channel}` : ''}${v.checked ? ` · ${L('enlace comprobado el', 'link checked on')} ${esc(v.checked)}` : ''}.</p></div>`;
}
const FIELD_LABEL = { class: ['Clase', 'Class'], order: ['Orden', 'Order'], genus: ['Género', 'Genus'], species: ['Especie', 'Species'], epithet: ['Especie', 'Species'], common: ['Nombre vulgar', 'Common name'], common_es: ['Nombre vulgar', 'Common name'], binomial: ['Nombre científico', 'Scientific name'] };
function correctionsHTML(list) {
  if (!Array.isArray(list) || !list.length) return '';
  const conf = { certain: L('segura', 'certain'), suggested: L('sugerida', 'suggested'), contested: L('discutida', 'contested') };
  return `<section class="corrections"><h2 class="sec">${L('Notas sobre el bestiario', 'Notes on the bestiary')}</h2>${list.map(c => `<div class="correction">
    <p><b>${esc(FIELD_LABEL[c.field] ? L(FIELD_LABEL[c.field][0], FIELD_LABEL[c.field][1]) : c.field)}</b>: ${L('el bestiario dice', 'the bestiary says')} <b>${esc(c.bestiary_value)}</b>; ${L('autoridad actual', 'current authority')}: <b>${esc(c.suggested_value)}</b>${c.confidence ? ` <span class="tag">${esc(conf[c.confidence] || c.confidence)}</span>` : ''}</p>
    ${c.note ? `<p class="small">${esc(I.t(c.note))}</p>` : ''}
    <p class="tiny muted">${L('En el examen se escribe lo que dice el bestiario.', 'In the exam, write what the bestiary says.')}${I.url(c.source_url) ? ` <a href="${esc(I.url(c.source_url))}" target="_blank" rel="noopener">${L('Fuente ↗', 'Source ↗')}</a>` : ''}</p></div>`).join('')}</section>`;
}
/* "Report an error": a prefilled GitHub issue. A plain link: nothing is sent until she submits it on GitHub. */
function reportLink(id) {
  const n = M().nodes[id] || {}, title = `${L('Error en la ficha', 'Error on the card')}: ${n.scientific || id} (${App.collection()})`;
  const body = L(`Ficha: ${id}\nColección: ${App.collection()}\n\n¿Qué está mal y qué debería decir? Si puedes, añade una fuente.\n`,
    `Card: ${id}\nCollection: ${App.collection()}\n\nWhat is wrong, and what should it say? Add a source if you can.\n`);
  const url = `${I.REPO_URL}/issues/new?labels=${encodeURIComponent('ficha')}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  return `<p class="tiny muted report-error">${L('¿Has visto un error en esta ficha? Sobre todo en los textos marcados como «borrador», que aún no ha revisado una persona.', 'Spotted an error on this card? Especially in texts marked “draft”, which no person has checked yet.')} <a href="${esc(url)}" target="_blank" rel="noopener">${L('Avísanos en GitHub ↗', 'Tell us on GitHub ↗')}</a></p>`;
}
const galleryIdx = {};
function figureHTML(id) {
  const ps = App.photosOf(id), idx = Math.min(galleryIdx[id] || 0, Math.max(0, ps.length - 1));
  return `<figure class="pinfig" id="gal-${esc(id)}">${App.carousel(id, { key: 'gal', idx, credit: true })}
    ${ps.length > 1 ? `<div class="gallery" role="group" aria-label="${L('Más fotos', 'More photos')}">${ps.map((p, i) => `<button type="button" class="gthumb" data-gal="${i}" aria-pressed="${i === idx}" aria-label="${L('Foto', 'Photo')} ${i + 1}">${App.tile(id, '', '', i)}</button>`).join('')}</div>` : ''}</figure>`;
}
function iucnCode(f) { const v = String((f && (f.es || f.en || f.value)) || '').trim().toUpperCase(); return I.IUCN[v] ? v : null; }
function factValue(f) {
  if (f.field === 'iucn') { const c = iucnCode(f); if (c) return `<span class="iucn">${c}</span>${L(I.IUCN[c][0], I.IUCN[c][1])}`; }
  return esc(I.t(f));
}
/* "What the name says": class, order and scientific name, each with its etymology, as memory aids. */
function namesHTML(id, cite) {
  const rows = [['class', L('Clase', 'Class')], ['order', L('Orden', 'Order')], ['genus', L('Género y especie', 'Genus and species')]]
    .map(([k, lab]) => [lab, App.nameMeaning(id, k)]).filter(r => r[1]);
  if (!rows.length) return '';
  const draft = rows.some(r => r[1].draft) ? ` <span class="draft">${L('borrador', 'draft')}</span>` : '';
  return `<h2 class="sec">${L('Qué dice el nombre', 'What the name says')}${draft}</h2><dl class="names-dl">${rows.map(([lab, m]) => `<dt>${lab} <i>${esc(m.name)}</i>${m.es ? `<span class="es-form">${L('en español', 'in Spanish')}: ${esc(m.es)}</span>` : ''}</dt><dd>${m.text ? esc(m.text) + cite.content(m.key, m.sources) : ''}</dd>`).join('')}</dl>`;
}
function speciesCard(id) {
  const s = App.sp(id), c = (M().content.species || {})[id] || null, cite = citer();
  const draft = c && c.status === 'draft' ? `<span class="draft">${L('borrador', 'draft')}</span>` : '';
  const facts = (Array.isArray(s.facts) ? s.facts : []).filter(f => f && Array.isArray(f.src) && f.src.length && (f.es || f.en));
  const iu = facts.find(f => f.field === 'iucn'), es = facts.find(f => f.field === 'spain');
  const st = App.statsOf(id);
  const other = I.lang === 'es' ? s.common_en : s.common_es;
  const kicker = `<p class="kicker"><span>${L('Clase', 'Class')} ${App.isGradeNode(id) ? `<span class="gr">Reptilia*</span>` : esc(s.class)}${App.esForm('class', s.class) ? ` · ${esc(App.esForm('class', s.class))}` : ''}</span><span>${L('Orden', 'Order')} ${esc(s.order)}${App.esForm('order', s.order) ? ` · ${esc(App.esForm('order', s.order))}` : ''}</span>${s.infraorder ? `<span>${esc(s.infraorder)}</span>` : ''}${s.family ? `<span>${esc(s.family)}</span>` : ''}</p>`;
  const head = `${kicker}<h1 class="ptitle" tabindex="-1">${esc(App.spName(id))}</h1><p class="binom"><i>${esc(s.binomial)}</i>${s.authority ? ` <span class="auth">${esc(s.authority)}</span>` : ''}</p>
    ${other && other !== App.spName(id) ? `<p class="alt">${I.lang === 'es' ? 'EN' : 'ES'}: ${esc(other)}</p>` : ''}${exam5(id)}`;
  const status = `<div class="status-row">${iu && iucnCode(iu) ? `<span class="stat"><span class="iucn ${iucnCode(iu)}">${iucnCode(iu)}</span>${L('UICN', 'IUCN')}: ${L(I.IUCN[iucnCode(iu)][0], I.IUCN[iucnCode(iu)][1])}</span>` : ''}${es ? `<span class="stat">${esc(I.t(es))}</span>` : ''}<span class="stat">${App.ring(st.meter, 18)} ${L('Progreso', 'Progress')} ${pct(st.meter)}${st.mastered ? ' · ' + L('dominada', 'mastered') : ''}</span>${App.hasPhoto(id) ? `<button class="btn" data-practise="${esc(id)}" style="min-height:40px">${L('Practicar', 'Practise')}</button>` : ''}</div>`;
  const factsHTML = facts.length ? `<section class="facts"><h2 class="sec" style="margin-top:0">${L('Datos', 'Facts')}</h2><dl>${facts.map(f => `<dt>${esc(I.fieldName(f.field))}</dt><dd>${factValue(f)}${cite.bestiary(f.src)}${f.note ? `<span class="tiny muted"> · ${esc(I.t(f.note))}</span>` : ''}</dd>`).join('')}</dl></section>` : '';
  let body = `<div class="entry-grid ${factsHTML ? 'has-facts' : ''}"><div>${figureHTML(id)}</div>${factsHTML}</div>${namesHTML(id, cite)}`;
  if (c) {
    const cs = cite.content(id, c.sources);
    const marks = I.list(c.field_marks);
    if (marks.length) body += `<h2 class="sec">${L('Rasgos de campo', 'Field marks')}${cs} ${draft}</h2><ol class="marks">${marks.map((x, i) => `<li><span class="num">${i + 1}</span><span>${esc(x)}</span></li>`).join('')}</ol>`;
    const look = Array.isArray(c.lookalikes) ? c.lookalikes.filter(x => x && x.binomial) : [];
    if (look.length) body += `<h2 class="sec">${L('Con qué se confunde', 'Look-alikes')}${cs}</h2><div class="conf-list">${look.map(x => {
      const cid = M().order.find(k => App.sp(k).binomial === x.binomial);
      return `<div class="conf-item">${cid ? `<a href="#${esc(App.routeFor(cid))}">${App.tile(cid, App.spName(cid))}</a>` : `<span class="tile"><span class="ph"><span>${esc(x.binomial.charAt(0))}.<small>${L('fuera del bestiario', 'not in the bestiary')}</small></span></span></span>`}
        <div><p><b>${cid ? `<a href="#${esc(App.routeFor(cid))}">${esc(App.spName(cid))}</a> · ` : ''}<i>${esc(x.binomial)}</i></b></p><p>${esc(I.t(x))}</p></div></div>`;
    }).join('')}</div>`;
    if (c.dimorphism && I.t(c.dimorphism)) body += `<h2 class="sec">${L('Dimorfismo sexual', 'Sexual dimorphism')}${cs}</h2><p class="etym">${esc(I.t(c.dimorphism))}</p>`;
    const triv = I.list(c.trivia);
    if (triv.length) body += `<h2 class="sec">${L('Curiosidades', 'Trivia')}${cs}</h2><ul class="small">${triv.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  } else {
    body += `<div class="pending" style="margin-top:1rem"><h3>${L('Ficha en preparación', 'Card in preparation')}</h3><p class="small">${L('Los rasgos de campo, las especies con que se confunde y la etimología de esta especie aún no están escritos. Ya puedes practicar sus cinco casillas.', 'This species’ field marks, look-alikes and etymology aren’t written yet. You can already practise its five boxes.')}</p></div>`;
  }
  const photoRefs = App.photosOf(id).map(p => `<li style="list-style:none;margin-left:-1.4rem"><b>${L('Fotografía', 'Photograph')}</b>: ${esc(p.author || '')}${p.license ? `, ${I.url(p.license_url) ? `<a href="${esc(I.url(p.license_url))}" target="_blank" rel="noopener">${esc(p.license)}</a>` : esc(p.license)}` : ''}.${I.url(p.source_url) ? ` <a href="${esc(I.url(p.source_url))}" target="_blank" rel="noopener">${esc(p.source === 'inaturalist' ? 'iNaturalist' : p.source === 'commons' ? 'Wikimedia Commons' : L('Fuente', 'Source'))} ↗</a>` : ''}</li>`).join('');
  return `<article class="plate">${head}${status}${draft && !c.field_marks ? `<p>${draft}</p>` : ''}${gradeBand(id)}${correctionsHTML(s.corrections)}${body}${videoBox(id)}
    <h2 class="sec">${L('Tus cinco casillas', 'Your five boxes')}</h2>${App.skillBars([id])}<p class="tiny muted">${I.MASTERY_RULE()}</p>
    <section class="refs"><h2 class="sec">${L('Referencias', 'References')}</h2>${cite.order.length ? cite.refs() : ''}${photoRefs ? `<ol>${photoRefs}</ol>` : ''}
    <p class="tiny muted">${L('Clase, orden, nombre científico y nombre vulgar', 'Class, order, scientific and common name')}: ${L('lista de la colección', 'the collection’s list')} «${esc(App.collectionName(App.collection()))}»${M().bestiary.edition ? ` (${esc(M().bestiary.edition)})` : ''}.</p>${reportLink(id)}</section></article>`;
}
function badgeFor(id) {
  const n = M().nodes[id], k = E.speciesUnder(M(), id).length;
  if (n.rank === 'class') return { name: L(`Clase ${n.scientific}`, `Class ${n.scientific}`) };
  if (n.rank === 'order' && k >= 3) return { name: L(`Dominio de ${n.scientific}`, `Mastery of ${n.scientific}`) };
  return null;
}
function plateFig(s, k) {
  return `<a href="#${esc(App.routeFor(s))}">${App.tile(s, App.spName(s))}<span class="figno">Fig. ${k}</span><span class="v">${esc(App.spName(s))}</span><span class="b">${esc(App.sp(s).binomial)}</span><span class="m"><span style="width:${App.statsOf(s).meter * 100}%"></span></span></a>`;
}
function groupCard(id) {
  const n = M().nodes[id], g = (M().content.groups || {})[id] || null, sp = E.speciesUnder(M(), id), gs = groupOf(id), cite = citer();
  const rk = n.rank === 'clade' ? L('Clado', 'Clade') : n.rank === 'class' ? L('Clase (temario)', 'Class (syllabus)')
    : n.rank === 'infraorder' ? L('Infraorden (temario)', 'Infraorder (syllabus)') : `${L('Orden (temario)', 'Order (syllabus)')} · ${L('clase', 'class')} ${App.isGradeNode(id) ? '<span class="gr">Reptilia*</span>' : esc(App.sp(sp[0]) ? App.sp(sp[0]).class : '')}`;
  const badge = badgeFor(id), earned = P().badges[id];
  const prog = n.rank === 'class' ? Math.min(1, gs.G / 0.8) : gs.G;
  const vern = App.nodeName(id);
  const draft = g && g.status === 'draft' ? ` <span class="draft">${L('borrador', 'draft')}</span>` : '';
  const cs = g ? cite.content(id, g.sources) : '';
  let h = `<article class="plate"><p class="kicker"><span>${rk}</span><span>${sp.length} ${L('especies del bestiario', 'bestiary species')}</span><span>${sp.filter(App.hasPhoto).length} ${L('con foto', 'with photo')}</span></p>
    <h1 class="ptitle" tabindex="-1">${esc(n.scientific || id)}</h1>${vern && vern !== n.scientific ? `<p class="alt" style="font-size:1rem">${esc(vern)}</p>` : ''}${gradeBand(id)}
    ${g && g.summary && I.t(g.summary) ? `<p class="etym" style="margin-top:.6rem">${esc(I.t(g.summary))}${cs}${draft}</p>` : ''}
    ${g && g.etymology && I.t(g.etymology) ? `<div class="name-key"><p class="eyebrow">${L('Qué dice el nombre', 'What the name says')}</p><p>${esc(I.t(g.etymology))}${cs}</p></div>` : ''}
    <div class="mast-box">${badge ? App.medalSVG(n.scientific, earned ? 1 : prog, 64, { earned: !!earned }) : App.ring(gs.meter, 56)}<div><div class="pctn">${pct(gs.meter)}</div>
      <p class="small" style="margin:.2rem 0">${gs.mastered} ${L('de', 'of')} ${gs.total} ${L('especies dominadas', 'species mastered')}</p>
      ${badge ? `<p class="small" style="margin:.2rem 0"><b>${L('Insignia', 'Badge')}:</b> ${esc(badge.name)} · ${earned ? L('conseguida', 'earned') : pct(prog)}</p>` : ''}
      ${sp.some(App.hasPhoto) ? `<button class="btn primary" data-practise="${esc(id)}" style="min-height:44px;margin-top:.3rem">${L('Practicar este grupo', 'Practise this group')}</button>` : ''}</div></div>
    ${App.skillBars(sp)}`;
  const traits = g ? I.list(g.traits) : [];
  if (traits.length || (g && g.contrast && I.t(g.contrast))) {
    h += `<h2 class="sec">${L('Rasgos diagnósticos', 'Diagnostic traits')}${cs}${draft}</h2>${traits.length ? `<ol class="callist">${traits.map((t, i) => `<li><span class="num">${i + 1}</span><span>${esc(t)}</span></li>`).join('')}</ol>` : ''}
      ${g.contrast && I.t(g.contrast) ? `<div class="contrast"><b>${L('No confundir con', 'Do not confuse with')}</b><p style="margin:.2rem 0 0">${esc(I.t(g.contrast))}</p></div>` : ''}`;
  } else if (!g) {
    h += `<div class="pending" style="margin-top:1rem"><h3>${L('Resumen en preparación', 'Summary in preparation')}</h3><p class="small">${L('El resumen, los rasgos diagnósticos y «no confundir con» de este grupo aún no están escritos.', 'This group’s summary, diagnostic traits and “do not confuse with” aren’t written yet.')}</p></div>`;
  }
  h += `<h2 class="sec">${L('Lámina: todas las especies', 'Plate: every species')} <span class="tiny muted" style="font-family:var(--font-body)">${sp.length}</span></h2>`;
  if (n.rank === 'order' || n.rank === 'infraorder' || sp.length <= 12) h += `<div class="plates">${sp.map((s, i) => plateFig(s, i + 1)).join('')}</div>`;
  else {
    let k = 0;
    const groups = [];
    (function walk(x) { const nx = M().nodes[x]; if (!nx) return; if (nx.rank === 'order' || App.sp(x)) groups.push(x); else (nx.children || []).forEach(walk); })(id);
    groups.forEach(o => {
      const os = E.speciesUnder(M(), o);
      h += `<div class="order-h"><h3><a href="#${esc(App.routeFor(o))}">${esc(App.label(o))}</a></h3>${App.sp(o) ? '' : rankTag(o)}<span class="tiny muted">${os.length} · ${pct(rowMeter(o))}</span></div><div class="plates">${os.map(s => plateFig(s, ++k)).join('')}</div>`;
    });
  }
  h += `<p class="tiny muted" style="margin-top:1rem">${L('Las miniaturas muestran la foto entera, sin recortar.', 'Thumbnails show the whole photo, uncropped.')}</p>`;
  h += `<section class="refs">${cite.order.length ? `<h2 class="sec">${L('Referencias', 'References')}</h2>${cite.refs()}` : ''}${reportLink(id)}</section>`;
  return h + '</article>';
}
function bindCard(host, id) {
  host.querySelectorAll('[data-video]').forEach(b => b.onclick = () => {
    const box = b.closest('.video-box'), st = b.dataset.start ? `&start=${encodeURIComponent(b.dataset.start)}` : '';
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.video)}?autoplay=1${st}" title="${L('Vídeo', 'Video')}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  });
  host.querySelectorAll('[data-practise]').forEach(b => b.onclick = () => { P().ui.scope = b.dataset.practise; Store.save(); location.hash = 'nivel'; });
  /* The photo widget flips itself; the gallery remembers the photo and keeps its thumbnails in step. */
  App.carouselStep.gal = i => { galleryIdx[id] = i; host.querySelectorAll('[data-gal]').forEach(t => t.setAttribute('aria-pressed', String(+t.dataset.gal === i))); };
  host.querySelectorAll('[data-gal]').forEach(b => b.onclick = () => { const car = host.querySelector('.car[data-car="gal"]'); if (car) App.carouselShow(car, +b.dataset.gal); });
}

/* ---------- BADGES ---------- */
App.badgeName = id => {
  const n = M().nodes[id];
  if (n && n.rank === 'class') return L(`Clase ${n.scientific}`, `Class ${n.scientific}`);
  if (n) return L(`Dominio de ${n.scientific}`, `Mastery of ${n.scientific}`);
  return { 'habit:first_page': L('Primera página', 'First page'), 'habit:streak7': L('Racha de 7 días', '7-day streak'), 'mock:passed': L('Simulacro superado', 'Mock passed') }[id] || id;
};
App.badgeText = id => { const n = M().nodes[id]; return n ? n.scientific : { 'habit:first_page': 'I', 'habit:streak7': '7', 'mock:passed': '5/10' }[id] || '★'; };
const TIER_NAME = { bronze: ['bronce', 'bronze'], silver: ['plata', 'silver'], gold: ['oro', 'gold'] };
V.insignias = function () {
  App.focusMode(false);
  App.awardBadges();
  const st = E.badgeStatus(M(), P(), App.skills(), Date.now()), earned = P().badges;
  const branch = Object.values(st).filter(b => b.def.node);
  const habits = Object.values(st).filter(b => !b.def.node);
  const next = Object.values(st).filter(b => !earned[b.def.id]).sort((a, b) => b.progress - a.progress).slice(0, 3);
  const desc = b => b.def.kind === 'class' ? L('Bronce al dominar el 80 % de sus especies, plata al 90 % y oro al 100 %.', 'Bronze at 80% of its species mastered, silver at 90% and gold at 100%.')
    : b.def.kind === 'order' ? L('Domina todas sus especies.', 'Master all its species.')
    : { 'habit:first_page': L('Termina tu primera sesión.', 'Finish your first session.'), 'habit:streak7': L('Estudia 7 días seguidos (un comodín por semana).', 'Study 7 days in a row (one freeze a week).'), 'mock:passed': L('Saca un 5 o más en un simulacro.', 'Score 5 or more in a mock.') }[b.def.id];
  const medal = b => {
    const e = earned[b.def.id], stale = e && (!b.tier || ({ bronze: 1, silver: 2, gold: 3 }[b.tier] < { bronze: 1, silver: 2, gold: 3 }[e.tier]));
    const href = b.def.node ? `#${esc(App.routeFor(b.def.node))}` : b.def.id === 'mock:passed' ? '#simulacro' : '#hoy';
    return `<a class="medal" href="${href}">${App.medalSVG(App.badgeText(b.def.id), e ? 1 : b.progress, 76, { earned: !!e, stale })}<div class="nm">${esc(App.badgeName(b.def.id))}${b.def.node && App.isGradeNode(b.def.node) ? '*' : ''}</div><div class="pc">${e ? `${L('conseguida', 'earned')}${e.tier && b.def.kind === 'class' ? ' · ' + L(TIER_NAME[e.tier][0], TIER_NAME[e.tier][1]) : ''}${stale ? ' · ' + L('pide repaso', 'needs review') : ''}` : pct(b.progress)}</div></a>`;
  };
  const earnedIds = Object.keys(earned).filter(id => st[id] || !M().nodes[id]);
  App.main().innerHTML = `<p class="eyebrow">${L('Insignias', 'Badges')}</p><h1>${L('Cada insignia es una rama del árbol', 'Every badge is a branch of the tree')}</h1>
    <p class="small muted">${L('Domina las especies bajo un nodo y la rama es tuya. Sin clasificaciones: solo compites contigo.', 'Master the species under a node and the branch is yours. No leaderboards: you only compete with yourself.')}</p>
    <section class="card"><h2>${L('Próximas', 'Next up')}</h2>${next.map(b => `<div style="margin:.7rem 0"><div class="row"><b class="grow">${esc(App.badgeName(b.def.id))}</b><span class="small">${pct(b.progress)}</span></div><div class="bar"><span style="width:${b.progress * 100}%"></span></div><p class="tiny muted">${desc(b)}</p></div>`).join('')}</section>
    <section class="card"><h2>${L('Hábitos', 'Habits')}</h2><div class="medals">${habits.map(medal).join('')}</div></section>
    <section class="card"><h2>${L('Ramas del árbol', 'Tree branches')}</h2><p class="tiny muted">${L('Las clases y los órdenes con 3 especies o más.', 'Classes, and orders with 3 or more species.')}</p>
      <div class="medals">${branch.map(medal).join('')}</div>
      <p class="tiny muted">* ${L('La clase Reptilia del temario y sus órdenes: un grado parafilético, no un clado.', 'The syllabus class Reptilia and its orders: a paraphyletic grade, not a clade.')}</p></section>
    <section class="card"><h2>${L('Conseguidas', 'Earned')}</h2>${earnedIds.length ? `<div class="earned-list">${earnedIds.map(id => `<div class="item">${App.medalSVG(App.badgeText(id), 1, 44)}<b>${esc(App.badgeName(id))}</b><span class="tiny muted">${esc(I.fmtDate(earned[id].at))}</span></div>`).join('')}</div>` : `<p class="small muted">${L('Todavía ninguna. La primera llega al terminar tu primera sesión.', 'None yet. The first one comes when you finish your first session.')}</p>`}</section><div id="aside-m"></div>`;
  App.asideHost().innerHTML = `<section class="card"><p class="eyebrow">${L('Cómo se ganan', 'How they’re earned')}</p><p class="small">${L('Una especie está dominada cuando sus casillas del examen están dominadas: FSRS predice que las recuerdas con un 90 % de probabilidad y su estabilidad pasa de 7 días.', 'A species is mastered when its exam boxes are: FSRS predicts you recall them with 90% probability and their stability exceeds 7 days.')}</p><p class="small">${I.MASTERY_RULE()}</p><p class="small">${L('Las insignias ganadas no se pierden; si el dominio baja, piden un repaso.', 'Earned badges are never taken away; if mastery drops, they ask for a review.')}</p></section>`;
};
})();
