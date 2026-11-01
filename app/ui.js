/* VISU · shared UI: shell, photos, rings and medals, export/import, citations, toasts.
   Defines window.VISU_APP, which the view files extend. */
(function () {
'use strict';
const I = window.VISU_I18N, E = window.VISU_ENGINE, Store = window.VISU_STORE;
const L = I.L, esc = I.esc;
const App = window.VISU_APP = { views: {} };
App.DESK = window.matchMedia('(min-width: 1000px)');
App.REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

App.P = () => Store.data;
App.set = () => Store.data.settings;
App.skills = () => E.SKILLS.filter(k => Store.data.settings.skills[k]);
App.main = () => document.getElementById('main');
App.aside = () => document.getElementById('aside');
App.asideHost = () => (App.DESK.matches ? App.aside() : document.getElementById('aside-m'));
App.focusMode = on => document.body.classList.toggle('focus-mode', !!on);
App.focusFirst = sel => { const el = App.main().querySelector(sel); if (el) el.focus(); };
/* Collections (data/collections.js): the list, and the one open now (app/collection.js chose it). */
App.collections = () => ((window.VISU && window.VISU.collections && window.VISU.collections.list) || []);
App.collectionName = id => { const c = App.collections().find(x => x.id === id); return c ? I.t(c.name) : id; };
App.collection = () => Store.collection;

/* ---------- names and the tree ---------- */
const M = () => App.M;
App.sp = id => M().species[id];
/* Display name of a species in the interface language. The exam answer is always common_es. */
App.spName = id => { const s = App.sp(id); return s ? (I.lang === 'en' && s.common_en ? s.common_en : s.common_es || s.binomial) : id; };
App.nodeName = id => { const n = M().nodes[id]; if (!n) return App.sp(id) ? App.spName(id) : id; if (App.sp(id)) return App.spName(id); return (n.name && I.t(n.name)) || n.scientific || id; };
/* Rows and headings: clades by their vernacular name, the list's groups (class, order) by their scientific name. */
App.label = id => { const n = M().nodes[id]; if (!n) return App.nodeName(id); return n.rank === 'clade' || App.sp(id) ? App.nodeName(id) : n.scientific; };
App.routeFor = id => (App.sp(id) ? 'ficha-' + id : 'grupo-' + String(id).replace(':', '-'));
App.isGradeNode = id => {
  const n = M().nodes[id], s = App.sp(id);
  if (s) return s.class === 'Reptilia';
  if (!n) return false;
  if (n.grade === 'Reptilia') return true;
  if (n.rank === 'class' && n.scientific === 'Reptilia') return true;
  if (n.rank === 'order' || n.rank === 'infraorder') { const sp = E.speciesUnder(M(), id); return sp.length > 0 && sp.every(x => App.sp(x).class === 'Reptilia'); }
  return false;
};
/* Clades that hold part of the syllabus "Reptilia" without being that group of the list (Sauropsida, Archosauria…). */
App.holdsGrade = id => {
  const n = M().nodes[id]; if (!n || n.rank !== 'clade') return false;
  const cls = new Set(E.speciesUnder(M(), id).map(x => App.sp(x).class));
  return cls.has('Reptilia') && !cls.has('Mammalia');
};

/* ---------- photos: never cropped unless the media record has a crop box ---------- */
App.photosOf = id => M().photos[id] || [];
App.hasPhoto = id => App.photosOf(id).length > 0;
/* Quiz photos are drawn at random for each question (repeats allowed), so what she learns is the
   animal, not one picture's composition or its place in a session. */
App.randomPhoto = id => Math.floor(Math.random() * Math.max(1, App.photosOf(id).length));
/* The Spanish form of a class or order name (Chondrichthyes → Condrictios), as said in Spain. Only in the
   Spanish interface, and only when it differs from the Latin. */
App.esForm = (rank, sci) => {
  if (I.lang !== 'es' || !sci) return '';
  const n = M().nodes[`${rank}:${sci}`], es = n && n.name && n.name.es;
  const norm = x => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return es && norm(es) !== norm(sci) ? es : '';
};
/* "What the name says": the etymology behind one exam box, as a memory aid. Class and order come from their
   group texts; genus, species and common name from the species text. Null when not written yet. */
App.nameMeaning = (id, skill) => {
  const s = App.sp(id), C = M().content || {};
  const gid = skill === 'class' ? `class:${s.class}` : skill === 'order' ? `order:${s.order}` : null;
  const c = gid ? (C.groups || {})[gid] : (C.species || {})[id];
  const text = c && c.etymology ? I.t(c.etymology) : '';
  const es = gid ? App.esForm(skill, gid.split(':')[1]) : '';
  return text || es ? { key: gid || id, name: gid ? gid.split(':')[1] : s.binomial, es, text, draft: !!(c && c.status === 'draft'), sources: c && c.sources } : null;
};
/* The block shown after a mistake: the meaning of each box involved, once per name, then the names of the
   species it was confused with, for contrast. */
App.nameKeyHTML = (id, skills, confused) => {
  const seen = new Set(), rows = [];
  const add = m => { if (m && !seen.has(m.key)) { seen.add(m.key); rows.push(m); } };
  skills.forEach(k => add(App.nameMeaning(id, k)));
  (confused || []).forEach(o => add(App.nameMeaning(o, 'genus')));
  if (!rows.length) return '';
  return `<section class="name-key"><p class="eyebrow">${L('Qué dice el nombre', 'What the name says')}</p>${rows.map(m => `<p><i>${esc(m.name)}</i>${m.es ? ` (${L('en español', 'in Spanish')}, <b>${esc(m.es)}</b>)` : ''}${m.text ? `: ${esc(m.text)}` : ''}</p>`).join('')}${rows.some(m => m.draft) ? `<p class="tiny muted"><span class="draft">${L('borrador', 'draft')}</span></p>` : ''}</section>`;
};
const SOURCE_NAME = { commons: 'Wikimedia Commons', inaturalist: 'iNaturalist' };
App.credit = (p, opts) => {
  if (!p) return '';
  const lic = I.url(p.license_url) ? `<a href="${esc(I.url(p.license_url))}" target="_blank" rel="noopener">${esc(p.license || L('licencia', 'licence'))}</a>` : esc(p.license || '');
  const src = I.url(p.source_url) ? `<a href="${esc(I.url(p.source_url))}" target="_blank" rel="noopener">${L('original en', 'original on')} ${esc(SOURCE_NAME[p.source] || p.source || L('la fuente', 'the source'))}</a>` : '';
  const mod = p.modified ? ` · ${esc(L({ resized: 'redimensionada', cropped: 'recortada' }[p.modified] || p.modified, p.modified))}` : '';
  return `<p class="credit">${L('Foto', 'Photo')}: ${esc(p.author || L('autor desconocido', 'unknown author'))} · ${lic}${src ? ' · ' + src : ''}${mod}${opts && opts.note ? ' · ' + opts.note : ''}</p>`;
};
/* `anonymous`: no name, for practice screens, where the name is the answer. */
App.placeholder = (id, anonymous) => {
  if (anonymous) return `<div class="ph" role="img" aria-label="${esc(L('Foto no disponible', 'Photo not available'))}"><span><small>${L('foto no disponible', 'photo not available')}</small></span></div>`;
  const s = App.sp(id) || {}, g = (s.genus || '?')[0], e = s.epithet || '';
  return `<div class="ph" role="img" aria-label="${esc(L('Sin foto todavía', 'No photo yet'))}"><span>${esc(g)}. ${esc(e)}<small>${L('sin foto todavía', 'no photo yet')}</small></span></div>`;
};
function cropAttrs(p) {
  const c = Array.isArray(p.crop) && p.crop.length === 4 ? p.crop : null;
  if (!c) return { style: '', ar: p.w && p.h ? `${p.w}/${p.h}` : null };
  const [x, y, w, h] = c;
  const inset = `inset(${(y * 100).toFixed(2)}% ${((1 - x - w) * 100).toFixed(2)}% ${((1 - y - h) * 100).toFixed(2)}% ${(x * 100).toFixed(2)}%)`;
  return { style: `object-view-box:${inset}`, ar: p.w && p.h ? `${Math.round(p.w * w)}/${Math.round(p.h * h)}` : null };
}
App.tile = (id, alt, cls, idx) => {
  const ps = App.photosOf(id), p = ps.length ? ps[(idx || 0) % ps.length] : null;
  return `<span class="tile ${cls || ''}">${p ? `<img src="${esc(p.file)}" data-sp="${esc(id)}" alt="${esc(alt == null ? App.spName(id) : alt)}" loading="lazy" style="${cropAttrs(p).style}">` : App.placeholder(id)}</span>`;
};
/* The animal photo widget, used wherever an animal is shown large: every photo of the species in a fixed
   frame (whole photo, object-fit: contain), with arrows, a counter, swipe and arrow keys. It flips itself in
   place, so focus, typed answers and picks survive. Options:
     key     names the widget on its screen; a view that needs to know the photo on show registers
             App.carouselStep[key] = (idx) => { store it } (optional);
     idx     the photo to start on;  alt  the image's alt text (default: the species name);
     credit  true: the photo's credit under the frame, kept in step; 'later': a note that it appears after
             answering (it would give the name away); absent: none;
     inner   extra HTML inside the frame, under the arrows (e.g. the button that picks a photo). */
App.carouselStep = {};
const LATER = () => `<p class="credit">${L('El crédito de la foto aparece al responder (el pie revelaría el nombre).', 'The photo credit appears after you answer (the caption would give the name away).')}</p>`;
App.carousel = (id, o) => {
  const ps = App.photosOf(id), n = ps.length;
  if (!n) return `<div class="pframe" style="aspect-ratio:4/3">${App.placeholder(id)}</div>`;
  const idx = ((o.idx || 0) % n + n) % n, p = ps[idx];
  const alt = o.alt != null ? o.alt : App.spName(id);
  const nav = n > 1 ? `<button type="button" class="car-btn prev" data-car-step="-1" aria-label="${L('Foto anterior', 'Previous photo')}">‹</button><button type="button" class="car-btn next" data-car-step="1" aria-label="${L('Foto siguiente', 'Next photo')}">›</button><span class="car-count" aria-hidden="true">${idx + 1} / ${n}</span>` : '';
  const credit = o.credit === true ? `<div class="car-credit" data-live="1">${App.credit(p)}</div>` : o.credit === 'later' ? `<div class="car-credit">${LATER()}</div>` : '';
  const zoom = o.key === 'zoom' ? '' : `<button type="button" class="car-zoom" data-car-zoom aria-label="${L('Ver la foto en grande', 'View the photo larger')}">⤢</button>`;
  return `<div class="car" data-car="${esc(o.key || '')}" data-sp="${esc(id)}" data-idx="${idx}" data-credit="${o.credit === true ? 'live' : ''}" role="group" aria-roledescription="${L('carrusel', 'carousel')}" aria-label="${L('Foto', 'Photo')} ${idx + 1} ${L('de', 'of')} ${n}"><div class="pframe car-frame"><img src="${esc(p.file)}" data-sp="${esc(id)}" alt="${esc(alt)}" style="${cropAttrs(p).style}" decoding="async"></div>${o.inner || ''}${nav}${zoom}</div>${credit}`;
};
/* Show photo i in a widget, in place, and tell its view. */
App.carouselShow = (car, i) => {
  const ps = App.photosOf(car.dataset.sp), n = ps.length;
  if (n < 2) return;
  i = (i % n + n) % n;
  const p = ps[i], img = car.querySelector('.car-frame img');
  if (img) { img.src = p.file; img.setAttribute('style', cropAttrs(p).style); }
  car.dataset.idx = i;
  car.setAttribute('aria-label', `${L('Foto', 'Photo')} ${i + 1} ${L('de', 'of')} ${n}`);
  const count = car.querySelector('.car-count'); if (count) count.textContent = `${i + 1} / ${n}`;
  const cr = car.nextElementSibling; if (cr && cr.classList.contains('car-credit') && cr.dataset.live) cr.innerHTML = App.credit(p);
  const live = document.getElementById('live'); if (live) live.textContent = `${L('Foto', 'Photo')} ${i + 1} ${L('de', 'of')} ${n}`;
  const fn = App.carouselStep[car.dataset.car]; if (fn) fn(i, car);
};
function carouselGo(car, step) { if (car) App.carouselShow(car, +car.dataset.idx + step); }
/* The same widget, large, in a modal dialog. It opens on the photo on show, keeps the source's alt text and
   credit rule (a quiz photo stays anonymous), and the source follows what is flipped here. */
let zoomSrc = null;
const zoomDlg = () => {
  let d = document.getElementById('zoom');
  if (!d) {
    d = document.createElement('dialog'); d.id = 'zoom'; d.className = 'zoom';
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-zoom-close]')) d.close(); });
    d.addEventListener('close', () => { zoomSrc = null; d.innerHTML = ''; });
    document.body.appendChild(d);
  }
  return d;
};
App.carouselStep.zoom = i => { if (zoomSrc && zoomSrc.isConnected) App.carouselShow(zoomSrc, i); };
App.openZoom = car => {
  const d = zoomDlg(), img = car.querySelector('.car-frame img');
  zoomSrc = car;
  d.innerHTML = `<button type="button" class="zoom-close" data-zoom-close aria-label="${L('Cerrar', 'Close')}">✕</button>${App.carousel(car.dataset.sp, { key: 'zoom', idx: +car.dataset.idx, alt: img ? img.alt : '', credit: car.dataset.credit === 'live' || undefined })}`;
  d.setAttribute('aria-label', L('Foto en grande', 'Large photo'));
  d.showModal();
};
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-car-step]');
  if (b) { carouselGo(b.closest('.car'), +b.dataset.carStep); return; }
  const z = e.target.closest && (e.target.closest('[data-car-zoom]') || e.target.closest('.car-frame'));
  const car = z && z.closest('.car');
  if (car && car.dataset.car !== 'zoom' && Date.now() - (App.lastSwipe || 0) > 500) App.openZoom(car);
});
document.addEventListener('keydown', e => {
  const dlg = document.getElementById('zoom');
  const car = (dlg && dlg.open && dlg.querySelector('.car')) || (e.target.closest && e.target.closest('.car'));
  if (car && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); carouselGo(car, e.key === 'ArrowLeft' ? -1 : 1); }
});
let swipe = null;
document.addEventListener('pointerdown', e => { const car = e.target.closest && e.target.closest('.car'); swipe = car && e.pointerType !== 'mouse' ? { car, x: e.clientX, y: e.clientY } : null; });
document.addEventListener('pointerup', e => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y, car = swipe.car; swipe = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > 1.5 * Math.abs(dy)) { App.lastSwipe = Date.now(); carouselGo(car, dx < 0 ? 1 : -1); }
});
/* A listed photo whose file is missing shows the "no photo" placeholder instead of a broken image;
   on practice screens (focus mode) without the name, which would give the answer away. */
