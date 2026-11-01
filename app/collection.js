/* VISU · picks the active collection and loads its data. Runs before every other app script.

   data/collections.js lists the collections; each one has data/<id>/{bestiary,media,content}.js.
   The choice is remembered in localStorage ('visu-collection'); ?c=<id> in the address overrides it.
   document.write keeps the scripts classic and in order, which is what lets the site run from a
   downloaded folder (file://), where fetch and modules are blocked. */
(function () {
  'use strict';
  var C = window.VISU && window.VISU.collections;
  if (!C || !C.list || !C.list.length) return;
  var id = null;
  try { id = window.localStorage.getItem('visu-collection'); } catch (e) { /* storage blocked */ }
  var q = /[?&]c=([a-z0-9-]+)/.exec(location.search);
  if (q) id = q[1];
  if (!C.list.some(function (c) { return c.id === id; })) id = C.default;
  window.VISU_COLLECTION = id;
  ['bestiary', 'media', 'content'].forEach(function (name) {
    document.write('<script src="data/' + id + '/' + name + '.js"><\/script>');
  });
})();
