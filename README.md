# Herramienta de estudio para VISU · VISU Study Tool

The **VISU Study Tool** is a free website for learning to identify animals by sight, for
*visu* identification exams. You look at a photo and write the animal's **class, order,
genus, species and Spanish common name**.

The animals come in **collections**, one per exam. The first collection has **308
vertebrates**. Collections for invertebrates and arthropods can be added as a folder with a
species list (see [COLECCIONES.md](COLECCIONES.md)).

*En español más abajo.*

## What it does

- **Practice from photos** at three levels you choose before each session:
  - **Easy:** multiple choice, until you get a card right once; from then on that card is typed, with hints.
  - **Medium:** you type, and can ask for hints.
  - **Hard:** you type with no help, like the exam.

  Each question opens on a random photo of the animal, and you can flip through all its photos,
  so you learn the animal rather than one picture. Tap a photo to see it large. Spelling and accents count; capital letters
  don't.
- **You choose what comes first**, in Settings or before each game: every species, only the
  ones with an open mistake, or only the ones you haven't mastered. Within that, what you've seen
  least always comes first, so each round moves on to other species whether you answer right or
  wrong. Each quiz
  asks at most two boxes per species, so 20 questions cover at least 10 species, and a miss
  doesn't make the quiz longer. **Spaced repetition**
  ([FSRS](https://github.com/open-spaced-repetition/ts-fsrs)) still schedules every box; due
  dates break ties.
- **Three progress bars**: species seen (in a first look, on its card or in a game's answer),
  practised (answered at least once) and answered right (at least one box).
- **"Primer vistazo"** (first look): page through a group with nothing graded. An order shows
  its species one by one (photos, names, first field marks, what the name says); a class shows
  its orders, with the "-iformes" ("shaped like") naming rule. Every 4 animals, an ungraded
  "which one was…?" pause. It ends
  with an Easy round on that group only, its least seen species first (your saved
  practice group and level don't change). Today's card opens a menu of square tiles, one per
  group, each a badge medal (a cartoon of an iconic species of the group) whose ring is the
  share of its species mastered, marked when
  you've looked at it, with its open mistakes and species not started, so any group can be
  looked at again. The groups with the most species not started come first, after its
  suggestion: the order with
  the most species not started, skipping the ones you've finished looking at. Species that are
  alone in their order in the list come afterwards, in three batches ("other fish", "other
  birds", "other tetrapods"). Once
  you've looked at everything, it suggests the group with the most open mistakes.
- **"¿Qué grupo es?"**: see up to four animals of one class or order and name the group, on the
  same three levels, with its own spaced repetition. The way in for someone who doesn't know the
  animals yet: classes first, then the largest orders. A class's card can quiz just its orders.
  A wrong group shows both groups side by side, with what each has in common.
- **"¿Cuál sobra?"** (odd one out): four photos, three from one order; pick the one that isn't.
  The odd one comes from another class (Easy), the same class (Medium) or is the closest relative
  of another order (Hard). The answer shows both orders and what each has in common.
- **"¿Este o este?"** (this one or that one?): one photo and two look-alike species. With
  "most mistakes", your own confusions come first; a pair is settled after three right answers in a row. Look-alike pairs
  from the cards fill the round. Every answer shows the two side by side, part by part.
- **"¿Cuál es?"**: see a scientific name and pick the right photo out of four; each option
  can be flipped through all its photos. The harder the level, the more closely related the
  other animals.
- **A card opened during a quiz** opens over the question; close it and carry on where you were.
- **Mistakes teach.** If you confuse two species, you see them side by side with what tells
  them apart, and their field marks lined up part by part (head, tail, colouring…) next to
  their size. Every mistake also shows **what the name says**: what the Latin or Greek of the
  class, order, genus or species means, as a memory aid. Then **"Inténtalo otra vez"** asks the
  same question once more from memory (not graded); a misspelling shows the correct form with the
  missed letters marked.
- **"Mis fallos"** (my mistakes): a session of the cards you missed in the last 7 days that you
  haven't since got right on two different days.
- **Explore the tree of life** branch by branch, either the full tree or, in **study mode**, with
  each class of the list as the root of its own tree (Reptilia included, although it isn't a
  clade). A search box finds any species by its scientific or common name (accents and capitals
  don't matter there). Every group and species has a card: photos,
  a video, distribution, diet, size, sexual dimorphism, sex determination, conservation
  status, field marks, look-alikes and the meaning of its names. **Every fact, photo and video names its source.**
- **Mock exam** with the five-field answer sheet, on photos held out of practice (two per species), so it
  tests animals rather than remembered pictures.
- Spanish and English.

## Use it

**Online:** open the website at the GitHub Pages address of this repository.

**On your computer, offline:**

1. Download this repository: green **Code** button → **Download ZIP**. Unzip it.
2. Double-click **`index.html`**. It opens in your browser.

If your browser says it can't save your progress, use **`abrir-mac.command`** (Mac) or
**`abrir-windows.bat`** (Windows) instead. They need [Python 3](https://www.python.org/downloads/).

### Where your progress is saved

**Only in your browser, on your device.** There are no accounts and no server, and nothing
is sent anywhere. That means:

- Another browser, another device, private mode, clearing your browsing data, or using a
  different copy (online vs downloaded) will not show your progress.
- **Save a copy** regularly (*Guardar copia*). It is a small file you keep. *Recuperar copia*
  loads it back in any browser. If that browser already has progress, it offers to *combine* the
  two (every answer from both is kept) or to *replace* it, warns when the copy has no answers or
  fewer than the browser, and keeps the browser's progress first so it can be undone in *Ajustes*.
- Each collection keeps its own progress, and its own copies.

The website explains this in plain words on its **Cómo funciona / How it works** page, along with
how the study plan works: the daily limit on new species, what comes back when, and a suggested path.
Today, Settings and an empty session link straight to that section (`#como-funciona-plan`).

### Privacy

No cookies, no analytics, no tracking. Fonts, code and photos are served from this
repository. Videos load from YouTube only when you press play; at that point your browser tells
YouTube the site's address (not the page you're on), which YouTube requires before it plays an
embedded video. In a downloaded copy, videos open on YouTube instead.

### Found a mistake?

Every card has a **"report an error"** link that opens a pre-filled issue on GitHub. The texts
marked *borrador* (draft) were drafted from cited sources and haven't been checked by a person
yet.

## Updating or adding a collection

See **[COLECCIONES.md](COLECCIONES.md)** (in Spanish, with an English summary). In short,
edit or add `collections/<id>/species.csv` on GitHub and open a pull request. The checks
fetch the new species' data and photos, and the site updates when the pull request is
merged.

## Contributing

Pull requests are welcome, including ones made with an AI coding agent. Read
**[CONTRIBUTING.md](CONTRIBUTING.md)** first: what to change, the sources and licences every
contribution needs, and the tests it must pass.

## For developers

| Path | Contents |
|------|----------|
| `index.html`, `app/` | The website. Plain HTML, CSS and JavaScript, no build step |
| `collections/` | One folder per collection: `species.csv`, `collection.csv`, `videos.csv`, `changes.csv` |
| `data/` | Generated data the website loads (`collections.js`, and per collection `bestiary.js`, `media.js`, `content.js`). Do not edit |
| `media/` | Photos, 3–4 per species, with credits in [`media/CREDITS.md`](media/CREDITS.md) |
| `curation/` | Clade backbone, name notes, photo overrides (CSV), shared by every collection |
| `content/` | Field marks, look-alikes, etymology and group texts (JSON), drafted from cited sources |
| `pipeline/` | Python scripts that build `data/` and `media/`. See [`pipeline/README.md`](pipeline/README.md) |
| `docs/` | [`data-format.md`](docs/data-format.md) (every data file) and [`data-sources.md`](docs/data-sources.md) |
| `tests/` | Engine tests (`tests/engine.html`), browser scenarios (`tests/harness.html`) and a test-only arthropod collection |
| `vendor/` | ts-fsrs 5.4.2 (MIT) |

Rebuild the data:

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python pipeline/refresh.py   # network: names, facts, video links
.venv/bin/python pipeline/media.py select && .venv/bin/python pipeline/media.py fetch
.venv/bin/python pipeline/build.py     # offline: writes data/
.venv/bin/python -m unittest discover -s pipeline/tests
```

## Licences and credits

- **Code:** [MIT](LICENSE).
- **Data** (`collections/`, `curation/`, and the facts and lists in `data/<collection>/bestiary.js`):
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). They are compiled
  from the sources listed in [CREDITS.md](CREDITS.md); FishBase and Animal Diversity Web allow
  only non-commercial use.
- **Texts** (`content/` and its copy in `data/<collection>/content.js`): drafted from Wikipedia
  and other cited sources, so they stay
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), like Wikipedia.
- **Photos:** each keeps its own licence, with the author named in
  [`media/CREDITS.md`](media/CREDITS.md) and on every photo.
- **Videos** are public YouTube videos, embedded and credited to their channel; they are
  not copied into this repository.

---

## En español

La **Herramienta de estudio para VISU** es una web gratuita para aprender a identificar
animales de visu: ves una foto y escribes clase, orden, género, especie y nombre vulgar. Las
especies vienen en **colecciones**, una por examen; la primera tiene 308 vertebrados.

- **Úsala en línea**, o **descárgala**: botón verde *Code* → *Download ZIP*, descomprime y
  abre `index.html` con doble clic.
- **Tu progreso se guarda solo en tu navegador, en tu dispositivo.** Sin cuentas ni
  servidores. Si cambias de navegador o de dispositivo, o borras los datos del navegador,
  no lo verás: **guarda una copia** cada semana con *Guardar copia*. Cada colección guarda
  su propio progreso.
- Tú eliges qué sale antes al practicar: las especies que menos has visto, las que más fallas o las que menos dominas. Cada ronda pregunta como mucho dos casillas por especie.
- Empieza con un **primer vistazo** a un grupo (sin preguntas), practica en tres niveles, juega a **¿Qué grupo es?** (varias fotos de una clase u orden: nombra
  el grupo; la mejor forma de empezar) y a **¿Cuál es?**, explora el árbol de la vida rama a rama (completo, o en **modo estudio**, con cada clase de la lista como raíz de su propio árbol)
  y haz simulacros con la hoja de cinco casillas. Cada pregunta muestra una foto al azar del
  animal; el simulacro usa fotos que no salen al practicar. Cuentan la ortografía y las tildes; las mayúsculas, no.
- Cada ficha y cada fallo explican **qué dice el nombre**: qué significa el latín o el griego de
  la clase, el orden, el género y la especie, para recordarlos mejor.
- Cada dato, cada foto y cada vídeo indica su fuente.
- ¿Has visto un error? Cada ficha tiene un enlace para avisar en GitHub.
- **Para actualizar o añadir una colección**, ver [COLECCIONES.md](COLECCIONES.md).
