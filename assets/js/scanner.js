/* =========================================================
   QRForge · scanner.js — read QR codes from images and the camera
   ========================================================= */
(function (QF) {
  'use strict';

  const U = QF.util;
  const $ = U.$, $$ = U.$$, el = U.el;

  let scanner = null;

  /* ---------- payload classification ---------- */
  function classify(text) {
    const t = String(text || '').trim();
    if (/^WIFI:/i.test(t)) return { kind: 'Wi-Fi network', payload: t };
    if (/^BEGIN:VCARD/i.test(t)) return { kind: 'Contact (vCard)', payload: t };
    if (/^BEGIN:VEVENT/i.test(t)) return { kind: 'Calendar event', payload: t };
    if (/^mailto:/i.test(t)) return { kind: 'Email address', payload: t };
    if (/^tel:/i.test(t)) return { kind: 'Phone number', payload: t };
    if (/^SMSTO:/i.test(t) || /^sms:/i.test(t)) return { kind: 'SMS message', payload: t };
    if (/^geo:/i.test(t)) return { kind: 'GPS location', payload: t };
    if (/^bitcoin:|^ethereum:|^litecoin:|^dogecoin:/i.test(t)) return { kind: 'Crypto wallet', payload: t };
    if (/^https?:\/\//i.test(t)) {
      if (/\.pdf(\?|$)/i.test(t)) return { kind: 'PDF document', payload: t };
      if (/play\.google\.com|apps\.apple\.com/i.test(t)) return { kind: 'App store link', payload: t };
      return { kind: 'Web link', payload: t };
    }
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(t)) return { kind: 'Email address', payload: 'mailto:' + t };
    return { kind: 'Plain text', payload: t };
  }

  function showResult(text) {
    const info = classify(text);
    const host = $('#scanResult');
    host.innerHTML = '';
    host.appendChild(el('span', { class: 'scan-kind', text: info.kind }));
    host.appendChild(el('pre', { text: info.payload }));

    const actions = el('div', { class: 'scan-actions' });
    const copy = el('button', { class: 'key', text: 'Copy the result', type: 'button' });
    const open = el('button', { class: 'key', text: 'Open the link', type: 'button' });
    const use = el('button', { class: 'key key--primary', text: 'Use it in the generator', type: 'button' });
    const dl = el('button', { class: 'key', text: 'Save the text', type: 'button' });

    copy.addEventListener('click', function () {
      U.copyText(info.payload).then(function () { U.toast('Copied', 'ok'); });
    });
    open.addEventListener('click', function () {
      if (/^https?:\/\//i.test(info.payload)) window.open(info.payload, '_blank', 'noopener');
      else U.toast('This result is not a link', 'warn');
    });
    dl.addEventListener('click', function () {
      U.downloadText(info.payload, 'scanned-qr.txt', 'text/plain;charset=utf-8');
    });
    use.addEventListener('click', function () {
      useInGenerator(info);
    });

    actions.appendChild(copy); actions.appendChild(open); actions.appendChild(use); actions.appendChild(dl);
    host.appendChild(actions);
  }

  function useInGenerator(info) {
    const st = QF.app.state;
    let type = 'custom';
    const p = info.payload;

    if (/^WIFI:/i.test(p)) {
      type = 'wifi';
      const parts = p.replace(/^WIFI:/i, '').split(';');
      const get = function (k) {
        const f = parts.filter(function (x) { return x.indexOf(k + ':') === 0; })[0];
        return f ? f.slice(2).replace(/\\(.)/g, '$1') : '';
      };
      st.values.wifi = Object.assign(QF.types.defaults('wifi'), {
        ssid: get('S'), password: get('P'), encryption: get('T').toUpperCase() || 'WPA', hidden: /H:true/i.test(p)
      });
    } else if (/^BEGIN:VCARD/i.test(p)) {
      type = 'vcard';
      const grab = function (key) {
        const m = p.match(new RegExp('^' + key + '[^:\\r\\n]*:(.*)$', 'im'));
        return m ? m[1].replace(/\\([,;\\n])/g, '$1').trim() : '';
      };
      const n = grab('N').split(';');
      st.values.vcard = Object.assign(QF.types.defaults('vcard'), {
        firstName: n[1] || '', lastName: n[0] || '',
        org: grab('ORG'), title: grab('TITLE'),
        phone: grab('TEL'), email: grab('EMAIL'), website: grab('URL'), note: grab('NOTE')
      });
    } else if (/^mailto:/i.test(p)) {
      type = 'email';
      const rest = p.replace(/^mailto:/i, '');
      const [to, query] = rest.split('?');
      const q = {};
      (query || '').split('&').forEach(function (kv) {
        if (!kv) return;
        const i = kv.indexOf('=');
        q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
      });
      st.values.email = Object.assign(QF.types.defaults('email'), {
        to: decodeURIComponent(to), subject: q.subject || '', body: q.body || '', cc: q.cc || '', bcc: q.bcc || ''
      });
    } else if (/^tel:/i.test(p)) {
      type = 'phone';
      st.values.phone = Object.assign(QF.types.defaults('phone'), { phone: p.replace(/^tel:/i, '') });
    } else if (/^SMSTO:/i.test(p)) {
      type = 'sms';
      const rest = p.replace(/^SMSTO:/i, '');
      const idx = rest.indexOf(':');
      st.values.sms = Object.assign(QF.types.defaults('sms'), {
        phone: idx > -1 ? rest.slice(0, idx) : rest,
        message: idx > -1 ? rest.slice(idx + 1) : ''
      });
    } else if (/^geo:/i.test(p)) {
      type = 'location';
      const rest = p.replace(/^geo:/i, '').split('?')[0].split(',');
      st.values.location = Object.assign(QF.types.defaults('location'), {
        lat: rest[0] || '', lng: rest[1] || '', address: (p.split('q=')[1] || '')
      });
    } else if (/^https?:\/\//i.test(p)) {
      type = 'url';
      st.values.url = Object.assign(QF.types.defaults('url'), { url: p });
    } else {
      type = 'custom';
      st.values.custom = Object.assign(QF.types.defaults('custom'), { data: p });
    }

    st.type = type;
    QF.app.refresh();
    QF.app.setView('generator');
    QF.app.render();
    U.toast('Loaded into the generator', 'ok');
  }

  /* ---------- image scanning ---------- */
  function scanImage(file) {
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        const found = decodeImage(img, img.naturalWidth, img.naturalHeight);
        if (found) showResult(found);
        else U.toast('No QR code found in that image', 'warn');
      };
      img.onerror = function () { U.toast('Could not read that image', 'err'); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function scanCanvas(canvas) {
    if (!window.jsQR) return null;
    try {
      const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const r = window.jsQR(d.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
      return r ? r.data : null;
    } catch (e) { return null; }
  }

  function cropCanvas(src, keep) {
    const h = Math.max(16, Math.round(src.height * keep));
    const cv = document.createElement('canvas');
    cv.width = src.width;
    cv.height = h;
    cv.getContext('2d').drawImage(src, 0, 0);
    return cv;
  }

  function invertCanvas(src) {
    const cv = document.createElement('canvas');
    cv.width = src.width; cv.height = src.height;
    const ctx = cv.getContext('2d');
    const d = src.getContext('2d').getImageData(0, 0, src.width, src.height);
    const out = ctx.createImageData(src.width, src.height);
    for (let i = 0; i < d.data.length; i += 4) {
      out.data[i] = 255 - d.data[i];
      out.data[i + 1] = 255 - d.data[i + 1];
      out.data[i + 2] = 255 - d.data[i + 2];
      out.data[i + 3] = d.data[i + 3];
    }
    ctx.putImageData(out, 0, 0);
    return cv;
  }

  /**
   * Reads a QR code out of an image.
   *
   * A framed code with a caption band can defeat a strict decoder on the first
   * pass, so the whole image is tried first and then trimmed and inverted
   * versions of it. That way the tool reads the codes it generates.
   */
  function decodeImage(source, w, h) {
    const maxSide = 1400;
    let width = w, height = h;
    if (width > maxSide || height > maxSide) {
      const ratio = maxSide / Math.max(width, height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, width, height);

    let found = scanCanvas(canvas);
    if (found) return found;

    /* trim the bottom, where a caption band usually sits */
    for (const keep of [0.94, 0.9, 0.85]) {
      found = scanCanvas(cropCanvas(canvas, keep));
      if (found) return found;
    }

    /* and the other way round */
    found = scanCanvas(invertCanvas(canvas));
    if (found) return found;

    /* one more attempt at full resolution */
    if (width !== w || height !== h) {
      const big = document.createElement('canvas');
      big.width = w; big.height = h;
      const bctx = big.getContext('2d');
      bctx.drawImage(source, 0, 0, w, h);
      found = scanCanvas(big);
      if (found) return found;
    }
    return null;
  }

  /* ---------- camera ---------- */
  function startCamera() {
    const box = $('#cameraReader');
    if (!window.Html5Qrcode) { U.toast('The camera module failed to load', 'err'); return; }
    if (scanner) return;
    scanner = new window.Html5Qrcode('cameraReader');
    $('#btnCamStart').disabled = true;
    $('#btnCamStop').disabled = false;
    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.3333 },
      function (decoded) {
        showResult(decoded);
        stopCamera();
      },
      function () { /* ignore per-frame errors */ }
    ).catch(function (err) {
      U.toast('Camera unavailable: ' + (err && err.message ? err.message : 'permission denied'), 'err');
      stopCamera();
    });
  }

  function stopCamera() {
    if (!scanner) return;
    try {
      scanner.stop().then(function () {
        scanner.clear();
        scanner = null;
      }).catch(function () { scanner = null; });
    } catch (e) { scanner = null; }
    $('#btnCamStart').disabled = false;
    $('#btnCamStop').disabled = true;
  }

  /* ---------- init ---------- */
  function init() {
    const drop = $('#scanDrop'), input = $('#scanInput');
    if (!drop || !input) return;

    drop.addEventListener('click', function () { input.click(); });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      const f = input.files && input.files[0];
      if (f) scanImage(f);
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
      if (f) scanImage(f);
    });

    $('#btnCamStart').addEventListener('click', startCamera);
    $('#btnCamStop').addEventListener('click', stopCamera);
  }

  QF.scanner = { init: init, decodeImage: decodeImage };
})(window.QF);
