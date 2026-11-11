/* =========================================================
   QRForge · render.js — QR rendering, composition and export
   ------------------------------------------------------------
   Pipeline:
     payload -> QRCodeStyling (SVG)  ->  composed SVG  ->  PNG/JPG/WEBP/SVG
   The QR is rendered at an exact module-grid resolution so that
   the exported bitmap has crisp, seam-free modules.
   ========================================================= */
(function (QF) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const XLINK = 'http://www.w3.org/1999/xlink';

  /* ---------- byte-mode data capacity per version (L,M,Q,H) ---------- */
  const BYTE_CAPACITY = [
    17, 14, 11, 7, 32, 26, 20, 14, 53, 42, 32, 24, 78, 62, 46, 34,
    106, 84, 60, 44, 134, 106, 74, 58, 154, 122, 86, 64, 192, 152, 108, 84,
    230, 180, 130, 98, 271, 213, 151, 119, 321, 251, 177, 137, 367, 287, 203, 155,
    425, 331, 241, 177, 458, 362, 258, 194, 520, 412, 292, 220, 586, 450, 322, 250,
    644, 504, 364, 280, 718, 560, 394, 310, 792, 624, 442, 338, 858, 666, 482, 382,
    929, 711, 509, 403, 1003, 779, 565, 439, 1091, 857, 611, 461, 1171, 911, 661, 511,
    1273, 997, 715, 535, 1367, 1059, 751, 593, 1465, 1125, 805, 625, 1528, 1190, 868, 658,
    1628, 1264, 929, 698, 1732, 1370, 1003, 742, 1840, 1452, 1061, 790, 1952, 1538, 1120, 835,
    2068, 1628, 1204, 893, 2188, 1722, 1283, 958, 2303, 1809, 1351, 1016, 2431, 1911, 1423, 1076,
    2566, 1989, 1499, 1120, 2701, 2099, 1579, 1190, 2812, 2213, 1664, 1267, 2956, 2331, 1725, 1373
  ];
  const EC_INDEX = { L: 0, M: 1, Q: 2, H: 3 };

  function estimate(payload, ec) {
    const bytes = QF.util.byteLength(payload);
    const idx = EC_INDEX[ec] === undefined ? 2 : EC_INDEX[ec];
    let version = 0;
    for (let v = 1; v <= 40; v++) {
      if (bytes <= BYTE_CAPACITY[(v - 1) * 4 + idx]) { version = v; break; }
    }
    if (!version) version = 40;
    const capacity = BYTE_CAPACITY[(version - 1) * 4 + idx];
    return {
      bytes: bytes,
      version: version,
      capacity: capacity,
      modules: 17 + 4 * version,
      percent: Math.min(100, Math.round((bytes / capacity) * 100))
    };
  }

  /**
   * Works out how the QR fits inside the card.
   *
   * The module grid is always rendered at an exact integer module size so that
   * neighbouring modules share pixel-perfect edges in every export. When the
   * requested size is too small for the payload the quiet zone is reduced
   * first, and only then is the card allowed to grow — a QR that is too small
   * to scan would be pointless.
   */
  function computeSizing(state, modules) {
    const cardOuter = Math.max(24, state.size);
    const circular = state.cardShape === 'circle';
    const gridLimit = circular ? cardOuter / Math.SQRT2 : cardOuter;

    let q = Math.max(0, Math.round(state.margin));
    let per = modules + 2 * q;
    let K = Math.floor(gridLimit / per);

    while (K < 1 && q > 0) {
      q -= 1;
      per = modules + 2 * q;
      K = Math.floor(gridLimit / per);
    }
    if (K < 1) K = 1;

    const renderSize = K * per;
    const gridSize = modules * K;
    const quiet = q * K;

    let cardSize = Math.max(cardOuter, gridSize + 2 * quiet);
    if (circular) cardSize = Math.max(cardSize, (gridSize + 2 * quiet) * Math.SQRT2);

    return { q: q, K: K, renderSize: renderSize, gridSize: gridSize, quiet: quiet, cardSize: cardSize, modules: modules };
  }

  /* ---------- option building ---------- */
  function gradientOf(state) {
    return {
      type: state.gradType,
      rotation: state.gradRotation,
      colorStops: [
        { offset: 0, color: state.gradColor1 },
        { offset: 1, color: state.gradColor2 }
      ]
    };
  }

  /**
   * Builds the complete option set for the library.
   *
   * Every key is always present, even when it is cleared with null. The library
   * merges each update into the previous options rather than replacing them, so
   * an omitted key keeps its old value: leave out `gradient` and a preset's
   * gradient would survive a reset, leave out `image` and a removed logo would
   * stay in the code.
   */
  function buildOptions(state, data, sizing) {
    const ecFactor = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 }[state.ec] || 0.25;
    const p = state.logoSize / 100;

    const opts = {
      type: 'svg',
      shape: 'square',
      width: sizing.renderSize,
      height: sizing.renderSize,
      margin: sizing.quiet,
      data: data,
      qrOptions: { typeNumber: 0, errorCorrectionLevel: state.ec },
      dotsOptions: {
        type: state.dotType,
        color: state.dotColor,
        gradient: state.dotGradient ? gradientOf(state) : null,
        roundSize: true
      },
      cornersSquareOptions: {
        type: state.cornerSquareType,
        color: state.cornersFollow ? state.dotColor : state.cornerSquareColor,
        gradient: null
      },
      cornersDotOptions: {
        type: state.cornerDotType,
        color: state.cornersFollow ? state.dotColor : state.cornerDotColor,
        gradient: null
      },
      backgroundOptions: { color: 'transparent', round: 0, gradient: null },
      image: state.logo || null,
      imageOptions: {
        hideBackgroundDots: state.logoHideDots,
        imageSize: state.logo ? (p * p) / ecFactor : 0.4,
        /* the library's margin is in pixels and shrinks the image from its
           hidden region, so it is left at zero; the margin the user sets is
           applied as a scale on the image itself when the scene is composed. */
        margin: 0,
        crossOrigin: undefined,
        saveAsBlob: true
      }
    };

    return opts;
  }

  /* ---------- SVG helpers ---------- */
  function svgEl(name, attrs) {
    const e = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      e.setAttribute(k, attrs[k]);
    }
    return e;
  }

  function roundedRectPath(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    return 'M ' + (x + r) + ' ' + y +
      ' H ' + (x + w - r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) +
      ' V ' + (y + h - r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) +
      ' H ' + (x + r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) +
      ' V ' + (y + r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + ' Z';
  }

  function tagPath(x, y, w, h, cut) {
    cut = Math.max(0, Math.min(cut, Math.min(w, h) * 0.5));
    return 'M ' + x + ' ' + y +
      ' H ' + (x + w) + ' V ' + (y + h - cut) +
      ' L ' + (x + w - cut) + ' ' + (y + h) +
      ' H ' + x + ' Z';
  }

  /* ---------- composition ---------- */
  /**
   * Lays the QR card out and merges it with the decorative frame.
   * @param {SVGElement} innerSvg  the QR library output
   * @param {object} state         generator state
   * @param {object} layout        { modules, moduleSize, gridSize, cardSize, ... }
   */
  function compose(innerSvg, state, layout) {
    const q = QF.util;
    const sizing = layout.sizing;

    const cardSize = sizing.cardSize;
    const template = (QF.frames && QF.frames.byId[state.frameTemplate]) || (QF.frames && QF.frames.byId.none);
    const space = template ? template.space(state, cardSize) : { top: 0, right: 0, bottom: 0, left: 0 };

    const gridSize = sizing.gridSize;
    const renderSize = sizing.renderSize;

    const W = cardSize + space.left + space.right;
    const H = cardSize + space.top + space.bottom;

    const cardX = space.left;
    const cardY = space.top;

    /* --- outer svg --- */
    const outer = svgEl('svg', {
      'xmlns': NS, 'xmlns:xlink': XLINK,
      viewBox: '0 0 ' + W + ' ' + H,
      width: W, height: H,
      'shape-rendering': 'geometricPrecision'
    });
    const defs = svgEl('defs');
    outer.appendChild(defs);

    const frameRadius = Math.min(state.frameRadius, Math.min(W, H) / 2);

    /* --- card background --- */
    const cardFill = state.bgTransparent ? 'transparent' : state.bgColor;
    const roundPx = Math.round((state.bgRound / 100) * cardSize);
    let cardShapeEl;
    if (state.cardShape === 'circle') {
      cardShapeEl = svgEl('circle', { cx: cardSize / 2, cy: cardSize / 2, r: cardSize / 2, fill: cardFill });
    } else {
      cardShapeEl = svgEl('rect', {
        x: 0, y: 0, width: cardSize, height: cardSize,
        rx: roundPx, ry: roundPx, fill: cardFill
      });
    }
    const cardGroup = svgEl('g', { transform: 'translate(' + cardX + ',' + cardY + ')' });
    cardGroup.appendChild(cardShapeEl);

    /* the template's decoration: some of it sits behind the code */
    const behind = [], front = [];
    if (template && template.draw) {
      const fill = state.frameBgTransparent ? 'transparent' : state.frameBgColor;
      template.draw({
        outer: outer,
        defs: defs,
        behind: behind,
        front: front,
        cardX: cardX, cardY: cardY, cardSize: cardSize,
        W: W, H: H,
        state: state,
        fill: fill,
        onFill: q.readableOn(state.frameBgColor),
        ink: q.tokenColor('--color-ink'),
        paper: q.tokenColor('--color-paper'),
        well: q.tokenColor('--color-paper-2'),
        edge: q.tokenColor('--color-rule-2'),
        line: q.tokenColor('--color-rule-2'),
        stroke: q.tokenColor('--color-rule-2'),
        frameColor: state.frameColor,
        frameRadius: frameRadius,
        capText: state.frameFoot,
        headText: state.frameHead,
        capSize: QF.frames.cap(state, cardSize),
        headSize: Math.max(12, Math.round((state.frameHeadSize || 28) * (cardSize / 512))),
        fontFamily: state.frameFont === 'system'
          ? 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
          : state.frameFont
      });
    }
    behind.forEach(function (n) { outer.appendChild(n); });

    /* --- background image (clipped to the card) --- */
    if (state.bgImage) {
      const clipId = 'qf-bgclip-' + q.uid('c');
      const cp = svgEl('clipPath', { id: clipId });
      const inner = state.cardShape === 'circle'
        ? svgEl('circle', { cx: cardSize / 2, cy: cardSize / 2, r: cardSize / 2 })
        : svgEl('rect', { x: 0, y: 0, width: cardSize, height: cardSize, rx: roundPx, ry: roundPx });
      cp.appendChild(inner);
      defs.appendChild(cp);

      let img;
      if (state.bgImageFit === 'stretch') {
        img = svgEl('image', { x: 0, y: 0, width: cardSize, height: cardSize, preserveAspectRatio: 'none' });
      } else if (state.bgImageFit === 'contain') {
        img = svgEl('image', { x: 0, y: 0, width: cardSize, height: cardSize, preserveAspectRatio: 'xMidYMid meet' });
      } else {
        img = svgEl('image', { x: 0, y: 0, width: cardSize, height: cardSize, preserveAspectRatio: 'xMidYMid slice' });
      }
      img.setAttribute('href', state.bgImage);
      img.setAttribute('xlink:href', state.bgImage);
      img.setAttribute('opacity', String(state.bgImageOpacity / 100));
      img.setAttribute('clip-path', 'url(#' + clipId + ')');
      cardGroup.appendChild(img);
    }

    /* --- the QR itself ---
       The offset is rounded to a whole unit so every module edge stays on a
       pixel boundary at any integer export scale — that keeps the modules
       crisp instead of anti-aliased into grey mush. The group lives inside the
       card group, so the offset is relative to the card. */
    const qrOffsetX = Math.round((cardSize - renderSize) / 2);
    const qrOffsetY = Math.round((cardSize - renderSize) / 2);
    const qrGroup = svgEl('g', { transform: 'translate(' + qrOffsetX + ',' + qrOffsetY + ')' });

    const innerDoc = innerSvg.ownerDocument || document;
    Array.prototype.slice.call(innerSvg.childNodes).forEach(function (node) {
      qrGroup.appendChild(innerDoc.importNode(node, true));
    });

    /* --- logo shape and margin --- */
    if (state.logo) {
      const imgEl = qrGroup.querySelector('image');
      if (imgEl) {
        const rawW = imgEl.getAttribute('width') || '0';
        const rawH = imgEl.getAttribute('height') || '0';
        const unit = /px$/.test(rawW) ? 'px' : '';
        let ix = parseFloat(imgEl.getAttribute('x')) || 0;
        let iy = parseFloat(imgEl.getAttribute('y')) || 0;
        let iw = parseFloat(rawW) || 0;
        let ih = parseFloat(rawH) || 0;

        /* the margin scales the logo down inside the area cleared for it, so the
           cleared modules stay put and the logo keeps its own proportions */
        const scale = Math.max(0.1, 1 - (state.logoMargin / 100) * 0.8);
        if (scale < 1 && iw > 0 && ih > 0) {
          const nw = iw * scale, nh = ih * scale;
          ix = ix + (iw - nw) / 2;
          iy = iy + (ih - nh) / 2;
          iw = nw; ih = nh;
          imgEl.setAttribute('x', String(ix));
          imgEl.setAttribute('y', String(iy));
          imgEl.setAttribute('width', iw + unit);
          imgEl.setAttribute('height', ih + unit);
        }

        if (state.logoShape && state.logoShape !== 'none') {
          const clipId = 'qf-logoclip-' + q.uid('l');
          const cp = svgEl('clipPath', { id: clipId });
          if (state.logoShape === 'circle') {
            cp.appendChild(svgEl('circle', { cx: ix + iw / 2, cy: iy + ih / 2, r: Math.min(iw, ih) / 2 }));
          } else {
            cp.appendChild(svgEl('rect', { x: ix, y: iy, width: iw, height: ih, rx: Math.min(iw, ih) * 0.14, ry: Math.min(iw, ih) * 0.14 }));
          }
          defs.appendChild(cp);
          imgEl.setAttribute('clip-path', 'url(#' + clipId + ')');
        }
      }
    }

    cardGroup.appendChild(qrGroup);
    outer.appendChild(cardGroup);

    front.forEach(function (n) { outer.appendChild(n); });

    return {
      svg: outer,
      width: W,
      height: H,
      modules: layout.modules,
      moduleSize: sizing.K,
      gridSize: gridSize
    };
  }

  /* ---------- rasterisation ---------- */
  function serialize(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('xmlns:xlink', XLINK);
    return new XMLSerializer().serializeToString(clone);
  }

  function svgToCanvas(svg, pixelWidth, pixelHeight, backgroundColor) {
    return new Promise(function (resolve, reject) {
      const markup = serialize(svg);
      const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(pixelWidth));
        canvas.height = Math.max(1, Math.round(pixelHeight));
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (backgroundColor) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not rasterise the QR code'));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        blob ? resolve(blob) : reject(new Error('Could not encode the image'));
      }, type, quality);
    });
  }

  /* ---------- public API ---------- */
  let instance = null;
  let instanceData = null;

  function ensureInstance() {
    if (!instance) {
      instance = new window.QRCodeStyling({ type: 'svg', width: 320, height: 320, data: ' ' });
      instanceData = ' ';
    }
    return instance;
  }

  /**
   * Renders the QR for the given state and returns the composed SVG.
   */
  async function render(state, payload) {
    const data = payload === undefined || payload === null ? '' : String(payload);
    const est = estimate(data, state.ec);

    let sizing = computeSizing(state, est.modules);
    const qr = ensureInstance();
    qr.update(buildOptions(state, data, sizing));

    /* read the real module count when the library exposes it */
    let modules = est.modules;
    try {
      if (qr._qr && typeof qr._qr.getModuleCount === 'function') {
        modules = qr._qr.getModuleCount();
      }
    } catch (e) { /* fall back to the estimate */ }

    if (modules !== est.modules) {
      /* the library picked a more compact mode — re-render at the right size */
      sizing = computeSizing(state, modules);
      qr.update(buildOptions(state, data, sizing));
    }

    const blob = await qr.getRawData('svg');
    const text = await blob.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const innerSvg = doc.documentElement;

    const composed = compose(innerSvg, state, { modules: modules, sizing: sizing });
    composed.estimate = est;
    composed.payload = data;
    return composed;
  }

  /**
   * Exports the composed QR.
   * @returns {Promise<Blob>}
   */
  async function exportBlob(state, format, scale, quality, composed) {
    const s = Math.max(1, Math.round(scale || 1));
    const svg = composed ? composed.svg : (await render(state, state.__payload)).svg;

    if (format === 'svg') {
      const clone = svg.cloneNode(true);
      clone.setAttribute('width', String(Math.round(composed ? composed.width : 0)));
      clone.setAttribute('height', String(Math.round(composed ? composed.height : 0)));
      const markup = '<?xml version="1.0" encoding="UTF-8"?>\n' + serialize(clone);
      return new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    }

    const pxW = Math.round((composed ? composed.width : 0) * s);
    const pxH = Math.round((composed ? composed.height : 0) * s);
    const bg = (state.bgTransparent && !state.bgImage) ? null : (state.bgTransparent ? null : state.bgColor);
    const canvas = await svgToCanvas(svg, pxW, pxH, bg);
    const type = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    return canvasToBlob(canvas, type, type === 'image/png' ? undefined : (quality === undefined ? 0.92 : quality));
  }

  QF.render = {
    estimate: estimate,
    render: render,
    exportBlob: exportBlob,
    compose: compose,
    serialize: serialize,
    svgToCanvas: svgToCanvas,
    buildOptions: buildOptions
  };
})(window.QF);
