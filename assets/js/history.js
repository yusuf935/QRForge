/* =========================================================
   QRForge · history.js — locally saved QR designs
   ========================================================= */
(function (QF) {
  'use strict';

  const KEY = 'qrforge.history.v1';
  const MAX = 40;

  function all() {
    const list = QF.util.store.get(KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function save() { return QF.util.store.set(KEY, all()); }

  function add(entry) {
    const list = all();
    list.unshift(entry);
    while (list.length > MAX) list.pop();
    QF.util.store.set(KEY, list);
    return list;
  }

  function remove(id) {
    const list = all().filter(function (e) { return e.id !== id; });
    QF.util.store.set(KEY, list);
    return list;
  }

  function clear() { QF.util.store.remove(KEY); return []; }

  QF.history = { all: all, add: add, remove: remove, clear: clear, count: function () { return all().length; } };
})(window.QF);
