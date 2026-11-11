/* =========================================================
   QRForge · types.js — content types, field schemas and payload builders
   ========================================================= */
(function (QF) {
  'use strict';

  const ICONS = {
    url: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    sms: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5.5 5.5 0 0 1 7 0"/><path d="M2 9a15 15 0 0 1 20 0"/><path d="M12 20h.01"/>',
    vcard: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M5.5 16c.7-1.7 2-2.5 3.5-2.5s2.8.8 3.5 2.5M15 9h4M15 12h4"/>',
    event: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M9 15h2M14 15h2"/>',
    location: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 12h3"/>',
    social: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5 15.4 17M15.4 7 8.6 10.5"/>',
    app: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    crypto: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5h3.2a2 2 0 0 1 0 4H9.5h4a2 2 0 0 1 0 4H9.5M9 7v10"/>',
    paypal: '<path d="M7 21 10 3h6a4 4 0 0 1 0 8H9"/><path d="M11 21h4"/>',
    product: '<path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="m3.3 7.3 8.7 5 8.7-5M12 22V12"/>',
    custom: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || ICONS.text) + '</svg>';
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s === null || s === undefined ? '' : s); }

  function ensureScheme(v) {
    const s = String(v || '').trim();
    if (!s) return '';
    if (/^(https?:|ftp:|mailto:|tel:|sms:|smsto:|geo:|wifi:|bitcoin:|ethereum:|litecoin:|dogecoin:|webcal:|market:|intent:|otpauth:|msteams:|zoommtg:|tg:|whatsapp:|viber:|skype:|data:)/i.test(s)) return s;
    if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(s)) return 'https://' + s;
    return s;
  }

  function wifiEscape(s) {
    return esc(s).replace(/([\\;,:"])/g, '\\$1');
  }

  function vcardEscape(s) {
    return esc(s).replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  }

  function toIcsDate(value, allDay) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2, '0');
    if (allDay) return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + 'T' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + 'Z';
  }

  function toLocalInput(value) {
    const d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------- social platforms ---------- */
  const SOCIALS = [
    { id: 'facebook', label: 'Facebook', template: 'https://www.facebook.com/{v}', ph: 'page.name' },
    { id: 'instagram', label: 'Instagram', template: 'https://www.instagram.com/{v}', ph: 'username' },
    { id: 'x', label: 'X (Twitter)', template: 'https://x.com/{v}', ph: 'username' },
    { id: 'linkedin', label: 'LinkedIn', template: 'https://www.linkedin.com/in/{v}', ph: 'profile-slug' },
    { id: 'youtube', label: 'YouTube', template: 'https://www.youtube.com/@{v}', ph: 'channel' },
    { id: 'tiktok', label: 'TikTok', template: 'https://www.tiktok.com/@{v}', ph: 'username' },
    { id: 'pinterest', label: 'Pinterest', template: 'https://www.pinterest.com/{v}', ph: 'username' },
    { id: 'reddit', label: 'Reddit', template: 'https://www.reddit.com/user/{v}', ph: 'username' },
    { id: 'threads', label: 'Threads', template: 'https://www.threads.net/@{v}', ph: 'username' },
    { id: 'snapchat', label: 'Snapchat', template: 'https://www.snapchat.com/add/{v}', ph: 'username' },
    { id: 'discord', label: 'Discord', template: 'https://discord.gg/{v}', ph: 'invite code' },
    { id: 'telegram', label: 'Telegram', template: 'https://t.me/{v}', ph: 'username' },
    { id: 'whatsapp', label: 'WhatsApp', template: 'https://wa.me/{v}', ph: '15551234567' },
    { id: 'spotify', label: 'Spotify', template: 'https://open.spotify.com/{v}', ph: 'artist/xyz' },
    { id: 'github', label: 'GitHub', template: 'https://github.com/{v}', ph: 'username' },
    { id: 'twitch', label: 'Twitch', template: 'https://www.twitch.tv/{v}', ph: 'channel' },
    { id: 'vimeo', label: 'Vimeo', template: 'https://vimeo.com/{v}', ph: 'username' },
    { id: 'medium', label: 'Medium', template: 'https://medium.com/@{v}', ph: 'username' },
    { id: 'soundcloud', label: 'SoundCloud', template: 'https://soundcloud.com/{v}', ph: 'username' },
    { id: 'linktree', label: 'Linktree', template: 'https://linktr.ee/{v}', ph: 'username' },
    { id: 'maps', label: 'Google Maps', template: 'https://maps.app.goo.gl/{v}', ph: 'short link' }
  ];

  const CRYPTOS = [
    { id: 'bitcoin', label: 'Bitcoin (BTC)', scheme: 'bitcoin' },
    { id: 'ethereum', label: 'Ethereum (ETH)', scheme: 'ethereum' },
    { id: 'litecoin', label: 'Litecoin (LTC)', scheme: 'litecoin' },
    { id: 'dogecoin', label: 'Dogecoin (DOGE)', scheme: 'dogecoin' },
    { id: 'btc-usdt', label: 'Tether (TRC-20)', scheme: 'bitcoin' },
    { id: 'monero', label: 'Monero (XMR)', scheme: 'monero' }
  ];

  /* =========================================================
     Type definitions
     ========================================================= */
  const TYPES = [
    {
      id: 'url', label: 'URL', group: 'basic',
      fields: [
        { key: 'url', label: 'Website address', type: 'text', placeholder: 'https://example.com', default: 'https://example.com', bulk: true }
      ],
      build: v => ensureScheme(v.url)
    },
    {
      id: 'text', label: 'Plain text', group: 'basic',
      fields: [
        { key: 'text', label: 'Text content', type: 'textarea', placeholder: 'Any message, note or snippet…', default: 'Hello world!', bulk: true }
      ],
      build: v => esc(v.text)
    },
    {
      id: 'email', label: 'Email', group: 'basic',
      fields: [
        { key: 'to', label: 'Recipient', type: 'text', placeholder: 'hello@example.com', default: 'hello@example.com', bulk: true },
        { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Subject line', default: '' },
        { key: 'body', label: 'Message body', type: 'textarea', placeholder: 'Write your email…', default: '' },
        { key: 'cc', label: 'CC', type: 'text', placeholder: 'Optional', default: '' },
        { key: 'bcc', label: 'BCC', type: 'text', placeholder: 'Optional', default: '' }
      ],
      build: v => {
        const q = [];
        if (v.subject) q.push('subject=' + encodeURIComponent(v.subject));
        if (v.body) q.push('body=' + encodeURIComponent(v.body));
        if (v.cc) q.push('cc=' + encodeURIComponent(v.cc));
        if (v.bcc) q.push('bcc=' + encodeURIComponent(v.bcc));
        return 'mailto:' + esc(v.to) + (q.length ? '?' + q.join('&') : '');
      }
    },
    {
      id: 'sms', label: 'SMS', group: 'basic',
      fields: [
        { key: 'phone', label: 'Phone number', type: 'text', placeholder: '+15551234567', default: '', bulk: true },
        { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Type your message…', default: '' }
      ],
      build: v => 'SMSTO:' + esc(v.phone) + (v.message ? ':' + esc(v.message) : '')
    },
    {
      id: 'phone', label: 'Phone call', group: 'basic',
      fields: [
        { key: 'phone', label: 'Phone number', type: 'text', placeholder: '+15551234567', default: '', bulk: true }
      ],
      build: v => 'tel:' + esc(v.phone).replace(/[^\d+]/g, '')
    },
    {
      id: 'wifi', label: 'Wi‑Fi', group: 'connect',
      fields: [
        { key: 'ssid', label: 'Network name (SSID)', type: 'text', placeholder: 'My WiFi', default: '', bulk: true },
        { key: 'password', label: 'Password', type: 'text', placeholder: '••••••••', default: '', showIf: v => v.encryption !== 'nopass' },
        { key: 'encryption', label: 'Security', type: 'select', options: [
          { value: 'WPA', label: 'WPA / WPA2 / WPA3' }, { value: 'WEP', label: 'WEP' }, { value: 'nopass', label: 'Open (no password)' }
        ], default: 'WPA' },
        { key: 'hidden', label: 'Hidden network', type: 'checkbox', default: false }
      ],
      build: v => {
        const parts = ['T:' + (v.encryption === 'nopass' ? 'nopass' : v.encryption)];
        parts.push('S:' + wifiEscape(v.ssid));
        if (v.encryption !== 'nopass' && v.password) parts.push('P:' + wifiEscape(v.password));
        if (v.hidden) parts.push('H:true');
        return 'WIFI:' + parts.join(';') + ';;';
      }
    },
    {
      id: 'vcard', label: 'Contact', group: 'connect',
      fields: [
        { key: 'firstName', label: 'First name', type: 'text', placeholder: 'Ada', default: '', half: true, bulk: true },
        { key: 'lastName', label: 'Last name', type: 'text', placeholder: 'Lovelace', default: '', half: true, bulk: true },
        { key: 'org', label: 'Company', type: 'text', placeholder: 'Analytical Engines Ltd.', default: '' },
        { key: 'title', label: 'Job title', type: 'text', placeholder: 'CTO', default: '' },
        { key: 'phone', label: 'Phone', type: 'text', placeholder: '+15551234567', default: '', half: true, bulk: true },
        { key: 'email', label: 'Email', type: 'text', placeholder: 'ada@example.com', default: '', half: true, bulk: true },
        { key: 'website', label: 'Website', type: 'text', placeholder: 'https://example.com', default: '' },
        { key: 'street', label: 'Street address', type: 'text', placeholder: '12 Baker Street', default: '' },
        { key: 'city', label: 'City', type: 'text', placeholder: 'London', default: '', half: true },
        { key: 'zip', label: 'Postcode', type: 'text', placeholder: 'NW1 6XE', default: '', half: true },
        { key: 'country', label: 'Country', type: 'text', placeholder: 'United Kingdom', default: '' },
        { key: 'note', label: 'Note', type: 'textarea', placeholder: 'Optional note', default: '' }
      ],
      build: v => {
        /* a single "First Last" value is split automatically */
        let first = String(v.firstName || '').trim();
        let last = String(v.lastName || '').trim();
        if (!last && first.indexOf(' ') > -1) {
          const parts = first.split(/\s+/);
          last = parts.pop();
          first = parts.join(' ');
        }
        const L = [];
        L.push('BEGIN:VCARD');
        L.push('VERSION:3.0');
        L.push('N:' + vcardEscape(last) + ';' + vcardEscape(first) + ';;;');
        const fn = (first + ' ' + last).trim() || (v.org || 'Contact');
        L.push('FN:' + vcardEscape(fn));
        if (v.org) L.push('ORG:' + vcardEscape(v.org));
        if (v.title) L.push('TITLE:' + vcardEscape(v.title));
        if (v.phone) L.push('TEL;TYPE=CELL,VOICE:' + vcardEscape(v.phone));
        if (v.email) L.push('EMAIL;TYPE=INTERNET:' + vcardEscape(v.email));
        if (v.website) L.push('URL:' + vcardEscape(ensureScheme(v.website)));
        const adr = [v.street, v.city, '', v.zip, v.country].filter(x => x && String(x).trim()).map(vcardEscape).join(';');
        if (adr) L.push('ADR;TYPE=WORK:;;' + adr);
        if (v.note) L.push('NOTE:' + vcardEscape(v.note));
        L.push('END:VCARD');
        return L.join('\r\n');
      }
    },
    {
      id: 'event', label: 'Event', group: 'connect',
      fields: [
        { key: 'title', label: 'Event title', type: 'text', placeholder: 'Launch party', default: '', bulk: true },
        { key: 'location', label: 'Location', type: 'text', placeholder: '123 Main St, Berlin', default: '' },
        { key: 'start', label: 'Starts', type: 'datetime-local', default: '' },
        { key: 'end', label: 'Ends', type: 'datetime-local', default: '' },
        { key: 'allDay', label: 'All-day event', type: 'checkbox', default: false },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What is happening?', default: '' },
        { key: 'repeat', label: 'Repeats', type: 'select', options: [
          { value: '', label: 'Does not repeat' },
          { value: 'DAILY', label: 'Daily' },
          { value: 'WEEKLY', label: 'Weekly' },
          { value: 'MONTHLY', label: 'Monthly' },
          { value: 'YEARLY', label: 'Yearly' }
        ], default: '' }
      ],
      build: v => {
        const L = ['BEGIN:VEVENT'];
        if (v.title) L.push('SUMMARY:' + vcardEscape(v.title));
        const s = toIcsDate(v.start, v.allDay);
        const e = toIcsDate(v.end, v.allDay);
        if (s) L.push('DTSTART' + (v.allDay ? ';VALUE=DATE' : '') + ':' + s);
        if (e) L.push('DTEND' + (v.allDay ? ';VALUE=DATE' : '') + ':' + e);
        if (v.location) L.push('LOCATION:' + vcardEscape(v.location));
        if (v.description) L.push('DESCRIPTION:' + vcardEscape(v.description));
        if (v.repeat) L.push('RRULE:FREQ=' + v.repeat);
        L.push('END:VEVENT');
        return L.join('\r\n');
      }
    },
    {
      id: 'location', label: 'Location', group: 'connect',
      fields: [
        { key: 'lat', label: 'Latitude', type: 'text', placeholder: '52.5200', default: '', half: true, bulk: true },
        { key: 'lng', label: 'Longitude', type: 'text', placeholder: '13.4050', default: '', half: true, bulk: true },
        { key: 'address', label: 'Or an address', type: 'text', placeholder: 'Brandenburg Gate, Berlin', default: '' }
      ],
      build: v => {
        const hasCoords = v.lat !== '' && v.lng !== '' && !isNaN(parseFloat(v.lat)) && !isNaN(parseFloat(v.lng));
        if (hasCoords) {
          const q = v.address ? '?q=' + encodeURIComponent(v.address) : '';
          return 'geo:' + parseFloat(v.lat) + ',' + parseFloat(v.lng) + q;
        }
        if (v.address) return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.address);
        return '';
      }
    },
    {
      id: 'pdf', label: 'PDF / doc', group: 'content',
      fields: [
        { key: 'url', label: 'Document URL', type: 'text', placeholder: 'https://example.com/brochure.pdf', default: '', bulk: true },
        { key: 'page', label: 'Open at page', type: 'number', placeholder: '1', default: '', min: 1 }
      ],
      build: v => {
        const u = ensureScheme(v.url);
        if (!u) return '';
        return v.page ? u + '#page=' + parseInt(v.page, 10) : u;
      }
    },
    {
      id: 'social', label: 'Social', group: 'content',
      fields: [
        { key: 'platform', label: 'Platform', type: 'select', options: SOCIALS.map(s => ({ value: s.id, label: s.label })).concat([{ value: 'custom', label: 'Custom URL' }]), default: 'instagram' },
        { key: 'handle', label: 'Username / link', type: 'text', placeholder: 'username', default: '', bulk: true },
        { key: 'customUrl', label: 'Custom URL', type: 'text', placeholder: 'https://example.com', default: '', showIf: v => v.platform === 'custom' }
      ],
      build: v => {
        if (v.platform === 'custom') return ensureScheme(v.customUrl);
        const s = SOCIALS.find(x => x.id === v.platform);
        if (!s) return '';
        const raw = String(v.handle || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        return s.template.replace('{v}', raw.replace(/^@/, ''));
      }
    },
    {
      id: 'app', label: 'App', group: 'content',
      fields: [
        { key: 'platform', label: 'Store', type: 'select', options: [
          { value: 'google', label: 'Google Play' }, { value: 'apple', label: 'Apple App Store' }, { value: 'custom', label: 'Custom / other' }
        ], default: 'google' },
        { key: 'packageId', label: 'Package / App ID or URL', type: 'text', placeholder: 'com.example.app', default: '', bulk: true },
        { key: 'customUrl', label: 'Custom URL', type: 'text', placeholder: 'https://example.com/app', default: '', showIf: v => v.platform === 'custom' }
      ],
      build: v => {
        const raw = String(v.packageId || '').trim();
        if (!raw) return '';
        if (v.platform === 'custom') return ensureScheme(raw || v.customUrl);
        if (v.platform === 'google') {
          if (/^https?:\/\//i.test(raw)) return raw;
          return 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(raw);
        }
        if (/^https?:\/\//i.test(raw)) return raw;
        return 'https://apps.apple.com/app/id' + raw.replace(/\D/g, '');
      }
    },
    {
      id: 'crypto', label: 'Crypto', group: 'content',
      fields: [
        { key: 'coin', label: 'Currency', type: 'select', options: CRYPTOS.map(c => ({ value: c.id, label: c.label })), default: 'bitcoin' },
        { key: 'address', label: 'Wallet address', type: 'text', placeholder: 'bc1q…', default: '', bulk: true },
        { key: 'amount', label: 'Amount (optional)', type: 'text', placeholder: '0.005', default: '' }
      ],
      build: v => {
        const c = CRYPTOS.find(x => x.id === v.coin) || CRYPTOS[0];
        const addr = String(v.address || '').trim();
        if (!addr) return '';
        const amt = String(v.amount || '').trim();
        return c.scheme + ':' + addr + (amt ? '?amount=' + encodeURIComponent(amt) : '');
      }
    },
    {
      id: 'paypal', label: 'Payment', group: 'content',
      fields: [
        { key: 'mode', label: 'Method', type: 'select', options: [
          { value: 'paypalme', label: 'PayPal.Me' }, { value: 'donate', label: 'PayPal Donate' }, { value: 'link', label: 'Payment link' }
        ], default: 'paypalme' },
        { key: 'recipient', label: 'Recipient email / URL', type: 'text', placeholder: 'pay@example.com', default: '', bulk: true },
        { key: 'amount', label: 'Amount', type: 'text', placeholder: '25.00', default: '' },
        { key: 'currency', label: 'Currency', type: 'select', options: [
          { value: 'USD', label: 'USD $' }, { value: 'EUR', label: 'EUR €' }, { value: 'GBP', label: 'GBP £' },
          { value: 'JPY', label: 'JPY ¥' }, { value: 'INR', label: 'INR ₹' }, { value: 'AUD', label: 'AUD $' }, { value: 'CAD', label: 'CAD $' }
        ], default: 'USD' },
        { key: 'item', label: 'Item name (optional)', type: 'text', placeholder: 'Order #1042', default: '' }
      ],
      build: v => {
        const rec = String(v.recipient || '').trim();
        if (!rec) return '';
        const q = [];
        if (v.amount) q.push('amount=' + encodeURIComponent(v.amount));
        if (v.currency && v.currency !== 'USD') q.push('currency_code=' + encodeURIComponent(v.currency));
        if (v.item) q.push('item_name=' + encodeURIComponent(v.item));
        const qs = q.length ? '?' + q.join('&') : '';
        if (v.mode === 'donate') return 'https://www.paypal.com/donate/' + encodeURIComponent(rec) + qs;
        if (v.mode === 'link') return ensureScheme(rec) + (qs ? (rec.indexOf('?') > -1 ? '&' : '?') + q.join('&') : '');
        return 'https://www.paypal.me/' + encodeURIComponent(rec) + qs;
      }
    },
    {
      id: 'product', label: 'Product', group: 'content',
      fields: [
        { key: 'name', label: 'Product name', type: 'text', placeholder: 'Wireless Headphones', default: '', bulk: true },
        { key: 'url', label: 'Product URL', type: 'text', placeholder: 'https://shop.example.com/p/1042', default: '' },
        { key: 'sku', label: 'SKU', type: 'text', placeholder: 'SKU-1042', default: '' },
        { key: 'price', label: 'Price', type: 'text', placeholder: '79.00', default: '' },
        { key: 'currency', label: 'Currency', type: 'select', options: [
          { value: 'USD', label: 'USD $' }, { value: 'EUR', label: 'EUR €' }, { value: 'GBP', label: 'GBP £' },
          { value: 'JPY', label: 'JPY ¥' }, { value: 'INR', label: 'INR ₹' }
        ], default: 'USD' },
        { key: 'merchant', label: 'Merchant', type: 'text', placeholder: 'Example Store', default: '' }
      ],
      build: v => {
        let out = ensureScheme(v.url);
        const q = [];
        if (v.name) q.push('name=' + encodeURIComponent(v.name));
        if (v.sku) q.push('sku=' + encodeURIComponent(v.sku));
        if (v.price) q.push('price=' + encodeURIComponent(v.price) + '&currency=' + encodeURIComponent(v.currency));
        if (v.merchant) q.push('merchant=' + encodeURIComponent(v.merchant));
        if (q.length) out += (out.indexOf('?') > -1 ? '&' : '?') + q.join('&');
        return out;
      }
    },
    {
      id: 'custom', label: 'Raw data', group: 'content',
      fields: [
        { key: 'data', label: 'Exact payload', type: 'textarea', placeholder: 'Anything you want encoded…', default: '', bulk: true }
      ],
      build: v => esc(v.data)
    }
  ];

  const byId = {};
  TYPES.forEach(t => { byId[t.id] = t; });

  function defaults(typeId) {
    const t = byId[typeId];
    const v = {};
    if (!t) return v;
    t.fields.forEach(f => { v[f.key] = f.default === undefined ? '' : f.default; });
    return v;
  }

  function build(typeId, values) {
    const t = byId[typeId];
    if (!t) return '';
    try { return t.build(values) || ''; } catch (e) { return ''; }
  }

  QF.types = { list: TYPES, byId: byId, defaults: defaults, build: build, icon: icon, socials: SOCIALS, cryptos: CRYPTOS, ensureScheme: ensureScheme };
})(window.QF);
