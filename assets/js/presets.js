/* =========================================================
   QRForge · presets.js — style presets & module-shape swatches
   ========================================================= */
(function (QF) {
  'use strict';

  /* ---------- Module shape swatches ---------- */
  const DOT_TYPES = [
    { id: 'square', label: 'Square' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'dots', label: 'Dots' },
    { id: 'classy', label: 'Classy' },
    { id: 'classy-rounded', label: 'Classy rounded' },
    { id: 'extra-rounded', label: 'Extra rounded' }
  ];

  const CORNER_TYPES = [
    { id: 'square', label: 'Square' },
    { id: 'dot', label: 'Dot' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'extra-rounded', label: 'Extra rounded' },
    { id: 'classy', label: 'Classy' },
    { id: 'classy-rounded', label: 'Classy rounded' }
  ];

  /* Small 3x3-ish preview of each module shape */
  function dotSwatch(type) {
    const c = 'currentColor';
    const g = [];
    const m = 4;              // module size
    const gap = 1.5;
    const cell = m + gap;
    const offsets = [[0, 0], [cell, 0], [0, cell], [cell, cell], [cell * 2, 0], [cell * 2, cell * 2]];
    offsets.forEach(function (o) {
      const x = 2 + o[0], y = 2 + o[1];
      switch (type) {
        case 'dots':
          g.push('<circle cx="' + (x + m / 2) + '" cy="' + (y + m / 2) + '" r="' + (m / 2) + '" fill="' + c + '"/>');
          break;
        case 'rounded':
          g.push('<rect x="' + x + '" y="' + y + '" width="' + m + '" height="' + m + '" rx="1.4" fill="' + c + '"/>');
          break;
        case 'classy':
          g.push('<rect x="' + x + '" y="' + y + '" width="' + m + '" height="' + m + '" fill="' + c + '"/>');
          break;
        case 'classy-rounded':
          g.push('<rect x="' + x + '" y="' + y + '" width="' + m + '" height="' + m + '" rx="1.4" fill="' + c + '"/>');
          g.push('<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="' + (m - 2) + '" height="' + (m - 2) + '" rx="1" fill="none" stroke="#00000055" stroke-width=".7"/>');
          break;
        case 'extra-rounded':
          g.push('<rect x="' + x + '" y="' + y + '" width="' + m + '" height="' + m + '" rx="' + (m / 2) + '" fill="' + c + '"/>');
          break;
        default:
          g.push('<rect x="' + x + '" y="' + y + '" width="' + m + '" height="' + m + '" fill="' + c + '"/>');
      }
    });
    return '<svg viewBox="0 0 20 20">' + g.join('') + '</svg>';
  }

  function cornerSwatch(type) {
    const c = 'currentColor';
    let outer = '';
    switch (type) {
      case 'dot':
      case 'dots':
        outer = '<circle cx="7" cy="7" r="6" fill="' + c + '"/>';
        break;
      case 'rounded':
        outer = '<rect x="1" y="1" width="12" height="12" rx="3.5" fill="' + c + '"/>';
        break;
      case 'extra-rounded':
        outer = '<rect x="1" y="1" width="12" height="12" rx="6" fill="' + c + '"/>';
        break;
      case 'classy':
        outer = '<path d="M1 1h12v4H5v8H1z" fill="' + c + '"/>';
        break;
      case 'classy-rounded':
        outer = '<path d="M1 1h12v5a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3z" fill="' + c + '"/>';
        break;
      default:
        outer = '<rect x="1" y="1" width="12" height="12" fill="' + c + '"/>';
    }
    let inner = '<circle cx="7" cy="7" r="2.6" fill="#fff"/>';
    if (type === 'dot') inner = '<circle cx="7" cy="7" r="2.8" fill="#fff"/>';
    return '<svg viewBox="0 0 14 14">' + outer + inner + '</svg>';
  }

  /* ---------- Style presets ---------- */
  const PRESETS = [
    {
      id: 'classic', name: 'Classic',
      dot: '#0f172a', dot2: '#0f172a', bg: '#ffffff', gradient: false,
      dotType: 'square', cornerSquareType: 'square', cornerDotType: 'square', ec: 'Q'
    },
    {
      id: 'soft', name: 'Soft',
      dot: '#1f2937', dot2: '#1f2937', bg: '#fdf4ff', gradient: false,
      dotType: 'rounded', cornerSquareType: 'rounded', cornerDotType: 'dot', ec: 'Q'
    },
    {
      id: 'neon', name: 'Neon',
      dot: '#22d3ee', dot2: '#a855f7', bg: '#0b0f1a', gradient: true,
      dotType: 'dots', cornerSquareType: 'extra-rounded', cornerDotType: 'dot', ec: 'H'
    },
    {
      id: 'sunset', name: 'Sunset',
      dot: '#f97316', dot2: '#ec4899', bg: '#fff7ed', gradient: true,
      dotType: 'rounded', cornerSquareType: 'rounded', cornerDotType: 'dot', ec: 'Q'
    },
    {
      id: 'ocean', name: 'Ocean',
      dot: '#0ea5e9', dot2: '#6366f1', bg: '#f0f9ff', gradient: true,
      dotType: 'extra-rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot', ec: 'Q'
    },
    {
      id: 'forest', name: 'Forest',
      dot: '#059669', dot2: '#84cc16', bg: '#f0fdf4', gradient: true,
      dotType: 'classy-rounded', cornerSquareType: 'classy', cornerDotType: 'dot', ec: 'H'
    },
    {
      id: 'mono', name: 'Mono',
      dot: '#000000', dot2: '#000000', bg: '#ffffff', gradient: false,
      dotType: 'extra-rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot', ec: 'M'
    },
    {
      id: 'pastel', name: 'Pastel',
      dot: '#a78bfa', dot2: '#f9a8d4', bg: '#fdf4ff', gradient: true,
      dotType: 'dots', cornerSquareType: 'dot', cornerDotType: 'dot', ec: 'Q'
    },
    {
      id: 'terminal', name: 'Terminal',
      dot: '#22c55e', dot2: '#22c55e', bg: '#04140b', gradient: false,
      dotType: 'square', cornerSquareType: 'square', cornerDotType: 'square', ec: 'H'
    },
    {
      id: 'corporate', name: 'Corporate',
      dot: '#1e40af', dot2: '#0891b2', bg: '#ffffff', gradient: true,
      dotType: 'rounded', cornerSquareType: 'rounded', cornerDotType: 'square', ec: 'H'
    },
    {
      id: 'rose', name: 'Rose',
      dot: '#e11d48', dot2: '#fb7185', bg: '#fff1f2', gradient: true,
      dotType: 'classy', cornerSquareType: 'classy-rounded', cornerDotType: 'dot', ec: 'Q'
    },
    {
      id: 'midnight', name: 'Midnight',
      dot: '#e2e8f0', dot2: '#94a3b8', bg: '#0f172a', gradient: true,
      dotType: 'rounded', cornerSquareType: 'rounded', cornerDotType: 'dot', ec: 'H'
    }
  ];

  /* ---------- Frame styles ---------- */
  const FRAME_STYLES = [
    { id: 'box', label: 'Box' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'circle', label: 'Circle' },
    { id: 'tag', label: 'Tag' }
  ];

  function presetPreview(p) {
    const bg = p.bg;
    const c1 = p.dot;
    const c2 = p.gradient ? p.dot2 : p.dot;
    const mods = [];
    const pattern = [
      1, 1, 1, 0, 1, 1, 1,
      1, 0, 1, 0, 1, 0, 1,
      1, 1, 1, 0, 1, 1, 1,
      0, 0, 0, 1, 0, 0, 0,
      1, 1, 1, 0, 1, 1, 1,
      1, 0, 1, 1, 1, 0, 1,
      1, 1, 1, 0, 1, 1, 1
    ];
    const cell = 40 / 7;
    pattern.forEach(function (on, i) {
      if (!on) return;
      const x = (i % 7) * cell, y = Math.floor(i / 7) * cell;
      const fill = (i % 3 === 0) ? c1 : (p.gradient ? c2 : c1);
      let shape;
      if (p.dotType === 'dots') shape = '<circle cx="' + (x + cell / 2) + '" cy="' + (y + cell / 2) + '" r="' + (cell / 2.15) + '" fill="' + fill + '"/>';
      else if (p.dotType === 'rounded') shape = '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="' + (cell / 3.4) + '" fill="' + fill + '"/>';
      else if (p.dotType === 'extra-rounded') shape = '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="' + (cell / 2) + '" fill="' + fill + '"/>';
      else if (p.dotType === 'classy' || p.dotType === 'classy-rounded') shape = '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="' + (p.dotType === 'classy-rounded' ? cell / 3 : 0) + '" fill="' + fill + '"/>';
      else shape = '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" fill="' + fill + '"/>';
      mods.push(shape);
    });
    return '<svg class="preset-preview" viewBox="0 0 40 40" style="background:' + bg + '">' + mods.join('') + '</svg>';
  }

  QF.presets = {
    list: PRESETS,
    dotTypes: DOT_TYPES,
    cornerTypes: CORNER_TYPES,
    frameStyles: FRAME_STYLES,
    dotSwatch: dotSwatch,
    cornerSwatch: cornerSwatch,
    presetPreview: presetPreview
  };
})(window.QF);
