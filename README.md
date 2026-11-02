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
  - **Easy:** multiple choice.
  - **Medium:** you type, and can ask for hints.
  - **Hard:** you type with no help, like the exam.

  Each question opens on a random photo of the animal, and you can flip through all its photos,
  so you learn the animal rather than one picture. Tap a photo to see it large. Spelling and accents count; capital letters
  don't.
- **Spaced repetition** ([FSRS](https://github.com/open-spaced-repetition/ts-fsrs)): what
  you're about to forget comes back first.
- **"Primer vistazo"** (first look): page through a group with nothing graded. An order shows
  its species one by one (photos, names, first field marks); a class shows its orders. It ends
  with an Easy round on that group. Today suggests the order with the most species not seen yet.
- **"¿Qué grupo es?"**: see up to four animals of one class or order and name the group, on the
  same three levels, with its own spaced repetition. The way in for someone who doesn't know the
  animals yet: classes first, then the largest orders. A class's card can quiz just its orders.
  A wrong group shows both groups side by side, with what each has in common.
- **"¿Cuál es?"**: see a scientific name and pick the right photo out of four; each option
  can be flipped through all its photos. The harder the level, the more closely related the
  other animals.
- **Mistakes teach.** If you confuse two species, you see them side by side with what tells
  them apart, and their field marks lined up part by part (head, tail, colouring…) next to
  their size. Every mistake also shows **what the name says**: what the Latin or Greek of the
  class, order, genus or species means, as a memory aid.
- **Explore the tree of life** branch by branch, either the full tree or, in **study mode**, with
  each class of the list as the root of its own tree (Reptilia included, although it isn't a
  clade). Every group and species has a card: photos,
  a video, distribution, diet, size, sexual dimorphism, sex determination, conservation
  status, field marks, look-alikes and the meaning of its names. **Every fact, photo and video names its source.**
- **Mock exam** with the five-field answer sheet.
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
  loads it back in any browser.
- Each collection keeps its own progress, and its own copies.

The website explains this in plain words on its **Cómo funciona / How it works** page.

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
| `collections/` | One folder per collection: `species.csv`, `collection.csv`, `videos.csv` |
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
- Empieza con un **primer vistazo** a un grupo (sin preguntas), practica en tres niveles, juega a **¿Qué grupo es?** (varias fotos de una clase u orden: nombra
  el grupo; la mejor forma de empezar) y a **¿Cuál es?**, explora el árbol de la vida rama a rama (completo, o en **modo estudio**, con cada clase de la lista como raíz de su propio árbol)
  y haz simulacros con la hoja de cinco casillas. Cada pregunta muestra una foto al azar del
  animal. Cuentan la ortografía y las tildes; las mayúsculas, no.
- Cada ficha y cada fallo explican **qué dice el nombre**: qué significa el latín o el griego de
  la clase, el orden, el género y la especie, para recordarlos mejor.
- Cada dato, cada foto y cada vídeo indica su fuente.
- ¿Has visto un error? Cada ficha tiene un enlace para avisar en GitHub.
- **Para actualizar o añadir una colección**, ver [COLECCIONES.md](COLECCIONES.md).
