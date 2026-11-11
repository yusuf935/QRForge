/* End-to-end check of the redesigned QRForge, driven through headless Chrome.
   Verifies the generator, every tab, the views, the exports and the scanner. */
'use strict';

const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:8080/';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => !!document.querySelector('#qrHolder svg'), { timeout: 15000 });

  /* --- fonts --- */
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight),
      count: document.fonts.size
    };
  });
  check('fonts loaded', fonts.count >= 7, fonts.loaded.join(', '));

  /* --- the mark renders and decodes --- */
  const decoded = await page.evaluate(async () => {
    const svg = document.querySelector('#qrHolder svg');
    const markup = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([markup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const c = document.createElement('canvas'); c.width = 800; c.height = 800;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 800);
    ctx.drawImage(img, 0, 0, 800, 800);
    const d = ctx.getImageData(0, 0, 800, 800);
    const r = window.jsQR(d.data, 800, 800, { inversionAttempts: 'attemptBoth' });
    URL.revokeObjectURL(url);
    return r ? r.data : 'FAIL';
  });
  check('the mark scans back', decoded === 'https://example.com', decoded);

  /* --- every tab opens --- */
  for (const panel of ['design', 'media', 'frame', 'export', 'content']) {
    await page.click(`.tray-key[data-panel="${panel}"]`);
    await new Promise(r => setTimeout(r, 120));
    const visible = await page.evaluate(p => {
      const el = document.querySelector(`.tabpane[data-pane="${p}"]`);
      return el && el.classList.contains('is-active') && el.offsetHeight > 0;
    }, panel);
    check('the ' + panel + ' tab opens', visible);
  }

  /* --- every content type builds a payload --- */
  const typeCount = await page.evaluate(() => document.querySelectorAll('#typeGrid .type-key').length);
  check('sixteen content types', typeCount === 16, typeCount);

  const typePayloads = await page.evaluate(async () => {
    const out = [];
    const cards = [...document.querySelectorAll('#typeGrid .type-key')];
    const SAMPLE = 'Sample value 42';
    for (const c of cards) {
      c.click();
      await new Promise(r => setTimeout(r, 90));
      /* fill every field the type shows, so a type with no default still builds */
      document.querySelectorAll('#contentFields input, #contentFields textarea').forEach(el => {
        if (el.type === 'checkbox') { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); return; }
        if (el.type === 'number') { el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })); return; }
        if (el.tagName === 'SELECT') { el.selectedIndex = Math.min(1, el.options.length - 1); el.dispatchEvent(new Event('change', { bubbles: true })); return; }
        el.value = SAMPLE; el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await new Promise(r => setTimeout(r, 60));
      const v = window.QF.types.build(window.QF.app.state.type, window.QF.app.state.values[window.QF.app.state.type]);
      out.push(c.dataset.type + '=' + (v ? 'ok' : 'empty'));
    }
    return out;
  });
  check('every type builds a payload', typePayloads.every(s => s.endsWith('ok')), typePayloads.join(' '));

  /* --- the route lives in the URL --- */
  await page.evaluate(() => document.querySelector('.navbtn[data-view="bulk"]').click());
  await new Promise(r => setTimeout(r, 200));
  const hash = await page.evaluate(() => location.hash);
  check('the view lives in the URL', /#\/bulk/.test(hash), hash);

  await page.evaluate(() => document.querySelector('.navbtn[data-view="generator"]').click());
  await new Promise(r => setTimeout(r, 150));
  await page.evaluate(() => document.querySelector('.tray-key[data-panel="design"]').click());
  await new Promise(r => setTimeout(r, 150));
  const hash2 = await page.evaluate(() => location.hash);
  check('the open panel lives in the URL', /#\/generator\/design/.test(hash2), hash2);

  /* --- exports --- */
  const exports = await page.evaluate(async () => {
    const st = window.QF.app.state;
    const out = {};
    for (const fmt of ['png', 'svg', 'jpeg', 'webp']) {
      try {
        const c = await window.QF.render.render(st, 'https://example.com');
        const b = await window.QF.render.exportBlob(st, fmt, 2, 0.9, c);
        out[fmt] = b.type + ' ' + b.size;
      } catch (e) { out[fmt] = 'ERR ' + e.message; }
    }
    return out;
  });
  check('PNG export', /image\/png \d{4,}/.test(exports.png), exports.png);
  check('SVG export', /image\/svg/.test(exports.svg), exports.svg);
  check('JPG export', /image\/jpeg \d{4,}/.test(exports.jpeg), exports.jpeg);
  check('WEBP export', /image\/webp \d{4,}/.test(exports.webp), exports.webp);

  /* --- bulk, from a CSV to a ZIP --- */
  const bulk = await page.evaluate(async () => {
    document.querySelector('.navbtn[data-view="bulk"]').click();
    await new Promise(r => setTimeout(r, 150));
    document.getElementById('csvSample').click();
    await new Promise(r => setTimeout(r, 400));
    const rows = document.querySelectorAll('#bulkTable tbody tr').length;
    document.getElementById('btnBulkGenerate').click();
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 250));
      if (/downloaded/.test(document.getElementById('bulkStatus').textContent)) break;
    }
    return { rows, status: document.getElementById('bulkStatus').textContent };
  });
  check('the CSV preview renders', bulk.rows >= 5, bulk.rows + ' rows');
  check('the ZIP is built', /5 QR codes/.test(bulk.status), bulk.status);

  /* --- the scanner reads a generated code back --- */
  const scan = await page.evaluate(async () => {
    document.querySelector('.navbtn[data-view="scan"]').click();
    await new Promise(r => setTimeout(r, 150));
    const st = window.QF.app.state;
    /* a framed code, the hardest case for a decoder */
    st.frameTemplate = 'banner';
    window.QF.frames.apply('banner', st);
    const c = await window.QF.render.render(st, 'WIFI:T:WPA;S:RoundTrip;P:pw123;;');
    const blob = await window.QF.render.exportBlob(st, 'png', 2, 1, c);
    const file = new File([blob], 'qr.png', { type: 'image/png' });
    const dt = new DataTransfer(); dt.items.add(file);
    const input = document.getElementById('scanInput');
    input.files = dt.files; input.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 1600));
    const kind = document.querySelector('#scanResult .scan-kind');
    const pre = document.querySelector('#scanResult pre');
    st.frameTemplate = 'none';
    window.QF.app.refresh();
    return { kind: kind ? kind.textContent : null, text: pre ? pre.textContent : null };
  });
  check('the scanner reads a framed code', scan.kind === 'Wi-Fi network' && /RoundTrip/.test(scan.text || ''), scan.kind + ' ' + scan.text);

  /* --- the scanner feeds the generator --- */
  const back = await page.evaluate(async () => {
    [...document.querySelectorAll('#scanResult .scan-actions button')].find(b => /generator/i.test(b.textContent)).click();
    await new Promise(r => setTimeout(r, 400));
    const st = window.QF.app.state;
    const active = document.querySelector('#typeGrid .type-key.is-active');
    return { type: st.type, ssid: st.values.wifi && st.values.wifi.ssid, active: active && active.dataset.type };
  });
  check('the scan lands in the generator', back.type === 'wifi' && back.active === 'wifi' && back.ssid === 'RoundTrip', JSON.stringify(back));

  /* --- history --- */
  const hist = await page.evaluate(async () => {
    document.querySelector('.navbtn[data-view="generator"]').click();
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('btnSave').click();
    await new Promise(r => setTimeout(r, 900));
    document.querySelector('.navbtn[data-view="history"]').click();
    await new Promise(r => setTimeout(r, 250));
    return { count: document.getElementById('historyCount').textContent, cards: document.querySelectorAll('#historyGrid .hist-card').length };
  });
  check('history saves a code', hist.cards >= 1, hist.count + ' saved');

  /* --- the colour mode toggle --- */
  const mode = await page.evaluate(async () => {
    const before = document.documentElement.dataset.mode || 'unset';
    document.getElementById('themeToggle').click();
    await new Promise(r => setTimeout(r, 150));
    const after = document.documentElement.dataset.mode;
    document.getElementById('themeToggle').click();
    return { before, after };
  });
  check('the colour mode toggles', mode.after && mode.after !== mode.before, JSON.stringify(mode));

  /* --- the Media panel's sliders --- */
  const media = await page.evaluate(async () => {
    const st = window.QF.app.state;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const out = { size: [], margin: [], preview: null, plate: null };

    const logo = document.createElement('canvas'); logo.width = 400; logo.height = 200;
    const lx = logo.getContext('2d');
    lx.fillStyle = '#d946ef'; lx.fillRect(0, 0, 400, 200);
    st.logo = logo.toDataURL('image/png');

    async function draw(size, margin) {
      st.logoSize = size; st.logoMargin = margin;
      const composed = await window.QF.render.render(st, 'https://example.com');
      const img = composed.svg.querySelector('image');
      return {
        w: parseFloat(img.getAttribute('width')),
        h: parseFloat(img.getAttribute('height')),
        ratio: parseFloat(img.getAttribute('width')) / parseFloat(img.getAttribute('height'))
      };
    }

    for (const s of [10, 25, 40]) out.size.push(await draw(s, 0));
    for (const m of [0, 8, 20, 40]) out.margin.push(await draw(25, m));

    /* an uploaded preview keeps its own proportions */
    document.querySelector('.navbtn[data-view="generator"]').click();
    await wait(200);
    document.querySelector('.tray-key[data-panel="media"]').click();
    await wait(250);
    const sq = document.createElement('canvas'); sq.width = 300; sq.height = 300;
    const sx = sq.getContext('2d');
    sx.fillStyle = '#0ea5e9'; sx.fillRect(0, 0, 300, 300);
    const blob = await new Promise(r => sq.toBlob(r, 'image/png'));
    const file = new File([blob], 'square.png', { type: 'image/png' });
    const dt = new DataTransfer(); dt.items.add(file);
    const input = document.getElementById('logoInput');
    input.files = dt.files; input.dispatchEvent(new Event('change'));
    await wait(900);
    const prev = document.querySelector('#logoPreview img');
    const pr = prev ? prev.getBoundingClientRect() : null;
    out.preview = pr ? { ratio: pr.width / pr.height } : null;

    /* the plate takes the background the user chose */
    st.bgColor = '#fff4d6'; st.bgTransparent = false;
    window.QF.app.render();
    await wait(500);
    const plate = document.getElementById('plate');
    out.plate = {
      bg: getComputedStyle(plate).backgroundColor,
      strip: getComputedStyle(document.querySelector('.plate-strip')).backgroundColor
    };
    st.logo = null;
    return out;
  });

  check('the logo size slider resizes the logo',
    media.size[0].w < media.size[1].w && media.size[1].w < media.size[2].w,
    media.size.map(s => Math.round(s.w)).join(' < '));

  check('the logo margin slider shrinks the logo',
    media.margin[0].w > media.margin[1].w && media.margin[1].w > media.margin[2].w && media.margin[2].w > media.margin[3].w,
    media.margin.map(s => Math.round(s.w)).join(' > '));

  check('the logo margin never makes the logo a negative size',
    media.margin.every(s => s.w > 0 && s.h > 0),
    media.margin.map(s => s.w.toFixed(1) + 'x' + s.h.toFixed(1)).join(' '));

  check('the logo keeps its proportions at every margin',
    media.margin.every(s => Math.abs(s.ratio - media.margin[0].ratio) < 0.02),
    media.margin.map(s => s.ratio.toFixed(3)).join(' '));

  check('an uploaded preview keeps its proportions',
    media.preview && Math.abs(media.preview.ratio - 1) < 0.05,
    media.preview ? media.preview.ratio.toFixed(3) : 'no preview');

  check('the preview plate takes the chosen background',
    media.plate && media.plate.bg === 'rgb(255, 244, 214)',
    media.plate ? media.plate.bg + ' / strip ' + media.plate.strip : 'none');

  /* --- reset to defaults --- */
  const reset = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const st = window.QF.app.state;

    document.querySelector('.navbtn[data-view="generator"]').click();
    await wait(200);
    document.querySelector('.tray-key[data-panel="media"]').click();
    await wait(250);

    /* an uploaded logo, so the reset has something to clear */
    const c = document.createElement('canvas'); c.width = 100; c.height = 100;
    const x = c.getContext('2d'); x.fillStyle = '#ff0000'; x.fillRect(0, 0, 100, 100);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const file = new File([blob], 'l.png', { type: 'image/png' });
    const dt = new DataTransfer(); dt.items.add(file);
    const input = document.getElementById('logoInput');
    input.files = dt.files; input.dispatchEvent(new Event('change'));
    await wait(800);

    /* a design far from the defaults, and a shared design sitting in the URL */
    Object.assign(st, {
      size: 1024, ec: 'H', dotColor: '#ff00ff', dotGradient: true, gradColor1: '#00ff00', gradColor2: '#ffff00',
      bgColor: '#ffee00', cardShape: 'circle', frameEnabled: true, frameStyle: 'tag',
      frameHead: 'HELLO', frameFoot: 'WORLD'
    });
    window.QF.app.refresh();
    window.QF.app.render();
    await wait(400);
    location.hash = '#/generator/design?d=' + btoa(unescape(encodeURIComponent(JSON.stringify(st))));
    await wait(250);

    /* the Neon preset, so the reset has a gradient to clear */
    const neon = [...document.querySelectorAll('#presetGrid .preset')].find(p => p.dataset.preset === 'neon');
    neon.click();
    await wait(600);

    async function paint() {
      const composed = await window.QF.render.render(window.QF.app.state, 'https://example.com');
      const fills = [...composed.svg.querySelectorAll('rect')].map(r => r.getAttribute('fill')).filter(Boolean);
      return {
        gradientFills: fills.filter(f => f.startsWith('url(')).length,
        images: composed.svg.querySelectorAll('image').length,
        solids: [...new Set(fills.filter(f => !f.startsWith('url(')))].join(',')
      };
    }
    const neonPaint = await paint();

    document.getElementById('resetDesign').click();
    await wait(800);

    const resetPaint = await paint();
    const s = window.QF.app.state;
    return {
      size: s.size, ec: s.ec, dotColor: s.dotColor, dotGradient: s.dotGradient,
      bgColor: s.bgColor, cardShape: s.cardShape, frameEnabled: s.frameEnabled,
      frameHead: s.frameHead, logo: s.logo,
      logoPreview: !!document.querySelector('#logoPreview img'),
      logoHasImageClass: document.getElementById('logoDrop').classList.contains('has-image'),
      hash: location.hash,
      payload: document.getElementById('payloadBox').value,
      neonPaint, resetPaint
    };
  });

  check('reset returns the design to its defaults',
    reset.size === 512 && reset.ec === 'Q' && reset.dotColor === '#0f172a' &&
    reset.dotGradient === false && reset.bgColor === '#ffffff' &&
    reset.cardShape === 'square' && reset.frameEnabled === false && reset.frameHead === '',
    JSON.stringify({ size: reset.size, ec: reset.ec, dot: reset.dotColor, grad: reset.dotGradient, bg: reset.bgColor, card: reset.cardShape, frame: reset.frameEnabled }));

  check('the Neon preset paints a gradient', reset.neonPaint.gradientFills > 0,
    reset.neonPaint.gradientFills + ' gradient fills, solids [' + reset.neonPaint.solids + ']');

  check('reset clears the gradient from the render, not just the state',
    reset.resetPaint.gradientFills === 0 && reset.resetPaint.solids.indexOf('#0f172a') > -1,
    reset.resetPaint.gradientFills + ' gradient fills, solids [' + reset.resetPaint.solids + ']');

  check('reset removes the uploaded logo from the design', reset.logo === null, reset.logo);

  check('reset clears the upload preview as well', !reset.logoPreview && !reset.logoHasImageClass,
    'preview ' + reset.logoPreview + ' class ' + reset.logoHasImageClass);

  check('reset clears the shared design from the URL', reset.hash.indexOf('?d=') === -1, reset.hash);

  check('reset keeps the content you typed', reset.payload.length > 0, reset.payload.slice(0, 40));

  /* --- the spec dropdown --- */
  const spec = await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const d = document.querySelector('.raw');
    const summary = document.querySelector('.summary-note');
    const before = {
      open: d.open,
      summary: summary ? summary.textContent : null,
      parts: summary ? summary.children.length : 0,
      rows: document.querySelectorAll('#specBody tr').length,
      marker: getComputedStyle(d.querySelector('summary'), '::before').width
    };
    d.querySelector('summary').click();
    await wait(250);
    const after = { open: d.open, tableVisible: d.querySelector('.spec').offsetHeight > 0 };
    d.querySelector('summary').click();
    await wait(250);
    return { before, after, closedAgain: !d.open };
  });

  check('the spec is a dropdown that opens and closes',
    spec.before.open === false && spec.after.open === true && spec.after.tableVisible && spec.closedAgain,
    JSON.stringify(spec.after) + ' closedAgain ' + spec.closedAgain);

  check('the collapsed spec still shows the key figures',
    spec.before.parts >= 3 && /v\d/.test(spec.before.summary || '') && /px/.test(spec.before.summary || ''),
    spec.before.summary);

  check('the spec dropdown shows a disclosure marker', spec.before.marker !== '0px', spec.before.marker);

  /* --- every frame template renders and stays scannable --- */
  const frames = await page.evaluate(async () => {
    const st = window.QF.app.state;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const ids = window.QF.frames.list.map(f => f.id);
    const out = [];

    async function decode(blob) {
      const bmp = await createImageBitmap(blob);
      /* the app's own decoder, which retries on trimmed and inverted copies */
      return window.QF.scanner.decodeImage(bmp, bmp.width, bmp.height);
    }

    for (const id of ids) {
      st.frameTemplate = id;
      st.frameEnabled = id !== 'none';
      window.QF.frames.apply(id, st);
      const composed = await window.QF.render.render(st, 'https://example.com');
      const blob = await window.QF.render.exportBlob(st, 'png', 1, 1, composed);
      const decoded = await decode(blob);
      /* the caption must sit inside the artwork */
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;left:-9999px;top:0';
      host.appendChild(composed.svg.cloneNode(true));
      document.body.appendChild(host);
      const t = host.querySelector('text');
      let clipped = false;
      if (t) {
        const b = t.getBBox();
        clipped = (b.y + b.height) > composed.height - 1;
      }
      host.remove();
      out.push({ id: id, decoded: decoded, clipped: clipped, w: composed.width, h: composed.height });
    }
    st.frameTemplate = 'none';
    window.QF.app.refresh();
    return { ids: ids, out: out };
  });

  check('there are twelve frame templates', frames.ids.length === 12, frames.ids.join(', '));
  check('every frame template keeps the code scannable',
    frames.out.every(f => f.decoded === 'https://example.com'),
    frames.out.filter(f => f.decoded !== 'https://example.com').map(f => f.id + ':' + f.decoded).join(' ') || 'all decode');
  check('no frame template clips its caption',
    frames.out.every(f => !f.clipped),
    frames.out.filter(f => f.clipped).map(f => f.id).join(' ') || 'none clipped');

  /* --- no stray console noise --- */
  check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));

  await browser.close();

  const failed = results.filter(r => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