document.addEventListener('error', e => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.dataset.sp) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = App.placeholder(img.dataset.sp, document.body.classList.contains('focus-mode'));
  img.replaceWith(tmp.firstChild);
}, true);

/* ---------- rings, medals, levels ---------- */
App.ring = (v, size) => {
  const r = 8, C = 2 * Math.PI * r;
  return `<svg class="ring ${v >= 1 ? 'full' : ''}" viewBox="0 0 22 22" width="${size || 22}" height="${size || 22}" aria-hidden="true"><circle class="bg" cx="11" cy="11" r="${r}" fill="none" stroke-width="3.2"/>${v > 0 ? `<circle class="fg" cx="11" cy="11" r="${r}" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="${(C * Math.min(1, v)).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 11 11)"/>` : ''}</svg>`;
};
App.medalSVG = (text, prog, size, opts) => {
  const r = 30, C = 2 * Math.PI * r, earned = prog >= 1 || (opts && opts.earned), stale = opts && opts.stale;
  return `<svg viewBox="0 0 76 76" width="${size || 76}" height="${size || 76}" aria-hidden="true">
    <circle cx="38" cy="38" r="${r}" fill="${earned ? 'var(--gold-soft)' : 'var(--paper)'}" stroke="var(--m0)" stroke-width="6" ${stale ? 'stroke-dasharray="4 3"' : ''}/>
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="${earned ? 'var(--gold)' : 'var(--accent)'}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C * Math.min(1, prog || 0)} ${C}" transform="rotate(-90 38 38)"/>
    <text x="38" y="43" text-anchor="middle" font-family="Iowan Old Style, Palatino, Georgia, serif" font-style="italic" font-weight="700" font-size="14" fill="${earned ? 'var(--gold)' : 'var(--ink)'}">${esc(String(text || '').slice(0, 4))}</text></svg>`;
};
App.lvDots = n => `<span class="lvl-dots" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
App.emptyNote = (title, body, cta) => `<div class="empty"><b>${title}</b><p class="small">${body}</p>${cta || ''}</div>`;

/* ---------- icons (inline SVG, no icon font) ---------- */
const ICON = {
  hoy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  explorar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18M5 7h6M11 7v5h6M11 12v6h7"/><circle cx="5" cy="3.5" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.6"/><circle cx="19" cy="18" r="1.6"/></svg>',
  insignias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/></svg>',
  como: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 1 1 3.8 2.6c-.7.3-1.1.9-1.1 1.6v.6"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>',
  ajustes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  feather: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 4C11 4 6 10 6 18M6 18l-2 2M20 4c0 8-5 13-11 13M10 9h6M8 13h6"/></svg>',
  flame: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/></svg>',
  device: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M8.5 10.5l2.2 2 4.8-4.5" stroke-linecap="round"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  photoName: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="7" width="22" height="18" rx="3"/><path d="M7 22l6-7 5 5 3-3 4 5"/><path d="M30 14h7M30 20h5M8 32h24" stroke-linecap="round"/></svg>',
  namePhoto: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8h14" stroke-linecap="round"/><rect x="5" y="15" width="13" height="10" rx="2"/><rect x="22" y="15" width="13" height="10" rx="2"/><rect x="5" y="28" width="13" height="9" rx="2"/><rect x="22" y="28" width="13" height="9" rx="2" stroke-width="3"/></svg>',
  sheet: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="4" width="24" height="32" rx="3"/><path d="M13 11h14M13 17h14M13 23h14M13 29h9" stroke-linecap="round"/></svg>',
  tree: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 34 20 20M20 20l14 14M20 20V6M13 27l7 7"/></svg>'
};

App.ICON = ICON;
App.badgeIcon = n => ICON[n] || '';

/* ---------- shell ---------- */
const TABS = [['hoy', 'Hoy', 'Today'], ['explorar', 'Explorar', 'Explore'], ['insignias', 'Insignias', 'Badges'], ['como-funciona', 'Cómo funciona', 'How it works', 'como'], ['ajustes', 'Ajustes', 'Settings']];
App.tabOf = r => {
  if (/^(nivel|sesion|hoja|cual-es|resumen|simulacro.*)$/.test(r)) return 'hoy';
  if (r === 'explorar' || r.startsWith('ficha-') || r.startsWith('grupo-')) return 'explorar';
  return r;
};
App.backupState = () => { const r = I.relDays(Store.data.meta.lastBackup); return { r, nudge: r.d >= 7 && Store.data.log.length > 0 }; };
function savebarHTML() {
  const { r, nudge } = App.backupState();
  if (!Store.ok) return `<span>${ICON.device}</span><span>${L('Este navegador no deja guardar: tu progreso se perderá al cerrar.', 'This browser won’t let us save: your progress will be lost when you close it.')}</span><button data-export>${L('Guardar copia', 'Save a copy')}</button>`;
  return `<a class="what" href="#como-funciona">${ICON.device}<span><b>${L('Progreso guardado en este navegador', 'Progress saved in this browser')}</b><br>${L('Última copia', 'Last copy')}: <span class="when">${esc(r.txt)}</span>${nudge ? ' · ' + L('conviene hacer una', 'time to make one') : ''}</span></a><button data-export>${L('Guardar copia', 'Save a copy')}</button>`;
}
function savecardHTML() {
  const { r, nudge } = App.backupState();
  if (!Store.ok) return `<div class="savecard nostore" role="status"><b>${L('No se puede guardar aquí', 'Can’t save here')}</b><br>${L('Guarda una copia antes de cerrar.', 'Save a copy before closing.')}<button data-export>${L('Guardar copia', 'Save a copy')}</button></div>`;
  return `<div class="savecard ${nudge ? 'nudge' : ''}" role="status"><span class="row" style="gap:.4rem;flex-wrap:nowrap"><span style="width:18px;flex:none">${ICON.device}</span><b>${L('Guardado en este navegador', 'Saved in this browser')}</b></span>
    ${L('Última copia', 'Last copy')}: <span class="when">${esc(r.txt)}</span>${nudge ? `<br><span class="tiny">${L('Conviene guardar una copia cada semana.', 'Save a copy every week or so.')}</span>` : ''}
    <button data-export>${L('Guardar copia', 'Save a copy')}</button></div>`;
}
App.counts = () => {
  const sp = App.M.order.map(id => App.M.species[id]), k = f => new Set(sp.map(s => s[f])).size;
  return { species: sp.length, classes: k('class'), orders: k('order'), photos: App.M.withPhotos.length };
};
App.shell = route => {
  const cur = App.tabOf(route), P = Store.data, c = App.counts();
  const tabs = TABS.map(([h, es, en, ic]) => `<a class="tab ${h === 'como-funciona' ? 'how' : ''}" href="#${h}" ${cur === h ? 'aria-current="page"' : ''}>${ICON[ic || h]}<span>${L(es, en)}</span></a>`).join('');
  const brand = `<a class="brand" href="#hoy">${ICON.feather}<span>${esc(I.APP_NAME())} <small>${esc(App.collectionName(App.collection()))}</small></span></a>`;
  document.title = `${I.APP_NAME()} · ${App.collectionName(App.collection())}`;
  const ed = App.M.bestiary.edition ? ` · ${L('lista', 'list')} ${esc(App.M.bestiary.edition)}` : '';
  document.getElementById('rail').innerHTML = brand + tabs + `<div class="rail-foot">${savecardHTML()}<p>${L(`${c.species} especies · ${c.classes} clases · ${c.orders} órdenes`, `${c.species} species · ${c.classes} classes · ${c.orders} orders`)}${ed}</p></div>`;
  document.getElementById('tabbar').innerHTML = tabs;
  const st = E.streak(P.days, Date.now());
  document.getElementById('topbar').innerHTML = brand + '<span class="spacer"></span>' +
    `<a class="chip streak" href="#insignias" aria-label="${L('Racha', 'Streak')}: ${st} ${L('días', 'days')}">${ICON.flame}${st}</a>` +
    `<button class="chip" id="langbtn" lang="${I.lang === 'es' ? 'en' : 'es'}" aria-label="${L('Switch to English', 'Cambiar a español')}">${L('EN', 'ES')}</button>`;
  const sb = document.getElementById('savebar');
  sb.className = 'savebar top' + (!Store.ok ? ' nostore' : App.backupState().nudge ? ' nudge' : '');
  sb.innerHTML = savebarHTML();
  const nb = document.getElementById('nostore');
  nb.hidden = Store.ok && !Store.error;
  if (!Store.ok) nb.innerHTML = `<b>${L('Este navegador no deja guardar tu progreso.', 'This browser won’t let us save your progress.')}</b> ${L('Puedes estudiar, pero todo se perderá al cerrar la pestaña. Abre la web en otro navegador (Chrome, Edge o Firefox) o usa la versión en internet; mientras, pulsa «Guardar copia» antes de cerrar.', 'You can study, but everything is lost when you close the tab. Open the site in another browser (Chrome, Edge or Firefox) or use the online version; meanwhile, press “Save a copy” before closing.')} <a href="#como-funciona">${L('Más información', 'More information')}</a>`;
  else if (Store.error) nb.innerHTML = `<b>${L('No se pudo guardar el último cambio.', 'The last change couldn’t be saved.')}</b> ${Store.error === 'quota' ? L('El navegador no tiene espacio para esta web.', 'The browser has no room left for this site.') : ''} ${L('Guarda una copia para no perderlo.', 'Save a copy so you don’t lose it.')} <button class="linkbtn" data-export>${L('Guardar copia', 'Save a copy')}</button>`;
  document.getElementById('langbtn').onclick = () => { App.setLang(I.lang === 'es' ? 'en' : 'es'); };
  document.documentElement.lang = I.lang;
};
App.setLang = lang => { Store.data.settings.lang = lang; I.lang = lang; Store.save(); App.render(true); };
App.applyTheme = () => { const t = Store.data.settings.theme; if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); };

/* ---------- toast ---------- */
App.toast = msg => { const t = document.getElementById('toast'); t.innerHTML = msg; t.hidden = false; clearTimeout(App.toast._t); App.toast._t = setTimeout(() => { t.hidden = true; }, 6000); };

/* ---------- export / import ---------- */
App.exportBackup = () => {
  const now = Date.now();
  const P = Store.data;
  const prevBackup = P.meta.lastBackup;
  P.meta.lastBackup = now;
  const data = E.makeExport(P, now, App.M.bestiary.edition, App.collection());
  try {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `visu-progreso-${App.collection()}-${E.ymd(now)}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    Store.save();
    App.toast(L(`Copia guardada en tu carpeta de descargas: <b>${esc(a.download)}</b>`, `Copy saved to your downloads folder: <b>${esc(a.download)}</b>`));
    App.render(true);
  } catch (e) {
    P.meta.lastBackup = prevBackup;
    App.toast(L('No se pudo crear el archivo. Prueba con otro navegador.', 'Couldn’t create the file. Try another browser.'));
  }
};
App.importText = text => {
  let res;
  try {
    res = E.parseImport(text, Date.now(), App.collection());
  } catch (err) {
    App.toast(err.code === 'other_collection' ? L(`Esa copia es de otra colección: <b>${esc(App.collectionName(err.collection))}</b>. Ábrela en Ajustes → Colección y recupera la copia allí. Tu progreso actual sigue igual.`, `That copy belongs to another collection: <b>${esc(App.collectionName(err.collection))}</b>. Open it in Settings → Collection and restore the copy there. Your current progress is unchanged.`)
      : err.code === 'newer' ? L('Esa copia es de una versión más nueva de la web. Actualiza esta copia de la web y vuelve a intentarlo.', 'That copy comes from a newer version of the site. Update this copy of the site and try again.')
      : err.code === 'invalid' ? L('Ese archivo tiene datos que no son válidos (quizá se editó a mano o no lo creó esta web), así que no se ha cargado. Tu progreso actual sigue igual.', 'That file contains invalid data (it may have been edited by hand or not made by this site), so it wasn’t loaded. Your current progress is unchanged.')
      : L('Ese archivo no es una copia de VISU. Elige el archivo .json que guardaste con «Guardar copia».', 'That file isn’t a VISU copy. Pick the .json file you saved with “Save a copy”.'));
    if (err.issues && window.console) console.warn('VISU import rejected:', err.issues.slice(0, 20));
    return false;
  }
  /* Rendering happens outside the try above: a screen error is not a bad file. */
  res.progress.meta.seenNotice = true;
  res.progress.meta.lastBackup = res.exportedAt || Date.now();
  const ok = Store.replace(res.progress);
  I.lang = Store.data.settings.lang === 'en' ? 'en' : 'es';
  App.applyTheme();
  const when = res.exportedAt ? I.fmtDate(res.exportedAt) : '?';
  App.toast(ok ? L(`Copia recuperada: ${res.answers} respuestas. Era del ${esc(when)}.`, `Copy restored: ${res.answers} answers. It was from ${esc(when)}.`)
    : L('Copia leída, pero este navegador no deja guardarla: se perderá al cerrar.', 'Copy read, but this browser won’t let us keep it: it will be lost when you close.'));
  App.render(true);
  return true;
};
document.getElementById('importfile').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => App.importText(String(rd.result));
  rd.onerror = () => App.toast(L('No se pudo leer el archivo.', 'Couldn’t read the file.'));
  rd.readAsText(f); e.target.value = '';
});
App.backupHTML = () => {
  const { r, nudge } = App.backupState();
  return `<div class="backup"><div class="status-line">${ICON.device}<span>${Store.ok ? L('Tu progreso se guarda en este navegador, en este dispositivo.', 'Your progress is saved in this browser, on this device.') : L('Este navegador no deja guardar. Guarda una copia antes de cerrar.', 'This browser won’t let us save. Save a copy before closing.')}</span></div>
    <p class="small" style="margin:0">${L('Última copia', 'Last copy')}: <b style="${nudge ? 'color:var(--gold)' : ''}">${esc(r.txt)}</b>${nudge ? ` · ${L('conviene hacer una', 'time to make one')}` : ''}</p>
    <div class="btns"><button class="btn primary" data-export>${ICON.download}${L('Guardar copia', 'Save a copy')}</button><button class="btn" data-import>${ICON.upload}${L('Recuperar copia', 'Restore a copy')}</button></div></div>`;
};

