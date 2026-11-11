/* =========================================================
   QRForge · app.js — main controller
   ========================================================= */
(function (QF) {
  'use strict';

  const U = QF.util;
  const $ = U.$, $$ = U.$$, el = U.el;

  /* ---------------- state ---------------- */
  function defaultState() {
    return {
      type: 'url',
      values: {},

      size: 512,
      ec: 'Q',
      margin: 4,

      dotType: 'rounded',
      dotColor: '#0f172a',
      dotGradient: false,
      gradType: 'linear',
      gradRotation: 45,
      gradColor1: '#6366f1',
      gradColor2: '#22d3ee',

      cornerSquareType: 'rounded',
      cornerDotType: 'dot',
      cornerSquareColor: '#0f172a',
      cornerDotColor: '#0f172a',
      cornersFollow: true,

      bgColor: '#ffffff',
      bgTransparent: false,
      cardShape: 'square',
      bgRound: 0,

      logo: null,
      logoSize: 25,
      logoMargin: 0,
      logoShape: 'none',
      logoHideDots: true,

      bgImage: null,
      bgImageOpacity: 35,
      bgImageFit: 'cover',

      frameEnabled: false,
      frameTemplate: 'none',
      frameStyle: 'rounded',
      frameWidth: 12,
      frameRadius: 16,
      frameColor: '#0f172a',
      frameBgColor: '#0f172a',
      frameBgTransparent: false,
      frameHead: '',
      frameHeadSize: 34,
      frameHeadColor: '#0f172a',
      frameFoot: '',
      frameFootSize: 34,
      frameFootColor: '#475569',
      frameFont: 'system',

      format: 'png',
      quality: 0.92,
      scale: 2,
      fileName: 'qrcode'
    };
  }

  let state = defaultState();
  let composed = null;
  let lastPayload = '';
  let renderToken = 0;
  let activePreset = '';
  let activePanel = 'content';
  let activeView = 'generator';

  /* ---------------- routing ---------------- */
  function parseHash() {
    const raw = (location.hash || '').replace(/^#\/?/, '');
    const qIndex = raw.indexOf('?');
    const path = qIndex > -1 ? raw.slice(0, qIndex) : raw;
    const query = qIndex > -1 ? raw.slice(qIndex + 1) : '';
    const parts = path.split('/').filter(Boolean);
    return {
      view: parts[0] || 'generator',
      panel: parts[1] || 'content',
      params: new URLSearchParams(query)
    };
  }

  function routeHash(view, panel, design) {
    let hash = '#/' + view + '/' + (panel || 'content');
    if (design) hash += '?d=' + design;
    return hash;
  }

  function writeRoute(push) {
    const hash = routeHash(activeView, activePanel);
    if (location.hash === hash) return;
    if (push) location.hash = hash;
    else history.replaceState(null, '', hash);
  }

  /**
   * Swaps the state for a new set of values without replacing the object, so
   * anything holding a reference to it keeps seeing the current design.
   */
  function replaceState(next) {
    Object.keys(state).forEach(function (k) { delete state[k]; });
    Object.assign(state, next);
    return state;
  }

  /* ---------------- content values ---------------- */
  function values() {
    if (!state.values[state.type]) state.values[state.type] = QF.types.defaults(state.type);
    return state.values[state.type];
  }

  function payload() {
    return QF.types.build(state.type, values());
  }

  /* ---------------- UI builders ---------------- */
  function buildTypeGrid() {
    const host = $('#typeGrid');
    host.innerHTML = '';
    QF.types.list.forEach(function (t) {
      const card = el('button', {
        class: 'type-key' + (t.id === state.type ? ' is-active' : ''),
        type: 'button',
        'data-type': t.id,
        title: t.label
      });
      card.innerHTML = QF.types.icon(t.id) + '<span>' + t.label + '</span>';
      card.addEventListener('click', function () {
        if (state.type === t.id) return;
        state.type = t.id;
        $$('#typeGrid .type-key').forEach(function (c) { c.classList.toggle('is-active', c.dataset.type === t.id); });
        buildContentForm();
        scheduleRender(true);
      });
      host.appendChild(card);
    });
  }

  function buildContentForm() {
    const host = $('#contentFields');
    host.innerHTML = '';
    const type = QF.types.byId[state.type];
    if (!type) return;
    const v = values();

    type.fields.forEach(function (f) {
      if (f.showIf && !f.showIf(v)) return;
      const wrap = el('div', { class: 'field' });
      const id = 'f_' + f.key;

      if (f.type === 'checkbox') {
        const label = el('label', { class: 'check' });
        const input = el('input', { type: 'checkbox', id: id });
        input.checked = !!v[f.key];
        input.addEventListener('change', function () {
          v[f.key] = input.checked;
          buildContentForm();
          scheduleRender(true);
        });
        label.appendChild(input);
        label.appendChild(el('span', { text: f.label }));
        wrap.appendChild(label);
        host.appendChild(wrap);
        return;
      }

      const lbl = el('label', { class: 'label', for: id, text: f.label });
      wrap.appendChild(lbl);

      let input;
      if (f.type === 'textarea') {
        input = el('textarea', { id: id, rows: 3, placeholder: f.placeholder || '' });
        input.value = v[f.key] === undefined ? '' : v[f.key];
        input.addEventListener('input', function () { v[f.key] = input.value; scheduleRender(); });
      } else if (f.type === 'select') {
        input = el('select', { id: id });
        (f.options || []).forEach(function (o) {
          const opt = el('option', { value: o.value, text: o.label });
          if (String(v[f.key]) === String(o.value)) opt.selected = true;
          input.appendChild(opt);
        });
        input.addEventListener('change', function () {
          v[f.key] = input.value;
          buildContentForm();
          scheduleRender(true);
        });
      } else {
        input = el('input', { id: id, type: f.type === 'number' ? 'number' : 'text', placeholder: f.placeholder || '' });
        if (f.min !== undefined) input.min = f.min;
        input.value = v[f.key] === undefined ? '' : v[f.key];
        input.addEventListener('input', function () {
          v[f.key] = input.value;
          scheduleRender();
        });
      }
      wrap.appendChild(input);
      host.appendChild(wrap);
    });
  }

  function buildPresets() {
    const host = $('#presetGrid');
    host.innerHTML = '';
    QF.presets.list.forEach(function (p) {
      const btn = el('button', { class: 'preset' + (p.id === activePreset ? ' is-active' : ''), type: 'button', 'data-preset': p.id });
      btn.innerHTML = QF.presets.presetPreview(p) + '<span class="preset-name">' + p.name + '</span>';
      btn.addEventListener('click', function () { applyPreset(p.id); });
      host.appendChild(btn);
    });
  }

  function buildDotTypeRow() {
    const host = $('#dotTypeRow');
    host.innerHTML = '';
    QF.presets.dotTypes.forEach(function (d) {
      const b = el('button', {
        class: 'swatch' + (d.id === state.dotType ? ' is-active' : ''),
        type: 'button', title: d.label, 'data-dot': d.id, 'aria-label': d.label
      });
      b.innerHTML = QF.presets.dotSwatch(d.id);
      b.addEventListener('click', function () {
        state.dotType = d.id;
        $$('#dotTypeRow .swatch').forEach(function (s) { s.classList.toggle('is-active', s.dataset.dot === d.id); });
        scheduleRender();
      });
      host.appendChild(b);
    });
  }

  function buildFrameTemplateGrid() {
    const host = $('#frameTemplateGrid');
    if (!host) return;
    host.innerHTML = '';
    QF.frames.list.forEach(function (f) {
      const b = el('button', {
        class: 'frame-tile' + (f.id === state.frameTemplate ? ' is-active' : ''),
        type: 'button',
        'data-frame-id': f.id,
        title: f.name
      });
      b.innerHTML = '<span class="frame-tile-art">' + QF.frames.swatch(f.id) + '</span>' +
        '<span class="frame-tile-name">' + f.name + '</span>';
      b.addEventListener('click', function () {
        state.frameTemplate = f.id;
        state.frameEnabled = f.id !== 'none';
        QF.frames.apply(f.id, state);
        syncControls();
        $$('#frameTemplateGrid .frame-tile').forEach(function (t) { t.classList.toggle('is-active', t.dataset.frameId === f.id); });
        scheduleRender(true);
      });
      host.appendChild(b);
    });
  }

  function buildFrameStyleRow() {
    /* the frame templates replace the old style swatches */
  }

  function buildSelectOptions(select, options, current) {
    select.innerHTML = '';
    options.forEach(function (o) {
      const opt = el('option', { value: o.value, text: o.label });
      if (String(current) === String(o.value)) opt.selected = true;
      select.appendChild(opt);
    });
  }

  /* ---------------- presets ---------------- */
  function applyPreset(id) {
    const p = QF.presets.list.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    state.dotColor = p.dot;
    state.dotGradient = p.gradient;
    state.gradColor1 = p.dot;
    state.gradColor2 = p.dot2;
    state.bgColor = p.bg;
    state.dotType = p.dotType;
    state.cornerSquareType = p.cornerSquareType;
    state.cornerDotType = p.cornerDotType;
    state.cornersFollow = true;
    state.ec = p.ec;
    activePreset = id;

    refresh();
    scheduleRender(true);
    U.toast('Applied the ' + p.name + ' preset', 'ok');
  }

  function randomise() {
    const c1 = U.randomHex(), c2 = U.randomHex();
    const bgOptions = ['#ffffff', '#f8fafc', '#0b1020', '#111827', '#fff7ed', '#f0fdf4'];
    const dots = QF.presets.dotTypes.map(function (d) { return d.id; });
    const corners = QF.presets.cornerTypes.map(function (c) { return c.id; });
    state.dotColor = c1;
    state.gradColor1 = c1;
    state.gradColor2 = c2;
    state.dotGradient = Math.random() > 0.4;
    state.gradType = Math.random() > 0.7 ? 'radial' : 'linear';
    state.gradRotation = Math.floor(Math.random() * 360);
    state.bgColor = bgOptions[Math.floor(Math.random() * bgOptions.length)];
    state.bgTransparent = false;
    state.dotType = dots[Math.floor(Math.random() * dots.length)];
    state.cornerSquareType = corners[Math.floor(Math.random() * corners.length)];
    state.cornerDotType = Math.random() > 0.4 ? 'dot' : corners[Math.floor(Math.random() * corners.length)];
    state.cornersFollow = true;
    state.cardShape = Math.random() > 0.8 ? 'circle' : 'square';
    state.bgRound = state.cardShape === 'circle' ? 0 : Math.floor(Math.random() * 40);
    state.frameEnabled = Math.random() > 0.65;
    if (state.frameEnabled) {
      const ids = QF.frames.list.filter(function (f) { return f.id !== 'none'; });
      const pick = ids[Math.floor(Math.random() * ids.length)];
      state.frameTemplate = pick.id;
      QF.frames.apply(pick.id, state);
    } else {
      state.frameTemplate = 'none';
      state.frameHead = '';
      state.frameFoot = '';
    }
    activePreset = '';
    refresh();
    scheduleRender(true);
  }

  /* ---------------- control binding ---------------- */
  function bindRange(id, key, format, onChange) {
    const input = $(id);
    if (!input) return;
    const out = $(id + 'Out');
    input.addEventListener('input', function () {
      state[key] = parseFloat(input.value);
      if (out) out.textContent = format(state[key]);
      scheduleRender();
      if (onChange) onChange();
    });
  }

  function bindColor(colorId, hexId, key) {
    const c = $(colorId), h = $(hexId);
    if (!c) return;
    c.addEventListener('input', function () {
      state[key] = c.value;
      if (h) h.value = c.value;
      scheduleRender();
    });
    if (h) h.addEventListener('input', function () {
      if (!U.isHex(h.value)) return;
      const v = U.normHex(h.value);
      state[key] = v;
      c.value = v;
      scheduleRender();
    });
    h.addEventListener('blur', function () { h.value = state[key]; });
  }

  function syncControls() {
    const set = function (id, value) { const n = $(id); if (n) n.value = value; };
    const setChk = function (id, value) { const n = $(id); if (n) n.checked = !!value; };
    const setOut = function (id, text) { const n = $(id); if (n) n.textContent = text; };

    set('#sizeInput', state.size); setOut('#sizeOut', state.size + ' px');
    set('#ecLevel', state.ec);
    set('#marginInput', state.margin); setOut('#marginOut', state.margin + ' modules');
    set('#dotColor', state.dotColor); set('#dotColorHex', state.dotColor);
    setChk('#dotGradient', state.dotGradient);
    set('#gradType', state.gradType);
    set('#gradRotation', state.gradRotation); setOut('#gradRotationOut', state.gradRotation + '°');
    set('#gradColor1', state.gradColor1); set('#gradColor2', state.gradColor2);
    set('#cornerSquareType', state.cornerSquareType);
    set('#cornerDotType', state.cornerDotType);
    set('#cornerSquareColor', state.cornerSquareColor);
    set('#cornerDotColor', state.cornerDotColor);
    setChk('#cornersFollow', state.cornersFollow);
    set('#bgColor', state.bgColor); set('#bgColorHex', state.bgColor);
    setChk('#bgTransparent', state.bgTransparent);
    set('#cardShape', state.cardShape);
    set('#bgRound', state.bgRound); setOut('#bgRoundOut', state.bgRound + '%');
    set('#frameRadius', state.frameRadius); setOut('#frameRadiusOut', state.frameRadius);
    set('#frameColor', state.frameColor); set('#frameBgColor', state.frameBgColor);
    set('#logoSize', state.logoSize); setOut('#logoSizeOut', state.logoSize + '%');
    set('#logoMargin', state.logoMargin); setOut('#logoMarginOut', state.logoMargin + '%');
    set('#logoShape', state.logoShape);
    setChk('#logoHideDots', state.logoHideDots);
    set('#bgImageOpacity', state.bgImageOpacity); setOut('#bgImageOpacityOut', state.bgImageOpacity + '%');
    set('#bgImageFit', state.bgImageFit);
    setChk('#frameBgTransparent', state.frameBgTransparent);
    set('#frameHead', state.frameHead);
    set('#frameHeadSize', state.frameHeadSize); setOut('#frameHeadSizeOut', state.frameHeadSize);
    set('#frameFoot', state.frameFoot);
    set('#frameFootSize', state.frameFootSize); setOut('#frameFootSizeOut', state.frameFootSize);
    set('#frameFont', state.frameFont);
    set('#qualityInput', Math.round(state.quality * 100)); setOut('#qualityOut', Math.round(state.quality * 100) + '%');
    set('#fileName', state.fileName);

    $('#gradientFields').hidden = !state.dotGradient;
    $('#logoFields').hidden = !state.logo;
    $('#logoRemove').hidden = !state.logo;
    $('#bgImageFields').hidden = !state.bgImage;
    $('#bgImageRemove').hidden = !state.bgImage;
    $('#qualityField').hidden = state.format === 'svg' || state.format === 'png';

    $('#cornerSquareColor').disabled = state.cornersFollow;
    $('#cornerDotColor').disabled = state.cornersFollow;

    $$('#formatRow .chip').forEach(function (c) { c.classList.toggle('is-active', c.dataset.format === state.format); });
    $$('#scaleRow .chip').forEach(function (c) { c.classList.toggle('is-active', Number(c.dataset.scale) === state.scale); });
    $$('.tray-key').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.panel === activePanel)); });
  }

  function setPanel(name, updateRoute) {
    if (!name) return;
    activePanel = name;
    $$('.tray-key').forEach(function (b) {
      const on = b.dataset.panel === name;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $$('.tabpane').forEach(function (p) { p.classList.toggle('is-active', p.dataset.pane === name); });
    if (updateRoute !== false) writeRoute(false);
  }

  function bindTabKeys() {
    const keys = $$('.tray-key');
    keys.forEach(function (key, i) {
      key.addEventListener('keydown', function (e) {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = keys[(i + 1) % keys.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = keys[(i - 1 + keys.length) % keys.length];
        else if (e.key === 'Home') next = keys[0];
        else if (e.key === 'End') next = keys[keys.length - 1];
        if (!next) return;
        e.preventDefault();
        setPanel(next.dataset.panel);
        next.focus();
      });
    });
  }

  function bindControls() {
    $$('.tray-key').forEach(function (btn) {
      btn.addEventListener('click', function () { setPanel(btn.dataset.panel); });
    });
    bindTabKeys();

    bindRange('#sizeInput', 'size', function (v) { return v + ' px'; });
    $('#ecLevel').addEventListener('change', function () { state.ec = this.value; activePreset = ''; buildPresets(); scheduleRender(true); });
    bindRange('#marginInput', 'margin', function (v) { return v + ' modules'; });

    $('#dotGradient').addEventListener('change', function () {
      state.dotGradient = this.checked;
      $('#gradientFields').hidden = !state.dotGradient;
      activePreset = ''; buildPresets();
      scheduleRender();
    });
    bindColor('#dotColor', '#dotColorHex', 'dotColor');
    $('#gradType').addEventListener('change', function () { state.gradType = this.value; scheduleRender(); });
    bindRange('#gradRotation', 'gradRotation', function (v) { return v + '°'; });
    $('#gradColor1').addEventListener('input', function () { state.gradColor1 = this.value; activePreset = ''; buildPresets(); scheduleRender(); });
    $('#gradColor2').addEventListener('input', function () { state.gradColor2 = this.value; activePreset = ''; buildPresets(); scheduleRender(); });

    buildSelectOptions($('#cornerSquareType'), QF.presets.cornerTypes.map(function (c) { return { value: c.id, label: c.label }; }), state.cornerSquareType);
    buildSelectOptions($('#cornerDotType'), QF.presets.cornerTypes.map(function (c) { return { value: c.id, label: c.label }; }), state.cornerDotType);
    $('#cornerSquareType').addEventListener('change', function () { state.cornerSquareType = this.value; scheduleRender(); });
    $('#cornerDotType').addEventListener('change', function () { state.cornerDotType = this.value; scheduleRender(); });
    $('#cornerSquareColor').addEventListener('input', function () { state.cornerSquareColor = this.value; state.cornersFollow = false; $('#cornersFollow').checked = false; scheduleRender(); });
    $('#cornerDotColor').addEventListener('input', function () { state.cornerDotColor = this.value; state.cornersFollow = false; $('#cornersFollow').checked = false; scheduleRender(); });
    $('#cornersFollow').addEventListener('change', function () {
      state.cornersFollow = this.checked;
      $('#cornerSquareColor').disabled = this.checked;
      $('#cornerDotColor').disabled = this.checked;
      scheduleRender();
    });

    bindColor('#bgColor', '#bgColorHex', 'bgColor');
    $('#bgTransparent').addEventListener('change', function () {
      state.bgTransparent = this.checked;
      if (this.checked) state.bgImage = null;
      scheduleRender();
    });
    $('#cardShape').addEventListener('change', function () { state.cardShape = this.value; scheduleRender(); });
    bindRange('#bgRound', 'bgRound', function (v) { return v + '%'; });

    $('#logoSize').addEventListener('input', function () { state.logoSize = +this.value; $('#logoSizeOut').textContent = this.value + '%'; scheduleRender(); });
    $('#logoMargin').addEventListener('input', function () { state.logoMargin = +this.value; $('#logoMarginOut').textContent = this.value + '%'; scheduleRender(); });
    $('#logoShape').addEventListener('change', function () { state.logoShape = this.value; scheduleRender(); });
    $('#logoHideDots').addEventListener('change', function () { state.logoHideDots = this.checked; scheduleRender(); });
    $('#bgImageOpacity').addEventListener('input', function () { state.bgImageOpacity = +this.value; $('#bgImageOpacityOut').textContent = this.value + '%'; scheduleRender(); });
    $('#bgImageFit').addEventListener('change', function () { state.bgImageFit = this.value; scheduleRender(); });

    bindRange('#frameRadius', 'frameRadius', function (v) { return String(v); });
    $('#frameColor').addEventListener('input', function () { state.frameColor = this.value; scheduleRender(); });
    $('#frameBgColor').addEventListener('input', function () { state.frameBgColor = this.value; scheduleRender(); });
    $('#frameBgTransparent').addEventListener('change', function () { state.frameBgTransparent = this.checked; scheduleRender(); });
    $('#frameHead').addEventListener('input', function () { state.frameHead = this.value; scheduleRender(); });
    bindRange('#frameHeadSize', 'frameHeadSize', function (v) { return String(v); });
    $('#frameFoot').addEventListener('input', function () { state.frameFoot = this.value; scheduleRender(); });
    bindRange('#frameFootSize', 'frameFootSize', function (v) { return String(v); });
    $('#frameFont').addEventListener('change', function () { state.frameFont = this.value; scheduleRender(); });

    $$('#formatRow .chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.format = chip.dataset.format;
        $$('#formatRow .chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
        $('#qualityField').hidden = state.format === 'svg' || state.format === 'png';
      });
    });
    $$('#scaleRow .chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.scale = Number(chip.dataset.scale);
        $$('#scaleRow .chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
      });
    });
    $('#qualityInput').addEventListener('input', function () {
      state.quality = +this.value / 100;
      $('#qualityOut').textContent = this.value + '%';
    });
    $('#fileName').addEventListener('input', function () { state.fileName = this.value; });

    $('#btnDownload').addEventListener('click', download);
    $('#btnCopyImage').addEventListener('click', copyImage);
    $('#btnCopyPayload').addEventListener('click', copyPayload);
    $('#btnShare').addEventListener('click', shareLink);
    $('#btnCopyLink').addEventListener('click', shareLink);
    $('#btnPrint').addEventListener('click', printQR);
    $('#btnSave').addEventListener('click', saveToHistory);
    $('#btnRandom').addEventListener('click', randomise);
    $('#resetDesign').addEventListener('click', function () {
      /* the content is kept, so nothing the user typed is lost, but every
         design setting goes back to its default */
      const keep = { type: state.type, values: state.values, format: state.format, scale: state.scale, quality: state.quality, fileName: state.fileName };
      replaceState(Object.assign(defaultState(), keep));
      activePreset = '';
      refresh();
      writeRoute(false);
      scheduleRender(true);
      U.toast('The design is back to its defaults');
    });

    setupDropzone('#logoDrop', '#logoInput', function (dataUrl) {
      state.logo = dataUrl;
      showPreview('#logoPreview', dataUrl);
      $('#logoDrop').classList.add('has-image');
      $('#logoFields').hidden = false;
      $('#logoRemove').hidden = false;
      scheduleRender(true);
    });
    $('#logoRemove').addEventListener('click', function () {
      state.logo = null;
      clearPreview('#logoPreview');
      $('#logoDrop').classList.remove('has-image');
      $('#logoFields').hidden = true;
      $('#logoRemove').hidden = true;
      scheduleRender(true);
    });

    setupDropzone('#bgImageDrop', '#bgImageInput', function (dataUrl) {
      state.bgImage = dataUrl;
      showPreview('#bgImagePreview', dataUrl);
      $('#bgImageDrop').classList.add('has-image');
      $('#bgImageFields').hidden = false;
      $('#bgImageRemove').hidden = false;
      scheduleRender(true);
    });
    $('#bgImageRemove').addEventListener('click', function () {
      state.bgImage = null;
      clearPreview('#bgImagePreview');
      $('#bgImageDrop').classList.remove('has-image');
      $('#bgImageFields').hidden = true;
      $('#bgImageRemove').hidden = true;
      scheduleRender(true);
    });
  }

  function showPreview(sel, dataUrl) {
    const host = $(sel);
    const existing = host.querySelector('img');
    if (existing && existing.getAttribute('src') === dataUrl) { host.hidden = false; return; }
    host.innerHTML = '';
    const img = el('img', { alt: '', src: dataUrl });
    /* the natural size is set once it loads, so the preview keeps the image's
       own proportions instead of being stretched into a fixed box */
    img.addEventListener('load', function () {
      if (img.naturalWidth) { img.width = img.naturalWidth; img.height = img.naturalHeight; }
    });
    host.appendChild(img);
    host.hidden = false;
  }

  function clearPreview(sel) {
    const host = $(sel);
    host.innerHTML = '';
    host.hidden = true;
  }

  /**
   * Keeps the upload zones in step with the state, so a design that has no
   * logo never shows one, whatever changed it.
   */
  function syncMediaPreviews() {
    if (state.logo) showPreview('#logoPreview', state.logo);
    else clearPreview('#logoPreview');
    $('#logoDrop').classList.toggle('has-image', !!state.logo);

    if (state.bgImage) showPreview('#bgImagePreview', state.bgImage);
    else clearPreview('#bgImagePreview');
    $('#bgImageDrop').classList.toggle('has-image', !!state.bgImage);
  }

  function setupDropzone(dropSel, inputSel, onFile) {
    const drop = $(dropSel), input = $(inputSel);
    if (!drop || !input) return;
    drop.addEventListener('click', function () { input.click(); });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      const f = input.files && input.files[0];
      if (f) handleFile(f, onFile);
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
      if (f) handleFile(f, onFile);
    });
  }

  function handleFile(file, cb) {
    if (file.size > 6 * 1024 * 1024) {
      U.toast('That image is larger than 6 MB', 'err');
      return;
    }
    U.readFileAsDataURL(file).then(cb).catch(function () {
      U.toast('Could not read that file', 'err');
    });
  }

  /* ---------------- rendering ---------------- */
  const scheduleRender = U.debounce(function () { doRender(); }, 90);

  function updatePlate() {
    const plate = $('#plate');
    if (!plate) return;
    /* the plate takes the background the user chose, so the mark is seen on the
       ground it will be exported on rather than on a dark panel */
    if (state.bgTransparent && !state.bgImage) {
      plate.style.removeProperty('--plate-bg');
      plate.classList.add('is-transparent');
    } else {
      plate.style.setProperty('--plate-bg', state.bgColor);
      plate.classList.remove('is-transparent');
    }
  }

  async function doRender() {
    const token = ++renderToken;
    const holder = $('#qrHolder');
    const data = payload();
    lastPayload = data;

    $('#payloadBox').value = data;
    $('#rawPayload').textContent = data || '(empty)';

    if (!data) {
      composed = null;
      holder.classList.add('is-empty');
      holder.innerHTML = '<p>Fill in the content tab and the code appears here.</p>';
      updatePlate();
      $('#plateCaption').textContent = '';
      updateSpec(null);
      return;
    }

    try {
      const result = await QF.render.render(state, data);
      if (token !== renderToken) return;
      composed = result;
      holder.classList.remove('is-empty');
      holder.innerHTML = '';
      const svg = result.svg.cloneNode(true);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.maxWidth = Math.min(state.size, 520) + 'px';
      holder.appendChild(svg);
      updatePlate();
      const caption = $('#plateCaption');
      caption.textContent = data;
      caption.title = data + '\n\nThe full payload is under Raw payload below.';
      updateSpec(result);
    } catch (err) {
      if (token !== renderToken) return;
      console.error(err);
      holder.classList.add('is-empty');
      holder.innerHTML = '<p>' + (err && err.message ? err.message : 'Could not generate the QR code') + '</p>';
      plate.classList.remove('is-transparent');
      updateSpec(null);
    }
  }

  function updateSpec(result) {
    const body = $('#specBody');
    const summary = $('#specSummary');
    const warning = $('#scanWarning');
    if (!result) {
      body.innerHTML = '';
      summary.innerHTML = '';
      warning.hidden = true;
      return;
    }
    const est = result.estimate;
    const hot = est.percent > 85;
    const rows = [
      ['Version', est.version],
      ['Modules', result.modules + ' by ' + result.modules],
      ['Error correction', state.ec],
      ['Output', Math.round(result.width * state.scale) + ' by ' + Math.round(result.height * state.scale) + ' pixels'],
      ['Payload', est.bytes + ' of ' + est.capacity + ' bytes']
    ];
    body.innerHTML = rows.map(function (r) {
      return '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>';
    }).join('') +
      '<tr><th scope="row">Capacity used</th><td><span class="mono">' + est.percent + '%</span>' +
      '<div class="meter"><div class="meter-fill' + (hot ? ' is-hot' : '') + '" style="transform:scaleX(' + (est.percent / 100) + ')"></div></div></td></tr>';

    /* the collapsed line still carries the figures, so nothing is lost at a glance */
    const parts = [
      'v' + est.version,
      result.modules + '×' + result.modules,
      Math.round(result.width * state.scale) + '×' + Math.round(result.height * state.scale) + ' px'
    ];
    if (hot) parts.push(est.percent + '% used');
    summary.innerHTML = '';
    parts.forEach(function (p) { summary.appendChild(el('span', { text: p })); });

    const msg = scanWarning();
    warning.hidden = !msg;
    if (msg) $('#scanWarningText').textContent = msg;
  }

  /**
   * Estimates how likely the current design is to be scannable.
   * Returns a warning message, or null when everything looks fine.
   */
  function scanWarning() {
    const bg = state.bgTransparent ? '#ffffff' : state.bgColor;
    const colors = state.dotGradient ? [state.gradColor1, state.gradColor2] : [state.dotColor];
    let worst = Infinity;
    colors.forEach(function (c) { worst = Math.min(worst, U.contrastRatio(c, bg)); });

    if (worst < 1.6) {
      return 'The foreground and the background are almost the same colour. Scanners will not read this code.';
    }
    if (worst < 3) {
      return 'The contrast between the modules and the background is low. Darken the dot colour or lighten the background.';
    }
    if (state.logo && state.logoHideDots && (state.ec === 'L' || state.ec === 'M')) {
      return 'A logo with error correction ' + state.ec + ' leaves little room. Use Q or H so the code stays readable.';
    }
    if (state.margin < 2) {
      return 'The quiet zone is very small. Keep at least two modules of margin so the code scans reliably.';
    }
    return null;
  }

  /* ---------------- actions ---------------- */
  function fileBase() {
    const n = (state.fileName || 'qrcode').trim().replace(/[^\w\-. ]+/g, '').replace(/\s+/g, '-') || 'qrcode';
    return n;
  }

  async function download() {
    if (!composed) { U.toast('Nothing to download yet', 'warn'); return; }
    try {
      const blob = await QF.render.exportBlob(state, state.format, state.scale, state.quality, composed);
      const ext = state.format === 'jpeg' ? 'jpg' : state.format;
      U.downloadBlob(blob, fileBase() + '.' + ext);
      U.toast('Downloaded ' + fileBase() + '.' + ext, 'ok');
    } catch (e) {
      console.error(e);
      U.toast(e.message || 'The export failed', 'err');
    }
  }

  async function copyImage() {
    if (!composed) { U.toast('Nothing to copy yet', 'warn'); return; }
    try {
      const blob = await QF.render.exportBlob(state, 'png', state.scale, 1, composed);
      await U.copyBlob(blob);
      U.toast('The image is on the clipboard', 'ok');
    } catch (e) {
      U.toast('Your browser blocked the clipboard. Use Download instead.', 'warn');
    }
  }

  function copyPayload() {
    U.copyText(lastPayload).then(function () {
      U.toast('The payload is on the clipboard', 'ok');
    }).catch(function () {
      U.toast('Could not copy the payload', 'err');
    });
  }

  function encodeState() {
    const json = JSON.stringify(state);
    try { return btoa(unescape(encodeURIComponent(json))); }
    catch (e) { return ''; }
  }

  function decodeState(str) {
    try { return JSON.parse(decodeURIComponent(escape(atob(str)))); }
    catch (e) { return null; }
  }

  function shareLink() {
    const hash = routeHash('generator', activePanel, encodeState());
    const url = location.origin + location.pathname + location.search + hash;
    history.replaceState(null, '', hash);
    if (navigator.share) {
      navigator.share({ title: 'My QR code', url: url }).catch(function () { });
      return;
    }
    U.copyText(url).then(function () {
      U.toast('The design link is on the clipboard', 'ok');
    }).catch(function () {
      U.toast('Could not copy the link', 'err');
    });
  }

  function printQR() {
    if (!composed) return;
    const w = window.open('', '_blank');
    if (!w) { U.toast('Allow pop-ups to print', 'warn'); return; }
    const markup = QF.render.serialize(composed.svg);
    w.document.write(
      '<!DOCTYPE html><html><head><title>' + U.escapeHtml(fileBase()) + '</title>' +
      '<style>body{margin:0;display:grid;place-items:center;height:100vh}svg{max-width:90vw;max-height:90vh}</style>' +
      '</head><body>' + markup + '<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>'
    );
    w.document.close();
  }

  async function saveToHistory() {
    if (!composed) { U.toast('Nothing to save yet', 'warn'); return; }
    try {
      const blob = await QF.render.exportBlob(state, 'png', 1, 1, composed);
      const dataUrl = await new Promise(function (resolve) {
        const fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.readAsDataURL(blob);
      });
      QF.history.add({
        id: U.uid('q'),
        created: Date.now(),
        type: state.type,
        payload: lastPayload.slice(0, 300),
        thumb: dataUrl,
        design: JSON.parse(JSON.stringify(state))
      });
      updateHistoryCount();
      U.toast('Saved to history', 'ok');
    } catch (e) {
      U.toast('Could not save to history', 'err');
    }
  }

  function updateHistoryCount() {
    const n = QF.history.count();
    const badge = $('#historyCount');
    if (badge) badge.textContent = n;
  }

  /* ---------------- views ---------------- */
  function setView(name, updateRoute) {
    if (!name) name = 'generator';
    activeView = name;
    $$('.navbtn').forEach(function (b) { b.classList.toggle('is-active', b.dataset.view === name); });
    $$('.view').forEach(function (v) { v.classList.toggle('is-active', v.id === 'view-' + name); });
    if (name === 'history') renderHistory();
    if (name === 'generator') doRender();
    if (updateRoute !== false) writeRoute(false);
  }

  function renderHistory() {
    const grid = $('#historyGrid');
    const list = QF.history.all();
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<div class="empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" focusable="false" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM18 18h3v3h-3z"/></svg>' +
        '<p>No saved codes yet.</p>' +
        '<p>Save a design from the export tab and it will wait here.</p></div>';
      return;
    }
    list.forEach(function (item) {
      const card = el('div', { class: 'hist-card' });
      card.innerHTML =
        '<div class="hist-thumb"><img alt="Saved QR code" width="88" height="88" src="' + item.thumb + '"></div>' +
        '<div class="hist-body"><p title="' + U.escapeHtml(item.payload) + '">' + U.escapeHtml(item.payload || '(empty)') + '</p>' +
        '<small>' + new Date(item.created).toLocaleString() + ', ' + U.escapeHtml(item.type) + '</small></div>';
      const actions = el('div', { class: 'hist-actions' });
      const load = el('button', { class: 'key', text: 'Load', type: 'button' });
      const del = el('button', { class: 'key key--danger', text: 'Delete', type: 'button' });
      load.addEventListener('click', function () {
        replaceState(Object.assign(defaultState(), item.design));
        state.values = item.design.values || {};
        activePreset = '';
        refresh();
        setView('generator');
        doRender();
        U.toast('The design is loaded', 'ok');
      });
      del.addEventListener('click', function () {
        QF.history.remove(item.id);
        updateHistoryCount();
        renderHistory();
      });
      actions.appendChild(load); actions.appendChild(del);
      card.appendChild(actions);
      grid.appendChild(card);
    });
  }

  /* ---------------- colour mode ---------------- */
  function initMode() {
    const btn = $('#themeToggle');
    btn.addEventListener('click', function () {
      const root = document.documentElement;
      const current = root.dataset.mode || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      root.dataset.mode = next;
      U.store.set('qrforge.mode', next);
      /* the exported SVG bakes in the current ink, so it is rebuilt */
      doRender();
    });
  }

  /* ---------------- api modal ---------------- */
  function openApi() {
    const example = location.origin + location.pathname + routeHash('generator', 'content', encodeState());
    $('#modalTitle').textContent = 'QRForge API';
    $('#modalBody').innerHTML =
      '<p class="muted">QRForge is a client-side tool, but every design can be shared as a link. ' +
      'The whole configuration is Base64-encoded into the URL, so no server is involved.</p>' +
      '<h3 style="margin:var(--space-md) 0 var(--space-xs)">Share a design</h3>' +
      '<pre>' + U.escapeHtml(example) + '</pre>' +
      '<h3 style="margin:var(--space-md) 0 var(--space-xs)">Programmatic use</h3>' +
      '<pre>' + U.escapeHtml(
        'const qr = new QRCodeStyling({\n' +
        '  type: "svg",\n' +
        '  width: 512,\n' +
        '  height: 512,\n' +
        '  data: "https://example.com",\n' +
        '  qrOptions: { errorCorrectionLevel: "Q" },\n' +
        '  dotsOptions: { type: "rounded", color: "#6366f1" },\n' +
        '  imageOptions: { hideBackgroundDots: true }\n' +
        '});\n' +
        'qr.append(document.getElementById("qr"));\n' +
        'await qr.download({ name: "my-code", extension: "png" });'
      ) + '</pre>' +
      '<p class="muted">The bundled qr-code-styling library is available globally as QRCodeStyling.</p>';
    $('#modal').hidden = false;
  }

  /* ---------------- shared UI refresh ---------------- */
  function refresh() {
    syncControls();
    syncMediaPreviews();
    buildDotTypeRow();
    buildFrameTemplateGrid();
    buildPresets();
    buildTypeGrid();
    buildContentForm();
  }

  /* ---------------- init ---------------- */
  function init() {
    initMode();

    /* restore from a share link, then honour the route */
    const route = parseHash();
    const design = route.params.get('d');
    if (design) {
      const restored = decodeState(design);
      if (restored) {
        replaceState(Object.assign(defaultState(), restored));
        state.values = restored.values || {};
        /* a design shared before the templates existed falls back to the card */
        if (!state.frameTemplate) state.frameTemplate = state.frameEnabled ? 'card' : 'none';
        U.toast('The shared design is loaded', 'ok');
      }
    }

    buildTypeGrid();
    buildContentForm();
    buildPresets();
    buildDotTypeRow();
    buildFrameTemplateGrid();
    syncControls();
    bindControls();
    updateHistoryCount();

    setView(route.view, false);
    setPanel(route.panel, false);
    writeRoute(false);

    $$('.navbtn').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });
    window.addEventListener('hashchange', function () {
      const r = parseHash();
      setView(r.view, false);
      setPanel(r.panel, false);
    });

    $('#openApi').addEventListener('click', openApi);
    $('#modalClose').addEventListener('click', function () { $('#modal').hidden = true; });
    $('#modal').addEventListener('click', function (e) { if (e.target === this) this.hidden = true; });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') $('#modal').hidden = true;
    });

    $('#btnClearHistory').addEventListener('click', function () {
      U.confirmDialog('Clear the history', 'This removes every saved code from this browser.').then(function (yes) {
        if (!yes) return;
        QF.history.clear();
        updateHistoryCount();
        renderHistory();
        U.toast('The history is cleared', 'ok');
      });
    });

    QF.bulk.init();
    QF.scanner.init();

    doRender();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  QF.app = {
    get state() { return state; },
    set state(v) { state = v; },
    render: doRender,
    setView: setView,
    refresh: refresh
  };
})(window.QF);
