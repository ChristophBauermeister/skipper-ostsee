/* SKIPPER_SHARE (F3) – share the passage plan and the last known position with a contact ashore, "expected by" time,
   local reminder and prepared messages when overdue. Stand-alone: no core file, no framework, no network.

   Nothing leaves the device unless the user taps a send button. There is no server: this module cannot alert anyone
   when the phone is off, flat, or out of coverage. That limit is shown in the UI and belongs there.

   SKIPPER_SHARE.mount(el, opts) -> api {refresh, stage, trip, destroy}, see README.md for opts.
   Pure logic is on SKIPPER_SHARE.logic (used by the node tests and by viewer.html). */
(function (root) {
  'use strict';
  var VERSION = '1.0.0', MIN = 60000;
  var CFG = { soonMin: 30, graceMin: 60, tickMs: 20000, maxLink: 6000, posOldMin: 60 };

  /* ---------- texts: German is the key; opts.t(german) serves further languages of the host ---------- */
  var EN = {
    'Törn teilen': 'Share passage', 'Keine Überwachung aktiv': 'No passage active', 'Unterwegs': 'Under way', 'Bald fällig': 'Due soon',
    'Erwartete Zeit erreicht': 'Expected time reached', 'ÜBERFÄLLIG': 'OVERDUE',
    'Erwartet bis': 'Expected by', 'Nachfrist': 'Grace period', 'Landkontakt wird aktiv ab': 'Contact acts from', 'noch': 'in', 'seit': 'for',
    'Das kann die App – und das nicht': 'What this app can do, and what it cannot',
    'Es gibt keinen Server. Die App alarmiert niemanden von selbst. Ist das Handy aus, leer oder ohne Netz, passiert nichts. Verlässlich ist nur die Absprache: Dein Landkontakt kennt die Zeit und weiß, was zu tun ist.': 'There is no server. The app never alerts anyone by itself. If the phone is off, flat or out of coverage, nothing happens. What you can rely on is the agreement: your contact ashore knows the time and knows what to do.',
    'Bei akuter Gefahr: Notruf über Funk oder Telefon, nicht diese Nachrichten.': 'In acute danger: call for help by radio or phone, not with these messages.',
    'Zum Notfall': 'Go to emergency',
    'Landkontakt': 'Contact ashore', 'Name': 'Name', 'Telefon (für SMS)': 'Phone (for SMS)', 'E-Mail': 'E-mail', 'Sprache der Nachricht': 'Message language',
    'Deutsch': 'German', 'Englisch': 'English', 'Törn': 'Passage', 'Schiff / Boot': 'Vessel', 'Personen an Bord': 'Persons on board', 'Eigene Nummer an Bord': 'Own number on board',
    'Rufzeichen': 'Call sign', 'Törnplan': 'Passage plan', 'Vorschlag aus dem Plan': 'Suggested from plan', 'Plan übernehmen': 'Use plan', 'Kein Plan in der App. Hier selbst eintragen, z. B. Route und Ziel.': 'No plan in the app. Enter it here, e.g. route and destination.',
    'Letzte bekannte Position': 'Last known position', 'Position holen': 'Get position', 'Keine Position': 'No position', 'Suche GPS …': 'Searching GPS …', 'GPS nicht verfügbar. Position wird ohne Angabe gesendet.': 'GPS not available. The message goes out without a position.',
    'Revier-Näherung ist keine Position und wird nicht gesendet.': 'An area estimate is not a position and is not sent.', 'Stand': 'as of', 'älter als 1 Stunde, neu holen': 'older than 1 hour, update it', 'Kartenlink anhängen': 'Add map link',
    'Der Link führt zu OpenStreetMap. Erst beim Öffnen lädt der Empfänger von dort.': 'The link leads to OpenStreetMap. It only loads from there when the recipient opens it.',
    'Link zum Törnblatt anhängen': 'Add link to passage sheet', 'Törn starten': 'Start passage', 'Zeit ändern': 'Change time', 'Bitte eine Zeit in der Zukunft eintragen.': 'Please enter a time in the future.',
    'Nachricht': 'Message', 'Teilen …': 'Share …', 'Kopieren': 'Copy', 'SMS': 'SMS', 'Mail': 'Mail', 'Kopiert.': 'Copied.', 'Text markieren und kopieren.': 'Select the text and copy it.',
    'Noch nicht versendet.': 'Not sent yet.', 'Teilen geöffnet': 'Share opened', 'Ob sie ankommt, kann die App nicht wissen.': 'The app cannot tell whether it arrives.',
    'Erinnerung': 'Reminder', 'Erinnerung nur, solange die App offen ist.': 'Reminder only while the app is open.', 'Systembenachrichtigung geplant. Handy muss eingeschaltet sein.': 'System notification scheduled. The phone must be on.',
    'Benachrichtigungen an, solange die App im Hintergrund läuft.': 'Notifications on while the app runs in the background.', 'Benachrichtigung erlauben': 'Allow notifications', 'Kalender-Erinnerung (.ics)': 'Calendar reminder (.ics)',
    'Kalender-Einträge erinnern auch bei geschlossener App, solange das Handy an ist. Die Datei kannst du auch dem Landkontakt schicken.': 'Calendar entries remind you even with the app closed, as long as the phone is on. You can send the file to your contact as well.',
    'Angekommen': 'Arrived', 'Später, alles gut': 'Later, all fine', 'Hilfe organisieren': 'Arrange help', 'Neue Zeit': 'New time',
    'Törn beenden': 'End passage', 'Bist du angekommen? Dann die Nachricht unten senden, sonst sucht dich dein Landkontakt.': 'Have you arrived? Send the message below, otherwise your contact will start looking for you.',
    'Sende jetzt die Nachricht, damit dein Landkontakt Bescheid weiß:': 'Send this message now so your contact knows:',
    'Törn beendet. Sende die Nachricht, damit dein Landkontakt Bescheid weiß.': 'Passage ended. Send the message so your contact knows.',
    'Überfällig: Landkontakt informieren': 'Overdue: tell your contact', 'Törn erwartet bis': 'Passage expected by', 'Speichern nicht möglich. Die Eingaben gehen beim Schließen verloren.': 'Saving failed. Your entries will be lost when the app closes.',
    'Törnblatt': 'Passage sheet', 'Dieses Blatt ist eine Momentaufnahme vom Versand, keine Live-Position.': 'This sheet is a snapshot from when it was sent, not a live position.',
    'Diese Seite sendet nichts und überwacht nichts.': 'This page sends nothing and monitors nothing.', 'Kein gültiges Törnblatt. Bitte den Link vollständig öffnen.': 'Not a valid passage sheet. Please open the complete link.',
    'Offen': 'On time', 'Zeit abgelaufen': 'Time has passed', 'Das Blatt kennt spätere Nachrichten nicht. Gilt nur, wenn du seither nichts gehört hast.': 'This sheet does not know of later messages. It applies only if you have heard nothing since.', 'Überfällig seit': 'Overdue for', 'Was tun?': 'What to do?', 'Karte öffnen': 'Open map',
    'Bitte zuerst versuchen, die Crew zu erreichen. Auf dem Wasser gibt es oft kein Netz.': 'First try to reach the crew. There is often no coverage on the water.',
    'Bleibt das ohne Erfolg, melde dich bei:': 'If that fails, contact:', 'und gib diese Angaben weiter.': 'and pass on these details.',
    'Kalender-Erinnerung für mich': 'Calendar reminder for me', 'min': 'min', 'h': 'h'
  };
  function makeT(opts) {
    var lang = (opts && opts.lang) || 'de', host = opts && opts.t;
    return function (k) {
      if (lang === 'de') return k;
      if (lang === 'en' && EN[k]) return EN[k];
      var v = host ? host(k) : null;
      return v && v !== k ? v : (EN[k] || k);
    };
  }

  /* ---------- pure logic ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtDM(v, isLat, lang) {    // same notation as formatDM in core/platform/helpers.js, decimal point in English
    var hemi = isLat ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W');
    var t = Math.round(Math.abs(v) * 600), deg = Math.floor(t / 600), min = (t % 600) / 10;
    var dd = String(deg).padStart(isLat ? 2 : 3, '0'), mm = min.toFixed(1).padStart(4, '0');
    return dd + '°' + (lang === 'en' ? mm : mm.replace('.', ',')) + '′ ' + hemi;
  }
  function fmtPos(p, lang) { return fmtDM(p.lat, true, lang) + ' ' + fmtDM(p.lon, false, lang); }
  /* a region estimate (src 'region') is no position: same rule as the MAYDAY text */
  function validPos(p) { return !!p && p.src !== 'region' && isFinite(p.lat) && isFinite(p.lon) && p.lat !== null && p.lon !== null && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180; }
  function tzLabel(ms) {
    var o = -new Date(ms).getTimezoneOffset(), a = Math.abs(o);
    return 'UTC' + (o < 0 ? '−' : '+') + pad(Math.floor(a / 60)) + ':' + pad(a % 60);
  }
  var WD = { de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
  function fmtClock(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtWhen(ms, lang) {   // always with the UTC offset: skipper and contact may be in different time zones
    var d = new Date(ms), en = lang === 'en';
    var day = en ? d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) : pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
    return WD[en ? 'en' : 'de'][d.getDay()] + ' ' + day + ', ' + fmtClock(ms) + ' (' + tzLabel(ms) + ')';
  }
  function fmtDur(ms, T) {
    var m = Math.max(0, Math.round(ms / MIN)), h = Math.floor(m / 60);
    return (h ? h + ' ' + (T ? T('h') : 'h') + ' ' : '') + (m % 60) + ' ' + (T ? T('min') : 'min');
  }
  function localInput(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function parseLocal(s) {
    var m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : NaN;
  }
  function deadline(t) { return t.expectedAt + (t.graceMin == null ? CFG.graceMin : t.graceMin) * MIN; }
  function tripStage(t, now) {
    if (!t || t.status !== 'active' || !isFinite(t.expectedAt)) return 'idle';
    if (now >= deadline(t)) return 'overdue';
    if (now >= t.expectedAt) return 'due';
    if (now >= t.expectedAt - CFG.soonMin * MIN) return 'soon';
    return 'ok';
  }
  /* which reminder is due now; each one fires once per expected time */
  function reminderDue(t, now) {
    var s = tripStage(t, now);
    if (s !== 'idle' && s !== 'ok' && !(t.notified || {})[s]) return s;
    return null;
  }
  function osmLink(p) {
    var la = (+p.lat).toFixed(5), lo = (+p.lon).toFixed(5);
    return 'https://www.openstreetmap.org/?mlat=' + la + '&mlon=' + lo + '#map=12/' + la + '/' + lo;
  }
  function digits(n) { return String(n || '').replace(/[^\d+]/g, ''); }
  function smsHref(num, body) { return 'sms:' + digits(num) + '?body=' + encodeURIComponent(body); }
  function mailHref(to, subject, body) { return 'mailto:' + encodeURIComponent(to || '').replace(/%40/g, '@') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); }

  var MSG = {
    de: {
      head: 'Törnmeldung', pers: 'Personen an Bord', by: 'Erwartet bis', pos: 'Letzte bekannte Position', nopos: 'Position: nicht bekannt', asof: 'Stand', map: 'Karte', plan: 'Törnplan', sheet: 'Törnblatt', tel: 'Nummer an Bord',
      ifnot: 'Wenn du bis {t} nichts von uns gehört hast:', one: '1. Versuch uns zu erreichen. Auf dem Wasser gibt es oft kein Netz.', two: '2. Klappt das nicht, melde dich bei:', and: 'und gib diese Nachricht weiter.', call112: 'Notruf 112', manual: 'Von Hand versendet. Es gibt keine automatische Überwachung.',
      lateHead: 'Wir sind später dran, aber alles in Ordnung.', newBy: 'Neue erwartete Zeit', arrHead: 'Wir sind gut angekommen.', arrAt: 'Ankunft', thanks: 'Danke, alles erledigt.',
      helpHead: 'Wir sind nicht wie geplant angekommen und brauchen Unterstützung.', helpWas: 'Erwartet war', helpAsk: 'Bitte melde dich bei:', helpNote: 'Grund / Lage', helpFill: '[bitte ergänzen]', subject: 'Törnmeldung'
    },
    en: {
      head: 'Passage report', pers: 'Persons on board', by: 'Expected by', pos: 'Last known position', nopos: 'Position: not known', asof: 'as of', map: 'Map', plan: 'Passage plan', sheet: 'Passage sheet', tel: 'Number on board',
      ifnot: 'If you have not heard from us by {t}:', one: '1. Try to reach us. There is often no coverage on the water.', two: '2. If that fails, contact:', and: 'and pass on this message.', call112: 'Emergency number 112', manual: 'Sent by hand. There is no automatic monitoring.',
      lateHead: 'We are running late, but all is well.', newBy: 'New expected time', arrHead: 'We have arrived safely.', arrAt: 'Arrival', thanks: 'Thank you, all done.',
      helpHead: 'We have not arrived as planned and need support.', helpWas: 'We were expected by', helpAsk: 'Please contact:', helpNote: 'Reason / situation', helpFill: '[please complete]', subject: 'Passage report'
    }
  };
  function boatLine(d) { return (d.boat || '').trim() + (d.call ? ' (' + d.call + ')' : ''); }
  function numberLines(d, M) {
    var n = (d.numbers || []).filter(function (x) { return x && x.num; }).slice(0, 3).map(function (x) { return '   ' + x.title + ': ' + x.num; });
    return n.length ? n : ['   ' + M.call112];
  }
  function posLines(d, M, lang) {
    if (!validPos(d.pos)) return [M.nopos];
    var L = [M.pos + ': ' + fmtPos(d.pos, lang) + (d.pos.t ? ', ' + M.asof + ' ' + fmtWhen(d.pos.t, lang) : '')];
    if (d.mapLink !== false) L.push(M.map + ': ' + osmLink(d.pos));
    return L;
  }
  function planMessage(d) {
    var lang = d.lang === 'en' ? 'en' : 'de', M = MSG[lang], L = [M.head + (boatLine(d) ? ': ' + boatLine(d) : '')];
    if (d.persons) L.push(M.pers + ': ' + d.persons);
    if (d.phone) L.push(M.tel + ': ' + d.phone);
    if (isFinite(d.expectedAt) && d.expectedAt) L.push(M.by + ': ' + fmtWhen(d.expectedAt, lang));
    L = L.concat(posLines(d, M, lang));
    if (d.planText) { L.push('', M.plan + ':', String(d.planText).trim()); }
    if (d.link) { L.push('', M.sheet + ': ' + d.link); }
    if (isFinite(d.expectedAt) && d.expectedAt) {
      L.push('', M.ifnot.replace('{t}', fmtWhen(deadline(d), lang)), M.one, M.two);
      L = L.concat(numberLines(d, M));
      L.push('   ' + M.and);
    }
    L.push('', M.manual);
    return L.join('\n');
  }
  function lateMessage(d) {
    var lang = d.lang === 'en' ? 'en' : 'de', M = MSG[lang], L = [(boatLine(d) ? boatLine(d) + ': ' : '') + M.lateHead];
    L.push(M.newBy + ': ' + (d.expectedAt > d.now ? fmtWhen(d.expectedAt, lang) : M.helpFill));   // an expired time is no new time
    return L.concat(posLines(d, M, lang)).join('\n');
  }
  function arrivedMessage(d) {
    var lang = d.lang === 'en' ? 'en' : 'de', M = MSG[lang], L = [(boatLine(d) ? boatLine(d) + ': ' : '') + M.arrHead];
    L.push(M.arrAt + ': ' + fmtWhen(d.now, lang), M.thanks);
    return L.join('\n');
  }
  function helpMessage(d) {
    var lang = d.lang === 'en' ? 'en' : 'de', M = MSG[lang], L = [(boatLine(d) ? boatLine(d) + ': ' : '') + M.helpHead];
    if (d.persons) L.push(M.pers + ': ' + d.persons);
    if (isFinite(d.expectedAt) && d.expectedAt) L.push(M.helpWas + ': ' + fmtWhen(d.expectedAt, lang));
    L = L.concat(posLines(d, M, lang));
    L.push(M.helpNote + ': ' + M.helpFill, M.helpAsk);
    return L.concat(numberLines(d, M)).join('\n');
  }
  /* ---- calendar file (RFC 5545): works without this app, also on the contact's phone ---- */
  function icsText(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function icsTime(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'); }
  function icsFold(line) {   // 75 octets per line, never inside a UTF-8 sequence
    var enc = new TextEncoder(), out = [], cur = '', n = 0;
    Array.from(line).forEach(function (ch) {
      var b = enc.encode(ch).length;
      if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
      cur += ch; n += b;
    });
    out.push(cur);
    return out.join('\r\n ');
  }
  function icsEvent(e) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AIxion Systems//Skipper share ' + VERSION + '//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + e.uid, 'DTSTAMP:' + icsTime(e.now), 'DTSTART:' + icsTime(e.at), 'DTEND:' + icsTime(e.at + 15 * MIN), 'SUMMARY:' + icsText(e.title), 'DESCRIPTION:' + icsText(e.body),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(e.title), 'TRIGGER;RELATED=START:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }
  /* ---- passage sheet link: the data travels in the #fragment, which browsers do not send to the host of viewer.html ---- */
  function b64u(s) {
    var bin = ''; new TextEncoder().encode(s).forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(s) {
    var bin = atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(a);
  }
  function sheetPayload(d) {
    var p = { v: 1, l: d.lang === 'en' ? 'en' : 'de', b: d.boat || '', c: d.call || '', n: d.persons || '', o: d.phone || '', e: d.expectedAt, g: d.graceMin, s: d.now, t: d.planText || '', r: (d.numbers || []).slice(0, 3).map(function (x) { return [x.title, x.num]; }) };
    if (validPos(d.pos)) p.p = [+(+d.pos.lat).toFixed(5), +(+d.pos.lon).toFixed(5), d.pos.t || null];
    return p;
  }
  function sheetLink(base, d) {
    if (!base) return '';
    var p = sheetPayload(d), mk = function () { return base + '#p=' + b64u(JSON.stringify(p)); }, url = mk();
    while (url.length > CFG.maxLink && p.t.length > 40) { p.t = p.t.slice(0, Math.floor(p.t.length * 0.7)).trimEnd() + ' …'; url = mk(); }
    return url.length > CFG.maxLink ? '' : url;
  }
  function parseSheet(hash) {
    var m = /[#&]p=([A-Za-z0-9_-]+)/.exec(String(hash || ''));
    if (!m) return null;
    try {
      var p = JSON.parse(unb64u(m[1]));
      if (!p || p.v !== 1 || !isFinite(p.e)) return null;
      return p;
    } catch (e) { return null; }
  }

  /* ---------- environment ---------- */
  function capPlugin(n) { var c = root.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins ? c.Plugins[n] : null; }
  function memoryStore() { var m = {}; return { get: function (k) { return k in m ? m[k] : null; }, set: function (k, v) { m[k] = v; return true; } }; }
  function localStore() {
    return {
      get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
    };
  }
  function saveFile(opts, name, text, mime) {
    if (opts.saveFile) return Promise.resolve(opts.saveFile(name, text, mime));
    var FS = capPlugin('Filesystem'), SH = capPlugin('Share');
    if (FS && SH) return FS.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' }).then(function (r) { return SH.share({ title: name, url: r.uri, dialogTitle: name }); });
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return Promise.resolve();
  }

  /* ---------- UI ---------- */
  function mount(el, o) {
    o = o || {};
    var T = makeT(o), now = o.now || Date.now, store = o.storage || (typeof localStorage !== 'undefined' ? localStore() : memoryStore()), KEY = o.key || 'skipper.share';
    var S = load(), saveOk = true, msgKind = 'plan', flash = '', timer = null, nativeOk = false, draft = null, editing = false;
    function load() {
      var d = null; try { d = JSON.parse(store.get(KEY)); } catch (e) { }
      return Object.assign({ contact: { name: '', phone: '', mail: '' }, msgLang: o.lang === 'en' ? 'en' : 'de', boat: '', call: '', persons: '', phone: '', planText: '', mapLink: true, sheetLink: true, graceMin: CFG.graceMin, expectedAt: null, pos: null, trip: null, shared: null }, d || {});
    }
    function save() { saveOk = store.set(KEY, JSON.stringify(S)) !== false; var w = el.querySelector('[data-sks=savewarn]'); if (w) w.hidden = saveOk; }
    function boatFromHost() {
      var b = o.getBoat ? o.getBoat() : null;
      if (b) { if (!S.boat && b.name) S.boat = b.name; if (!S.call && b.call) S.call = b.call; }
    }
    function plan() { try { return o.getPlan ? o.getPlan() : null; } catch (e) { return null; } }
    function hostPos() { try { return o.getPosition ? o.getPosition() : null; } catch (e) { return null; } }
    function position() {
      var p = hostPos();
      if (validPos(p) && (!validPos(S.pos) || (p.t || 0) >= (S.pos.t || 0))) { S.pos = { lat: p.lat, lon: p.lon, t: p.t || now(), acc: p.acc || null }; }
      return { region: !!p && p.src === 'region', pos: validPos(S.pos) ? S.pos : null };
    }
    function numbers() { try { return (o.emergency ? o.emergency(S.pos) : []) || []; } catch (e) { return []; } }
    function data() {
      var t = S.trip && S.trip.status === 'active' ? S.trip : null;
      var d = { lang: S.msgLang, boat: S.boat, call: S.call, persons: S.persons, phone: S.phone, planText: S.planText, pos: position().pos, mapLink: S.mapLink, expectedAt: t ? t.expectedAt : S.expectedAt, graceMin: t ? t.graceMin : +S.graceMin, numbers: numbers(), now: now() };
      if (S.sheetLink && o.viewerUrl && isFinite(d.expectedAt) && d.expectedAt) d.link = sheetLink(o.viewerUrl, d);
      return d;
    }
    function message() {
      var d = data();
      if (draft != null) return draft;
      if (msgKind === 'late') return lateMessage(d);
      if (msgKind === 'arrived') return arrivedMessage(d);
      if (msgKind === 'help') return helpMessage(d);
      return planMessage(d);
    }
    function subject() { return MSG[S.msgLang === 'en' ? 'en' : 'de'].subject + (S.boat ? ': ' + S.boat : ''); }

    /* --- reminders --- */
    function notifyNow(stage) {
      var t = S.trip, title = T(stage === 'overdue' ? 'Überfällig: Landkontakt informieren' : 'Erwartete Zeit erreicht');
      if (stage === 'soon') title = T('Bald fällig');
      var body = T('Törn erwartet bis') + ' ' + fmtWhen(t.expectedAt, S.msgLang);
      if (o.notify) { try { o.notify(title, body, stage); } catch (e) { } }
      else if (!nativeOk && typeof Notification !== 'undefined' && Notification.permission === 'granted') { try { new Notification(title, { body: body, tag: 'skipper-share-' + stage }); } catch (e) { } }
      if (root.navigator && navigator.vibrate) { try { navigator.vibrate(stage === 'overdue' ? [400, 200, 400, 200, 400] : 300); } catch (e) { } }
    }
    function scheduleNative() {
      var t = S.trip, LN = capPlugin('LocalNotifications'), go = o.schedule || (LN ? function (list) {
        var p = LN.requestPermissions ? LN.requestPermissions() : Promise.resolve({ display: 'granted' });
        return p.then(function (r) {
          if (r && r.display && r.display !== 'granted') throw new Error('denied');
          return LN.schedule({ notifications: list.map(function (n) { return { id: n.id, title: n.title, body: n.body, schedule: { at: new Date(n.at), allowWhileIdle: true } }; }) });
        });
      } : null);
      nativeOk = false;
      if (!go || !t) return;
      var body = T('Törn erwartet bis') + ' ' + fmtWhen(t.expectedAt, S.msgLang), list = [{ id: 7301, at: t.expectedAt, title: T('Erwartete Zeit erreicht'), body: body }, { id: 7302, at: deadline(t), title: T('Überfällig: Landkontakt informieren'), body: body }]
        .filter(function (n) { return n.at > now(); });
      Promise.resolve().then(function () { return go(list); }).then(function () { nativeOk = true; renderChannel(); }).catch(function () { nativeOk = false; renderChannel(); });
    }
    function cancelNative() {
      var LN = capPlugin('LocalNotifications');
      nativeOk = false;
      if (o.cancelSchedule) { try { o.cancelSchedule([7301, 7302]); } catch (e) { } } else if (LN) { LN.cancel({ notifications: [{ id: 7301 }, { id: 7302 }] }).catch(function () { }); }
    }
    function tick() {
      var r = reminderDue(S.trip, now());
      if (r) { (S.trip.notified = S.trip.notified || {})[r] = now(); save(); notifyNow(r); if (r === 'overdue' && msgKind === 'plan') { msgKind = 'late'; draft = null; } render(); return; }
      renderStatus();
    }

    /* --- rendering --- */
    function stageView(st) {
      return { idle: ['n', T('Keine Überwachung aktiv')], ok: ['g', T('Unterwegs')], soon: ['y', T('Bald fällig')], due: ['y', T('Erwartete Zeit erreicht')], overdue: ['r', T('ÜBERFÄLLIG')] }[st];
    }
    function statusHTML() {
      var t = S.trip, st = tripStage(t, now()), v = stageView(st), h = '<div class="sks-status sks-' + v[0] + '"><b>' + esc(v[1]) + '</b>';
      if (st !== 'idle') {
        var left = t.expectedAt - now(), d2 = deadline(t) - now();
        h += '<div>' + esc(T('Erwartet bis')) + ': <b>' + esc(fmtWhen(t.expectedAt, o.lang)) + '</b>' + (left > 0 ? ' · ' + esc(T('noch')) + ' ' + esc(fmtDur(left, T)) : '') + '</div>';
        h += '<div>' + esc(T('Landkontakt wird aktiv ab')) + ': ' + esc(fmtWhen(deadline(t), o.lang)) + (d2 < 0 ? ' · ' + esc(T('seit')) + ' ' + esc(fmtDur(-d2, T)) : '') + '</div>';
      }
      return h + '</div>';
    }
    function renderStatus() { var b = el.querySelector('[data-sks=status]'); if (b) b.innerHTML = statusHTML(); }
    function channelText() {
      if (nativeOk) return T('Systembenachrichtigung geplant. Handy muss eingeschaltet sein.');
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') return T('Benachrichtigungen an, solange die App im Hintergrund läuft.');
      return T('Erinnerung nur, solange die App offen ist.');
    }
    function renderChannel() {
      var b = el.querySelector('[data-sks=channel]'); if (b) b.textContent = channelText();
      var a = el.querySelector('[data-a=perm]');
      if (a) a.hidden = nativeOk || typeof Notification === 'undefined' || Notification.permission !== 'default';
    }
    function renderMsg() {
      var ta = el.querySelector('[data-sks=msg]'); if (!ta) return;
      var txt = message(); if (ta.value !== txt) ta.value = txt;
      ta.readOnly = msgKind !== 'help' && msgKind !== 'late';
      var num = S.contact.phone, sms = el.querySelector('[data-sks=sms]'), mail = el.querySelector('[data-sks=mail]');
      sms.href = smsHref(num, txt); mail.href = mailHref(S.contact.mail, subject(), txt);
      var inf = el.querySelector('[data-sks=shared]');
      inf.textContent = S.shared ? T('Teilen geöffnet') + ': ' + fmtWhen(S.shared, o.lang) + '. ' + T('Ob sie ankommt, kann die App nicht wissen.') : T('Noch nicht versendet.');
      var f = el.querySelector('[data-sks=flash]'); f.textContent = flash;
    }
    function fld(label, id, val, attrs) {
      return '<label class="sks-f"><span>' + esc(T(label)) + '</span><input data-f="' + id + '" value="' + esc(val || '') + '"' + (attrs || '') + '></label>';
    }
    function render() {
      boatFromHost();
      var t = S.trip && S.trip.status === 'active' ? S.trip : null, st = tripStage(t, now()), p = position(), pl = plan();
      if (!S.expectedAt && pl && pl.arriveAt) S.expectedAt = pl.arriveAt;
      if (!S.planText && pl && pl.text) S.planText = pl.text;
      var showEdit = !t || editing;
      var h = '<div class="sks"><div data-sks="status">' + statusHTML() + '</div>';
      h += '<div class="sks-warn" data-sks="savewarn"' + (saveOk ? ' hidden' : '') + '>' + esc(T('Speichern nicht möglich. Die Eingaben gehen beim Schließen verloren.')) + '</div>';
      if (st === 'overdue' || st === 'due') {
        h += '<div class="sks-card sks-alert"><div class="sks-danger">' + esc(T('Bei akuter Gefahr: Notruf über Funk oder Telefon, nicht diese Nachrichten.')) + '</div>' + (o.onEmergency ? '<button type="button" class="sks-btn sks-emg" data-a="emergency">' + esc(T('Zum Notfall')) + '</button>' : '') + '</div>';
      }
      if (t) {
        h += '<div class="sks-card"><div class="sks-row">'
          + '<button type="button" class="sks-btn sks-pri" data-a="arrive">' + esc(T('Angekommen')) + '</button>'
          + '<button type="button" class="sks-btn" data-kind="late">' + esc(T('Später, alles gut')) + '</button>'
          + '<button type="button" class="sks-btn" data-kind="help">' + esc(T('Hilfe organisieren')) + '</button>'
          + '<button type="button" class="sks-btn" data-kind="plan">' + esc(T('Törnplan')) + '</button></div>'
          + '<label class="sks-f sks-mt"><span>' + esc(T('Neue Zeit')) + '</span><span class="sks-inl"><input type="datetime-local" data-f="newtime" value="' + esc(localInput(t.expectedAt)) + '"><button type="button" class="sks-btn" data-a="retime">' + esc(T('Zeit ändern')) + '</button></span></label>'
          + '<div class="sks-err" data-sks="terr"></div></div>';
      }
      if (showEdit) {
        h += '<div class="sks-card"><h3>' + esc(T('Landkontakt')) + '</h3><div class="sks-grid">' + fld('Name', 'c.name', S.contact.name, ' autocomplete="off"') + fld('Telefon (für SMS)', 'c.phone', S.contact.phone, ' type="tel" autocomplete="off"') + fld('E-Mail', 'c.mail', S.contact.mail, ' type="email" autocomplete="off"')
          + '<label class="sks-f"><span>' + esc(T('Sprache der Nachricht')) + '</span><select data-f="msgLang"><option value="de"' + (S.msgLang === 'de' ? ' selected' : '') + '>' + esc(T('Deutsch')) + '</option><option value="en"' + (S.msgLang === 'en' ? ' selected' : '') + '>' + esc(T('Englisch')) + '</option></select></label></div></div>';
        h += '<div class="sks-card"><h3>' + esc(T('Törn')) + '</h3><div class="sks-grid">' + fld('Schiff / Boot', 'boat', S.boat) + fld('Rufzeichen', 'call', S.call) + fld('Personen an Bord', 'persons', S.persons, ' inputmode="numeric"') + fld('Eigene Nummer an Bord', 'phone', S.phone, ' type="tel"')
          + '<label class="sks-f"><span>' + esc(T('Erwartet bis')) + '</span><input type="datetime-local" data-f="expected" value="' + (S.expectedAt ? esc(localInput(S.expectedAt)) : '') + '"></label>'
          + '<label class="sks-f"><span>' + esc(T('Nachfrist')) + '</span><select data-f="grace">' + [30, 60, 120, 180].map(function (m) { return '<option value="' + m + '"' + (+S.graceMin === m ? ' selected' : '') + '>' + fmtDur(m * MIN, T) + '</option>'; }).join('') + '</select></label></div>'
          + (pl && pl.arriveAt ? '<div class="sks-note">' + esc(T('Vorschlag aus dem Plan')) + ': ' + esc(fmtWhen(pl.arriveAt, o.lang)) + '</div>' : '')
          + '<label class="sks-f sks-mt"><span>' + esc(T('Törnplan')) + '</span><textarea rows="5" data-f="planText" placeholder="' + esc(T('Kein Plan in der App. Hier selbst eintragen, z. B. Route und Ziel.')) + '">' + esc(S.planText) + '</textarea></label>'
          + (pl && pl.text ? '<button type="button" class="sks-btn" data-a="useplan">' + esc(T('Plan übernehmen')) + '</button>' : '') + '</div>';
      }
      h += '<div class="sks-card"><h3>' + esc(T('Letzte bekannte Position')) + '</h3><div class="sks-pos">' + (p.pos ? esc(fmtPos(p.pos, o.lang)) : esc(T('Keine Position'))) + '</div>';
      if (p.pos && p.pos.t) h += '<div class="sks-note">' + esc(T('Stand')) + ' ' + esc(fmtWhen(p.pos.t, o.lang)) + (now() - p.pos.t > CFG.posOldMin * MIN ? ' · <b>' + esc(T('älter als 1 Stunde, neu holen')) + '</b>' : '') + '</div>';
      if (p.region) h += '<div class="sks-note">' + esc(T('Revier-Näherung ist keine Position und wird nicht gesendet.')) + '</div>';
      h += '<div class="sks-inl sks-mt"><button type="button" class="sks-btn" data-a="gps">' + esc(T('Position holen')) + '</button><span class="sks-note" data-sks="gpsmsg"></span></div>'
        + '<label class="sks-chk"><input type="checkbox" data-f="mapLink"' + (S.mapLink ? ' checked' : '') + '> ' + esc(T('Kartenlink anhängen')) + '</label><div class="sks-note">' + esc(T('Der Link führt zu OpenStreetMap. Erst beim Öffnen lädt der Empfänger von dort.')) + '</div>'
        + (o.viewerUrl ? '<label class="sks-chk"><input type="checkbox" data-f="sheetLink"' + (S.sheetLink ? ' checked' : '') + '> ' + esc(T('Link zum Törnblatt anhängen')) + '</label>' : '') + '</div>';
      if (!t) h += '<div class="sks-card"><button type="button" class="sks-btn sks-pri sks-wide" data-a="start">' + esc(T('Törn starten')) + '</button><div class="sks-err" data-sks="serr"></div></div>';
      h += '<div class="sks-card"><h3>' + esc(T('Nachricht')) + '</h3><div class="sks-note" data-sks="flash"></div><textarea rows="9" data-sks="msg" aria-label="' + esc(T('Nachricht')) + '" readonly></textarea><div class="sks-row sks-mt">'
        + '<button type="button" class="sks-btn sks-pri" data-a="share">' + esc(T('Teilen …')) + '</button><button type="button" class="sks-btn" data-a="copy">' + esc(T('Kopieren')) + '</button>'
        + '<a class="sks-btn" data-sks="sms" data-a="link">' + esc(T('SMS')) + '</a><a class="sks-btn" data-sks="mail" data-a="link">' + esc(T('Mail')) + '</a></div><div class="sks-note" data-sks="shared"></div></div>';
      if (t) h += '<div class="sks-card"><h3>' + esc(T('Erinnerung')) + '</h3><div class="sks-note" data-sks="channel"></div><div class="sks-row sks-mt"><button type="button" class="sks-btn" data-a="perm" hidden>' + esc(T('Benachrichtigung erlauben')) + '</button><button type="button" class="sks-btn" data-a="ics">' + esc(T('Kalender-Erinnerung (.ics)')) + '</button></div><div class="sks-note">' + esc(T('Kalender-Einträge erinnern auch bei geschlossener App, solange das Handy an ist. Die Datei kannst du auch dem Landkontakt schicken.')) + '</div></div>';
      h += '<div class="sks-card sks-limit"><h3>' + esc(T('Das kann die App – und das nicht')) + '</h3><p>' + esc(T('Es gibt keinen Server. Die App alarmiert niemanden von selbst. Ist das Handy aus, leer oder ohne Netz, passiert nichts. Verlässlich ist nur die Absprache: Dein Landkontakt kennt die Zeit und weiß, was zu tun ist.')) + '</p></div></div>';
      el.innerHTML = h; renderMsg(); renderChannel();
    }
    function setFlash(t) { flash = t; var f = el.querySelector('[data-sks=flash]'); if (f) f.textContent = t; }

    /* --- actions --- */
    function startTrip() {
      var e = el.querySelector('[data-sks=serr]');
      if (!isFinite(S.expectedAt) || !S.expectedAt || S.expectedAt <= now()) { e.textContent = T('Bitte eine Zeit in der Zukunft eintragen.'); return; }
      S.trip = { status: 'active', startedAt: now(), expectedAt: S.expectedAt, graceMin: +S.graceMin, notified: {} };
      msgKind = 'plan'; draft = null; save(); scheduleNative(); render();
    }
    function retime() {
      var v = parseLocal(el.querySelector('[data-f=newtime]').value), e = el.querySelector('[data-sks=terr]');
      if (!isFinite(v) || v <= now()) { e.textContent = T('Bitte eine Zeit in der Zukunft eintragen.'); return; }
      S.trip.expectedAt = v; S.expectedAt = v; S.trip.notified = {}; msgKind = 'late'; draft = null; save(); cancelNative(); scheduleNative(); render();
    }
    function arrive() {
      S.trip.status = 'closed'; S.trip.closedAt = now(); msgKind = 'arrived'; draft = null; flash = T('Törn beendet. Sende die Nachricht, damit dein Landkontakt Bescheid weiß.');
      S.shared = null; S.expectedAt = null; cancelNative(); save(); render();
    }
    function doShare() {
      var txt = el.querySelector('[data-sks=msg]').value, title = subject(), SH = capPlugin('Share');
      function mark(m) { S.shared = now(); save(); setFlash(m || ''); renderMsg(); }
      if (o.shareText) { Promise.resolve(o.shareText(title, txt)).then(function () { mark(); }).catch(function () { doCopy(); }); return; }
      if (SH) { SH.share({ title: title, text: txt, dialogTitle: title }).then(function () { mark(); }).catch(function () { doCopy(); }); return; }
      if (root.navigator && navigator.share) { navigator.share({ title: title, text: txt }).then(function () { mark(); }).catch(function (e) { if (e && e.name === 'AbortError') return; doCopy(); }); return; }
      doCopy();
    }
    function doCopy() {
      var ta = el.querySelector('[data-sks=msg]');
      function manual() { ta.focus(); ta.select(); setFlash(T('Text markieren und kopieren.')); }
      if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(function () { S.shared = now(); save(); setFlash(T('Kopiert.')); renderMsg(); }, manual);
      else manual();
    }
    function doGps() {
      var m = el.querySelector('[data-sks=gpsmsg]');
      function fail() { m.textContent = T('GPS nicht verfügbar. Position wird ohne Angabe gesendet.'); }
      if (!root.navigator || !navigator.geolocation) { fail(); return; }
      m.textContent = T('Suche GPS …');
      try {
        navigator.geolocation.getCurrentPosition(function (r) {
          S.pos = { lat: r.coords.latitude, lon: r.coords.longitude, t: now(), acc: r.coords.accuracy, src: 'gps' }; save(); render();
        }, fail, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      } catch (e) { fail(); }
    }
    function doIcs() {
      var t = S.trip, title = (S.boat ? S.boat + ': ' : '') + T('Überfällig: Landkontakt informieren'), name = 'toern-erinnerung-' + localInput(t.expectedAt).replace(/\D/g, '').slice(0, 12) + '.ics';
      saveFile(o, name, icsEvent({ uid: 'skipper-share-' + t.startedAt + '@aixion.eu', now: now(), at: deadline(t), title: title, body: planMessage(data()) }), 'text/calendar;charset=utf-8');
    }
    function onClick(ev) {
      var b = ev.target.closest('[data-a],[data-kind]'); if (!b) return;
      var k = b.getAttribute('data-kind'), a = b.getAttribute('data-a');
      if (k) { msgKind = k; draft = null; flash = ''; renderMsg(); el.querySelector('[data-sks=msg]').scrollIntoView({ block: 'center' }); return; }
      if (a === 'link') { S.shared = now(); save(); setTimeout(renderMsg, 0); return; }
      ({ start: startTrip, retime: retime, arrive: arrive, share: doShare, copy: doCopy, gps: doGps, ics: doIcs,
        emergency: function () { o.onEmergency(); },
        useplan: function () { var p = plan(); if (p) { S.planText = p.text; if (p.arriveAt) S.expectedAt = p.arriveAt; save(); render(); } },
        perm: function () { Notification.requestPermission().then(renderChannel); } }[a] || function () { })();
    }
    function onInput(ev) {
      var e = ev.target, f = e.getAttribute('data-f');
      if (e.getAttribute('data-sks') === 'msg') { if (!e.readOnly) draft = e.value; return; }
      if (!f || f === 'newtime') return;
      var v = e.type === 'checkbox' ? e.checked : e.value;
      if (f.indexOf('c.') === 0) S.contact[f.slice(2)] = v;
      else if (f === 'expected') S.expectedAt = parseLocal(v) || null;
      else if (f === 'grace') S.graceMin = +v;
      else S[f] = v;
      save(); renderMsg();
    }
    el.addEventListener('click', onClick); el.addEventListener('input', onInput); el.addEventListener('change', onInput);
    function onVis() { if (!document.hidden) tick(); }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    if (S.trip && S.trip.status === 'active') scheduleNative();
    render(); tick();
    timer = setInterval(tick, o.tickMs || CFG.tickMs);
    return {
      refresh: render, stage: function () { return tripStage(S.trip, now()); }, trip: function () { return S.trip; },
      destroy: function () { clearInterval(timer); el.removeEventListener('click', onClick); el.removeEventListener('input', onInput); el.removeEventListener('change', onInput); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis); el.innerHTML = ''; }
    };
  }

  /* passage sheet for the contact ashore (viewer.html): reads only the #fragment, sends nothing */
  function renderSheet(el, hash, o) {
    o = o || {};
    var p = parseSheet(hash), now = (o.now || Date.now)(), opts = { lang: o.lang }, tt;
    if (!p) { opts.lang = o.lang || 'de'; tt = makeT(opts); el.innerHTML = '<div class="sks"><div class="sks-warn">' + esc(tt('Kein gültiges Törnblatt. Bitte den Link vollständig öffnen.')) + '</div></div>'; return null; }
    opts.lang = o.lang || p.l; tt = makeT(opts);
    var trip = { status: 'active', expectedAt: p.e, graceMin: p.g }, st = tripStage(trip, now), v = st === 'overdue' ? ['r', tt('Zeit abgelaufen')] : st === 'due' ? ['y', tt('Erwartete Zeit erreicht')] : ['g', tt('Offen')], lang = opts.lang;
    var h = '<div class="sks"><h2>' + esc(tt('Törnblatt')) + (p.b ? ': ' + esc(p.b) : '') + (p.c ? ' (' + esc(p.c) + ')' : '') + '</h2><div class="sks-status sks-' + v[0] + '"><b>' + esc(v[1]) + '</b>'
      + '<div>' + esc(tt('Erwartet bis')) + ': <b>' + esc(fmtWhen(p.e, lang)) + '</b></div><div>' + esc(tt('Landkontakt wird aktiv ab')) + ': ' + esc(fmtWhen(deadline(trip), lang)) + '</div>' + (st === 'overdue' ? '<div>' + esc(tt('Das Blatt kennt spätere Nachrichten nicht. Gilt nur, wenn du seither nichts gehört hast.')) + '</div>' : '') + '</div>';
    h += '<div class="sks-card">' + (p.n ? '<div>' + esc(tt('Personen an Bord')) + ': <b>' + esc(p.n) + '</b></div>' : '') + (p.o ? '<div>' + esc(tt('Eigene Nummer an Bord')) + ': <a href="tel:' + esc(digits(p.o)) + '">' + esc(p.o) + '</a></div>' : '');
    if (p.p && validPos({ lat: p.p[0], lon: p.p[1] })) {
      var q = { lat: p.p[0], lon: p.p[1] };
      h += '<h3>' + esc(tt('Letzte bekannte Position')) + '</h3><div class="sks-pos">' + esc(fmtPos(q, lang)) + '</div>' + (p.p[2] ? '<div class="sks-note">' + esc(tt('Stand')) + ' ' + esc(fmtWhen(p.p[2], lang)) + '</div>' : '') + '<a class="sks-btn sks-mt" rel="noopener" href="' + esc(osmLink(q)) + '">' + esc(tt('Karte öffnen')) + '</a>';
    }
    h += '</div>';
    if (p.t) h += '<div class="sks-card"><h3>' + esc(tt('Törnplan')) + '</h3><div class="sks-pre">' + esc(p.t) + '</div></div>';
    var nums = (p.r || []).filter(function (x) { return x && x[1]; });
    h += '<div class="sks-card sks-alert"><h3>' + esc(tt('Was tun?')) + '</h3><p>' + esc(tt('Bitte zuerst versuchen, die Crew zu erreichen. Auf dem Wasser gibt es oft kein Netz.')) + '</p><p>' + esc(tt('Bleibt das ohne Erfolg, melde dich bei:')) + '</p>';
    h += (nums.length ? nums : [[lang === 'en' ? 'Emergency number' : 'Notruf', '112']]).map(function (x) { return '<div><a href="tel:' + esc(digits(x[1])) + '"><b>' + esc(x[1]) + '</b></a> ' + esc(x[0]) + '</div>'; }).join('') + '<p>' + esc(tt('und gib diese Angaben weiter.')) + '</p></div>';
    h += '<div class="sks-card"><button type="button" class="sks-btn" data-a="ics">' + esc(tt('Kalender-Erinnerung für mich')) + '</button><div class="sks-note">' + esc(tt('Dieses Blatt ist eine Momentaufnahme vom Versand, keine Live-Position.')) + ' ' + esc(tt('Diese Seite sendet nichts und überwacht nichts.')) + (p.s ? ' ' + esc(tt('Stand')) + ' ' + esc(fmtWhen(p.s, lang)) : '') + '</div></div></div>';
    el.innerHTML = h;
    el.querySelector('[data-a=ics]').addEventListener('click', function () {
      var title = (p.b ? p.b + ': ' : '') + tt('Erwartet bis') + ' ' + fmtClock(p.e);
      saveFile(o, 'toernblatt.ics', icsEvent({ uid: 'skipper-sheet-' + p.e + '@aixion.eu', now: (o.now || Date.now)(), at: deadline(trip), title: title, body: tt('Was tun?') + ' ' + tt('Bitte zuerst versuchen, die Crew zu erreichen. Auf dem Wasser gibt es oft kein Netz.') }), 'text/calendar;charset=utf-8');
    });
    return p;
  }

  var api = {
    version: VERSION, mount: mount, renderSheet: renderSheet,
    logic: { fmtPos: fmtPos, fmtWhen: fmtWhen, validPos: validPos, tripStage: tripStage, reminderDue: reminderDue, deadline: deadline, planMessage: planMessage, lateMessage: lateMessage, arrivedMessage: arrivedMessage, helpMessage: helpMessage, icsEvent: icsEvent, sheetLink: sheetLink, parseSheet: parseSheet, smsHref: smsHref, mailHref: mailHref, osmLink: osmLink, parseLocal: parseLocal, localInput: localInput }
  };
  root.SKIPPER_SHARE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