/* ---------- citations: numbered per card, popover with the source ---------- */
App.citeReg = {};
const pop = document.getElementById('pop');
let popFor = null;
function closePop() { pop.hidden = true; popFor = null; }
App.closePop = closePop;
document.addEventListener('click', e => {
  const ex = e.target.closest('[data-export]'); if (ex) { e.preventDefault(); App.exportBackup(); return; }
  const im = e.target.closest('[data-import]'); if (im) { e.preventDefault(); document.getElementById('importfile').click(); return; }
  const b = e.target.closest('.cite');
  if (b) {
    e.preventDefault();
    if (popFor === b && !pop.hidden) { closePop(); return; }
    const s = App.citeReg[b.dataset.src] || {};
    pop.innerHTML = `<button class="close" aria-label="${L('Cerrar', 'Close')}">×</button><b>${esc(b.textContent)}. ${esc(s.title || b.dataset.src)}</b>${s.license ? `<span class="muted">${L('Licencia', 'Licence')}: ${esc(s.license)}</span>` : ''}${s.retrieved ? `<span class="muted">${L('Consultado', 'Retrieved')}: ${esc(s.retrieved)}</span>` : ''}<br>${I.url(s.url) ? `<a href="${esc(I.url(s.url))}" target="_blank" rel="noopener">${L('Abrir la fuente ↗', 'Open the source ↗')}</a> · ` : ''}<a href="#" data-ref="${esc(b.dataset.src)}">${L('Ver en referencias', 'See in references')}</a>`;
    pop.hidden = false; popFor = b;
    const r = b.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(window.scrollX + r.left - 20, document.documentElement.clientWidth - pop.offsetWidth - 8)) + 'px';
    pop.querySelector('.close').onclick = closePop;
    pop.querySelector('[data-ref]').onclick = ev => {
      ev.preventDefault();
      const li = document.getElementById('ref-' + ev.target.dataset.ref);
      closePop();
      if (li) { li.scrollIntoView({ behavior: App.REDUCED.matches ? 'auto' : 'smooth', block: 'center' }); li.classList.add('flash'); setTimeout(() => li.classList.remove('flash'), 1800); }
    };
    pop.querySelector('a').focus();
    return;
  }
  if (!e.target.closest('#pop')) closePop();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { const b = popFor; closePop(); if (b) b.focus(); } });

