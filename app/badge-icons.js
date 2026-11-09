/* VISU · badge icons: one cartoon of an iconic species per class, order and single-species batch (vertebrates).
   Drawn by hand as SVG for this project (MIT, like the code); decoration only, but each keeps the species' real field
   marks. viewBox 0 0 100 100, drawn to sit inside a circle of radius 44. Keyed by tree node id; a node without an icon
   keeps the text medal. `sp` is the species drawn (named in the medal's tooltip). Classic script: defines window.VISU_ICONS. */
(function () {
'use strict';
const EYE = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#1b1b22"/><circle cx="${x + r * .35}" cy="${y - r * .35}" r="${r * .38}" fill="#fff"/>`;
/* A side-view fish facing left: body, darker back, pale belly, tail and fins; `extra` is drawn on top. */
const fish = (o) => `
  <path d="M74 50 L${o.tail || '92 32 L88 50 L92 68'} Z" fill="${o.fin || o.back}"/>
  <path d="M40 ${o.top || 32} L${o.dorsal || '58 22 L64 36'} Z" fill="${o.fin || o.back}"/>
  <path d="M12 50 C20 ${o.top || 32} 56 ${(o.top || 32) - 2} 76 50 C56 ${102 - (o.top || 32)} 20 ${100 - (o.top || 32)} 12 50Z" fill="${o.body}"/>
  <path d="M12 50 C20 ${o.top || 32} 56 ${(o.top || 32) - 2} 76 50 C56 44 26 42 12 50Z" fill="${o.back}"/>
  <path d="M14 52 C26 ${92 - (o.top || 32)} 52 ${94 - (o.top || 32)} 72 54 C52 58 30 58 14 52Z" fill="${o.belly}"/>
  <path d="M40 58 L34 70 L46 62 Z" fill="${o.fin || o.back}"/>
  ${EYE(o.eyeX || 24, o.eyeY || 46, o.eyeR || 3.4)}
  <path d="M13 53 C15 54 17 54 19 53" stroke="#2a2a30" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  ${o.extra || ''}`;

const I = {
 /* ---------- classes ---------- */
 'class:Myxini': { sp: 'myxine_glutinosa', svg: `
  <path d="M84 66 C92 54 84 36 66 36 C46 36 44 60 30 62 C20 63 14 58 14 52" stroke="#c98c86" stroke-width="15" fill="none" stroke-linecap="round"/>
  <path d="M84 66 C92 54 84 36 66 36 C46 36 44 60 30 62 C20 63 14 58 14 52" stroke="#dba7a0" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M8 50 l-4 -4 M8 53 l-5 0 M9 56 l-4 4" stroke="#b0706a" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="40" cy="74" r="3" fill="#cfe3f2" opacity=".9"/><circle cx="50" cy="80" r="2.2" fill="#cfe3f2" opacity=".9"/><circle cx="60" cy="72" r="2.6" fill="#cfe3f2" opacity=".9"/>` },
 'class:Hyperoartia': { sp: 'lampetra_fluviatilis', svg: `
  <path d="M18 50 C30 40 50 44 62 50 C72 56 82 58 92 52" stroke="#7d8794" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M20 54 C32 48 50 52 62 56 C72 60 82 60 92 56" stroke="#d9dee5" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M70 42 C76 40 82 42 86 46" stroke="#6a7380" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="16" cy="51" r="7" fill="#9aa3ad"/><circle cx="12" cy="52" r="3.4" fill="#c46e66"/>
  ${EYE(22, 46, 2.6)}
  ${[30, 34, 38, 42, 46, 50, 54].map(x => `<circle cx="${x}" cy="49" r="1.3" fill="#3e444d"/>`).join('')}` },
 'class:Chondrichthyes': { sp: 'prionace_glauca', svg: `
  <path d="M80 52 L96 30 L90 54 L94 72 Z" fill="#3f6fb4"/>
  <path d="M46 42 L56 20 L62 44 Z" fill="#3f6fb4"/>
  <path d="M4 56 C14 46 38 40 58 42 C72 44 82 50 86 54 C80 60 66 64 46 64 C26 64 12 62 4 56Z" fill="#4c80c8"/>
  <path d="M6 58 C18 64 40 66 60 62 C44 60 26 60 6 58Z" fill="#eef3fa"/>
  <path d="M30 58 L22 78 L40 62 Z" fill="#3f6fb4"/>
  ${EYE(18, 52, 2.8)}
  <path d="M36 50 l0 7 M40 50 l0 7 M44 50 l0 7" stroke="#2f5a96" stroke-width="1.3" stroke-linecap="round"/>` },
 'class:Actinopterygii': { sp: 'hippocampus_zosterae', svg: `
  <path d="M56 26 C70 26 74 40 66 48 C60 54 66 62 66 70 C66 82 54 90 46 84 C40 80 44 72 50 74 C54 76 52 80 50 80" stroke="#e6a43a" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M56 26 C70 26 74 40 66 48 C60 54 66 62 66 70 C66 82 54 90 46 84" stroke="#f3c463" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M50 30 L30 30 L30 36 L48 38 Z" fill="#e6a43a"/>
  <path d="M58 22 L60 14 L64 22 Z M64 24 L68 18 L68 26 Z" fill="#d48f2a"/>
  <path d="M70 44 C80 42 82 52 74 56 Z" fill="#f7d891" opacity=".9"/>
  ${EYE(56, 31, 3.2)}
  ${[46, 54, 62, 70].map(y => `<path d="M${y < 60 ? 62 : 64} ${y} l6 -1" stroke="#c98722" stroke-width="1.4" stroke-linecap="round"/>`).join('')}` },
 'class:Sarcopterygii': { sp: 'latimeria_chalumnae', svg: fish({ body: '#3d4f78', back: '#2e3d60', belly: '#4f6290', fin: '#2e3d60', top: 30, tail: '90 36 L84 50 L90 64 L98 50',
   extra: `<ellipse cx="44" cy="68" rx="7" ry="4" fill="#2e3d60" transform="rotate(30 44 68)"/><ellipse cx="36" cy="60" rx="7" ry="4" fill="#2e3d60" transform="rotate(40 36 60)"/>
   ${[[34, 42], [48, 40], [58, 46], [42, 52], [56, 56], [66, 50], [28, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#e8edf6"/>`).join('')}` }) },
 'class:Amphibia': { sp: 'ambystoma_mexicanum', svg: `
  <path d="M62 62 C76 62 88 70 92 80 C84 78 74 74 62 72Z" fill="#f2b8c0"/>
  <ellipse cx="52" cy="64" rx="20" ry="11" fill="#f6c4cb"/>
  <path d="M40 72 L34 82 M46 74 L44 84 M62 72 L66 82" stroke="#f2b0b8" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="34" cy="50" rx="20" ry="16" fill="#f6c4cb"/>
  <path d="M16 40 C8 34 6 30 8 26 M18 46 C8 46 4 42 4 38 M50 40 C58 34 60 30 58 26 M48 46 C58 46 62 42 62 38" stroke="#e0607a" stroke-width="4" fill="none" stroke-linecap="round"/>
  ${EYE(27, 48, 2.6)}${EYE(41, 48, 2.6)}
  <path d="M28 56 C32 59 36 59 40 56" stroke="#a5505e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <circle cx="23" cy="54" r="2.4" fill="#ef8ea0" opacity=".7"/><circle cx="45" cy="54" r="2.4" fill="#ef8ea0" opacity=".7"/>` },
 'class:Reptilia': { sp: 'chamaeleo_chamaeleon', svg: `
  <path d="M6 80 C30 74 70 74 96 80" stroke="#7a5a3a" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M70 58 C84 58 86 72 78 74 C72 76 70 68 76 68 C80 68 78 62 72 64" stroke="#6aa843" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M22 50 C26 36 46 32 62 40 C72 46 74 60 66 66 C56 72 34 72 24 64 C20 60 20 54 22 50Z" fill="#7bbb4f"/>
  <path d="M26 48 C30 38 44 34 58 40" stroke="#5e9a38" stroke-width="3" fill="none" stroke-dasharray="2 3"/>
  <path d="M22 50 C20 40 28 30 40 32 L30 50 Z" fill="#6aa843"/>
  <circle cx="28" cy="52" r="7" fill="#8dca5f"/>${EYE(29, 52, 3)}
  <path d="M14 58 C18 60 22 60 26 58" stroke="#3f6e26" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <path d="M36 68 L34 78 M60 68 L62 78" stroke="#6aa843" stroke-width="4" stroke-linecap="round"/>` },
 'class:Aves': { sp: 'upupa_epops', svg: `
  <path d="M40 30 L26 10 M44 28 L36 8 M48 28 L48 8 M52 28 L60 10 M54 30 L68 14" stroke="#e39a4c" stroke-width="6" stroke-linecap="round"/>
  <path d="M26 10 l0 0 M36 8 l0 0 M48 8 l0 0 M60 10 l0 0 M68 14 l0 0" stroke="#1d1d22" stroke-width="6" stroke-linecap="round"/>
  <path d="M84 60 L94 54 L94 70 Z" fill="#1d1d22"/>
  <ellipse cx="60" cy="62" rx="26" ry="16" fill="#e8a65a"/>
  <path d="M58 52 C70 50 82 54 86 60 C80 70 68 74 60 72 Z" fill="#1d1d22"/>
  <path d="M64 56 l16 2 M62 62 l20 2 M62 68 l16 1" stroke="#f4f0e6" stroke-width="3" stroke-linecap="round"/>
  <circle cx="44" cy="42" r="14" fill="#e8a65a"/>
  ${EYE(40, 40, 3)}
  <path d="M32 44 C22 46 14 52 8 60" stroke="#2a2a2e" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M54 78 l-2 10 M62 78 l0 10" stroke="#55555c" stroke-width="2.4" stroke-linecap="round"/>` },
 'class:Mammalia': { sp: 'ursus_arctos', svg: `
  <circle cx="26" cy="28" r="12" fill="#7a4e2c"/><circle cx="74" cy="28" r="12" fill="#7a4e2c"/>
  <circle cx="26" cy="28" r="6" fill="#a8744a"/><circle cx="74" cy="28" r="6" fill="#a8744a"/>
  <path d="M50 22 C74 22 84 40 84 56 C84 76 68 88 50 88 C32 88 16 76 16 56 C16 40 26 22 50 22Z" fill="#8b5a33"/>
  <ellipse cx="50" cy="66" rx="17" ry="13" fill="#c99a6c"/>
  ${EYE(38, 50, 3.6)}${EYE(62, 50, 3.6)}
  <ellipse cx="50" cy="60" rx="6" ry="4.4" fill="#2a1d16"/>
  <path d="M50 64 L50 70 M50 70 C47 73 44 72 43 70 M50 70 C53 73 56 72 57 70" stroke="#2a1d16" stroke-width="1.6" fill="none" stroke-linecap="round"/>` },

 /* ---------- single-species batches ---------- */
 'solos:peces': { sp: 'lophius_piscatorius', svg: `
  <path d="M40 22 C40 10 52 6 56 14" stroke="#6b5a44" stroke-width="2" fill="none"/><circle cx="57" cy="15" r="4" fill="#ffe27a"/><circle cx="57" cy="15" r="7" fill="#ffe27a" opacity=".35"/>
  <path d="M78 54 L94 40 L90 56 L94 72 Z" fill="#8a7458"/>
  <path d="M14 56 C10 34 30 24 52 28 C70 32 82 44 80 56 C78 70 62 78 44 78 C26 78 16 70 14 56Z" fill="#9c8462"/>
  <path d="M14 56 C24 60 40 60 54 54 C48 66 34 72 18 68Z" fill="#5a2f2a"/>
  <path d="M16 57 l4 5 l3 -5 l4 6 l3 -6 l4 6 l3 -6 l4 5 l3 -5 M20 66 l3 -4 l3 4 l4 -5 l3 5 l4 -5 l3 5" stroke="#fffaf0" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
  ${EYE(40, 42, 3.4)}
  <circle cx="64" cy="44" r="2" fill="#7a6448"/><circle cx="70" cy="60" r="2.4" fill="#7a6448"/><circle cx="58" cy="68" r="2" fill="#7a6448"/>` },
 'solos:aves': { sp: 'aptenodytes_forsteri', svg: `
  <path d="M40 90 l-6 3 l10 0 Z M60 90 l6 3 l-10 0 Z" fill="#e8a83a"/>
  <ellipse cx="50" cy="60" rx="24" ry="32" fill="#22252e"/>
  <path d="M28 52 C20 66 22 78 30 82 C30 70 32 60 34 54Z M72 52 C80 66 78 78 70 82 C70 70 68 60 66 54Z" fill="#1a1c24"/>
  <ellipse cx="50" cy="66" rx="16" ry="25" fill="#f6f2e8"/>
  <path d="M38 46 C42 52 46 54 50 54 C54 54 58 52 62 46 C60 56 56 60 50 60 C44 60 40 56 38 46Z" fill="#f9e3a2"/>
  <circle cx="50" cy="34" r="16" fill="#22252e"/>
  <path d="M34 36 C32 42 34 48 40 50 C38 44 38 40 40 36Z M66 36 C68 42 66 48 60 50 C62 44 62 40 60 36Z" fill="#f2a628"/>
  ${EYE(44, 32, 3)}${EYE(56, 32, 3)}
  <path d="M50 37 L46 43 L50 45 L54 43 Z" fill="#3a3a44"/><path d="M47 43.5 L53 43.5" stroke="#f08a4b" stroke-width="1.4"/>` },
 'solos:tetrapodos': { sp: 'trichechus_manatus', svg: `
  <path d="M74 50 C86 44 96 50 92 60 C88 66 80 62 74 58Z" fill="#8d97a2"/>
  <path d="M10 56 C10 40 30 34 50 36 C66 38 78 46 78 56 C78 66 64 72 46 72 C26 72 10 68 10 56Z" fill="#a3adb8"/>
  <path d="M30 66 C28 74 22 78 18 76 C20 72 24 68 26 64Z" fill="#8d97a2"/>
  <ellipse cx="18" cy="58" rx="10" ry="9" fill="#b9c2cc"/>
  ${EYE(22, 50, 2.6)}
  <path d="M10 58 l-4 -1 M10 61 l-4 1 M12 63 l-3 3" stroke="#6f7883" stroke-width="1.2" stroke-linecap="round"/>
  <circle cx="14" cy="57" r="1" fill="#555d66"/><circle cx="17" cy="60" r="1" fill="#555d66"/>
  <path d="M40 44 c4 -2 8 -2 12 0 M50 56 c4 -2 8 -2 12 0" stroke="#8d97a2" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <circle cx="60" cy="24" r="2.6" fill="#cfe3f2"/><circle cx="66" cy="16" r="1.8" fill="#cfe3f2"/>` },

 /* ---------- orders: fish ---------- */
 'order:Petromyzontiformes': { sp: 'petromyzon_marinus', svg: `
  <path d="M86 90 C92 70 78 60 64 58" stroke="#7a6a4e" stroke-width="16" fill="none" stroke-linecap="round"/>
  <circle cx="48" cy="48" r="26" fill="#8f7d5c"/>
  <circle cx="44" cy="52" r="17" fill="#e8b7a8"/>
  <circle cx="44" cy="52" r="9" fill="#9b3f38"/>
  ${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<circle cx="${(44 + Math.cos(a) * 13).toFixed(1)}" cy="${(52 + Math.sin(a) * 13).toFixed(1)}" r="1.6" fill="#fffaf0"/>`; }).join('')}
  ${Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2 + .3; return `<circle cx="${(44 + Math.cos(a) * 5.5).toFixed(1)}" cy="${(52 + Math.sin(a) * 5.5).toFixed(1)}" r="1.1" fill="#fffaf0"/>`; }).join('')}
  ${EYE(64, 32, 3)}` },
 'order:Lamniformes': { sp: 'carcharodon_carcharias', svg: `
  <path d="M82 54 L96 34 L92 56 L96 76 Z" fill="#7f8ea3"/>
  <path d="M44 38 L54 12 L62 40 Z" fill="#7f8ea3"/>
  <path d="M6 58 C14 44 36 36 56 38 C72 40 84 48 88 56 C82 64 66 70 46 70 C26 70 12 66 6 58Z" fill="#8a9ab0"/>
  <path d="M8 60 C18 70 38 74 60 68 C46 64 28 62 8 60Z" fill="#f2f4f8"/>
  <path d="M52 64 L60 80 L66 66 Z" fill="#7f8ea3"/>
  ${EYE(26, 52, 3)}
  <path d="M12 62 C18 66 26 66 32 63" stroke="#3a4250" stroke-width="1.6" fill="#fff"/>
  <path d="M15 63 l2 2.5 l2 -2 l2 2.5 l2 -2 l2 2.5 l2 -2" stroke="#3a4250" stroke-width="1" fill="none"/>
  <path d="M38 50 l0 8 M42 50 l0 8 M46 50 l0 8" stroke="#6b7a90" stroke-width="1.4" stroke-linecap="round"/>` },
 'order:Carcharhiniformes': { sp: 'sphyrna_zygaena', svg: `
  <path d="M44 36 C38 54 42 74 50 96 C58 74 62 54 56 36Z" fill="#8796a8"/>
  <path d="M47 40 C45 56 47 74 50 90 C53 74 55 56 53 40Z" fill="#a3b0c0"/>
  <path d="M44 52 L24 66 L46 62Z M56 52 L76 66 L54 62Z" fill="#7a899b"/>
  <path d="M12 30 C12 22 88 22 88 30 C88 38 62 36 56 40 L44 40 C38 36 12 38 12 30Z" fill="#8796a8"/>
  ${EYE(15, 30, 3)}${EYE(85, 30, 3)}
  <path d="M42 36 C46 38 54 38 58 36" stroke="#3a4250" stroke-width="1.4" fill="none" stroke-linecap="round"/>` },
 'order:Myliobatiformes': { sp: 'mobula_mobular', svg: `
  <path d="M50 64 C52 76 60 88 74 94" stroke="#3a4a66" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M50 30 C60 30 70 42 96 50 C80 58 66 64 50 68 C34 64 20 58 4 50 C30 42 40 30 50 30Z" fill="#3e5272"/>
  <path d="M50 46 C58 48 70 52 84 52 C70 58 60 62 50 64 C40 62 30 58 16 52 C30 52 42 48 50 46Z" fill="#5b7194"/>
  <path d="M40 32 C38 24 42 20 44 22 L46 32Z M60 32 C62 24 58 20 56 22 L54 32Z" fill="#3e5272"/>
  ${EYE(42, 38, 2.8)}${EYE(58, 38, 2.8)}
  <path d="M44 46 C48 49 52 49 56 46" stroke="#e8eef8" stroke-width="1.8" fill="none" stroke-linecap="round"/>` },
 'order:Acipenseriformes': { sp: 'acipenser_sturio', svg: `
  <path d="M74 48 L94 28 L88 52 L96 66 L76 60 Z" fill="#6b7868"/>
  <path d="M6 54 C18 44 50 40 76 46 L76 60 C50 66 24 64 12 60Z" fill="#7c8a7a"/>
  <path d="M12 60 C30 66 56 64 76 60 C56 58 30 58 12 60Z" fill="#dcdfd2"/>
  ${[24, 34, 44, 54, 64].map(x => `<path d="M${x} 43 l3 -3 l3 3 l-3 3Z" fill="#ece9da"/>`).join('')}
  ${[30, 42, 54, 66].map(x => `<path d="M${x} 54 l2.4 -2.4 l2.4 2.4 l-2.4 2.4Z" fill="#ece9da"/>`).join('')}
  <path d="M14 60 l-1 6 M17 60 l0 7 M20 60 l1 6" stroke="#4e5a4c" stroke-width="1.4" stroke-linecap="round"/>
  ${EYE(20, 51, 2.6)}
  <path d="M40 62 L34 72 L46 64Z" fill="#6b7868"/>` },
 'order:Anguilliformes': { sp: 'muraena_helena', svg: `
  <path d="M30 96 C24 80 26 62 40 52" stroke="#5a4426" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="M40 36 C56 30 74 34 84 42 L66 48 L86 56 C74 64 56 66 42 62 C30 58 28 42 40 36Z" fill="#6a5230"/>
  <path d="M66 48 L84 43 L86 55 Z" fill="#c4535a"/>
  <path d="M70 46 l2 3 l2 -3.4 l2 3 l2 -3.4 l2 3 M70 52 l2 -3 l2 3 l2 -3 l2 3 l2 -3" stroke="#fffaf0" stroke-width="1.2" fill="none"/>
  ${EYE(62, 40, 3)}
  ${[[44, 44], [50, 56], [36, 66], [28, 80], [40, 82], [56, 46], [32, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#e5cf7c"/>`).join('')}` },
 'order:Clupeiformes': { sp: 'sardina_pilchardus', svg: fish({ body: '#c9d4de', back: '#3e6e9c', belly: '#eef2f6', fin: '#8aa3bb', top: 36,
   extra: [30, 38, 46].map(x => `<circle cx="${x}" cy="48" r="2" fill="#2d4a68"/>`).join('') }) },
 'order:Cypriniformes': { sp: 'carassius_auratus', svg: `
  <path d="M70 50 C84 30 98 34 94 44 C90 50 92 52 96 58 C98 68 84 70 70 50Z" fill="#f6a23c" opacity=".9"/>
  <path d="M36 30 L50 20 L58 32 Z" fill="#f08a2a"/>
  <ellipse cx="44" cy="50" rx="30" ry="22" fill="#f58a26"/>
  <ellipse cx="40" cy="58" rx="18" ry="10" fill="#fbbf6a"/>
  <path d="M44 66 L38 78 L50 70Z" fill="#f08a2a"/>
  ${EYE(26, 44, 5)}
  <ellipse cx="17" cy="54" rx="2.6" ry="2" fill="#c45f16"/>
  <path d="M50 38 c4 4 4 10 0 14 M58 40 c4 4 4 8 0 12" stroke="#e07818" stroke-width="1.4" fill="none"/>` },
 'order:Characiformes': { sp: 'serrasalmus_rhombeus', svg: `
  <path d="M76 50 L92 34 L88 50 L92 66 Z" fill="#4a5058"/>
  <path d="M40 24 L56 18 L60 30 Z" fill="#4a5058"/>
  <path d="M10 52 C12 30 40 20 60 28 C74 34 78 44 76 50 C78 58 72 70 58 74 C40 80 14 74 10 52Z" fill="#7d8792"/>
  <path d="M12 58 C20 72 40 78 58 74 C70 70 74 62 74 56 C56 64 32 64 12 58Z" fill="#d9584a"/>
  <path d="M10 52 L26 56 L12 60 Z" fill="#3a3f46"/>
  <path d="M12 56 l3 3 l3 -3 l3 3 l3 -3" stroke="#fff" stroke-width="1.4" fill="none"/>
  ${EYE(24, 44, 3.6)}
  ${[[40, 40], [50, 36], [46, 48], [56, 44], [62, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="#5a636e"/>`).join('')}` },
 'order:Salmoniformes': { sp: 'salmo_trutta', svg: fish({ body: '#c8b27a', back: '#7a6a3e', belly: '#f1e7c8', fin: '#8a7a4c', top: 34,
   extra: `<path d="M64 36 L68 32 L70 38Z" fill="#8a7a4c"/>${[[32, 44, '#2b2620'], [42, 42, '#2b2620'], [52, 44, '#2b2620'], [38, 52, '#c8402e'], [50, 52, '#c8402e'], [60, 48, '#2b2620'], [46, 36, '#2b2620']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${c}"/>`).join('')}` }) },
 'order:Gadiformes': { sp: 'gadus_morhua', svg: `
  <path d="M74 50 L90 36 L88 50 L90 64 Z" fill="#8a8458"/>
  <path d="M30 34 L36 24 L42 34 Z M46 33 L52 24 L58 34 Z M60 36 L66 28 L70 40 Z" fill="#8a8458"/>
  <path d="M12 50 C20 32 56 30 76 50 C56 70 20 68 12 50Z" fill="#a8a070"/>
  <path d="M14 52 C26 62 52 64 72 54 C52 58 30 58 14 52Z" fill="#ece6cc"/>
  <path d="M20 48 C36 44 56 46 72 50" stroke="#ece6cc" stroke-width="1.6" fill="none"/>
  ${[[34, 40], [44, 38], [54, 42], [40, 46], [60, 46], [28, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="#6b6640"/>`).join('')}
  ${EYE(24, 45, 3.2)}
  <path d="M18 57 C18 62 16 64 15 66" stroke="#6b6640" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M13 52 C15 53 17 53 19 52" stroke="#2a2a30" stroke-width="1.3" fill="none" stroke-linecap="round"/>` },
 'order:Cyprinodontiformes': { sp: 'poecilia_reticulata', svg: `
  <path d="M56 50 C70 26 96 26 96 50 C96 74 70 74 56 50Z" fill="#f08a3a"/>
  <path d="M60 50 C72 34 90 34 92 50 C90 66 72 66 60 50Z" fill="#3e8ed8"/>
  <circle cx="78" cy="44" r="4" fill="#1d1d22"/><circle cx="82" cy="58" r="3" fill="#f6d14a"/>
  <path d="M40 40 L50 32 L54 42 Z" fill="#9aa4b0"/>
  <path d="M14 50 C20 40 44 38 60 50 C44 62 20 60 14 50Z" fill="#b6bfc9"/>
  <path d="M34 46 c4 -2 8 0 10 4" stroke="#f08a3a" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${EYE(24, 47, 3.2)}` },
 'order:Perciformes': { sp: 'epinephelus_marginatus', svg: `
  <path d="M78 52 L94 40 C96 50 96 56 94 66 Z" fill="#5e4a38"/>
  <path d="M30 30 C44 22 60 24 72 34 L66 40 L34 38Z" fill="#5e4a38"/>
  <path d="M8 54 C10 34 40 26 60 32 C76 38 80 48 80 54 C80 64 70 74 50 76 C26 78 8 70 8 54Z" fill="#7a6048"/>
  <path d="M10 58 C20 72 44 76 66 70 C46 70 26 66 10 58Z" fill="#c9a77e"/>
  <path d="M6 54 C10 50 18 50 22 54 C18 60 10 62 6 58Z" fill="#5e4a38"/>
  <path d="M8 56 L20 56" stroke="#3a2a20" stroke-width="1.6" stroke-linecap="round"/>
  ${EYE(28, 44, 3.6)}
  ${[[42, 44], [54, 40], [62, 50], [46, 56], [36, 54], [56, 60]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="#c6ab84"/>`).join('')}` },
 'order:Spariformes': { sp: 'sparus_aurata', svg: fish({ body: '#c9d1d8', back: '#8c9aa8', belly: '#eef1f4', fin: '#8c9aa8', top: 28, dorsal: '60 20 L66 34',
   extra: `<path d="M22 38 C26 34 30 34 32 36" stroke="#f2c230" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M32 40 C34 46 34 52 32 56" stroke="#5a6470" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="30" cy="42" r="2.4" fill="#d9504a"/>` }) },
 'order:Scombriformes': { sp: 'thunnus_thynnus', svg: `
  <path d="M74 50 L94 26 L84 50 L94 74 Z" fill="#26375a"/>
  <path d="M38 34 L48 20 L54 34 Z" fill="#26375a"/>
  <path d="M8 50 C18 34 50 30 76 50 C50 70 18 66 8 50Z" fill="#c0c8d4"/>
  <path d="M8 50 C18 34 50 30 76 50 C52 46 28 44 8 50Z" fill="#2b4170"/>
  <path d="M42 58 L36 70 L48 62Z" fill="#26375a"/>
  ${[58, 63, 68].map(x => `<path d="M${x} ${42 - (x - 58) / 3} l3 -3 l1 4Z M${x} ${58 + (x - 58) / 3} l3 3 l1 -4Z" fill="#f2c230"/>`).join('')}
  ${EYE(20, 46, 3.2)}
  <path d="M10 52 C12 53 15 53 17 52" stroke="#2a2a30" stroke-width="1.3" fill="none" stroke-linecap="round"/>` },
 'order:Pleuronectiformes': { sp: 'solea_solea', svg: `
  <path d="M80 50 L94 40 L94 60 Z" fill="#7a6044"/>
  <path d="M14 50 C14 30 40 20 60 26 C76 32 82 42 82 50 C82 58 76 68 60 74 C40 80 14 70 14 50Z" fill="#7a6044"/>
  <path d="M18 50 C18 34 40 26 58 30 C72 34 78 44 78 50 C78 56 72 66 58 70 C40 74 18 66 18 50Z" fill="#a8865e"/>
  ${EYE(26, 40, 3.4)}${EYE(32, 33, 3)}
  <path d="M20 54 C22 56 26 56 28 54" stroke="#3a2a20" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  ${[[44, 44], [56, 40], [52, 56], [64, 52], [40, 60], [66, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#8a6c4c"/>`).join('')}
  <path d="M74 46 a3 3 0 1 0 0.1 0" fill="#2a2a2a"/>` },

 /* ---------- orders: amphibians and reptiles ---------- */
 'order:Caudata': { sp: 'salamandra_salamandra', svg: `
  <path d="M60 60 C76 62 86 70 88 82" stroke="#1f1f24" stroke-width="9" fill="none" stroke-linecap="round"/>
  <ellipse cx="48" cy="58" rx="20" ry="11" fill="#22232a"/>
  <path d="M34 66 L28 76 M40 68 L38 80 M58 66 L62 76 M54 68 L58 80" stroke="#22232a" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="24" cy="50" rx="14" ry="11" fill="#22232a"/>
  <ellipse cx="22" cy="42" rx="5" ry="3.4" fill="#f4c21c"/><ellipse cx="30" cy="44" rx="4" ry="3" fill="#f4c21c"/>
  ${[[42, 52], [52, 54], [60, 60], [46, 62], [72, 66], [82, 74]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="2.6" fill="#f4c21c"/>`).join('')}
  ${EYE(19, 49, 3)}
  <path d="M12 54 C16 56 20 56 24 55" stroke="#55565e" stroke-width="1.3" fill="none" stroke-linecap="round"/>` },
 'order:Salientia': { sp: 'pelophylax_perezi', svg: `
  <path d="M18 74 C8 70 10 86 22 84 Z M82 74 C92 70 90 86 78 84 Z" fill="#6aa846"/>
  <ellipse cx="50" cy="62" rx="32" ry="22" fill="#79b852"/>
  <ellipse cx="50" cy="70" rx="20" ry="12" fill="#e8f2c8"/>
  <circle cx="34" cy="40" r="11" fill="#79b852"/><circle cx="66" cy="40" r="11" fill="#79b852"/>
  ${EYE(34, 39, 5.5)}${EYE(66, 39, 5.5)}
  <path d="M34 58 C42 64 58 64 66 58" stroke="#2f5420" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="30" cy="54" r="3" fill="#f2a3a3" opacity=".6"/><circle cx="70" cy="54" r="3" fill="#f2a3a3" opacity=".6"/>
  <path d="M30 50 L40 52 M60 52 L70 50" stroke="#4d7f30" stroke-width="1.2"/>` },
 'order:Chelonia': { sp: 'testudo_graeca', svg: `
  <path d="M28 64 L24 80 L34 80 L36 66Z M66 64 L68 80 L78 80 L74 64Z" fill="#b89a6a"/>
  <path d="M84 62 L92 66 L84 68Z" fill="#b89a6a"/>
  <ellipse cx="18" cy="56" rx="11" ry="9" fill="#b89a6a"/>
  ${EYE(15, 54, 2.8)}
  <path d="M9 60 C11 61 14 61 16 60" stroke="#6b5636" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <path d="M22 66 C20 40 36 26 54 26 C72 26 86 40 84 66Z" fill="#c08a3c"/>
  <path d="M22 66 L84 66" stroke="#8a5e24" stroke-width="3"/>
  <path d="M46 34 L62 34 L66 46 L54 54 L42 46Z" fill="#d9a656" stroke="#8a5e24" stroke-width="2"/>
  <path d="M42 46 L30 50 L28 64 M66 46 L78 50 L80 64 M54 54 L54 66 M30 50 L34 38 L46 34 M78 50 L74 38 L62 34 M42 46 L40 66 M66 46 L68 66" stroke="#8a5e24" stroke-width="2" fill="none"/>` },
 'order:Squamata': { sp: 'timon_lepidus', svg: `
  <path d="M60 60 C74 62 82 68 84 76 C85 81 80 82 79 78 C76 72 70 70 60 70Z" fill="#5e9c3a"/>
  <ellipse cx="50" cy="60" rx="22" ry="12" fill="#6fb043"/>
  <path d="M30 52 C20 48 12 50 10 56 C10 62 18 66 30 64Z" fill="#6fb043"/>
  <circle cx="44" cy="56" r="3" fill="#3f87c9"/><circle cx="54" cy="54" r="3" fill="#3f87c9"/><circle cx="62" cy="60" r="2.6" fill="#3f87c9"/><circle cx="48" cy="64" r="2.4" fill="#3f87c9"/>
  ${EYE(20, 54, 3)}
  <path d="M10 58 C14 60 18 60 22 59" stroke="#3d6e25" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <path d="M36 68 L30 78 M38 68 L34 80 M64 68 L68 78 M62 68 L60 80" stroke="#5e9c3a" stroke-width="4" stroke-linecap="round"/>` },
 'order:Crocodylia': { sp: 'crocodylus_niloticus', svg: `
  <path d="M96 64 C80 50 60 44 40 46 L8 50 C4 52 4 58 8 60 L40 62 C60 64 80 70 96 76Z" fill="#6f8a4a"/>
  <path d="M8 60 L40 62 C60 64 80 70 96 76 L96 70 C78 64 60 60 40 58 L10 56Z" fill="#d8d6a8"/>
  <path d="M10 56 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 M14 60 l3 -3 l3 3 l3 -3 l3 3" stroke="#fffaf0" stroke-width="1.4" fill="none"/>
  <path d="M52 46 C54 36 66 36 68 46Z" fill="#6f8a4a"/>
  ${EYE(60, 42, 3.4)}
  <circle cx="9" cy="51" r="1.4" fill="#3a4a26"/>
  ${[44, 54, 64, 74, 84].map(x => `<path d="M${x} ${46 + (x - 44) * .1} l3 -4 l3 4" fill="#5e7840"/>`).join('')}` },

 /* ---------- orders: birds ---------- */
 'order:Galliformes': { sp: 'alectoris_rufa', svg: `
  <path d="M80 54 L90 48 L88 60 Z" fill="#a07a5a"/>
  <ellipse cx="54" cy="58" rx="28" ry="22" fill="#9aa0a8"/>
  <path d="M30 60 C36 74 56 80 74 72 C70 62 60 60 48 60Z" fill="#c9a07a"/>
  ${[40, 48, 56, 64].map(x => `<path d="M${x} 50 l2 10" stroke="#fff" stroke-width="1.6"/><path d="M${x + 2} 50 l2 10" stroke="#2a2a2a" stroke-width="1.6"/>`).join('')}
  <circle cx="34" cy="38" r="14" fill="#a8a29a"/>
  <path d="M24 40 C26 50 36 54 44 48 C40 52 30 50 26 44Z" fill="#1d1d22"/>
  <path d="M26 42 C28 48 36 50 42 46 C38 44 30 44 26 42Z" fill="#f6f2ea"/>
  <path d="M26 34 L40 32" stroke="#f6f2ea" stroke-width="2.4" stroke-linecap="round"/>
  ${EYE(31, 38, 2.8)}
  <path d="M21 39 L14 41 L21 43 Z" fill="#d8352a"/>
  <path d="M50 78 l0 10 M60 78 l0 10" stroke="#d8352a" stroke-width="3" stroke-linecap="round"/>` },
 'order:Anseriformes': { sp: 'anas_platyrhynchos', svg: `
  <path d="M10 74 C30 82 70 82 92 74" stroke="#7ab6d8" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M80 54 L94 48 L88 62 Z" fill="#2d2d33"/>
  <ellipse cx="56" cy="60" rx="30" ry="15" fill="#b9b6ae"/>
  <path d="M30 56 C30 68 42 74 50 72 C44 66 42 58 44 52Z" fill="#7a4a32"/>
  <path d="M50 54 C60 50 74 52 82 58 C70 58 60 60 50 54Z" fill="#8a8a86"/>
  <path d="M56 58 L74 58 L72 62 L58 62 Z" fill="#3c55b8"/>
  <rect x="30" y="44" width="10" height="12" rx="4" fill="#2e6b3a"/>
  <circle cx="34" cy="36" r="13" fill="#2e7a42"/>
  <path d="M30 47 L42 47" stroke="#f4f4f0" stroke-width="2.4" stroke-linecap="round"/>
  ${EYE(31, 33, 2.8)}
  <path d="M22 36 C14 36 10 40 12 42 C16 43 22 42 24 40Z" fill="#f2c230"/>` },
 'order:Caprimulgiformes': { sp: 'mellisuga_helenae', svg: `
  <path d="M70 70 C76 60 88 60 90 70 C86 74 80 76 76 82Z" fill="#e0607a"/><path d="M80 84 C78 90 74 94 70 96" stroke="#5e9c3a" stroke-width="3" fill="none"/>
  <path d="M40 46 C34 26 46 14 58 22 C52 30 48 40 46 50Z" fill="#c9e2f2" opacity=".85"/>
  <path d="M52 46 C62 30 78 28 82 38 C72 40 62 46 56 52Z" fill="#c9e2f2" opacity=".85"/>
  <ellipse cx="46" cy="56" rx="14" ry="10" fill="#4a8a6a" transform="rotate(-30 46 56)"/>
  <path d="M52 64 L60 78 L48 70Z" fill="#3a6a52"/>
  <ellipse cx="44" cy="58" rx="7" ry="5" fill="#e8e6e0" transform="rotate(-30 44 58)"/>
  <circle cx="34" cy="46" r="8" fill="#e04a6a"/>
  ${EYE(33, 44, 2.2)}
  <path d="M28 48 L10 56" stroke="#2a2a2e" stroke-width="2" stroke-linecap="round"/>` },
 'order:Columbiformes': { sp: 'columba_palumbus', svg: `
  <path d="M78 60 L94 58 L92 70 Z" fill="#6f7884"/>
  <ellipse cx="56" cy="60" rx="28" ry="18" fill="#8d97a4"/>
  <path d="M44 52 C60 46 76 52 82 62 C72 60 58 58 44 60Z" fill="#7a8492"/>
  <path d="M60 54 L76 56" stroke="#f4f4f0" stroke-width="3" stroke-linecap="round"/>
  <path d="M30 56 C30 70 44 76 54 72 C46 66 42 58 42 52Z" fill="#c9a4b0"/>
  <circle cx="34" cy="40" r="13" fill="#8d97a4"/>
  <path d="M38 50 C42 50 46 52 46 56" stroke="#f4f4f0" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M40 46 C44 46 46 48 46 50" stroke="#7fc28a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  ${EYE(31, 38, 2.8)}
  <path d="M22 40 L15 42 L22 44 Z" fill="#e8a4a0"/>
  <path d="M50 78 l0 8 M58 78 l0 8" stroke="#e07a8a" stroke-width="2.6" stroke-linecap="round"/>` },
 'order:Gruiformes': { sp: 'grus_grus', svg: `
  <path d="M46 70 L42 96 M56 70 L60 96" stroke="#3a3a40" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M60 48 C82 46 92 60 86 70 C80 64 72 62 64 66Z" fill="#6f7680"/>
  <ellipse cx="52" cy="60" rx="20" ry="13" fill="#a5adb7"/>
  <path d="M38 54 C34 40 32 28 34 20" stroke="#a5adb7" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M38 54 C35 42 34 32 35 24" stroke="#22252c" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>
  <path d="M36 46 C34 36 34 28 36 22" stroke="#f4f4f0" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <circle cx="34" cy="18" r="7" fill="#22252c"/><circle cx="34" cy="13" r="3" fill="#d8352a"/>
  ${EYE(32, 18, 1.8)}
  <path d="M28 19 L16 24" stroke="#5a5a52" stroke-width="2.4" stroke-linecap="round"/>` },
 'order:Charadriiformes': { sp: 'fratercula_arctica', svg: `
  <path d="M40 90 l-6 3 l10 0 Z M60 90 l6 3 l-10 0 Z" fill="#f08a3a"/>
  <ellipse cx="50" cy="62" rx="24" ry="28" fill="#1f2128"/>
  <ellipse cx="50" cy="70" rx="15" ry="20" fill="#f6f4ee"/>
  <circle cx="50" cy="36" r="17" fill="#1f2128"/>
  <ellipse cx="44" cy="36" rx="11" ry="10" fill="#e9ebee"/>
  ${EYE(44, 34, 2.8)}<path d="M41 32 l-3 -2 M47 32 l3 -2" stroke="#d8352a" stroke-width="1.2"/>
  <path d="M34 34 C24 34 20 40 22 46 C26 46 30 44 34 42Z" fill="#f08a3a"/>
  <path d="M34 34 C30 34 28 36 28 38 L34 38Z" fill="#3a5a8a"/><path d="M26 40 L33 40" stroke="#f6d14a" stroke-width="1.6"/>` },
 'order:Pelecaniformes': { sp: 'pelecanus_onocrotalus', svg: `
  <path d="M56 50 C80 46 92 60 88 72 C78 66 68 66 60 70Z" fill="#1d1d22"/>
  <ellipse cx="58" cy="62" rx="24" ry="17" fill="#f6f2ec"/>
  <path d="M44 56 C40 44 40 34 46 26" stroke="#f6f2ec" stroke-width="10" fill="none" stroke-linecap="round"/>
  <circle cx="48" cy="24" r="9" fill="#f6f2ec"/>
  ${EYE(48, 22, 2.2)}
  <path d="M42 24 L8 36 L10 40 L42 30Z" fill="#f2b04a"/>
  <path d="M40 30 C30 34 14 40 12 42 C18 52 34 46 42 34Z" fill="#f6c46a"/>
  <path d="M52 78 l-2 12 M64 78 l0 12" stroke="#f2a0a0" stroke-width="3" stroke-linecap="round"/>` },
 'order:Ciconiiformes': { sp: 'ciconia_ciconia', svg: `
  <path d="M48 70 L44 96 M58 70 L60 96" stroke="#d8352a" stroke-width="2.6" stroke-linecap="round"/>
  <ellipse cx="56" cy="58" rx="24" ry="14" fill="#f6f4ee"/>
  <path d="M50 54 C64 52 80 56 88 66 C76 70 62 70 52 66Z" fill="#1d1d22"/>
  <path d="M40 54 C34 42 34 32 38 24" stroke="#f6f4ee" stroke-width="9" fill="none" stroke-linecap="round"/>
  <circle cx="40" cy="22" r="8" fill="#f6f4ee"/>
  ${EYE(39, 20, 2)}
  <path d="M34 22 L10 30" stroke="#d8352a" stroke-width="3.4" stroke-linecap="round"/>` },
 'order:Accipitriformes': { sp: 'aquila_adalberti', svg: `
  <path d="M22 98 C18 78 28 60 48 58 C68 58 82 74 80 98Z" fill="#4a3120"/>
  <path d="M28 74 C30 66 36 62 42 64 C40 70 34 74 28 74Z" fill="#f6f2e8"/>
  <path d="M48 20 C66 20 76 34 74 50 C72 62 62 68 50 68 C36 68 28 58 28 44 C28 30 36 20 48 20Z" fill="#5a3a22"/>
  <path d="M52 20 C66 20 76 32 74 48 C68 40 60 34 50 32Z" fill="#d6ad62"/>
  <path d="M36 38 C28 38 20 44 20 54 C24 52 28 52 30 56 C32 50 34 46 40 44Z" fill="#f2c230"/>
  <path d="M20 54 C20 50 22 48 25 48 C23 52 22 54 20 54Z" fill="#2a2a2e"/>
  ${EYE(44, 38, 3.4)}
  <path d="M38 33 C42 31 48 31 52 34" stroke="#2e1e14" stroke-width="2.4" fill="none" stroke-linecap="round"/>` },
 'order:Strigiformes': { sp: 'tyto_alba', svg: `
  <ellipse cx="50" cy="66" rx="25" ry="24" fill="#d8a85c"/>
  <ellipse cx="50" cy="70" rx="16" ry="17" fill="#fbf1de"/>
  <circle cx="44" cy="70" r="1.3" fill="#c79a5a"/><circle cx="56" cy="74" r="1.3" fill="#c79a5a"/><circle cx="50" cy="78" r="1.3" fill="#c79a5a"/>
  <path d="M50 22 C66 22 76 32 76 44 C76 56 66 62 50 62 C34 62 24 56 24 44 C24 32 34 22 50 22Z" fill="#d8a85c"/>
  <path d="M50 30 C46 26 34 26 31 36 C29 46 38 56 50 58 C62 56 71 46 69 36 C66 26 54 26 50 30Z" fill="#fffaf0"/>
  <path d="M50 30 L50 46" stroke="#e6cfa8" stroke-width="2"/>
  ${EYE(41, 41, 4.5)}${EYE(59, 41, 4.5)}
  <path d="M50 46 L47.5 50 L50 54 L52.5 50Z" fill="#e8b98a"/>
  <path d="M42 89 l3 -4 l3 4 M52 89 l3 -4 l3 4" stroke="#8a7a6a" stroke-width="2" fill="none" stroke-linecap="round"/>` },
 'order:Coraciiformes': { sp: 'alcedo_atthis', svg: `
  <path d="M10 76 L90 76" stroke="#7a5a3a" stroke-width="4" stroke-linecap="round"/>
  <path d="M66 58 L80 72 L70 72 Z" fill="#1e7ab8"/>
  <ellipse cx="54" cy="56" rx="16" ry="18" fill="#2a8fd0"/>
  <path d="M44 56 C42 70 52 76 60 72 C56 66 54 60 54 54Z" fill="#ef7a2c"/>
  <circle cx="50" cy="36" r="13" fill="#2a8fd0"/>
  <path d="M42 40 C46 44 54 44 58 40 C56 46 46 48 42 44Z" fill="#ef7a2c"/>
  <path d="M54 32 C58 34 60 36 60 40" stroke="#f4f4f0" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M56 24 c4 2 6 4 6 8" stroke="#56c8e8" stroke-width="2" fill="none" stroke-linecap="round"/>
  ${EYE(46, 35, 2.6)}
  <path d="M40 36 L12 42 L40 40 Z" fill="#1d1d22"/>
  <path d="M52 74 l0 2 M58 74 l0 2" stroke="#e05a3a" stroke-width="2.4"/>` },
 'order:Piciformes': { sp: 'dendrocopos_major', svg: `
  <rect x="62" y="0" width="22" height="100" fill="#8a6a48"/><path d="M68 10 l0 14 M76 40 l0 14 M70 70 l0 12" stroke="#6e5236" stroke-width="2"/>
  <path d="M58 76 L64 96 L54 90Z" fill="#1d1d22"/>
  <ellipse cx="50" cy="58" rx="14" ry="22" fill="#1d1d22"/>
  <path d="M42 54 C40 66 46 76 54 78 C52 70 50 62 50 54Z" fill="#f4f2ec"/>
  <path d="M54 76 C52 82 54 86 58 86 L60 78Z" fill="#d8352a"/>
  <ellipse cx="54" cy="52" rx="5" ry="9" fill="#f4f2ec"/>
  <circle cx="44" cy="34" r="12" fill="#1d1d22"/>
  <path d="M34 34 C34 28 40 26 44 28 C40 30 38 34 40 40 C36 40 34 38 34 34Z" fill="#f4f2ec"/>
  <path d="M48 24 C54 24 56 28 54 32 C52 30 50 28 48 28Z" fill="#d8352a"/>
  ${EYE(42, 33, 2.4)}
  <path d="M34 36 L20 38 L34 40 Z" fill="#3a3a40"/>
  <path d="M60 50 l6 -2 M60 66 l6 2" stroke="#3a3a40" stroke-width="2.4" stroke-linecap="round"/>` },
 'order:Falconiformes': { sp: 'falco_peregrinus', svg: `
  <path d="M50 96 C30 92 22 74 24 56 C26 36 40 24 56 24 C72 24 82 36 82 52 C82 72 72 90 50 96Z" fill="#59677a"/>
  <path d="M32 58 C30 74 40 90 54 92 C66 90 74 78 74 64 C60 70 44 68 32 58Z" fill="#f2ede2"/>
  ${[[44, 76], [52, 80], [60, 76], [50, 86], [58, 86]].map(([x, y]) => `<path d="M${x - 2} ${y} l2 2 l2 -2" stroke="#59677a" stroke-width="1.4" fill="none"/>`).join('')}
  <path d="M28 44 C30 34 44 28 58 30 C54 36 50 40 46 44Z" fill="#2a3240"/>
  <path d="M44 44 C42 52 40 58 38 62 C44 60 48 54 50 46Z" fill="#2a3240"/>
  <circle cx="48" cy="44" r="5" fill="#f2c230"/>${EYE(48, 44, 3.2)}
  <path d="M38 46 C30 46 24 52 24 58 C28 56 32 56 34 58 C36 54 36 50 40 48Z" fill="#f2c230"/>
  <path d="M24 58 C24 55 26 53 29 53 C27 56 26 58 24 58Z" fill="#2a2a2e"/>` },
 'order:Psittaciformes': { sp: 'ara_macao', svg: `
  <path d="M50 64 L44 96 L56 96 Z" fill="#d92f2f"/><path d="M47 70 L44 92 L48 92 Z" fill="#2f63c9"/>
  <path d="M30 50 C24 66 30 80 40 84 L46 60Z" fill="#2f63c9"/><path d="M34 60 C32 68 34 74 40 78 L44 64Z" fill="#f2c230"/>
  <ellipse cx="54" cy="56" rx="18" ry="22" fill="#e03434"/>
  <circle cx="54" cy="34" r="16" fill="#e03434"/>
  <ellipse cx="58" cy="34" rx="8" ry="7" fill="#fbf7f0"/>
  ${EYE(58, 33, 3)}
  <path d="M66 32 C80 32 82 46 74 52 C74 46 70 42 66 42Z" fill="#f0e9df"/>
  <path d="M66 42 C70 42 72 46 70 48 C68 46 66 46 66 44Z" fill="#2a2a2a"/>` },
 'order:Passeriformes': { sp: 'erithacus_rubecula', svg: `
  <path d="M78 52 L94 42 L92 60 Z" fill="#7a5b3e"/>
  <ellipse cx="54" cy="56" rx="30" ry="25" fill="#8c6a48"/>
  <circle cx="40" cy="40" r="18" fill="#8c6a48"/>
  <path d="M26 40 C26 30 34 28 40 30 C48 32 50 44 48 56 C46 68 40 74 34 72 C26 68 24 52 26 40Z" fill="#ec7a2c"/>
  <ellipse cx="56" cy="70" rx="16" ry="9" fill="#f4efe6"/>
  ${EYE(36, 38, 3.6)}
  <path d="M24 40 L15 42 L24 45 Z" fill="#3a3330"/>
  <path d="M50 81 l0 9 M60 81 l0 9" stroke="#6b5444" stroke-width="2.4" stroke-linecap="round"/>` },

 /* ---------- orders: mammals ---------- */
 'order:Monotremata': { sp: 'ornithorhynchus_anatinus', svg: `
  <path d="M74 54 C86 50 96 56 94 64 C90 70 80 68 72 64Z" fill="#5e3e24"/>
  <ellipse cx="50" cy="58" rx="26" ry="15" fill="#7a5232"/>
  <path d="M34 70 L28 80 L38 76Z M62 70 L68 80 L58 76Z" fill="#5e3e24"/>
  <circle cx="30" cy="52" r="12" fill="#7a5232"/>
  <path d="M22 50 C12 46 2 48 4 54 C6 60 14 60 22 58Z" fill="#3a3a42"/>
  <circle cx="10" cy="52" r="1" fill="#1d1d22"/><circle cx="13" cy="51" r="1" fill="#1d1d22"/>
  ${EYE(30, 48, 2.6)}` },
 'order:Dasyuromorphia': { sp: 'sarcophilus_harrisii', svg: `
  <ellipse cx="26" cy="28" rx="9" ry="11" fill="#1f1d22"/><ellipse cx="74" cy="28" rx="9" ry="11" fill="#1f1d22"/>
  <ellipse cx="26" cy="29" rx="5" ry="7" fill="#e8909a"/><ellipse cx="74" cy="29" rx="5" ry="7" fill="#e8909a"/>
  <path d="M50 24 C72 24 82 40 82 56 C82 76 66 90 50 90 C34 90 18 76 18 56 C18 40 28 24 50 24Z" fill="#26242a"/>
  <path d="M22 80 C34 74 66 74 78 80 C70 86 60 90 50 90 C40 90 30 86 22 80Z" fill="#f4f2ec"/>
  ${EYE(38, 48, 3.6)}${EYE(62, 48, 3.6)}
  <path d="M34 58 C34 70 66 70 66 58 C60 62 40 62 34 58Z" fill="#c74a54"/>
  <path d="M36 59 l3 4 l3 -3 l3 4 l3 -3 l3 4 l3 -3 l3 4 l3 -3 l2 3" stroke="#fffaf0" stroke-width="1.4" fill="none"/>
  <ellipse cx="50" cy="55" rx="4" ry="2.6" fill="#e8909a"/>` },
 'order:Diprotodontia': { sp: 'phascolarctos_cinereus', svg: `
  <circle cx="20" cy="34" r="16" fill="#9aa1aa"/><circle cx="80" cy="34" r="16" fill="#9aa1aa"/>
  <circle cx="20" cy="34" r="9" fill="#f2eee8"/><circle cx="80" cy="34" r="9" fill="#f2eee8"/>
  <ellipse cx="50" cy="56" rx="30" ry="28" fill="#aab1ba"/>
  <ellipse cx="50" cy="74" rx="16" ry="9" fill="#e8e4de"/>
  ${EYE(38, 50, 3.4)}${EYE(62, 50, 3.4)}
  <path d="M50 52 C58 52 60 60 58 66 C56 70 44 70 42 66 C40 60 42 52 50 52Z" fill="#2a2a30"/>
  <path d="M46 56 C46 58 48 58 48 56" stroke="#55555c" stroke-width="1" fill="none"/>` },
 'order:Proboscidea': { sp: 'loxodonta_africana', svg: `
  <path d="M30 34 C6 22 2 54 12 66 C20 74 30 66 34 58Z" fill="#9aa1ab"/><path d="M70 34 C94 22 98 54 88 66 C80 74 70 66 66 58Z" fill="#9aa1ab"/>
  <path d="M28 36 C14 30 10 52 16 60 C20 64 28 60 30 54Z" fill="#c9a6b0" opacity=".55"/><path d="M72 36 C86 30 90 52 84 60 C80 64 72 60 70 54Z" fill="#c9a6b0" opacity=".55"/>
  <ellipse cx="50" cy="46" rx="22" ry="22" fill="#a9b0ba"/>
  <path d="M44 56 C44 70 42 80 50 88 C54 92 60 88 56 84 C52 80 56 70 56 56Z" fill="#a9b0ba"/>
  <path d="M46 70 L56 70 M45 76 L55 76" stroke="#8d949e" stroke-width="1.2"/>
  <path d="M40 60 C36 66 32 68 28 68 M60 60 C64 66 68 68 72 68" stroke="#f6f1e4" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  ${EYE(40, 44, 3.6)}${EYE(60, 44, 3.6)}` },
 'order:Pilosa': { sp: 'bradypus_tridactylus', svg: `
  <path d="M0 18 C30 22 70 22 100 16" stroke="#7a5a3a" stroke-width="6" fill="none"/>
  <path d="M30 20 C28 34 30 40 36 44 M70 20 C72 34 70 40 64 44" stroke="#9a8a70" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M26 18 l2 6 M30 18 l0 7 M34 18 l-1 6 M66 18 l1 6 M70 18 l0 7 M74 18 l-1 6" stroke="#3a3328" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse cx="50" cy="62" rx="26" ry="26" fill="#a8977a"/>
  <ellipse cx="50" cy="60" rx="18" ry="15" fill="#efe4c8"/>
  <path d="M30 56 C34 52 42 52 46 58 C42 62 34 62 30 56Z M70 56 C66 52 58 52 54 58 C58 62 66 62 70 56Z" fill="#4a3a2a"/>
  ${EYE(39, 57, 2.6)}${EYE(61, 57, 2.6)}
  <ellipse cx="50" cy="64" rx="3" ry="2" fill="#3a2a20"/>
  <path d="M44 69 C48 72 52 72 56 69" stroke="#3a2a20" stroke-width="1.6" fill="none" stroke-linecap="round"/>` },
 'order:Primates': { sp: 'pan_troglodytes', svg: `
  <circle cx="18" cy="50" r="11" fill="#2e2620"/><circle cx="82" cy="50" r="11" fill="#2e2620"/>
  <circle cx="18" cy="50" r="6" fill="#d9b08c"/><circle cx="82" cy="50" r="6" fill="#d9b08c"/>
  <path d="M50 18 C72 18 82 34 82 52 C82 76 68 90 50 90 C32 90 18 76 18 52 C18 34 28 18 50 18Z" fill="#3a3028"/>
  <path d="M50 34 C64 34 72 42 70 52 C76 60 72 80 50 82 C28 80 24 60 30 52 C28 42 36 34 50 34Z" fill="#d9b08c"/>
  <path d="M32 46 C38 40 46 42 50 46 C54 42 62 40 68 46" stroke="#b08a68" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  ${EYE(40, 52, 3.2)}${EYE(60, 52, 3.2)}
  <path d="M46 62 C46 64 48 64 48 62 M52 62 C52 64 54 64 54 62" stroke="#5a4232" stroke-width="1.4" fill="none"/>
  <path d="M38 70 C44 76 56 76 62 70" stroke="#5a4232" stroke-width="2" fill="none" stroke-linecap="round"/>` },
 'order:Rodentia': { sp: 'sciurus_vulgaris', svg: `
  <path d="M60 80 C90 80 96 50 86 30 C80 18 64 18 62 30 C72 30 78 42 74 54 C70 64 62 66 58 70Z" fill="#c45a24"/>
  <path d="M66 34 C74 36 78 46 74 54" stroke="#e07a3a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="44" cy="64" rx="18" ry="20" fill="#d06a2e"/>
  <ellipse cx="40" cy="68" rx="9" ry="13" fill="#f4e6d2"/>
  <circle cx="38" cy="40" r="14" fill="#d06a2e"/>
  <path d="M30 30 L28 14 L36 26Z M44 28 L46 12 L50 28Z" fill="#c45a24"/><path d="M28 14 l-2 -4 M46 12 l1 -5" stroke="#c45a24" stroke-width="2.4" stroke-linecap="round"/>
  ${EYE(34, 38, 3)}
  <circle cx="25" cy="44" r="2" fill="#3a2418"/>
  <ellipse cx="38" cy="58" rx="5" ry="4" fill="#8a6a3a"/><path d="M34 56 l4 -2" stroke="#d06a2e" stroke-width="2"/>` },
 'order:Lagomorpha': { sp: 'oryctolagus_cuniculus', svg: `
  <path d="M36 40 C28 20 30 6 36 6 C42 6 44 22 44 40Z M54 40 C56 22 62 8 68 10 C74 14 66 28 60 42Z" fill="#9a8468"/>
  <path d="M37 36 C33 22 34 12 37 12 C40 12 41 24 41 36Z M57 38 C59 24 63 16 66 17 C69 19 64 28 60 40Z" fill="#e8b8b0"/>
  <ellipse cx="60" cy="70" rx="26" ry="18" fill="#a38c70"/>
  <circle cx="86" cy="66" r="6" fill="#f4f0e8"/>
  <circle cx="44" cy="54" r="17" fill="#a38c70"/>
  ${EYE(40, 50, 3.4)}
  <path d="M30 58 l-1 0" stroke="#e8909a" stroke-width="3" stroke-linecap="round"/>
  <path d="M28 60 l-8 -1 M28 62 l-8 2" stroke="#6b5a48" stroke-width="1" stroke-linecap="round"/>
  <path d="M40 84 l-2 4 M70 86 l4 2" stroke="#8a7458" stroke-width="5" stroke-linecap="round"/>` },
 'order:Eulipotyphla': { sp: 'erinaceus_europaeus', svg: `
  ${Array.from({ length: 22 }, (_, i) => { const a = Math.PI * (0.95 + i / 21 * 1.15), x = 56 + Math.cos(a) * 30, y = 62 + Math.sin(a) * 26; return `<path d="M${(56 + Math.cos(a) * 18).toFixed(1)} ${(62 + Math.sin(a) * 15).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#5a4636" stroke-width="3.4" stroke-linecap="round"/>`; }).join('')}
  <path d="M26 66 C26 44 44 36 60 36 C76 36 88 48 88 64 C88 74 80 80 66 80 L30 80Z" fill="#7a6250"/>
  <path d="M34 50 l4 2 M48 42 l2 4 M62 40 l0 4 M76 46 l-2 4 M82 58 l-4 1" stroke="#e8dcc8" stroke-width="2" stroke-linecap="round"/>
  <path d="M34 62 C26 60 14 66 8 72 C14 78 26 80 34 78Z" fill="#d9c2a2"/>
  <circle cx="8" cy="72" r="3" fill="#2a2420"/>
  ${EYE(24, 68, 2.6)}
  <path d="M30 80 l-2 6 M44 80 l0 6 M66 80 l2 6" stroke="#5a4636" stroke-width="3" stroke-linecap="round"/>` },
 'order:Chiroptera': { sp: 'pipistrellus_pipistrellus', svg: `
  <path d="M42 48 C30 34 14 34 4 44 C10 46 12 52 10 58 C16 54 22 56 24 62 C28 56 34 56 38 60Z" fill="#4a3a36"/>
  <path d="M58 48 C70 34 86 34 96 44 C90 46 88 52 90 58 C84 54 78 56 76 62 C72 56 66 56 62 60Z" fill="#4a3a36"/>
  <path d="M10 44 L24 52 L38 50 M90 44 L76 52 L62 50" stroke="#36292a" stroke-width="1.2" fill="none"/>
  <path d="M38 36 L36 20 L46 30 Z M62 36 L64 20 L54 30 Z" fill="#7a5e52"/>
  <ellipse cx="50" cy="52" rx="14" ry="18" fill="#8a6a58"/>
  <circle cx="50" cy="42" r="12" fill="#8a6a58"/>
  ${EYE(45, 41, 2.8)}${EYE(55, 41, 2.8)}
  <ellipse cx="50" cy="47" rx="2.4" ry="1.6" fill="#3a2a26"/>
  <path d="M47 50 l1 2.4 l1 -2.4 M51 50 l1 2.4 l1 -2.4" stroke="#fff" stroke-width="1" fill="none"/>` },
 'order:Carnivora': { sp: 'lynx_pardinus', svg: `
  <path d="M24 46 L26 14 L30 14 L40 34 Z" fill="#c98f52"/><path d="M76 46 L74 14 L70 14 L60 34 Z" fill="#c98f52"/>
  <path d="M27 15 l1 -5 M73 15 l-1 -5" stroke="#2b2420" stroke-width="3" stroke-linecap="round"/>
  <path d="M50 26 C70 26 80 40 80 56 C80 60 86 66 88 74 C76 74 70 80 50 84 C30 80 24 74 12 74 C14 66 20 60 20 56 C20 40 30 26 50 26Z" fill="#d79a5c"/>
  <path d="M20 62 C26 70 36 76 50 84 C64 76 74 70 80 62 C74 66 64 66 50 66 C36 66 26 66 20 62Z" fill="#f5eadb"/>
  <circle cx="34" cy="44" r="1.8" fill="#5a3b26"/><circle cx="66" cy="44" r="1.8" fill="#5a3b26"/><circle cx="40" cy="36" r="1.5" fill="#5a3b26"/><circle cx="60" cy="36" r="1.5" fill="#5a3b26"/><circle cx="50" cy="33" r="1.5" fill="#5a3b26"/>
  ${EYE(40, 50, 4.5)}${EYE(60, 50, 4.5)}
  <path d="M46 60 L54 60 L50 64 Z" fill="#3a2a22"/>
  <path d="M50 64 L50 68 M50 68 C47 71 44 70 43 68 M50 68 C53 71 56 70 57 68" stroke="#3a2a22" stroke-width="1.6" fill="none" stroke-linecap="round"/>` },
 'order:Perissodactyla': { sp: 'equus_quagga', svg: `
  <path d="M34 24 L28 6 L42 18Z M66 24 L72 6 L58 18Z" fill="#f4f2ec" stroke="#1d1d22" stroke-width="2" stroke-linejoin="round"/>
  <path d="M42 18 C44 8 56 8 58 18 L56 26 L44 26Z" fill="#1d1d22"/>
  <path d="M50 18 C66 18 72 34 70 52 C68 66 64 72 62 80 C60 92 40 92 38 80 C36 72 32 66 30 52 C28 34 34 18 50 18Z" fill="#f4f2ec"/>
  <path d="M34 30 C42 34 58 34 66 30 M32 40 C38 44 44 44 47 40 M68 40 C62 44 56 44 53 40 M32 52 C36 56 40 56 43 54 M68 52 C64 56 60 56 57 54 M36 64 C40 66 44 66 46 64 M64 64 C60 66 56 66 54 64 M50 22 L50 34" stroke="#1d1d22" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="50" cy="82" rx="12" ry="10" fill="#2e2a2a"/>
  <ellipse cx="45" cy="82" rx="2" ry="3" fill="#555"/><ellipse cx="55" cy="82" rx="2" ry="3" fill="#555"/>
  ${EYE(38, 48, 3)}${EYE(62, 48, 3)}` },
 'order:Cetartiodactyla': { sp: 'orcinus_orca', svg: `
  <path d="M84 52 L96 40 L94 54 L96 66 Z" fill="#1f2430"/>
  <path d="M46 40 L52 14 L60 40 Z" fill="#1f2430"/>
  <path d="M10 56 C10 42 28 36 50 38 C68 40 82 48 88 54 C80 62 64 70 42 70 C22 70 10 66 10 56Z" fill="#1f2430"/>
  <path d="M14 62 C22 68 34 70 46 68 C40 64 30 62 14 62Z" fill="#f4f6fb"/>
  <ellipse cx="30" cy="48" rx="7" ry="3.6" fill="#f4f6fb" transform="rotate(-12 30 48)"/>
  <ellipse cx="62" cy="44" rx="7" ry="3" fill="#8f97a8" transform="rotate(8 62 44)"/>
  <circle cx="22" cy="52" r="2.2" fill="#0c0e14"/>
  <path d="M38 66 L48 78 L54 68 Z" fill="#1f2430"/>
  <path d="M12 58 C16 60 20 60 24 59" stroke="#f4f6fb" stroke-width="1.6" fill="none" stroke-linecap="round"/>` }
};
window.VISU_ICONS = I;
})();
