/* VISU · boot and hash router. Loaded last. */
(function () {
'use strict';
const I = window.VISU_I18N, E = window.VISU_ENGINE, Store = window.VISU_STORE, App = window.VISU_APP;
const V = App.views;
const L = I.L;

function fatal(es, en) {
  document.getElementById('main').innerHTML = `<div class="session-wrap"><h1>${L(es[0], en[0])}</h1><p>${L(es[1], en[1])}</p></div>`;
}
const DATA = window.VISU || {};
Store.load();
I.lang = Store.data.settings.lang === 'en' ? 'en' : 'es';
App.applyTheme();
if (!window.FSRS || !DATA.bestiary || !DATA.bestiary.species || !DATA.bestiary.tree) {
  fatal(['Faltan archivos de la web', 'No se han podido cargar los datos (carpeta data/) o el planificador (carpeta vendor/). Comprueba que has descomprimido la carpeta entera y abre index.html desde ella.'],
    ['Some of the site’s files are missing', 'The data (data/ folder) or the scheduler (vendor/ folder) couldn’t be loaded. Check that you unzipped the whole folder and open index.html from inside it.']);
  return;
}
App.M = E.buildModel(DATA.bestiary, DATA.media, DATA.content);
const BYROUTE = {};
Object.keys(App.M.nodes).forEach(id => { BYROUTE[App.routeFor(id)] = id; });
App.M.order.forEach(id => { BYROUTE[App.routeFor(id)] = id; });

/* A card opened from a practice screen remembers where it came from: the card shows "Volver a la
   práctica", and going back (that button or the browser's back) resumes the same question instead of
   starting a new session. */
const PRACTICE = ['sesion', 'sesion-repaso', 'grupos', 'grupos-repaso', 'hoja', 'cual-es', 'resumen', 'simulacro-resultados'];
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="#ficha-"], a[href^="#grupo-"]');
  const here = (location.hash || '#hoy').slice(1);
  if (a && (PRACTICE.includes(here) || here.startsWith('vistazo-'))) App.returnTo = here;
}, true);

App.render = function (full) {
  let r = (location.hash || '#hoy').slice(1);
  try { r = decodeURIComponent(r); } catch (e) { /* keep raw */ }
  const resume = !!App.returnTo && r === App.returnTo;
  if (resume || (!BYROUTE[r] && r !== App.returnTo)) App.returnTo = null;
  App.closePop();
  App.shell(r);
  document.getElementById('app').classList.remove('explore');
  App.aside().innerHTML = '';
  const s = App.sessionState();
  if (r === 'sesion' || r === 'sesion-repaso') { if (!(resume && s && s.game === 'foto') && (!full || !s || s.game !== 'foto')) App.newSession('foto', { force: r === 'sesion-repaso' }); V.session(); }
  else if (r === 'grupos' || r === 'grupos-repaso') { if (!(resume && s && s.game === 'grupo') && (!full || !s || s.game !== 'grupo')) App.newSession('grupo', { force: r === 'grupos-repaso' }); V.session(); }
  else if (r === 'hoja') { if (!(resume && s && s.game === 'hoja') && (!full || !s || s.game !== 'hoja')) App.newSession('hoja'); V.session(); }
  else if (r === 'resumen') V.resumen();
  else if (r === 'cual-es') { if (!(resume && App.reverseState()) && (!full || !App.reverseState())) App.newReverse(); V.cual(); }
  else if (r === 'simulacro') { if (!full || !App.mockState() || App.mockState().done) App.newMock(); V.simulacro(); }
  else if (r === 'simulacro-resultados') V.simulacroResultados();
  else if (r.startsWith('vistazo-') && BYROUTE['grupo-' + r.slice(8)]) V.vistazo(BYROUTE['grupo-' + r.slice(8)]);
  else if (r === 'nivel') V.nivel();
  else if (r === 'explorar') V.explore(Store.data.ui.exploreSel || App.M.root, false);
  else if (BYROUTE[r]) V.explore(BYROUTE[r], !full);
  else if (r === 'insignias') V.insignias();
  else if (r === 'ajustes') V.ajustes();
  else if (r === 'como-funciona') V.como();
  else if (r === 'aviso') { V.hoy(); App.showNotice(); }
  else V.hoy();
  if (!BYROUTE[r] || full) window.scrollTo(0, 0);
};

window.addEventListener('hashchange', () => App.render(false));
App.DESK.addEventListener('change', () => App.render(true));
window.addEventListener('error', e => {
  App.toast(L('Algo ha fallado en esta pantalla. Tu progreso guardado no se ha perdido; vuelve a Hoy e inténtalo otra vez.',
      'Something went wrong on this screen. Your saved progress is safe; go back to Today and try again.'));
  if (window.console) console.error(e.error || e.message);
});
App.render(true);
if (!Store.data.meta.seenNotice && location.hash !== '#aviso') App.showNotice();
})();
