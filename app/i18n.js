/* VISU · language helpers and fixed labels. Classic script: defines window.VISU_I18N. */
(function () {
'use strict';
const I = { lang: 'es' };

I.L = (es, en) => (I.lang === 'en' ? en : es);
/* Bilingual object {es, en} from the data files; falls back to whichever language exists. */
I.t = o => (o == null ? '' : typeof o === 'string' ? o : (o[I.lang] != null ? o[I.lang] : o.es != null ? o.es : o.en != null ? o.en : ''));
I.list = o => { const v = o && (o[I.lang] || o.es || o.en); return Array.isArray(v) ? v : []; };
I.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* The only way a data URL becomes a link: http(s) or nothing (no javascript:, data:, …). */
I.url = u => (typeof u === 'string' && /^https?:\/\/[^\s/]/i.test(u) ? u : '');
I.REPO_URL = 'https://github.com/davidsaid/visu-study-tool';
I.APP_NAME = () => I.L('Herramienta de estudio para VISU', 'VISU Study Tool');
I.pct = x => Math.round((x || 0) * 100) + '%';

I.SKILLS = ['class', 'order', 'genus', 'species', 'common'];
const SKILL_NAME = {
  class: ['Clase', 'Class'], order: ['Orden', 'Order'], genus: ['Género', 'Genus'],
  species: ['Especie', 'Species'], common: ['Nombre vulgar', 'Common name'], binomial: ['Género y especie', 'Genus and species']
};
I.sk = k => I.L(SKILL_NAME[k][0], SKILL_NAME[k][1]);

I.LEVELS = {
  1: { key: 'facil', es: 'Fácil', en: 'Easy', des: 'Opción múltiple: eliges entre cuatro. Las tarjetas que ya acertaste pasan a escribirse, con pistas.', den: 'Multiple choice: pick one of four. Cards you’ve already got right move on to typing, with hints.' },
  2: { key: 'medio', es: 'Medio', en: 'Medium', des: 'Escribes la respuesta. Si te atascas, pide hasta 3 pistas.', den: 'Type the answer. Stuck? Ask for up to 3 hints.' },
  3: { key: 'dificil', es: 'Difícil', en: 'Hard', des: 'Escribes la respuesta, sin ayudas. Como en el examen.', den: 'Type the answer, no help. Like the exam.' }
};
I.lvName = n => I.L(I.LEVELS[n].es, I.LEVELS[n].en);
I.lvDes = n => I.L(I.LEVELS[n].des, I.LEVELS[n].den);
I.MASTERY_RULE = () => I.L(
  'Solo las respuestas en Difícil y sin pistas cuentan para «dominada». Fácil y Medio suben tu progreso hasta la mitad; la otra mitad se gana en Difícil.',
  'Only answers on Hard, without hints, count toward “mastered”. Easy and Medium take your progress up to half; the other half is earned on Hard.');

I.FIELD = {
  distribution: ['Distribución', 'Distribution'], habitat: ['Hábitat', 'Habitat'], diet: ['Dieta', 'Diet'], mass: ['Masa', 'Mass'],
  length: ['Longitud', 'Length'], dimorphism: ['Dimorfismo sexual', 'Sexual dimorphism'], sex_determination: ['Determinación del sexo', 'Sex determination'],
  lifespan: ['Longevidad', 'Lifespan'], reproduction: ['Reproducción', 'Reproduction'], activity: ['Actividad', 'Activity'],
  migration: ['Migración', 'Migration'], iucn: ['UICN (mundial)', 'IUCN (global)'], spain: ['Catálogo español', 'Spanish catalogue']
};
/* Body parts a field mark can describe (content field_marks.parts); the order is the order of the comparison rows. */
I.PART = {
  shape: ['Forma y tamaño', 'Shape and size'], head: ['Cabeza', 'Head'], colour: ['Color y dibujo', 'Colour and pattern'],
  skin: ['Piel y cobertura', 'Skin and covering'], wings: ['Alas', 'Wings'], fins: ['Aletas', 'Fins'], legs: ['Patas', 'Legs'],
  tail: ['Cola', 'Tail'], sexes: ['Machos y hembras', 'Males and females'], young: ['Jóvenes', 'Young'], behaviour: ['Comportamiento', 'Behaviour']
};
I.fieldName = f => (I.FIELD[f] ? I.L(I.FIELD[f][0], I.FIELD[f][1]) : f);
I.IUCN = {
  LC: ['Preocupación menor', 'Least concern'], NT: ['Casi amenazada', 'Near threatened'], VU: ['Vulnerable', 'Vulnerable'],
  EN: ['En peligro', 'Endangered'], CR: ['En peligro crítico', 'Critically endangered'], EW: ['Extinta en estado silvestre', 'Extinct in the wild'],
  EX: ['Extinta', 'Extinct'], DD: ['Datos insuficientes', 'Data deficient'], NE: ['No evaluada', 'Not evaluated']
};
I.RANK = { clade: ['clado', 'clade'], class: ['clase', 'class'], order: ['orden', 'order'], infraorder: ['infraorden', 'infraorder'], species: ['especie', 'species'] };
I.rankName = r => (I.RANK[r] ? I.L(I.RANK[r][0], I.RANK[r][1]) : r || '');

I.locale = () => (I.lang === 'en' ? 'en-GB' : 'es-ES');
I.fmtDate = (d, opts) => new Date(d).toLocaleDateString(I.locale(), opts || { day: 'numeric', month: 'long', year: 'numeric' });

const DAY = 864e5;
/* Whole calendar days between a timestamp and today (local time). */
I.daysAgo = ts => { const a = new Date(ts); a.setHours(0, 0, 0, 0); const b = new Date(); b.setHours(0, 0, 0, 0); return Math.round((b - a) / DAY); };
I.relDays = ts => {
  if (!ts) return { d: Infinity, txt: I.L('nunca', 'never') };
  const d = I.daysAgo(ts);
  return { d, txt: d <= 0 ? I.L('hoy', 'today') : d === 1 ? I.L('ayer', 'yesterday') : I.L(`hace ${d} días`, `${d} days ago`) };
};
/* "in 10 min", "in 3 days": for the "back in" line after an answer. */
I.inTime = ms => {
  const m = Math.max(1, Math.round(ms / 6e4));
  if (m < 60) return I.L(`${m} min`, `${m} min`);
  const h = Math.round(m / 60);
  if (h < 24) return I.L(`${h} h`, `${h} h`);
  const d = Math.round(h / 24);
  return d === 1 ? I.L('1 día', '1 day') : I.L(`${d} días`, `${d} days`);
};

window.VISU_I18N = I;
})();
