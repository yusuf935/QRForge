# QRForge — Advanced QR Code Generator

A complete, **100 % client-side** QR code generator with deep customisation: 16 content
types, every module shape, gradients, logos, background images, decorative frames,
bulk CSV → ZIP generation, a built-in scanner and shareable design links.

Nothing you type ever leaves the browser.

![No backend](https://img.shields.io/badge/backend-none-22c55e) ![License](https://img.shields.io/badge/license-GPL--3.0-6366f1) ![Dependencies](https://img.shields.io/badge/dependencies-zero-22c55e)

---

## Quick start

### XAMPP / Apache
Copy this folder into `C:\xampp\htdocs\` as `QRForge` and open:

```
http://localhost/QRForge/
```

### Any static server
```bash
node dev-server.js        # → http://localhost:8080
# or
python -m http.server 8080
```

The site is plain HTML/CSS/JS — no build step, no dependencies to install.

---

## Features

### Content types (16)
| | | |
|---|---|---|
| URL | Plain text | Email |
| SMS | Phone call | Wi‑Fi |
| Contact (vCard 3.0) | Event (iCalendar) | Location (geo:) |
| PDF document | Social network | Mobile app |
| Crypto wallet | Payment (PayPal) | Product / SKU |
| Raw payload | | |

Each type has a purpose-built payload builder that escapes correctly
(`WIFI:T:WPA;S:Cafe\;Guest;…`, `BEGIN:VCARD` with CRLF line endings, iCalendar
`DTSTART`/`RRULE`, `mailto:` query encoding, `geo:` coordinates, `bitcoin:` URIs …).

### Design
- **12 style presets** (Classic, Neon, Sunset, Ocean, Forest, Terminal, Corporate …)
- **6 module shapes** — square, rounded, dots, classy, classy-rounded, extra-rounded
- **6 finder-pattern shapes**, each with an independent colour
- **Gradients** — linear or radial, any rotation, two stops
- **Solid or transparent background**, corner roundness, square / rounded / circular cards
- **Error correction** L/M/Q/H, quiet zone 0–10 modules, 128–2048 px
- **Randomise** button for instant inspiration
- **Scan-safety checker** that warns about low contrast, tiny quiet zones and
  logos that are too big for the chosen error-correction level

### Media
- **Logo** upload (PNG / JPG / SVG / WEBP / GIF) with size, margin, module-hiding and
  square / rounded / circular logo shapes. The margin starts at 0 and scales the logo
  down inside the area cleared for it, so the logo keeps its own proportions at any
  value
- **Background image** with opacity and cover / contain / stretch fitting

### Frames
Twelve **frame templates**, each a whole treatment around the code rather than a
border style: no frame, caption, banner, speech bubble, ticket, corner brackets,
brush stroke, card, clipboard, phone, envelope and ribbon. Picking one sets the
caption, the fill and the accent for you; the caption above and below, the
colours, the corner radius and the font stay editable.

The caption scales with the code, so a frame looks the same proportioned at
128 px and at 2048 px, and it is set in the display face so it reads as a caption
rather than a label.

Each template draws itself either **behind** the code or **in front** of it, and
the card itself stays a true quiet zone, so the code is never covered.

### Export
- **PNG · SVG · JPG · WEBP**
- 1×–4× export scale, quality slider for raster formats, custom file name
- Copy image to clipboard, copy payload, print, save to history
- **Shareable design links** — the whole configuration is Base64-encoded into the
  URL fragment, so a design can be shared without a server

### Bulk generation
Upload a CSV, pick the QR type, and map your columns to the payload fields
(auto-guessed from the header names). Every row is rendered with the current design
and delivered as a single **ZIP**.

### Scanner
- Upload any image and decode the QR code inside it (`jsQR`)
- Live camera scanning (`html5-qrcode`, needs HTTPS or `localhost`)
- Results are classified (Wi‑Fi, vCard, event, link, crypto …) and can be pushed
  straight back into the generator
- A captioned code can defeat a strict decoder on the first pass, so the scanner
  retries on trimmed and inverted copies of the image — it reads the framed codes
  the tool generates

---

## Design system

The interface is built on one system, defined entirely by tokens in
`assets/css/tokens.css`. Every colour, size and duration comes from there, so
there are no colour literals in the component stylesheet.

| | |
|---|---|
| **Paper** | cool near-white `oklch(98.6% 0.005 250)`, ruled with 1 px hairlines |
| **Ink** | blue-grey `oklch(21% 0.028 262)`; every neutral tinted, never a pure absolute |
| **Signal** | one electric cobalt `oklch(52% 0.19 258)`, under 5 % of the screen |
| **Type** | Familjen Grotesk for the wordmark and section titles, IBM Plex Sans for everything else, JetBrains Mono for machine values and code |
| **Controls** | keycaps with a real 3 px bottom edge that lifts on hover and sinks on press; options sit as keys on a sunken paper tray, the chosen one pressed |
| **Surfaces** | one containment layer, cut corners on two opposite sides, depth by paper step and hairline, never a card inside a card |
| **Signature** | the mark on **its own ground**, with the payload set below it in mono on a graphite strip |
| **Dark mode** | a second, re-derived rendering of the same tokens, not an inversion |

Every text pairing was checked numerically in both modes (the worst body pairing is
4.86:1 against a 4.5:1 target). The three families are self-hosted in `assets/fonts/`,
so the interface renders identically with no network.

### The end-to-end test

With the dev server running on port 8080:

```bash
npm i puppeteer-core
node tests/e2e.js
```

41 checks: the mark scans back through `jsQR`, every tab opens, every content type
builds a payload, the view and the open panel live in the URL, all four export
formats produce a file, the CSV becomes a ZIP, the scanner reads a framed code and
hands it to the generator, history saves, the colour mode toggles, the Media sliders
behave, reset returns the design to its defaults in the **render** as well as the
state without losing your content, the spec dropdown opens and closes, every frame
template renders without clipping its caption and stays readable, and the console
stays clean.

---

## Project layout

```
QRForge/
├── index.html              markup for every view
├── dev-server.js           optional zero-dependency static server
├── tests/e2e.js            41-check end-to-end suite (needs puppeteer-core)
└── assets/
    ├── css/
    │   ├── fonts.css       @font-face for the three self-hosted families
    │   ├── tokens.css      every colour, size and duration, light and dark
    │   ├── base.css        the shared resets and browser surfaces
    │   └── style.css       the app itself
    ├── fonts/              seven woff2 files, latin subset, no network needed
    ├── js/
    │   ├── utils.js        DOM helpers, storage, CSV parser, colour maths
    │   ├── types.js        content-type schemas + payload builders
    │   ├── presets.js      style presets and shape swatches
    │   ├── frames.js       the twelve frame templates and their geometry
    │   ├── render.js       QR rendering, SVG composition, export pipeline
    │   ├── history.js      localStorage history
    │   ├── app.js          main controller (generator)
    │   ├── bulk.js         CSV → ZIP pipeline
    │   └── scanner.js      image + camera decoding
    └── vendor/             pinned third-party libraries
        ├── qr-code-styling.umd.js   1.9.2
        ├── jsQR.js                  1.4.0
        ├── jszip.min.js             3.10.1
        └── html5-qrcode.min.js      2.3.8
```

### How the rendering works

1. The payload is encoded by `qr-code-styling` into an **SVG** at an exact
   module-grid resolution, so the quiet zone is a true number of modules and
   adjacent modules share pixel-perfect edges.
2. `render.js` composes that SVG into a larger scene — card background, background
   image, logo clipping, decorative frame, captions.
3. Exports rasterise the composed SVG through a canvas (PNG/JPG/WEBP) or ship the
   vector directly (SVG).

Because every export scale is an integer and the QR box is placed on whole pixels,
the module grid always lands on whole pixels — no seams and no blurring, at any size.

### Routing

The view and the open settings panel live in the URL, so a design link carries both:

```
#/generator/design          the generator, the design panel
#/bulk                      the bulk view
#/generator/content?d=BASE64  a shared design
```

---

## Browser support

Chrome, Edge, Firefox and Safari (desktop and mobile). The camera scanner needs a
secure context (`https://` or `localhost`); everything else works from `file://`.

## Licence

GNU General Public License v3.0 — see [LICENSE](LICENSE).

The pinned libraries under `assets/vendor/` carry their own licences: `qr-code-styling`
and `jsQR` are MIT, `JSZip` is dual-licensed MIT/GPL, `html5-qrcode` is Apache-2.0.
The three typefaces in `assets/fonts/` are licensed for use and redistribution: IBM Plex
Sans and JetBrains Mono under the SIL Open Font License, Familjen Grotesk under the
SIL Open Font License.
