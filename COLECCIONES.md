# Guía para mantener las colecciones

Esta guía es para quien mantenga una lista de especies de un curso al siguiente, o quiera
añadir una lista nueva (por ejemplo, invertebrados o artrópodos). No hace falta saber
programar. Necesitas una cuenta de GitHub con permiso de escritura en el repositorio; pídeselo
a quien lo mantiene. Sin esa cuenta, propón el cambio desde una copia tuya (*fork*) o envía el
CSV a quien lo mantiene.

*English summary at the end.*

## Qué es una colección

Cada colección es la lista de especies de un examen de identificación, y vive en su propia
carpeta, dentro de [`collections/`](collections/):

| Archivo | Qué contiene |
|---------|--------------|
| `species.csv` | Una fila por especie: lo que la herramienta pregunta y da por correcto |
| `collection.csv` | El nombre de la colección en español y en inglés, la edición y su posición en el menú |
| `videos.csv` | Opcional: un vídeo público por especie, con el canal que lo publicó |
| `changes.csv` | Opcional: las respuestas que cambiaron en una versión nueva de la lista |

Cada colección guarda su propio progreso: cambiar de colección en la web no borra nada.

## `species.csv`

| Columna | Ejemplo | Notas |
|---------|---------|-------|
| `clase` | `Mammalia` | La que se pide en el examen |
| `orden` | `Carnivora` | La que se pide en el examen |
| `infraorden` | `Cetacea` | Casi siempre vacío |
| `nombre_cientifico` | `Lynx pardinus` | Género y especie, separados por un espacio |
| `nombre_vulgar` | `Lince ibérico` | El nombre que se pide en el examen, con sus tildes |

**Lo que escribes en este archivo es lo que la herramienta da por correcto.** Si una
autoridad actual usa otro nombre, la ficha lo muestra en una nota
([`curation/corrections.csv`](curation/corrections.csv)), pero la respuesta no cambia.

Si una especie está en dos colecciones, tiene que tener la misma clase, el mismo orden y el
mismo infraorden en las dos: el árbol, los datos y las fotos son comunes.

## `collection.csv`

```csv
key,value
nombre_es,Vertebrados
nombre_en,Vertebrates
edicion,2026-27
orden,1
```

`orden` decide la posición en el menú; la colección con el número más bajo es la que se abre
la primera vez. El nombre de la carpeta es el identificador de la colección: solo letras
minúsculas sin tildes, números y guiones (`vertebrados`, `artropodos`). **No lo cambies una
vez publicado**: el progreso de los estudiantes se guarda con ese nombre.

## `videos.csv`

```csv
species_id,url,channel,channel_url,title,checked
lynx_pardinus,https://www.youtube.com/watch?v=…,Nombre del canal,https://www.youtube.com/@canal,Título del vídeo,2026-11-01
```

`species_id` es el nombre científico en minúsculas, con guion bajo (`lynx_pardinus`). Cada
vídeo necesita su canal y el enlace al canal, para dar el crédito a quien lo publicó. Elige
vídeos públicos que muestren al animal vivo; la comprobación revisa que el enlace funciona y
que el vídeo se puede ver dentro de la web.

## `changes.csv`

Si una versión nueva de la lista cambia la clase, el orden, el infraorden o el nombre vulgar de
una especie, quien ya la había estudiado recuerda la respuesta antigua. Anota el cambio aquí
además de en `species.csv`:

```csv
fecha,nombre_cientifico,campo,antes,ahora
2026-11-04,Apus apus,orden,Caprimulgiformes,Apodiformes
```

| Columna | Notas |
|---------|-------|
| `fecha` | La de la versión nueva de la lista, como `2026-11-04` |
| `nombre_cientifico` | Como en `species.csv` |
| `campo` | `clase`, `orden`, `infraorden` o `nombre_vulgar` |
| `antes` | La respuesta anterior |
| `ahora` | La respuesta nueva: tiene que coincidir con `species.csv`, o la comprobación se detiene |

Con estas filas, la web ofrece un «Primer vistazo» solo de las especies que cambiaron, y lo
sugiere en Hoy a quien ya había empezado alguna. En la ficha y en ese vistazo, cada especie
muestra el cambio (antes → ahora), y si alguien responde lo antiguo, se le dice que era la
respuesta anterior. Al empezar un curso nuevo puedes vaciar el archivo (deja la cabecera).

## Actualizar una lista, paso a paso

1. En GitHub, abre `collections/<colección>/species.csv` y pulsa el **lápiz** («Edit this
   file»).
2. Añade, borra o corrige filas. Respeta las comas: si un nombre lleva una coma, ponlo entre
   comillas. Cada fila debe tener las cinco columnas; si una no cuadra, la comprobación dice
   qué fila es.
