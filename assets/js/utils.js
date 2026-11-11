/* =========================================================
   QRForge · utils.js — shared helpers
   ========================================================= */
window.QF = window.QF || {};

(function (QF) {
  'use strict';

  /* ---------- DOM ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (c === null || c === undefined) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function on(node, type, handler, opts) {
    if (!node) return function () {};
    node.addEventListener(type, handler, opts);
    return function () { node.removeEventListener(type, handler, opts); };
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function raf(fn) { return requestAnimationFrame(fn); }

  /* ---------- Values ---------- */
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function escapeXml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function escapeHtml(s) {
    return escapeXml(s).replace(/&#39;/g, "'");
  }

  function isHex(c) { return /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(String(c || '').trim()); }

  function normHex(c) {
    let v = String(c || '').trim();
    if (!v) return '#000000';
    if (v[0] !== '#') v = '#' + v;
    if (v.length === 4) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return v.toLowerCase();
  }

  function hexToRgb(hex) {
    const h = normHex(hex).slice(1);
    if (h.length === 3) return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  function relLuminance(hex) {
    const c = hexToRgb(hex);
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function contrastRatio(a, b) {
    const l1 = relLuminance(a), l2 = relLuminance(b);
    const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function byteLength(str) {
    return new TextEncoder().encode(String(str || '')).length;
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- Files ---------- */
  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('No file'));
      const fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error('Could not read file')); };
      fr.readAsDataURL(file);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  }

  function downloadText(text, filename, mime) {
    downloadBlob(new Blob([text], { type: mime || 'text/plain;charset=utf-8' }), filename);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      const ta = el('textarea', { style: 'position:fixed;opacity:0;top:0;left:0' });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('Copy failed'));
      } catch (e) {
        document.body.removeChild(ta);
        reject(e);
      }
    });
  }

  function copyBlob(blob) {
    if (!navigator.clipboard || !window.ClipboardItem) return Promise.reject(new Error('Clipboard images are not supported in this browser'));
    return navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  }

  /* ---------- UI ---------- */
  const toastHost = function () { return document.getElementById('toasts'); };

  function toast(message, kind, ms) {
    const host = toastHost();
    if (!host) return;
    const t = el('div', { class: 'toast ' + (kind || ''), text: message });
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .25s ease, transform .25s ease';
      t.style.opacity = '0';
      t.style.transform = 'translateX(28px)';
      setTimeout(function () { t.remove(); }, 260);
    }, ms || 2600);
  }

  function confirmDialog(title, message) {
    return new Promise(function (resolve) {
      const modal = document.getElementById('modal');
      const body = document.getElementById('modalBody');
      const titleEl = document.getElementById('modalTitle');
      titleEl.textContent = title;
      body.innerHTML = '';
      body.appendChild(el('p', { class: 'muted', text: message }));
      const row = el('div', { class: 'btn-row' });
      const yes = el('button', { class: 'btn btn-primary', text: 'Confirm' });
      const no = el('button', { class: 'btn', text: 'Cancel' });
      row.appendChild(yes); row.appendChild(no);
      body.appendChild(row);
      modal.hidden = false;
      function close(v) { modal.hidden = true; yes.remove(); no.remove(); resolve(v); }
      yes.addEventListener('click', function () { close(true); });
      no.addEventListener('click', function () { close(false); });
      modal.addEventListener('click', function once(e) {
        if (e.target === modal) { modal.removeEventListener('click', once); close(false); }
      });
    });
  }

  /* ---------- Storage ---------- */
  const store = {
    get: function (key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- Colour helpers ---------- */
  function randomHex() {
    const h = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    return '#' + h;
  }

  function readableOn(bg) {
    return contrastRatio(bg, '#0f172a') >= contrastRatio(bg, '#ffffff') ? '#0f172a' : '#ffffff';
  }

  /* OKLCH to sRGB, so a theme token can be baked into a standalone SVG. */
  function oklchToHex(L, C, H) {
    const h = (H * Math.PI) / 180;
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    const enc = function (v) {
      v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
      return Math.min(1, Math.max(0, v));
    };
    const to = function (v) { return Math.round(enc(v) * 255).toString(16).padStart(2, '0'); };
    return '#' + to(lr) + to(lg) + to(lb);
  }

  /**
   * Resolves any CSS colour to a literal hex, so an exported SVG does not
   * depend on the page's custom properties.
   */
  function cssColor(value) {
    if (!value) return '#000000';
    const v = String(value).trim();
    const ok = v.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/i);
    if (ok) return oklchToHex(parseFloat(ok[1]) / 100, parseFloat(ok[2]), parseFloat(ok[3]));
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(v)) return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toLowerCase();
    const probe = document.createElement('span');
    probe.style.color = v;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();
    const m = rgb.match(/rgba?\(([^)]+)\)/);
    if (!m) return '#000000';
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).slice(0, 3).map(Number);
    return '#' + p.map(function (n) { return Math.round(n).toString(16).padStart(2, '0'); }).join('');
  }

  /** Reads a theme token and resolves it to a literal colour. */
  function tokenColor(name) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return cssColor(v);
  }

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    const src = String(text || '').replace(/^\uFEFF/, '');
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (inQuotes) {
        if (c === '"') {
          if (src[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else if (c === '\r') {
        /* skip */
      } else {
        field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (v) { return String(v).trim() !== ''; }); });
  }

  QF.util = {
    $: $, $$: $$, el: el, on: on, debounce: debounce, raf: raf,
    clamp: clamp, escapeXml: escapeXml, escapeHtml: escapeHtml,
    isHex: isHex, normHex: normHex, hexToRgb: hexToRgb,
    contrastRatio: contrastRatio, relLuminance: relLuminance,
    byteLength: byteLength, formatBytes: formatBytes, uid: uid,
    readFileAsDataURL: readFileAsDataURL, downloadBlob: downloadBlob, downloadText: downloadText,
    copyText: copyText, copyBlob: copyBlob, toast: toast, confirmDialog: confirmDialog,
    store: store, randomHex: randomHex, readableOn: readableOn, parseCSV: parseCSV,
    cssColor: cssColor, tokenColor: tokenColor, oklchToHex: oklchToHex
  };
})(window.QF);
