/* =========================================================
   QRForge · bulk.js — CSV → many QR codes → ZIP
   ========================================================= */
(function (QF) {
  'use strict';

  const U = QF.util;
  const $ = U.$, $$ = U.$$, el = U.el;

  let rows = [];
  let headers = [];
  let csvName = 'codes';

  /* ---------------- CSV loading ---------------- */
  function loadCsv(text, name) {
    const parsed = U.parseCSV(text);
    if (!parsed.length) {
      U.toast('That CSV looks empty', 'err');
      return;
    }
    headers = parsed[0].map(function (h, i) { return (h || '').trim() || ('Column ' + (i + 1)); });
    rows = parsed.slice(1).map(function (r) {
      const o = {};
      headers.forEach(function (h, i) { o[h] = r[i] === undefined ? '' : r[i]; });
      return o;
    });
    csvName = (name || 'codes').replace(/\.csv$/i, '');
    $('#bulkConfig').hidden = false;
    $('#bulkTableField').hidden = false;
    $('#bulkActions').hidden = false;
    buildTypeOptions();
    buildMapping();
    renderTable();
    U.toast(rows.length + ' row' + (rows.length === 1 ? '' : 's') + ' loaded', 'ok');
  }

  function buildTypeOptions() {
    const sel = $('#bulkType');
    const current = sel.value;
    sel.innerHTML = '';
    QF.types.list.forEach(function (t) {
      const opt = el('option', { value: t.id, text: t.label });
      if (t.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
    if (!current) sel.value = 'url';
  }

  /* ---------------- mapping ---------------- */
  function guessMapping(type) {
    const map = {};
    const t = QF.types.byId[type];
    const taken = {};

    const norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };

    /* pass 1 — exact matches on the field key or label */
    t.fields.forEach(function (f) {
      const key = norm(f.key);
      const label = norm(f.label);
      headers.forEach(function (h) {
        if (taken[h]) return;
        const nh = norm(h);
        if (nh === key || nh === label || nh === norm(f.key.replace(/([A-Z])/g, ' $1'))) {
          map[f.key] = h;
          taken[h] = true;
        }
      });
    });

    /* pass 2 — partial matches, one header per field */
    t.fields.forEach(function (f) {
      if (map[f.key]) return;
      const key = norm(f.key);
      headers.forEach(function (h) {
        if (taken[h]) return;
        const nh = norm(h);
        if (nh && (nh.indexOf(key) > -1 || key.indexOf(nh) > -1)) {
          map[f.key] = h;
          taken[h] = true;
        }
      });
    });

    return map;
  }

  function buildMapping() {
    const type = $('#bulkType').value;
    const t = QF.types.byId[type];
    const host = $('#bulkMapping');
    host.innerHTML = '';
    const map = guessMapping(type);

    t.fields.forEach(function (f) {
      const row = el('div', { class: 'map-row' });
      row.appendChild(el('span', { class: 'map-col', text: f.label + (f.bulk ? ' •' : '') }));
      const sel = el('select');
      const none = el('option', { value: '', text: '— not used —' });
      sel.appendChild(none);
      headers.forEach(function (h) {
        const o = el('option', { value: h, text: h });
        if (map[f.key] === h) o.selected = true;
        sel.appendChild(o);
      });
      sel.dataset.field = f.key;
      sel.addEventListener('change', function () {
        map[f.key] = sel.value;
        renderTable();
      });
      row.appendChild(sel);
      host.appendChild(row);
    });
  }

  function currentMap() {
    const map = {};
    $$('#bulkMapping select').forEach(function (s) { map[s.dataset.field] = s.value; });
    return map;
  }

  function buildPayload(row, type, map) {
    const t = QF.types.byId[type];
    const values = {};
    t.fields.forEach(function (f) {
      const col = map[f.key];
      values[f.key] = col ? (row[col] === undefined ? '' : row[col]) : (f.default === undefined ? '' : f.default);
    });
    return QF.types.build(type, values);
  }

  /* ---------------- preview ---------------- */
  function renderTable() {
    const type = $('#bulkType').value;
    const map = currentMap();
    const table = $('#bulkTable');
    table.innerHTML = '';
    const head = el('thead');
    const tr = el('tr');
    tr.appendChild(el('th', { text: '#' }));
    headers.forEach(function (h) { tr.appendChild(el('th', { text: h })); });
    tr.appendChild(el('th', { text: 'Payload' }));
    head.appendChild(tr);
    table.appendChild(head);

    const body = el('tbody');
    rows.slice(0, 12).forEach(function (row, i) {
      const r = el('tr');
      r.appendChild(el('td', { text: String(i + 1) }));
      headers.forEach(function (h) { r.appendChild(el('td', { text: row[h] })); });
      const payload = buildPayload(row, type, map);
      r.appendChild(el('td', { text: payload.length > 60 ? payload.slice(0, 60) + '…' : payload, title: payload }));
      body.appendChild(r);
    });
    table.appendChild(body);
    if (rows.length > 12) {
      const r = el('tr');
      const td = el('td', { colspan: String(headers.length + 2), class: 'muted', text: '… and ' + (rows.length - 12) + ' more rows' });
      r.appendChild(td);
      body.appendChild(r);
    }
  }

  /* ---------------- generation ---------------- */
  async function generate() {
    const type = $('#bulkType').value;
    const map = currentMap();
    const useDesign = $('#bulkUseDesign').value === 'yes';
    const base = useDesign ? JSON.parse(JSON.stringify(QF.app.state)) : defaultDesign();

    const progress = $('#bulkProgress');
    const bar = $('#bulkBar');
    const status = $('#bulkStatus');
    progress.hidden = false;
    bar.style.width = '0%';

    const zip = new window.JSZip();
    const folder = zip.folder(csvName || 'qr-codes');
    const used = {};
    let count = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const payload = buildPayload(row, type, map);
      if (!payload) { status.textContent = 'Row ' + (i + 1) + ': skipped (empty payload)'; continue; }

      let label = '';
      Object.keys(map).forEach(function (k) {
        if (!label && map[k]) label = String(row[map[k]] || '');
      });
      let name = (label || 'qr-' + (i + 1)).replace(/[^\w\-. ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'qr-' + (i + 1);
      if (used[name]) { used[name]++; name = name + '-' + used[name]; } else { used[name] = 1; }

      try {
        const composed = await QF.render.render(base, payload);
        const blob = await QF.render.exportBlob(base, base.format, base.scale, base.quality, composed);
        folder.file(name + '.' + (base.format === 'jpeg' ? 'jpg' : base.format), blob);
        count++;
      } catch (e) {
        console.error(e);
      }
      const pct = Math.round(((i + 1) / rows.length) * 100);
      bar.style.width = pct + '%';
      status.textContent = 'Generating ' + (i + 1) + ' / ' + rows.length + '…';
      await new Promise(function (r) { setTimeout(r, 0); });
    }

    status.textContent = 'Packing the ZIP…';
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    U.downloadBlob(blob, csvName + '-qr-codes.zip');
    bar.style.width = '100%';
    status.textContent = count + ' QR code' + (count === 1 ? '' : 's') + ' downloaded';
    U.toast('ZIP downloaded with ' + count + ' codes', 'ok');
    setTimeout(function () { progress.hidden = true; }, 2500);
  }

  function defaultDesign() {
    return {
      type: 'url', values: {},
      size: 512, ec: 'Q', margin: 4,
      dotType: 'square', dotColor: '#000000', dotGradient: false,
      gradType: 'linear', gradRotation: 45, gradColor1: '#000000', gradColor2: '#000000',
      cornerSquareType: 'square', cornerDotType: 'square',
      cornerSquareColor: '#000000', cornerDotColor: '#000000', cornersFollow: true,
      bgColor: '#ffffff', bgTransparent: false, cardShape: 'square', bgRound: 0,
      logo: null, logoSize: 25, logoMargin: 8, logoShape: 'none', logoHideDots: true,
      bgImage: null, bgImageOpacity: 35, bgImageFit: 'cover',
      frameEnabled: false, frameStyle: 'rounded', frameWidth: 12, frameRadius: 16,
      frameColor: '#000000', frameBgColor: '#ffffff', frameBgTransparent: false,
      frameHead: '', frameHeadSize: 24, frameHeadColor: '#000000',
      frameFoot: '', frameFootSize: 16, frameFootColor: '#475569', frameFont: 'system',
      format: 'png', quality: 0.92, scale: 2, fileName: 'qrcode'
    };
  }

  /* ---------------- sample ---------------- */
  const SAMPLE = [
    'name,email,phone,company',
    'Ada Lovelace,ada@example.com,+15550100001,Analytical Engines',
    'Alan Turing,alan@example.com,+15550100002,Bletchley Labs',
    'Grace Hopper,grace@example.com,+15550100003,Navy',
    'Katherine Johnson,katherine@example.com,+15550100004,NASA',
    'Hedy Lamarr,hedy@example.com,+15550100005,Frequency Lab'
  ].join('\n');

  /* ---------------- init ---------------- */
  function init() {
    const drop = $('#csvDrop'), input = $('#csvInput');
    if (!drop || !input) return;

    drop.addEventListener('click', function () { input.click(); });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      const f = input.files && input.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = function () { loadCsv(fr.result, f.name); };
      fr.readAsText(f);
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (evt) {
      drop.addEventListener(evt, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      drop.addEventListener(evt, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = function () { loadCsv(fr.result, f.name); };
      fr.readAsText(f);
    });

    $('#csvSample').addEventListener('click', function () {
      loadCsv(SAMPLE, 'contacts.csv');
      $('#bulkType').value = 'vcard';
      buildMapping();
      renderTable();
    });

    $('#bulkType').addEventListener('change', function () { buildMapping(); renderTable(); });
    $('#btnBulkGenerate').addEventListener('click', generate);
    $('#btnBulkCancel').addEventListener('click', function () {
      rows = []; headers = [];
      $('#bulkConfig').hidden = true;
      $('#bulkTableField').hidden = true;
      $('#bulkActions').hidden = true;
      $('#bulkProgress').hidden = true;
    });
  }

  QF.bulk = { init: init };
})(window.QF);