3. Abajo, en «Commit changes», elige **«Create a new branch … and start a pull request»**.
   Escribe un título como «Vertebrados 2027-28» y pulsa **Propose changes**, y luego **Create
   pull request**.
4. GitHub ejecuta solo la comprobación (de 5 a 20 minutos si hay especies nuevas). Busca los
   datos de las especies nuevas, les elige fotos, regenera la web y **añade esos cambios al
   pull request por sí sola**. En la pestaña **Checks** del pull request, abre el trabajo
   «check» y su **Summary**, donde está el **informe**:
   - errores en el CSV (columnas que faltan, especies repetidas);
   - especies nuevas cuyo nombre no se encuentra en las bases de datos, o que son sinónimos;
   - especies nuevas sin fotos, sin vídeo o sin ficha escrita;
   - vídeos que ya no funcionan.
5. Corrige lo que marque como **error** editando de nuevo el archivo en la misma rama. Los
   avisos (por ejemplo, «sin ficha escrita») no bloquean nada: la especie se puede estudiar
   igualmente con sus fotos y sus cinco respuestas.
6. Cuando el informe esté en verde, pulsa **Merge pull request**. La web pública se actualiza
   sola en unos minutos.

## Añadir una colección nueva

1. Crea la carpeta `collections/<identificador>/` con `collection.csv` y `species.csv`
   (puedes copiar los de otra colección y cambiarlos). En GitHub: **Add file → Create new
   file**, y escribe `collections/artropodos/species.csv` como nombre.
2. Si las clases y los órdenes no están aún en el árbol común
   ([`curation/clades.csv`](curation/clades.csv)), la web funciona igual: los cuelga de la
   colección y el informe lo avisa. Para un árbol más completo, quien mantenga el repositorio
   añade sus clados a ese archivo (ya hay filas para los principales grupos de artrópodos).
3. Abre el pull request como arriba. La comprobación busca los datos y las fotos de todas las
   especies nuevas. En la web aparece un selector de colección en **Ajustes**.

Las fichas escritas (rasgos de campo, especies con que se confunde, etimología) son
opcionales: sin ellas, la especie se estudia con sus fotos y sus cinco respuestas.

**Si editas la lista en Excel**: guárdala con «Guardar como» → **«CSV UTF-8 (delimitado por
comas)»**. Un CSV con punto y coma (`;`), que es lo que Excel guarda en español, también vale.
Lo que no vale es «CSV (delimitado por comas)» a secas ni «CSV (Macintosh)»: estropean las tildes
y la ñ, y la comprobación lo detiene y pide guardarlo como «CSV UTF-8».

## Fotos

Cada especie tiene de 3 a 4 fotos con licencia libre, elegidas automáticamente (iNaturalist y
Wikimedia Commons). Si una foto es mala (no se ve el animal, está muerto, es otra especie…), o
si quieres fijar una concreta, añade una fila en
[`curation/media_overrides.csv`](curation/media_overrides.csv):

| `species_id` | `action` | `media_id_or_url` | `value` |
|--------------|----------|-------------------|---------|
| `buteo_buteo` | `exclude` | `inat-123456` | |
| `buteo_buteo` | `pin` | `https://commons.wikimedia.org/wiki/File:…` | |

El identificador de cada foto aparece en su pie, en la ficha de la especie.

## Qué pasa con el progreso de los estudiantes

Nada se borra al cambiar una lista. Las especies que siguen igual conservan su progreso, y las
nuevas aparecen como nuevas. Si cambias el **nombre científico** de una especie, la
herramienta la trata como una especie nueva y su progreso empieza de cero. Si cambias su
orden, clase o nombre vulgar, conserva el progreso, y la pregunta pasa a pedir el valor nuevo;
anótalo en `changes.csv` para que quien aprendió el antiguo pueda repasarlo.

---

## English summary

Each collection is a folder under `collections/` with `species.csv` (class, order,
infraorder, scientific name, Spanish common name: the answers the tool accepts),
`collection.csv` (Spanish and English names, edition, menu position) and an optional
`videos.csv` (one public video per species, credited to its channel). An optional `changes.csv`
(`fecha,nombre_cientifico,campo,antes,ahora`) records answers that changed in a new version of
the list; `ahora` must match `species.csv`. The site then offers a first look at just those
species, shows old → new on their cards, and names an old answer as such. Never rename a published
collection's folder: students' progress is stored under that name.

To update or add a collection, edit or create those files on GitHub and open a pull request.
The checks fetch the new species' data and photos, commit the regenerated site to the pull
request, and post a report. Fix any errors, then merge, and the public site updates itself.
From Excel, save as "CSV UTF-8"; a semicolon-separated file is fine, other encodings are
refused with a message. Fix bad photos in `curation/media_overrides.csv`. A species in two
collections must have the same class, order and infraorder in both.
