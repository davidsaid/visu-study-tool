/* VISU · "Cómo funciona / How it works" and settings. */
(function () {
'use strict';
const I = window.VISU_I18N, E = window.VISU_ENGINE, Store = window.VISU_STORE, App = window.VISU_APP;
const L = I.L, esc = I.esc;
const V = App.views;
const M = () => App.M, P = () => Store.data, SET = () => Store.data.settings;

/* ---------- HOW IT WORKS ---------- */
function diagramSVG() {
  return `<svg viewBox="0 0 640 300" role="img" aria-labelledby="dg-t dg-d"><title id="dg-t">${L('Dónde vive tu progreso', 'Where your progress lives')}</title>
  <desc id="dg-d">${L('Tu progreso está dentro de tu navegador, en tu dispositivo. Con «Guardar copia» sale a un archivo; con «Recuperar copia» ese archivo entra en otro navegador o dispositivo. No hay ningún servidor.',
      'Your progress sits inside your browser, on your device. “Save a copy” puts it in a file; “Restore a copy” loads that file into another browser or device. There is no server.')}</desc>
  <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
  <g><rect x="14" y="40" width="250" height="176" rx="14" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>
    <rect x="14" y="40" width="250" height="28" rx="14" fill="var(--m0)"/><rect x="14" y="56" width="250" height="12" fill="var(--m0)"/>
    <circle cx="32" cy="54" r="4" fill="var(--muted)"/><circle cx="46" cy="54" r="4" fill="var(--muted)"/><circle cx="60" cy="54" r="4" fill="var(--muted)"/>
    <text x="139" y="30" text-anchor="middle" font-size="15" font-weight="700">${L('Tu navegador, en tu dispositivo', 'Your browser, on your device')}</text>
    <rect x="44" y="92" width="190" height="96" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
    <text x="139" y="128" text-anchor="middle" font-size="17" font-weight="800" fill="var(--accent)">${L('Tu progreso', 'Your progress')}</text>
    <text x="139" y="152" text-anchor="middle" font-size="12.5" class="mut">${L('aciertos, rachas, insignias', 'answers, streaks, badges')}</text>
    <text x="139" y="171" text-anchor="middle" font-size="12.5" class="mut">${L('solo aquí', 'only here')}</text>
    <rect x="70" y="232" width="138" height="12" rx="6" fill="var(--ink)"/><text x="139" y="272" text-anchor="middle" font-size="12.5" class="mut">${L('Nadie más lo ve', 'Nobody else can see it')}</text></g>
  <g><path d="M276 112 C 340 90, 380 90, 438 108" fill="none" stroke="var(--accent)" stroke-width="3" marker-end="url(#ah)"/>
    <text x="356" y="80" text-anchor="middle" font-size="14" font-weight="800" fill="var(--accent)">${L('Guardar copia', 'Save a copy')}</text>
    <path d="M438 170 C 380 192, 340 192, 276 172" fill="none" stroke="var(--accent)" stroke-width="3" marker-end="url(#ah)"/>
    <text x="356" y="214" text-anchor="middle" font-size="14" font-weight="800" fill="var(--accent)">${L('Recuperar copia', 'Restore a copy')}</text></g>
  <g><path d="M458 74 h82 l26 26 v110 h-108 z" fill="var(--surface)" stroke="var(--ink)" stroke-width="2"/><path d="M540 74 v26 h26" fill="none" stroke="var(--ink)" stroke-width="2"/>
    <text x="512" y="138" text-anchor="middle" font-size="13" font-weight="800">visu-progreso</text><text x="512" y="156" text-anchor="middle" font-size="13" font-weight="800">.json</text>
    <text x="512" y="186" text-anchor="middle" font-size="11.5" class="mut">${L('un archivo tuyo', 'a file you keep')}</text>
    <text x="512" y="240" text-anchor="middle" font-size="12.5" class="mut">${L('Guárdalo en tu ordenador,', 'Keep it on your computer,')}</text>
    <text x="512" y="258" text-anchor="middle" font-size="12.5" class="mut">${L('un USB o tu correo', 'a USB stick or your email')}</text></g>
  <g><line x1="600" y1="30" x2="630" y2="60" stroke="var(--error)" stroke-width="3"/><line x1="630" y1="30" x2="600" y2="60" stroke="var(--error)" stroke-width="3"/>
    <text x="615" y="80" text-anchor="middle" font-size="11" class="mut">${L('sin', 'no')}</text><text x="615" y="94" text-anchor="middle" font-size="11" class="mut">${L('servidor', 'server')}</text></g></svg>`;
}

V.como = function () {
  App.focusMode(false);
  const n = Store.data.settings.newPerDay;
  const online = /^https?:$/.test(location.protocol);
  App.main().innerHTML = `<article class="how"><p class="eyebrow">${L('Cómo funciona', 'How it works')}</p><h1>${L('Dónde se guarda tu progreso y cómo no perderlo',
      'Where your progress is saved, and how not to lose it')}</h1>
  ${Store.ok ? '' : `<div class="note-box error"><b>${L('Ahora mismo este navegador no deja guardar.',
      'Right now this browser won’t let us save.')}</b> ${L('Pasa a menudo al abrir la web descargada con doble clic en Safari. Ábrela en Chrome, Edge o Firefox, usa <b>abrir-mac.command</b> o <b>abrir-windows.bat</b>, o la versión en internet. Mientras, guarda una copia antes de cerrar.',
      'This often happens when the downloaded site is opened by double-click in Safari. Open it in Chrome, Edge or Firefox, use <b>abrir-mac.command</b> or <b>abrir-windows.bat</b>, or the online version. Meanwhile, save a copy before closing.')}</div>`}
  <p class="lede">${L('Esta web no tiene cuentas ni contraseñas. Tu progreso se guarda <b>solo en este navegador, en este dispositivo</b>: no en una cuenta, no en un servidor, no en la nube. Nadie más puede verlo, tampoco nosotros.',
      'This website has no accounts or passwords. Your progress is saved <b>only in this browser, on this device</b>: not in an account, not on a server, not in the cloud. Nobody else can see it, including us.')}</p>
  <div class="diagram">${diagramSVG()}</div>
  <p class="small muted">${L('El <span class="term">navegador</span> es el programa con el que abres webs: Chrome, Safari, Firefox o Edge.',
      'The <span class="term">browser</span> is the program you open websites with: Chrome, Safari, Firefox or Edge.')}</p>

  <h2>${L('Qué lo borra o lo hace «desaparecer»', 'What erases it or makes it “disappear”')}</h2>
  <p>${L('Tu progreso no viaja contigo. Parecerá que se ha borrado si:',
      'Your progress doesn’t travel with you. It will look as if it’s gone if you:')}</p>
  <ul class="erase">
    <li>${L('Abres la web con <b>otro navegador</b> (por ejemplo, Safari en vez de Chrome).',
        'Open the site in <b>another browser</b> (for example, Safari instead of Chrome).')}</li>
    <li>${L('La abres en <b>otro dispositivo</b>: otro ordenador, tu móvil o una tableta.',
        'Open it on <b>another device</b>: another computer, your phone or a tablet.')}</li>
    <li>${L('Usas el <b>modo privado o incógnito</b>: al cerrar la ventana, se borra todo.',
        'Use <b>private or incognito mode</b>: everything is erased when you close the window.')}</li>
    <li>${L('<b>Borras el historial o los datos de las webs</b> en los ajustes del navegador.',
        '<b>Clear your history or website data</b> in the browser’s settings.')}</li>
    <li>${L('Abres <b>otra copia de la web</b>: la versión en internet y la versión descargada guardan cada una su propio progreso.',
        'Open <b>a different copy of the site</b>: the online version and the downloaded version each keep their own progress.')}</li>
    <li>${L('<b>En iPhone o iPad</b>: Safari puede borrarlo si pasas <b>7 días sin abrir la web</b>. Para evitarlo, añádela a la pantalla de inicio (botón Compartir → «Añadir a pantalla de inicio») y ábrela desde ese icono.',
        '<b>On iPhone or iPad</b>: Safari may erase it if you go <b>7 days without opening the site</b>. To avoid this, add it to your home screen (Share button → “Add to Home Screen”) and open it from that icon.')}</li>
  </ul>

  <h2>${L('Cómo conservarlo: guarda una copia', 'How to keep it: save a copy')}</h2>
  <p>${L('Una copia es un archivo pequeño con todo tu progreso. Con él puedes recuperarlo si se borra, o llevarlo a otro navegador o dispositivo.',
      'A copy is a small file with all your progress. With it you can get your progress back if it’s erased, or move it to another browser or device.')}</p>
  <h3>${L('Guardar copia', 'Save a copy')}</h3>
  <ol class="steps-ol"><li>${L('Pulsa <b>«Guardar copia»</b> (aquí abajo, en Ajustes o en la barra de «Progreso guardado»).',
      'Press <b>“Save a copy”</b> (below, in Settings, or in the “Progress saved” bar).')}</li>
    <li>${L('Se descarga un archivo llamado <b>visu-progreso-</b> y la fecha, normalmente en tu carpeta <b>Descargas</b>.',
        'A file called <b>visu-progreso-</b> plus the date downloads, usually to your <b>Downloads</b> folder.')}</li>
    <li>${L('Déjalo en un sitio seguro: tu ordenador, un USB, o envíatelo por correo.',
        'Keep it somewhere safe: your computer, a USB stick, or email it to yourself.')}</li></ol>
  <h3>${L('Recuperar copia', 'Restore a copy')}</h3>
  <ol class="steps-ol"><li>${L('Abre la web en el navegador o dispositivo donde quieras seguir.',
      'Open the site in the browser or on the device where you want to carry on.')}</li>
    <li>${L('Pulsa <b>«Recuperar copia»</b> y elige el archivo <b>visu-progreso-….json</b>.',
        'Press <b>“Restore a copy”</b> and pick the <b>visu-progreso-….json</b> file.')}</li>
    <li>${L('Listo: tu progreso vuelve a estar aquí. Sustituye al que hubiera en este navegador.',
        'Done: your progress is back. It replaces whatever was in this browser.')}</li></ol>
  <div class="note-box info"><b>${L('¿Cuándo?', 'When?')}</b> ${L('Una vez a la semana, y siempre <b>antes</b> de cambiar de navegador o de dispositivo, de borrar los datos del navegador o de pasar de la versión en internet a la descargada. La barra «Última copia» te avisa si hace más de 7 días.',
      'Once a week, and always <b>before</b> switching browser or device, clearing browser data, or moving between the online and downloaded versions. The “Last copy” bar reminds you after 7 days.')}</div>
  <section class="card">${App.backupHTML()}</section>

  <h2>${L('Dos formas de usar la web', 'Two ways to use the site')}</h2>
  <div class="twoways"><div class="way"><h3>${L('En internet', 'Online')}${online ? ` <span class="tag teacher">${L('estás aquí', 'you are here')}</span>` : ''}</h3><p class="small">${L('Abres la dirección de la web (está publicada gratis en GitHub Pages). No instalas nada.',
      'You open the website’s address (published free on GitHub Pages). Nothing to install.')}</p></div>
    <div class="way"><h3>${L('Descargada', 'Downloaded')}${online ? '' : ` <span class="tag teacher">${L('estás aquí', 'you are here')}</span>`}</h3><p class="small">${L('Descargas la carpeta de GitHub, la descomprimes y haces doble clic en <b>index.html</b>. Funciona sin internet. Si tu navegador no deja guardar al abrirla así, prueba con Chrome, Edge o Firefox, o abre <b>abrir-mac.command</b> (Mac) o <b>abrir-windows.bat</b> (Windows), que necesitan Python 3. Cada forma de abrirla guarda su propio progreso.',
        'You download the folder from GitHub, unzip it and double-click <b>index.html</b>. It works offline. If your browser won’t save when opened this way, try Chrome, Edge or Firefox, or open <b>abrir-mac.command</b> (Mac) or <b>abrir-windows.bat</b> (Windows), which need Python 3. Each way of opening it keeps its own progress.')}</p></div></div>
  <p>${L('Las dos funcionan igual, pero <b>cada una guarda su propio progreso</b>. Para pasar de una a otra, guarda una copia en una y recupérala en la otra.',
      'Both work the same, but <b>each keeps its own progress</b>. To move between them, save a copy in one and restore it in the other.')}</p>

  <h2>${L('Cómo se mide tu progreso', 'How your progress is measured')}</h2>
  <p>${L('Cada especie tiene cinco tarjetas, una por casilla del examen: clase, orden, género, especie y nombre vulgar. Cuentan la ortografía, las tildes, la ñ y la ü; las mayúsculas y los espacios de más, no.',
      'Each species has five cards, one per exam box: class, order, genus, species and common name. Spelling, accents, ñ and ü count; capitals and extra spaces don’t.')}</p>
  <ul><li><b>${L('Fácil y Medio', 'Easy and Medium')}</b>: ${L('suben tu progreso hasta el 50 % y vuelven a enseñarte lo que fallas en la misma sesión.',
      'take your progress up to 50% and show you again what you miss in the same session.')}</li>
    <li><b>${L('Difícil, sin pistas', 'Hard, without hints')}</b>: ${L('alimenta el planificador FSRS, que decide cuándo repasar cada tarjeta. Una tarjeta está <b>dominada</b> cuando FSRS calcula que la recuerdas con un 90 % de probabilidad y su estabilidad pasa de 7 días.',
        'feeds the FSRS scheduler, which decides when each card is reviewed. A card is <b>mastered</b> when FSRS estimates a 90% chance you recall it and its stability exceeds 7 days.')}</li>
    <li><b>${L('Preparación', 'Readiness')}</b>: ${L('lo que FSRS predice que recordarías el día del examen (o dentro de 7 días si no has puesto fecha), de media sobre todas las tarjetas.',
        'what FSRS predicts you’d remember on exam day (or in 7 days if no date is set), averaged over every card.')}</li></ul>

  <h2 id="plan">${L('Cómo funciona tu plan de estudio', 'How your study plan works')}</h2>
  <p>${L('Cada día, Hoy te propone una sesión con dos tipos de tarjetas:', 'Every day, Today offers a session with two kinds of cards:')}</p>
  <ul><li><b>${L('Repasos', 'Reviews')}</b>: ${L('tarjetas que ya has visto y a las que les toca volver, las más atrasadas antes. No tienen límite: llenan la sesión salvo el hueco de las nuevas.',
        'cards you’ve already seen whose time to come back has arrived, the most overdue first. They have no limit: they fill the session except for the room kept for new ones.')}</li>
    <li><b>${L('Nuevas', 'New')}</b>: ${L(`hasta ${n} especies nuevas al día (${n * 5} tarjetas). Cada sesión les guarda hasta un tercio de sus tarjetas, aunque haya muchos repasos pendientes. Primero salen las especies de los grupos a los que ya has echado un primer vistazo; después, el resto en el orden del árbol, un orden tras otro. Si has puesto la fecha del examen, Hoy te dice cuántas nuevas al día harían falta para empezarlas todas 3 días antes. Cámbialo en Ajustes → «Especies nuevas al día». Más especies al día significa más repasos los días siguientes. «¿Qué grupo es?» tiene su propio límite: ${n} grupos nuevos al día.`,
        `up to ${n} new species a day (${n * 5} cards). Each session keeps up to a third of its cards for them, even with many reviews due. Species from groups you’ve had a first look at come first; then the rest in the order of the tree, one order after another. If you’ve set the exam date, Today tells you how many new ones a day it would take to start them all 3 days before. Change it in Settings → “New species per day”. More species a day means more reviews on the days after. “Which group is it?” has its own limit: ${n} new groups a day.`)}</li></ul>
  <p>${L('Si eliges practicar solo un grupo, solo salen sus especies. Si una sesión dice «No hay tarjetas para esta sesión», ya has hecho los repasos y las nuevas de hoy: «Repasar igualmente» adelanta tarjetas antes de su momento.',
      'If you choose to practise one group only, only its species come up. If a session says “No cards for this session”, you’ve done today’s reviews and new cards: “Review anyway” brings cards back early.')}</p>
  <h3>${L('Cuándo vuelve cada tarjeta', 'When each card comes back')}</h3>
  <ul><li><b>${L('Fácil y Medio', 'Easy and Medium')}</b>: ${L('si fallas, vuelve en la misma sesión. Si aciertas, a los 10 minutos; con dos aciertos seguidos, al día siguiente; con tres o más, a los tres días. Un acierto con «Lo adivino» vuelve a los 10 minutos.',
        'if you miss, it comes back in the same session. If you’re right, in 10 minutes; after two right in a row, the next day; after three or more, in three days. A right answer marked “I’m guessing” comes back in 10 minutes.')}</li>
    <li><b>${L('Difícil sin pistas, la hoja de examen y el simulacro', 'Hard without hints, the exam sheet and the mock')}</b>: ${L('FSRS la programa para cuando calcula que la probabilidad de recordarla baja al 90 %. «Lo sé seguro» alarga el intervalo y «Lo adivino» lo acorta.',
        'FSRS schedules it for when it estimates your chance of remembering it drops to 90%. “I know it” lengthens the interval and “I’m guessing” shortens it.')}</li></ul>
  <h3>${L('Camino recomendado', 'Suggested path')}</h3>
  <ol class="steps-ol"><li>${L('<b>Primer vistazo</b> a un orden: sus especies una a una, sin preguntas. Al terminar, una ronda en Fácil con ese grupo, aunque ya hayas gastado las nuevas de hoy. Cuando los hayas visto todos, Hoy te sugiere volver al orden donde tienes más fallos abiertos.',
        'A <b>first look</b> at an order: its species one by one, no questions. At the end, a round on Easy with that group, even if you’ve used up today’s new cards. Once you’ve seen them all, Today suggests going back to the order with the most open mistakes.')}</li>
    <li>${L('<b>Fácil</b> y luego <b>Medio</b>, hasta que los nombres te suenen.', '<b>Easy</b>, then <b>Medium</b>, until the names feel familiar.')}</li>
    <li>${L('<b>Difícil sin pistas</b>: solo esto cuenta para «dominada».', '<b>Hard without hints</b>: only this counts toward “mastered”.')}</li>
    <li>${L('Cada día, haz primero los repasos: son los que mantienen lo aprendido.', 'Every day, do the reviews first: they keep what you’ve learnt.')}</li></ol>
  <p>${L('<b>Mis fallos</b> reúne lo que fallaste en los últimos 7 días y aún no has acertado dos días distintos; cuenta como una sesión normal. Tras un fallo, «Inténtalo otra vez» te lo pregunta de nuevo al momento, sin nota.',
      '<b>My mistakes</b> gathers what you missed in the last 7 days and haven’t yet got right on two different days; it counts as a normal session. After a miss, “Try it again” asks it once more on the spot, ungraded.')}</p>
  <p>${L('<b>Primer vistazo</b>, <b>¿Cuál es?</b>, <b>¿Cuál sobra?</b> y <b>¿Este o este?</b> sirven para familiarizarte: cuentan como día de estudio, pero no cambian cuándo vuelve cada tarjeta.',
      '<b>First look</b>, <b>Which one is it?</b>, <b>Odd one out</b> and <b>This one or that one?</b> are for getting familiar: they count as a study day but don’t change when any card comes back.')}</p>

  <h2>${L('Privacidad', 'Privacy')}</h2>
  <ul><li>${L('<b>Sin cookies</b> ni publicidad.', '<b>No cookies</b> and no ads.')}</li>
    <li>${L('<b>Sin seguimiento</b>: no medimos visitas ni sabemos quién eres.',
        '<b>No tracking</b>: we don’t count visits or know who you are.')}</li>
    <li>${L('<b>No se envía nada</b> a ningún sitio. Las fotos, los textos y las letras vienen con la propia web.',
        '<b>Nothing is sent</b> anywhere. Photos, texts and fonts come with the site itself.')}</li>
    <li>${L('Los <b>vídeos</b> están en YouTube y solo se cargan cuando pulsas el botón. En ese momento tu navegador se conecta con YouTube y le dice la dirección de esta web, que YouTube exige para reproducir el vídeo; YouTube tiene sus propias reglas. En una copia descargada, los vídeos se abren en YouTube.',
        'The <b>videos</b> are on YouTube and only load when you press the button. At that moment your browser connects to YouTube and tells it this site’s address, which YouTube requires to play the video; YouTube has its own rules. In a downloaded copy, videos open on YouTube.')}</li>
    <li>${L('Para borrar tu progreso, ve a Ajustes → «Borrar», o borra los datos de esta web en tu navegador.',
        'To delete your progress, go to Settings → “Delete”, or clear this site’s data in your browser.')}</li></ul>

  <h2>${L('De dónde sale el contenido', 'Where the content comes from')}</h2>
  <p>${L('Cada <b>colección</b> (por ejemplo, vertebrados) es una lista de especies para un examen de identificación: el «bestiario». Sus clases, órdenes y nombres son las respuestas que da por buenas la herramienta. Cuando una autoridad actual usa otro nombre, la ficha lo indica en una nota, pero la respuesta no cambia.',
      'Each <b>collection</b> (for example, vertebrates) is a list of species for an identification exam: the “bestiary”. Its classes, orders and names are the answers the tool accepts. When a current authority uses another name, the card says so in a note, but the answer doesn’t change.')}</p>
  <p>${L('Los vídeos son vídeos públicos de YouTube; cada ficha nombra el canal que lo publicó.',
      'The videos are public YouTube videos; every card names the channel that published it.')}</p>
  <p>${L('Los datos de las fichas vienen de bases de datos científicas abiertas y de enciclopedias. <b>Cada dato lleva un número</b>: púlsalo y verás de dónde sale, su licencia y un enlace. <b>Cada foto lleva su autor y su licencia</b>, con enlace al original. Los textos marcados como «borrador» aún no los ha revisado una persona.',
      'Card facts come from open scientific databases and encyclopaedias. <b>Every fact carries a number</b>: press it to see where it comes from, its licence and a link. <b>Every photo shows its author and licence</b>, with a link to the original. Texts marked “draft” haven’t been checked by a person yet.')}</p>
  </article><div id="aside-m"></div>`;
  const short = [['Tu progreso vive en este navegador.', 'Your progress lives in this browser.'],
    ['Otro navegador, otro dispositivo o borrar datos = no lo verás.', 'Another browser, another device or clearing data = you won’t see it.'],
    ['Guarda una copia cada semana.', 'Save a copy every week.'], ['Sin cookies, sin seguimiento.', 'No cookies, no tracking.']];
  App.aside().innerHTML = App.DESK.matches ? `<section class="card sticky"><p class="eyebrow">${L('En resumen', 'In short')}</p>
    <ul class="small list-tight">${short.map(([es, en]) => `<li>${L(es, en)}</li>`).join('')}</ul>${App.backupHTML()}</section>` : '';
};

/* ---------- SETTINGS ---------- */
let wipeArmed = false;
V.ajustes = function () {
  App.focusMode(false);
  const set = SET();
  const num = (key, label, min, max, help) => `<div class="switch-row">
    <label class="grow" for="set-${key}"><b>${label}</b>${help ? `<br><span class="tiny muted">${help}</span>` : ''}</label>
    <input class="numin" type="number" id="set-${key}" data-num="${key}" min="${min}" max="${max}" value="${esc(set[key])}"></div>`;
  const seg = (attr, items, on) => `<div class="seg">${items.map(([v, label]) => `<button ${attr}="${v}" aria-pressed="${v === on}">${label}</button>`).join('')}</div>`;
  const cols = App.collections();
  const colCard = cols.length > 1 ? `<section class="card" id="coleccion"><h2>${L('Colección', 'Collection')}</h2>
    <p class="small muted">${L('Cada colección es la lista de especies de un examen. Cada una guarda su propio progreso; cambiar de colección no borra nada.',
        'Each collection is one exam’s species list. Each keeps its own progress; switching collection deletes nothing.')}</p>
    ${seg('data-col', cols.map(c => [esc(c.id), `${esc(I.t(c.name))} <span class="tiny muted">${c.species}</span>`]), esc(App.collection()))}</section>` : '';
  App.main().innerHTML = `<p class="eyebrow">${L('Ajustes', 'Settings')}</p><h1>${L('Ajustes', 'Settings')}</h1>${colCard}
  <section class="card"><h2>${L('Tu progreso y tus copias', 'Your progress and copies')}</h2>${App.backupHTML()}
    <p class="small muted">${L('«Guardar copia» descarga un archivo con tu progreso. «Recuperar copia» lo vuelve a cargar, aquí o en otro navegador.',
        '“Save a copy” downloads a file with your progress. “Restore a copy” loads it back, here or in another browser.')} <a href="#como-funciona">${L('Cómo funciona', 'How it works')}</a></p>
    <p class="small muted">${L(`${P().log.length} respuestas guardadas.`, `${P().log.length} answers saved.`)}</p>
    <div class="switch-row sep"><span class="grow small">${L('Borrar el progreso de este navegador',
        'Delete the progress in this browser')}</span>
      <button class="btn danger" id="wipe">${wipeArmed ? L('Pulsa otra vez para borrar', 'Press again to delete') : L('Borrar', 'Delete')}</button></div></section>
  <section class="card"><h2>${L('Examen', 'Exam')}</h2>
    <div class="switch-row"><label class="grow" for="set-exam"><b>${L('Fecha del examen', 'Exam date')}</b><br>
      <span class="tiny muted">${L('La preparación se calcula para ese día. Sin fecha, para dentro de 7 días.',
        'Readiness is forecast for that day. Without a date, for 7 days from now.')}</span></label>
      <input type="date" id="set-exam" class="numin" value="${esc(set.examDate || '')}"></div>
    ${num('newPerDay', L('Especies nuevas al día', 'New species per day'), 1, 60, `${L('Cada especie trae cinco tarjetas. Los repasos no tienen límite.',
        'Each species brings five cards. Reviews have no limit.')} <a href="#como-funciona-plan">${L('Cómo funciona tu plan', 'How your plan works')}</a>`)}
    ${num('sessionSize', L('Tarjetas por sesión', 'Cards per session'), 5, 100)}
    ${num('mockSize', L('Fotos en el simulacro', 'Photos in the mock'), 5, 100)}</section>
  <section class="card"><h2>${L('Idioma y tema', 'Language and theme')}</h2>
    <div class="row my"><span class="grow">${L('Idioma', 'Language')}</span>${seg('data-lang', [['es', 'Español'], ['en', 'English']], I.lang)}</div>
    <div class="row"><span class="grow">${L('Tema', 'Theme')}</span>
      ${seg('data-theme', [['auto', 'Auto'], ['light', L('Claro', 'Light')], ['dark', L('Oscuro', 'Dark')]], set.theme)}</div></section>
  <section class="card"><h2>${L('Casillas del examen', 'Exam boxes')}</h2>
    <p class="small muted">${L('El VISU pide cinco casillas por especie. Si un año cambia, desactiva las que no entren.',
        'The VISU exam asks for five boxes per species. If a year changes that, switch off the ones not asked.')}</p>
    ${E.SKILLS.map(k => `<div class="switch-row"><span class="grow"><b>${I.sk(k)}</b></span>
      <button class="switch" role="switch" aria-checked="${!!set.skills[k]}" data-skill="${k}" aria-label="${I.sk(k)}"></button></div>`).join('')}
    <p class="tiny muted" id="skillmsg"></p></section>
  <section class="card"><h2>${L('Nivel por defecto', 'Default level')}</h2><p class="small muted">${L('Se elige antes de cada sesión; esto solo marca el que aparece seleccionado.',
      'You choose before every session; this only sets which one is preselected.')}</p>
    ${seg('data-lv', [1, 2, 3].map(k => [k, I.lvName(k)]), set.level)}<p class="small mt">${I.MASTERY_RULE()}</p></section>
  <p class="tiny muted">${L('Datos', 'Data')}: ${esc(App.collectionName(App.collection()))} ${esc(M().bestiary.edition || '')}
    · ${L('generado', 'generated')} ${esc(M().bestiary.generated || '?')} · ${App.counts().photos} ${L('especies con foto', 'species with photos')}</p>
  <div id="aside-m"></div>`;
  App.aside().innerHTML = '';
};
App.on('click', '[data-skill]', b => {
  const set = SET(), k = b.dataset.skill;
  if (set.skills[k] && App.skills().length === 1) {
    document.getElementById('skillmsg').textContent = L('Deja al menos una casilla activa.', 'Keep at least one box on.');
    return;
  }
  set.skills[k] = !set.skills[k]; Store.save();
  App.redraw(V.ajustes, `[data-skill="${k}"]`);
});
App.on('click', '[data-lang]', b => App.setLang(b.dataset.lang));
App.on('click', '[data-col]', b => { if (b.dataset.col !== App.collection()) Store.switchCollection(b.dataset.col); });
App.on('click', '[data-theme]', b => { SET().theme = b.dataset.theme; Store.save(); App.applyTheme(); App.redraw(V.ajustes, `[data-theme="${b.dataset.theme}"]`); });
App.on('click', '[data-lv]', b => { SET().level = +b.dataset.lv; Store.save(); App.redraw(V.ajustes, `[data-lv="${b.dataset.lv}"]`); });
App.on('change', '[data-num]', inp => {
  const set = SET(), v = Math.round(+inp.value);
  if (v >= +inp.min && v <= +inp.max) { set[inp.dataset.num] = v; Store.save(); } else inp.value = set[inp.dataset.num];
});
App.on('change', '#set-exam', inp => { SET().examDate = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? inp.value : null; Store.save(); });
App.on('click', '#wipe', () => {
  if (!wipeArmed) { wipeArmed = true; App.redraw(V.ajustes, '#wipe'); return; }
  wipeArmed = false; Store.wipe();
  App.toast(L('Progreso borrado de este navegador.', 'Progress deleted from this browser.'));
  App.render(true);
});
})();