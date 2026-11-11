/* =========================================================
   QRForge · frames.js — decorative frame templates
   ------------------------------------------------------------
   A template is the whole treatment around the code: the caption
   band, the bubble, the ticket notches, the clipboard body. Each
   one reports the extra space it needs, then draws itself either
   behind the code (`behind`) or in front of it (`front`).

   The caption scales with the code, so a frame looks the same
   proportioned at 128 px and at 2048 px.
   ========================================================= */
(function (QF) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  const FONT_BODY = '"IBM Plex Sans", system-ui, sans-serif';
  const FONT_DISPLAY = '"Familjen Grotesk", system-ui, sans-serif';

  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      e.setAttribute(k, attrs[k]);
    }
    return e;
  }

  function text(str, x, y, o) {
    const t = el('text', {
      x: x, y: y,
      'text-anchor': o.anchor || 'start',
      'font-family': o.family || FONT_BODY,
      'font-size': o.size,
      'font-weight': o.weight || 500,
      fill: o.fill
    });
    if (o.style) t.setAttribute('font-style', o.style);
    if (o.tracking) t.setAttribute('letter-spacing', o.tracking);
    t.textContent = str;
    return t;
  }

  function rect(x, y, w, h, r, fill, extra) {
    return el('rect', Object.assign({ x: x, y: y, width: w, height: h, rx: r || 0, fill: fill }, extra || {}));
  }

  function path(d, fill, extra) {
    return el('path', Object.assign({ d: d, fill: fill }, extra || {}));
  }

  /** The caption size, scaled to the code so every frame reads the same. */
  function cap(state, cardSize) {
    return Math.max(12, Math.round((state.frameFootSize || 28) * (cardSize / 512)));
  }

  /** The caption above the code, scaled the same way. */
  function head(state, cardSize) {
    return Math.max(12, Math.round((state.frameHeadSize || 28) * (cardSize / 512)));
  }

  /* ---------- the templates ---------- */
  const TEMPLATES = [
    {
      id: 'none', name: 'No frame',
      space: function () { return { top: 0, right: 0, bottom: 0, left: 0 }; },
      draw: function () { },
      apply: function (s) { s.frameHead = ''; s.frameFoot = ''; }
    },
    {
      id: 'caption', name: 'Caption',
      space: function (s, c) { return { top: 0, right: 0, bottom: cap(s, c) + 26, left: 0 }; },
      draw: function (c) {
        c.front.push(text(c.capText, c.W / 2, c.cardY + c.cardSize + 20 + c.capSize * 0.74, {
          size: c.capSize, anchor: 'middle', fill: c.ink, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; s.frameColor = '#0f172a'; }
    },
    {
      id: 'banner', name: 'Banner',
      space: function (s, c) { return { top: 0, right: 0, bottom: cap(s, c) + 40, left: 0 }; },
      draw: function (c) {
        const h = c.capSize + 30;
        const y = c.cardY + c.cardSize + 14;
        c.front.push(rect(c.cardX, y, c.cardSize, h, 5, c.fill));
        c.front.push(text(c.capText, c.cardX + c.cardSize / 2, y + h / 2 + c.capSize * 0.35, {
          size: c.capSize, anchor: 'middle', fill: c.onFill, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; s.frameColor = '#0f172a'; }
    },
    {
      id: 'bubble', name: 'Speech bubble',
      space: function (s, c) { return { top: head(s, c) + 58, right: 0, bottom: 0, left: 0 }; },
      draw: function (c) {
        const w = c.cardSize * 0.74;
        const h = c.headSize + 30;
        const x = c.cardX + (c.cardSize - w) / 2;
        const y = c.cardY - h - 22;
        const tail = 15;
        const r = Math.round(h * 0.34);
        c.front.push(path(
          'M ' + (x + r) + ' ' + y +
          ' H ' + (x + w - r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) +
          ' V ' + (y + h - r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) +
          ' H ' + (x + w / 2 + 16) + ' L ' + (x + w / 2) + ' ' + (y + h + tail) +
          ' L ' + (x + w / 2 - 16) + ' ' + (y + h) +
          ' H ' + (x + r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) +
          ' V ' + (y + r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + ' Z', c.fill));
        c.front.push(text(c.headText, x + w / 2, y + h / 2 + c.headSize * 0.35, {
          size: c.headSize, anchor: 'middle', fill: c.onFill, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = 'Scan me!'; s.frameFoot = ''; s.frameColor = '#0f172a'; }
    },
    {
      id: 'ticket', name: 'Ticket',
      space: function (s, c) { return { top: 0, right: 18, bottom: cap(s, c) + 42, left: 18 }; },
      draw: function (c) {
        const x = c.cardX - 18, w = c.cardSize + 36;
        const y = c.cardY, h = c.cardSize;
        const strip = c.capSize + 34;
        const py = y + h + 10;
        const r = 13;
        c.behind.push(path(
          'M ' + x + ' ' + y +
          ' H ' + (x + w) +
          ' V ' + (py - r) +
          ' A ' + r + ' ' + r + ' 0 0 0 ' + (x + w) + ' ' + (py + r) +
          ' V ' + (py + strip) +
          ' H ' + x +
          ' V ' + (py + r) +
          ' A ' + r + ' ' + r + ' 0 0 0 ' + x + ' ' + (py - r) +
          ' Z', c.well, { stroke: c.edge, 'stroke-width': 1.5 }));
        c.front.push(el('line', {
          x1: x + 14, y1: py, x2: x + w - 14, y2: py,
          stroke: c.edge, 'stroke-width': 1.5, 'stroke-dasharray': '3 7'
        }));
        c.front.push(text(c.capText, x + w / 2, py + strip / 2 + c.capSize * 0.35, {
          size: c.capSize, anchor: 'middle', fill: c.ink, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; s.frameColor = '#0f172a'; }
    },
    {
      id: 'corners', name: 'Corner brackets',
      space: function (s, c) { return { top: 40, right: 40, bottom: cap(s, c) + 26, left: 40 }; },
      draw: function (c) {
        const L = Math.round(c.cardSize * 0.13), t = Math.round(c.cardSize * 0.014);
        const x = c.cardX, y = c.cardY, w = c.cardSize;
        c.front.push(path(
          'M ' + x + ' ' + (y + L) + ' V ' + y + ' H ' + (x + L) +
          ' M ' + (x + w - L) + ' ' + y + ' H ' + (x + w) + ' V ' + (y + L) +
          ' M ' + (x + w) + ' ' + (y + w - L) + ' V ' + (y + w) + ' H ' + (x + w - L) +
          ' M ' + (x + L) + ' ' + (y + w) + ' H ' + x + ' V ' + (y + w - L),
          'none', { stroke: c.frameColor, 'stroke-width': t, 'stroke-linecap': 'square' }));
        c.front.push(text(c.capText, c.W / 2, c.cardY + c.cardSize + 22 + c.capSize * 0.74, {
          size: c.capSize, anchor: 'middle', fill: c.ink, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; s.frameColor = '#0f172a'; }
    },
    {
      id: 'brush', name: 'Brush stroke',
      space: function (s, c) { return { top: 0, right: 0, bottom: cap(s, c) + 40, left: 0 }; },
      draw: function (c) {
        const w = c.cardSize * 0.74;
        const x = c.cardX + (c.cardSize - w) / 2;
        const y = c.cardY + c.cardSize + c.capSize * 1.15;
        /* a hand-drawn underline: one stroke, tapered, slightly off level */
        c.front.push(path(
          'M ' + (x + 6) + ' ' + (y + 4) +
          ' C ' + (x + w * 0.3) + ' ' + (y - 3) + ' ' + (x + w * 0.66) + ' ' + (y + 7) + ' ' + (x + w - 6) + ' ' + (y + 1),
          'none', {
            stroke: c.frameColor,
            'stroke-width': Math.max(3, c.capSize * 0.17),
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round'
          }));
        c.front.push(text(c.capText, c.W / 2, y - c.capSize * 0.42, {
          size: c.capSize, anchor: 'middle', fill: c.ink, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; s.frameColor = '#2f56d8'; }
    },
    {
      id: 'card', name: 'Card',
      space: function (s, c) { return { top: 26, right: 26, bottom: cap(s, c) + 58, left: 26 }; },
      draw: function (c) {
        const band = c.capSize + 34;
        c.behind.push(rect(c.cardX - 26, c.cardY - 26, c.cardSize + 52, c.cardSize + 52 + band, 10, c.fill,
          { stroke: c.line, 'stroke-width': 1 }));
        c.front.push(text(c.capText, c.cardX + c.cardSize / 2, c.cardY + c.cardSize + 26 + band / 2 + c.capSize * 0.35, {
          size: c.capSize, anchor: 'middle', fill: c.onFill, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; s.frameColor = '#0f172a'; }
    },
    {
      id: 'clipboard', name: 'Clipboard',
      space: function (s, c) { return { top: 46, right: 28, bottom: cap(s, c) + 46, left: 28 }; },
      draw: function (c) {
        const band = c.capSize + 34;
        const x = c.cardX - 28, y = c.cardY - 40;
        const w = c.cardSize + 56, h = c.cardSize + 40 + band;
        c.behind.push(rect(x, y, w, h, 10, c.fill, { stroke: c.line, 'stroke-width': 1 }));
        const cw = Math.round(c.cardSize * 0.16), ch = Math.round(c.cardSize * 0.05);
        c.behind.push(rect(c.cardX + c.cardSize / 2 - cw / 2, y - ch * 0.5, cw, ch, 3, c.frameColor));
        c.front.push(text(c.capText, c.cardX + c.cardSize / 2, y + c.cardSize + 40 + band / 2 + c.capSize * 0.35, {
          size: c.capSize, anchor: 'middle', fill: c.onFill, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; s.frameColor = '#0f172a'; }
    },
    {
      id: 'phone', name: 'Phone',
      space: function (s, c) { return { top: 52, right: 30, bottom: cap(s, c) + 48, left: 30 }; },
      draw: function (c) {
        const band = c.capSize + 34;
        const x = c.cardX - 30, y = c.cardY - 52;
        const w = c.cardSize + 60, h = c.cardSize + 52 + band;
        c.behind.push(rect(x, y, w, h, Math.round(c.cardSize * 0.06), c.fill, { stroke: c.line, 'stroke-width': 1 }));
        c.behind.push(rect(c.cardX + c.cardSize / 2 - c.cardSize * 0.07, y + c.cardSize * 0.035, c.cardSize * 0.14, c.cardSize * 0.016, 3, c.onFill, { opacity: 0.45 }));
        c.front.push(text(c.capText, c.cardX + c.cardSize / 2, y + c.cardSize + 52 + band / 2 + c.capSize * 0.35, {
          size: c.capSize, anchor: 'middle', fill: c.onFill, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; }
    },
    {
      id: 'envelope', name: 'Envelope',
      space: function (s, c) { return { top: 22, right: 22, bottom: cap(s, c) + 104, left: 22 }; },
      draw: function (c) {
        const e = 22;
        const x = c.cardX - e, y = c.cardY - e;
        const w = c.cardSize + e * 2;
        const sheet = c.cardSize + e * 2 + 18;
        /* the sheet the code sits on */
        c.behind.push(path('M ' + x + ' ' + y + ' H ' + (x + w) + ' V ' + (y + sheet) + ' H ' + x + ' Z',
          c.well, { stroke: c.edge, 'stroke-width': 1 }));
        /* the open flap, folded down in front of the code */
        const fy = y + sheet;
        const d = 40;
        c.front.push(path(
          'M ' + x + ' ' + fy +
          ' L ' + (x + w / 2) + ' ' + (fy + d) +
          ' L ' + (x + w) + ' ' + fy +
          ' L ' + (x + w) + ' ' + (fy + d * 0.36) +
          ' L ' + (x + w / 2) + ' ' + (fy + d * 1.36) +
          ' L ' + x + ' ' + (fy + d * 0.36) + ' Z', c.well, { stroke: c.edge, 'stroke-width': 1 }));
        c.front.push(text(c.capText, c.cardX + c.cardSize / 2, fy + d * 1.36 + c.capSize * 1.0, {
          size: c.capSize, anchor: 'middle', fill: c.ink, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; s.frameColor = '#0f172a'; }
    },
    {
      id: 'ribbon', name: 'Ribbon',
      space: function (s, c) { return { top: Math.round(c * 0.3), right: 0, bottom: cap(s, c) + 26, left: 0 }; },
      draw: function (c) {
        const cx = c.cardX + c.cardSize / 2;
        const cy = c.cardY - c.cardSize * 0.15;
        const u = c.cardSize * 0.085;
        /* the two loops */
        c.front.push(path(
          'M ' + cx + ' ' + cy +
          ' C ' + (cx - u * 2.3) + ' ' + (cy - u * 1.7) + ' ' + (cx - u * 2.7) + ' ' + (cy + u * 1.4) + ' ' + cx + ' ' + cy + ' Z', c.frameColor));
        c.front.push(path(
          'M ' + cx + ' ' + cy +
          ' C ' + (cx + u * 2.3) + ' ' + (cy - u * 1.7) + ' ' + (cx + u * 2.7) + ' ' + (cy + u * 1.4) + ' ' + cx + ' ' + cy + ' Z', c.frameColor));
        /* the knot */
        c.front.push(el('ellipse', { cx: cx, cy: cy, rx: u * 0.66, ry: u * 0.54, fill: c.frameColor }));
        /* the two tails */
        c.front.push(path(
          'M ' + (cx - u * 0.55) + ' ' + (cy + u * 0.3) +
          ' L ' + (cx - u * 1.7) + ' ' + (cy + u * 2.3) +
          ' L ' + (cx - u * 0.2) + ' ' + (cy + u * 1.8) +
          ' L ' + (cx + u * 0.7) + ' ' + (cy + u * 2.5) +
          ' L ' + (cx + u * 0.55) + ' ' + (cy + u * 0.36) + ' Z', c.frameColor));
        c.front.push(text(c.capText, cx, c.cardY + c.cardSize + 22 + c.capSize * 0.74, {
          size: c.capSize, anchor: 'middle', fill: c.ink, weight: 600, family: FONT_DISPLAY
        }));
      },
      apply: function (s) { s.frameHead = ''; s.frameFoot = 'Scan me!'; s.frameColor = '#e11d48'; }
    }
  ];

  const byId = {};
  TEMPLATES.forEach(function (t) { byId[t.id] = t; });

  /* ---------- swatches ---------- */
  function miniQr() {
    const g = [];
    const finder = function (x, y) {
      g.push('<rect x="' + x + '" y="' + y + '" width="13" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="2.6" opacity=".32"/>');
      g.push('<rect x="' + (x + 5) + '" y="' + (y + 5) + '" width="3.4" height="3.4" rx="1" fill="currentColor" opacity=".32"/>');
    };
    finder(4, 4); finder(37, 4); finder(4, 37);
    const dots = [[22, 5], [29, 7], [22, 15], [29, 17], [21, 25], [7, 25], [13, 27], [29, 29], [21, 37], [29, 45], [35, 37], [43, 23], [49, 31], [43, 47], [35, 52], [21, 50], [49, 50], [9, 50], [17, 44]];
    dots.forEach(function (d) { g.push('<rect x="' + d[0] + '" y="' + d[1] + '" width="3.4" height="3.4" rx="1" fill="currentColor" opacity=".32"/>'); });
    return g.join('');
  }

  const SWATCHES = {
    none: '',
    caption: '<rect x="14" y="50" width="28" height="3.5" rx="1.75" fill="currentColor"/>',
    banner: '<rect x="6" y="46" width="44" height="10" rx="2" fill="currentColor"/>',
    bubble: '<path d="M13 3h30a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-9l-6 5v-5h-15a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" fill="currentColor"/>',
    ticket: '<path d="M7 18h42v4a4 4 0 0 0 0 8v3H7v-3a4 4 0 0 0 0-8z" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>',
    corners: '<path d="M7 19V7h12M37 7h12v12M49 37v12H37M19 49H7V37" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>',
    brush: '<path d="M10 42c12-5 24 4 38-2l3 7c-15 6-27-3-39 2z" fill="currentColor"/>',
    card: '<rect x="5" y="9" width="46" height="40" rx="5" fill="currentColor" opacity=".16"/><rect x="5" y="9" width="46" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="15" y="17" width="26" height="24" rx="2" fill="currentColor" opacity=".32"/>',
    clipboard: '<rect x="8" y="13" width="40" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="22" y="6" width="12" height="10" rx="2.5" fill="currentColor"/>',
    phone: '<rect x="14" y="3" width="28" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="21" y="12" width="14" height="14" rx="1" fill="currentColor" opacity=".32"/><rect x="23" y="7" width="10" height="2" rx="1" fill="currentColor" opacity=".5"/>',
    envelope: '<rect x="7" y="13" width="42" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M7 43l21-14 21 14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>',
    ribbon: '<path d="M28 20c-9-7-12 2 0 6M28 20c9-7 12 2 0 6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><circle cx="28" cy="20" r="3.6" fill="currentColor"/><path d="M26 23l-3 8 3-2 3 3 1-8z" fill="currentColor"/>'
  };

  function swatch(id) {
    const deco = SWATCHES[id] || '';
    return '<svg viewBox="0 0 56 56" focusable="false" aria-hidden="true">' +
      miniQr() + deco + '</svg>';
  }

  function apply(id, state) {
    const t = byId[id];
    if (!t) return;
    t.apply(state);
  }

  QF.frames = {
    list: TEMPLATES,
    byId: byId,
    swatch: swatch,
    apply: apply,
    cap: cap,
    head: head,
    el: el,
    text: text
  };
})(window.QF);