/* ---------- first-visit notice ---------- */
App.showNotice = () => {
  const host = document.getElementById('notice-host');
  host.innerHTML = `<div class="scrim"><div class="notice" role="dialog" aria-modal="true" aria-labelledby="nt-h">
    <svg class="ill" viewBox="0 0 300 70" aria-hidden="true"><rect x="2" y="8" width="120" height="56" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/><text x="62" y="41" text-anchor="middle" font-size="13" font-weight="800" fill="var(--accent)" font-family="system-ui">${L('Tu progreso', 'Your progress')}</text>
      <path d="M132 36 h70" stroke="var(--accent)" stroke-width="2.5" stroke-dasharray="5 4"/><path d="M196 30 l8 6 -8 6" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
      <path d="M214 10 h50 l18 18 v38 h-68 z" fill="var(--surface)" stroke="var(--ink)" stroke-width="2"/><text x="248" y="48" text-anchor="middle" font-size="11" font-weight="800" fill="var(--ink)" font-family="system-ui">.json</text></svg>
    <h2 id="nt-h">${L('Hola. Antes de empezar, una cosa importante', 'Hi. One important thing before you start')}</h2>
    ${Store.ok ? `<p>${L('Tu progreso se guarda <b>solo en este navegador, en este dispositivo</b>. No hay cuentas ni servidores, así que nadie más lo ve.', 'Your progress is saved <b>only in this browser, on this device</b>. There are no accounts or servers, so nobody else sees it.')}</p>
    <p>${L('Si cambias de navegador o de dispositivo, o borras los datos del navegador, no lo verás. Para no perderlo, <b>guarda una copia</b> de vez en cuando.', 'If you switch browser or device, or clear your browser data, you won’t see it. To keep it safe, <b>save a copy</b> now and then.')}</p>`
    : `<p><b>${L('Este navegador no deja guardar tu progreso.', 'This browser won’t let us save your progress.')}</b> ${L('Puedes estudiar, pero se perderá al cerrar. Abre la web en otro navegador o usa la versión en internet.', 'You can study, but it is lost when you close. Open the site in another browser or use the online version.')}</p>`}
    <p class="small muted">${L('Sin cookies y sin seguimiento.', 'No cookies and no tracking.')}</p>
    <div class="row"><button class="btn primary" id="nt-ok">${L('Entendido', 'Got it')}</button><button class="btn" id="nt-more">${L('Saber más', 'Learn more')}</button></div></div></div>`;
  const close = () => { Store.data.meta.seenNotice = true; Store.save(); host.innerHTML = ''; };
  document.getElementById('nt-ok').onclick = () => { close(); App.main().focus({ preventScroll: true }); };
  document.getElementById('nt-more').onclick = () => { close(); location.hash = 'como-funciona'; };
  host.querySelector('.notice').addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;   // aria-modal: keep focus inside the notice
    const f = host.querySelectorAll('.notice button'), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.getElementById('nt-ok').focus();
};
})();
