// Acceptance tests for SPEC v1 §9 (numbers 1-36 are the test names).
// Run (from outside the app dir): cd /home/claude && NODE_PATH=$(npm root -g) node skipper-ostsee/tests/logic.test.js
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !detail ? '' : '  -> ' + detail));
}
const lc = (s) => String(s).toLowerCase();
const NOW = Date.UTC(2026, 6, 15, 9, 0); // 15.07.2026 11:00 MESZ: fixed clock, summer season, daylight

(async () => {
  execFileSync('node', [path.join(ROOT, 'tools', 'build.js')], { stdio: 'inherit' });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [], external = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
    if (u === 'file://' + path.join(ROOT, 'index.html')) return;
    external.push(u);
  });
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => window.SKIPPER);

  const ev = (fn, arg) => page.evaluate(fn, arg);
  const posOf = (id) => ev((i) => { const h = SKIPPER.DATA.find(x => x.id === i); return { lat: h.lat, lon: h.lon }; }, id);
  // Test profile = explicit TB (independent of the app default); summer season + fixed clock for determinism unless a test says otherwise.
  const TB = { type: 'mono', loa: 10.51, beam: 3.49, draft: 1.95, mast: 18.5, margin: 0.3, bridgeMargin: 1.0 };
  const base = { boat: TB, kids: false, course: 'am Wind', seaDir: null, seaH: 0, trend: false, season: 'sommer', pegel: 0, sicht: 'gut', now: NOW };
  const E = (st) => ev((s) => {
    const r = SKIPPER.evaluate(s);
    return { gates: r.gates, info: r.info, bridges: r.bridges, general: r.general, overall: r.overall, reff: r.reff, pegel: r.pegel, missing: r.missing, rec: r.rec && { green: r.rec.green && r.rec.green.h.id, far: r.rec.far }, T: r.T };
  }, st);
  const bridge = (r, id) => r.bridges.find(g => g.id === id);
  const gate = (r, id) => r.gates.find(g => g.id === id);
  const hs = (id, st) => ev(({ id, st }) => { const h = SKIPPER.DATA.find(x => x.id === id); return SKIPPER.harborStatus(h, st); }, { id, st });
  const hsX = (h, st) => ev(({ h, st }) => SKIPPER.harborStatus(h, st), { h, st });
  const item = (r, cat, lvl) => r.items.find(i => i.cat === cat && (!lvl || i.level === lvl));
  const has = (r, re) => r.items.some(i => re.test(i.text));
  const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const synth = (id, patch) => ev(({ id, patch }) => Object.assign({}, JSON.parse(JSON.stringify(SKIPPER.DATA.find(x => x.id === id))), patch), { id, patch });

  // ---------- Reff / Ampel / Offsets ----------
  // 1
  {
    const r = await ev(() => {
      const idx = (a, st) => SKIPPER.reffLevel(a, st).idx, out = { gaps: [] };
      const combos = { base: { kids: false, season: 'sommer' }, kids: { kids: true, season: 'sommer' }, season: { kids: false, season: 'vor' }, both: { kids: true, season: 'vor' } };
      out.t = {}; for (const k in combos) out.t[k] = SKIPPER.reffLevel(0, combos[k]).thresholds;
      out.base = [idx(22, combos.base), idx(27, combos.base), idx(28, combos.base), idx(17, combos.base), idx(18, combos.base)];
      out.kids = [idx(22, combos.kids), idx(20, combos.kids), idx(19, combos.kids)];
      out.season = [idx(22, combos.season), idx(20, combos.season), idx(19, combos.season)];
      out.both = [idx(11, combos.both), idx(12, combos.both), idx(16, combos.both), idx(17, combos.both), idx(21, combos.both), idx(22, combos.both)];
      for (const k in combos) { let prev = 0; for (let v = 0; v <= 60; v++) { const i = idx(v, combos[k]); if (i < prev) out.gaps.push([k, 'mono', v]); prev = i; const t = SKIPPER.reffLevel(v, combos[k]).thresholds; const exp = v >= t[2] ? 3 : v >= t[1] ? 2 : v >= t[0] ? 1 : 0; if (i !== exp) out.gaps.push([k, v]); } }
      out.viaState = SKIPPER.reffStufe({ gust: 19, windTrue: 15, course: 'am Wind', kids: false, season: 'sommer' });
      out.viaStateKids = SKIPPER.reffStufe({ gust: 19, windTrue: 15, course: 'am Wind', kids: true, season: 'sommer' });
      out.course = [SKIPPER.apparentWind(20, 'am Wind'), SKIPPER.apparentWind(20, 'halber Wind'), SKIPPER.apparentWind(20, 'raum'), SKIPPER.apparentWind(20, 'vorm Wind')];
      return out;
    });
    const ok = JSON.stringify(r.t.base) === '[18,23,28]' && JSON.stringify(r.t.kids) === '[15,20,25]' && JSON.stringify(r.t.season) === '[15,20,25]' && JSON.stringify(r.t.both) === '[12,17,22]'
      && JSON.stringify(r.base) === '[1,2,3,0,1]' && JSON.stringify(r.kids) === '[2,2,1]' && JSON.stringify(r.season) === '[2,2,1]' && JSON.stringify(r.both) === '[0,1,1,2,2,3]'
      && r.gaps.length === 0 && r.viaState.apparent === 22 && r.viaState.idx === 1 && r.viaStateKids.idx === 2 && JSON.stringify(r.course) === '[23,21,18,16]';
    check('1  Reff 18/23/28; Kinder und Saison je -3; beide -6 mit Untergrenze 12/17/22 (11 Vollzeug, 12 1. Reff); keine Lücke 0-60; Kursfaktoren', ok, JSON.stringify(r));
  }
  // 2
  {
    const lv = async (st, gusts) => { const o = []; for (const g of gusts) o.push((await E({ ...base, windTrue: 5, gust: g, ...st })).general.level); return o.join(''); };
    const a = await lv({}, [17, 18, 27, 28]);
    const k = await lv({ kids: true }, [14, 15, 24, 25]);
    const kv = await lv({ kids: true, season: 'vor' }, [11, 12, 21, 22]);
    const fl = await ev(() => { const o = []; for (const kids of [false, true]) for (const season of ['sommer', 'vor']) { const T = SKIPPER.effThresholds({ kids, season }); o.push(T.traffic.yellow >= 12 && T.traffic.red >= 22 && T.reff.base[0] >= 12 && T.reff.base[1] >= 17 && T.reff.base[2] >= 22); } return o; });
    check('2  Ampel Böen 17g 18y 27y 28r; Kinder 15y/25r; Kinder+Vorsaison 12y/22r; Untergrenze 12/22', a === 'gyyr' && k === 'gyyr' && kv === 'gyyr' && fl.every(Boolean), JSON.stringify({ a, k, kv, fl }));
  }
  // 3
  {
    const o = [];
    for (const h of [1.0, 1.25, 2.0]) o.push((await E({ ...base, windTrue: 5, gust: 8, seaH: h })).general.level);
    check('3  Seegang 1.0 g, 1.25 y, 2.0 r', o.join('') === 'gyr', o.join(''));
  }
  // 4
  {
    const p = await posOf('de-heiligenhafen-marina');
    const st = { ...base, pos: p, dir: 'W', windTrue: 5, gust: 8 };
    const n = await E({ ...st, sicht: 'nebel' }), g = await E({ ...st, gewitter: true }), c = await E(st);
    check('4  Nebel -> overall mind. gelb; Gewitter -> mind. gelb; Kontrolle grün', ['y', 'r'].includes(n.overall.level) && ['y', 'r'].includes(g.overall.level) && c.overall.level === 'g' && /Radar\/AIS/.test(n.general.text) && /Hafen vorher erreichen/.test(g.general.text), JSON.stringify([n.overall.level, g.overall.level, c.overall.level]));
  }
  // 5
  {
    const p = await posOf('de-heiligenhafen-marina');
    const r = {};
    for (const v of [0, -60, -100, 100, 150]) r[v] = await E({ ...base, pos: p, dir: 'W', windTrue: 5, gust: 8, pegel: v });
    const ok = r[0].pegel === null && r[-60].pegel && r[-60].pegel.level === 'i' && r[-60].info.some(i => i.id === 'pegel') && r[-60].overall.level === 'g'
      && r[-100].pegel.level === 'y' && r[-100].overall.level === 'y' && r[100].pegel.level === 'y' && r[100].overall.level === 'y' && r[150].pegel.level === 'r' && r[150].overall.level === 'r'
      && /schwere Sturmflut/.test(r[150].pegel.text) && /leichte/.test(r[100].pegel.text + '') && /Niedrigwasserwarnung/.test(r[-100].pegel.text);
    check('5  Pegel -60 Info, -100 gelb, +100 gelb, +150 rot (mit BSH-Stufe im Text)', ok, JSON.stringify([r[-60].pegel, r[-100].pegel, r[100].pegel, r[150].pegel]));
  }

  // ---------- Gates ----------
  // 6
  {
    const p = await posOf('de-sassnitz');
    const a = await E({ ...base, pos: p, dir: 'SW', windTrue: 15, gust: 23 });
    const b = await E({ ...base, pos: p, dir: 'SW', windTrue: 12, gust: 16 });
    check('6  Sassnitz SW 15/23 -> Bornholm-Gate rot; SW 12/16 -> kein Gate', gate(a, 'bornholm')?.level === 'r' && !gate(b, 'bornholm'), JSON.stringify([gate(a, 'bornholm'), !!gate(b, 'bornholm')]));
  }
  // 7
  {
    const p = await posOf('dk-roenne-havn');
    const a = await E({ ...base, pos: p, dir: 'W', windTrue: 10, gust: 12, seaDir: 'W', seaH: 1.5 });
    const b = await E({ ...base, pos: p, dir: 'W', windTrue: 8, gust: 10, sicht: 'nebel' });
    const ga = gate(a, 'bornholm');
    check('7  Rønne Seegang 1.5 m bei 10/12 -> rot, "BORNHOLM BLEIBEN"; Rønne Nebel 8/10 -> rot', ga?.level === 'r' && ga.title.includes('BORNHOLM BLEIBEN') && gate(b, 'bornholm')?.level === 'r', JSON.stringify([ga, gate(b, 'bornholm')]));
  }
  // 8
  {
    const tromper = { lat: 54.62, lon: 13.45 };
    const kiel = await posOf('de-kiel-schilksee');
    const pre = await ev((t) => {
      const b = SKIPPER.CONST.gates.bornholm.box;
      const inBox = t.lat >= b.latMin && t.lat <= b.latMax && t.lon >= b.lonMin && t.lon <= b.lonMax;
      const d = ['de-glowe', 'de-lohme'].map(i => SKIPPER.haversineNm(t, SKIPPER.DATA.find(h => h.id === i)));
      return { inBox, d };
    }, tromper);
    const a = await E({ ...base, pos: tromper, dir: 'SW', windTrue: 15, gust: 23 });
    const k = await E({ ...base, pos: kiel, dir: 'SW', windTrue: 15, gust: 23 });
    check('8  Tromper Wiek (außerhalb der Box, <=15 sm von Glowe/Lohme) -> Gate aktiv; Kiel-Schilksee -> kein Bornholm-Gate', !pre.inBox && Math.min(...pre.d) <= 15 && gate(a, 'bornholm')?.level === 'r' && !gate(k, 'bornholm'), JSON.stringify({ pre, a: !!gate(a, 'bornholm'), k: !!gate(k, 'bornholm') }));
  }
  // 9
  {
    const p = await posOf('dk-grenaa-marina');
    const a = await E({ ...base, pos: p, dir: 'E', windTrue: 18, gust: 24 });
    const b = await E({ ...base, pos: p, dir: 'E', windTrue: 10, gust: 14 });
    const c = await E({ ...base, pos: p, dir: 'E', windTrue: 10, gust: 19, kids: true });
    const c0 = await E({ ...base, pos: p, dir: 'E', windTrue: 10, gust: 19, kids: false });
    check('9  Grenaa Marina E 18/24 rot; 10/14 kein Gate; Kinder 10/19 rot (22-3), ohne Kinder 10/19 kein Gate', gate(a, 'anholt')?.level === 'r' && !gate(b, 'anholt') && gate(c, 'anholt')?.level === 'r' && !gate(c0, 'anholt'), JSON.stringify([!!gate(a, 'anholt'), !!gate(b, 'anholt'), !!gate(c, 'anholt'), !!gate(c0, 'anholt')]));
  }
  // 10
  {
    const vb = await ev(() => SKIPPER.BRIDGES.find(b => b.id === 'dk-bro-storeb-ltsbroen-vestbroen'));
    const p = { lat: vb.lat - 3 / 60, lon: vb.lon };
    const d = await ev((p) => SKIPPER.haversineNm(p, SKIPPER.BRIDGES.find(b => b.id === 'dk-bro-storeb-ltsbroen-vestbroen')), p);
    const a = await E({ ...base, pos: p, dir: 'W', windTrue: 8, gust: 10 });
    const b = await E({ ...base, pos: p, dir: 'W', windTrue: 8, gust: 10, boat: { ...TB, mast: 15 } });
    const ga = bridge(a, 'bridge-' + vb.id), gb = bridge(b, 'bridge-' + vb.id);
    check('10 3 sm vor Storebælt-Vestbro (18 m): Mast 18,5 -> Gate rot "passt nicht"; Mast 15 -> kein rot; overall bleibt g trotz roter Brücke', Math.abs(d - 3) < 0.1 && ga?.level === 'r' && /passt nicht/.test(ga.text) && (!gb || gb.level !== 'r') && a.overall.level === 'g' && a.bridges.some(x => x.level === 'r'), JSON.stringify({ d, ga, gb }));
  }
  // 11
  {
    const far = await ev(() => SKIPPER.BRIDGES.find(b => b.id === 'dk-bro-sj-lland-far-broen'));
    const p = { lat: far.lat - 3 / 60, lon: far.lon };
    const id = 'bridge-' + far.id;
    const a = await E({ ...base, pos: p, dir: 'W', windTrue: 8, gust: 10 });
    const b = await E({ ...base, pos: p, dir: 'W', windTrue: 8, gust: 10, pegel: 60 });
    const ia = bridge(a, id), gb = bridge(b, id);
    check('11 Farø-Brücke 20,0 m: 18,5+1,0 -> nicht rot, Info "Reserve 0,5 m"; Pegel +60 cm -> 19,4 < 19,5 rot', ia && ia.level !== 'r' && /Reserve 0,5 m/.test(ia.text) && gb?.level === 'r', JSON.stringify({ ia, gb }));
  }
  // 12
  {
    const br = await ev(() => SKIPPER.BRIDGES.find(b => b.id === 'de-bro-wittow-freileitung'));
    const p = { lat: br.lat - 1 / 60, lon: br.lon };
    const a = await E({ ...base, pos: p, dir: 'W', windTrue: 8, gust: 10 });
    const g = bridge(a, 'bridge-de-bro-wittow-freileitung');
    check('12 Freileitung Wittow: Höhe unbekannt -> gelb "Durchfahrtshöhe unbekannt"', g?.level === 'y' && /Durchfahrtshöhe unbekannt/.test(g.text), JSON.stringify(g));
  }
  // 13
  {
    const p = await posOf('de-sassnitz');
    const s = (extra) => E({ ...base, pos: p, dir: 'SW', ...extra });
    const a = await s({ windTrue: 12, gust: 20 });
    const b = await s({ windTrue: 12, gust: 20, kids: true });
    const c = await s({ windTrue: 12, gust: 16, kids: true, season: 'vor' });
    const d = await s({ windTrue: 12, gust: 15, kids: true, season: 'vor' });
    const e = await s({ windTrue: 12, gust: 19, kids: false, season: 'vor' });
    const f = await s({ windTrue: 12, gust: 18, kids: true });
    check('13 Kinder/Saison wirken im Gate: 12/20 ohne Kinder kein Gate; Kinder rot (>=19; 18 nicht); Kinder+Vorsaison rot bei 16 (15 nicht); Vorsaison allein rot bei 19',
      !gate(a, 'bornholm') && gate(b, 'bornholm')?.level === 'r' && !gate(f, 'bornholm') && gate(c, 'bornholm')?.level === 'r' && !gate(d, 'bornholm') && gate(e, 'bornholm')?.level === 'r',
      JSON.stringify([!!gate(a, 'bornholm'), !!gate(b, 'bornholm'), !!gate(f, 'bornholm'), !!gate(c, 'bornholm'), !!gate(d, 'bornholm'), !!gate(e, 'bornholm')]));
  }

  // ---------- Hafenstatus ----------
  // 14
  {
    const w = await hs('dk-klintholm-havn', { ...base, dir: 'W', windTrue: 10, gust: 12 });
    const sw = await hs('dk-klintholm-havn', { ...base, dir: 'SW', windTrue: 10, gust: 12 });
    const n = await hs('de-rerik', { ...base, dir: 'N', windTrue: 10, gust: 12, boat: { ...TB, draft: 1.62 } });
    check('14 Windschutz: Klintholm W nicht rot (full); SW gelb (part); Rerik N (Flachkiel) -> Gesamtlevel n "Schutz unbekannt"', w.level !== 'r' && item(w, 'prot')?.level === 'g' && item(sw, 'prot')?.level === 'y' && sw.level !== 'g' && n.level === 'n' && has(n, /Schutz bei Wind aus N unbekannt/), JSON.stringify([w.level, sw.level, n.level, n.reasons]));
  }
  // 15
  {
    const a = await hs('dk-klintholm-havn', { ...base, dir: 'W', windTrue: 15, gust: 22 });
    const b = await hs('dk-klintholm-havn', { ...base, dir: 'W', windTrue: 12, gust: 16 });
    const c = await hs('dk-klintholm-havn', { ...base, dir: 'E', windTrue: 15, gust: 22 });
    check('15 Ansteuerung Klintholm: W 15/22 rot "Ansteuerung"; 12/16 gelb; E 15/22 keine Ansteuerungsmeldung', item(a, 'entrance', 'r') && /Ansteuerung/.test(item(a, 'entrance').text) && a.level === 'r' && item(b, 'entrance', 'y') && !item(c, 'entrance'), JSON.stringify([a.reasons, b.reasons, c.reasons]));
  }
  // 16
  {
    const st = { ...base, dir: 'N', windTrue: 8, gust: 10 };
    const a = await hs('dk-marstal-havn', st);
    const b = await hs('dk-marstal-havn', { ...st, pegel: -80 });
    const c = await hs('dk-marstal-havn', { ...st, boat: { ...TB, draft: 1.62 } });
    check('16 Tiefe Marstal: Default gelb "nur an den tiefsten Plätzen"; Pegel -80 rot; Flachkiel 1,62 gelb', item(a, 'depth', 'y') && /nur an den tiefsten Plätzen/.test(item(a, 'depth').text) && !item(a, 'depth', 'r') && item(b, 'depth', 'r') && b.level === 'r' && item(c, 'depth', 'y') && !item(c, 'depth', 'r'), JSON.stringify([a.reasons, b.reasons, c.reasons]));
  }
  // 17
  {
    const r = await ev((base) => {
      const ids = SKIPPER.DATA.filter(h => h.depthEntrance_m == null && h.depthBerthMin_m == null && h.depthBerthMax_m == null).map(h => h.id);
      const bad = [];
      ids.forEach(id => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].forEach(d => {
        const s = SKIPPER.harborStatus(SKIPPER.DATA.find(h => h.id === id), Object.assign({}, base, { dir: d, windTrue: 5, gust: 8 }));
        if (s.level === 'g' || !s.items.some(i => i.text === 'Tiefe unbekannt') || (s.level !== 'n' && !s.items.some(i => !i.noLevel && i.level === 'r'))) bad.push([id, d, s.level]);
      }));
      return { n: ids.length, bad };
    }, base);
    const g = [];
    for (const d of DIRS) g.push((await hs('de-grossenbrode-kommunal', { ...base, dir: d, windTrue: 5, gust: 8 })).level);
    check('17 Beide Tiefen unbekannt -> Level n (oder r, wenn ein roter Grund bekannt ist), "Tiefe unbekannt", nie grün (alle 8 Richtungen, alle betroffenen Häfen)', r.n > 0 && r.bad.length === 0 && g.every(l => l === 'n'), JSON.stringify({ r, g }));
  }
  // 18
  {
    const st = { ...base, dir: 'SW', windTrue: 8, gust: 10 };
    const a = await hs('de-rerik', st);
    const b = await hs('de-rerik', { ...st, boat: { ...TB, draft: 1.62 } });
    check('18 maxDraft Rerik (1,8): Tiefgang 1,95 -> Gesamtlevel rot "max. Tiefgang"; Flachkiel 1,62 -> kein maxDraft-Grund', a.level === 'r' && item(a, 'depth', 'r') && /max\. Tiefgang/.test(item(a, 'depth', 'r').text) && !has(b, /max\. Tiefgang/), JSON.stringify([a.reasons, b.reasons]));
  }
  // 19
  {
    const st = { ...base, dir: 'N', windTrue: 8, gust: 10 };
    const klapp = await hs('dk-guldborg-bro-og-baadehavn', st);
    const syn = await synth('dk-marstal-havn', { bridgeIds: ['dk-bro-storeb-ltsbroen-vestbroen'] });
    const fest = await hsX(syn, st);
    const ok16 = await hsX(syn, { ...st, boat: { ...TB, mast: 15 } });
    check('19 Brücke auf Zufahrt: Klappbrücke (Guldborg) -> gelb "nur zu Öffnungszeiten"; synthetisch feste Brücke 18 m unter Mast -> rot; Mast 15 -> kein rot', item(klapp, 'bridge', 'y') && /nur zu Öffnungszeiten/.test(item(klapp, 'bridge').text) && item(fest, 'bridge', 'r') && fest.level === 'r' && !item(ok16, 'bridge', 'r'), JSON.stringify([klapp.reasons, fest.reasons]));
  }
  // 20
  {
    const r = await ev((base) => {
      const out = { gf: [], nf: [], labels: {} };
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      SKIPPER.DATA.forEach(h => {
        if (h.refugeLevel !== 'grenzfall' && h.refugeLevel !== 'notfall') return;
        dirs.forEach(d => [[3, 4], [10, 12]].forEach(([w, g]) => {
          const s = SKIPPER.harborStatus(h, Object.assign({}, base, { dir: d, windTrue: w, gust: g }));
          if (s.level === 'g') out[h.refugeLevel === 'grenzfall' ? 'gf' : 'nf'].push([h.id, d]);
          out.labels[h.refugeLevel] = out.labels[h.refugeLevel] || s.refugeLabel;
        }));
      });
      return out;
    }, base);
    const ny = await hs('dk-nyord-havn', { ...base, dir: 'N', windTrue: 5, gust: 8 });
    const nf = await hs('dk-grenaa-havn', { ...base, dir: 'N', windTrue: 5, gust: 8 });
    check('20 Grenzfall (Nyord) nie grün, Label "Grenzfall"; Berufshafen (notfall) nie grün, Label "Berufshafen"', r.gf.length === 0 && r.nf.length === 0 && /Grenzfall/.test(ny.refugeLabel) && /Berufshafen/.test(nf.refugeLabel) && ny.level !== 'g' && nf.level !== 'g', JSON.stringify({ r, ny: ny.refugeLabel, nf: nf.refugeLabel }));
  }
  // 21
  {
    const st = { ...base, dir: 'N', windTrue: 8, gust: 10 };
    const a = await hs('dk-marstal-havn', { ...st, longWind: 'SW' });
    const b = await hs('dk-marstal-havn', st);
    const it = a.items.find(i => /bis −1,2 m/.test(i.text));
    check('21 Surge Marstal: Starkwind >12 h aus SW, Pegel 0 -> zusätzlicher gelber Grund "bis −1,2 m"; ohne Starkwind kein solcher Grund', it && it.level === 'y' && !has(b, /bis −1,2 m/), JSON.stringify([a.reasons]));
  }
  // 22
  {
    const syn = await synth('dk-marstal-havn', { season: { open: '04-01', close: '10-31' } });
    const nov = await hsX(syn, { ...base, dir: 'N', windTrue: 8, gust: 10, now: Date.UTC(2026, 10, 15, 11, 0) });
    const jul = await hsX(syn, { ...base, dir: 'N', windTrue: 8, gust: 10, now: Date.UTC(2026, 6, 15, 11, 0) });
    check('22 Saison synthetisch 01.04.-31.10.: am 15.11. gelb "außerhalb der Saison"; am 15.07. kein Saison-Grund', item(nov, 'season', 'y') && /außerhalb der Saison/.test(item(nov, 'season').text) && !item(jul, 'season'), JSON.stringify([nov.reasons, jul.reasons]));
  }
  // 23
  {
    const syn = await synth('dk-marstal-havn', { catFriendly: false });
    const kat = { type: 'kat', loa: 10.5, beam: 5.5, draft: 1.0, mast: 15, margin: 0.3, bridgeMargin: 1.0, profile: 'kat' };
    const a = await hsX(syn, { ...base, dir: 'N', windTrue: 8, gust: 10, boat: kat });
    const b = await hsX(syn, { ...base, dir: 'N', windTrue: 8, gust: 10 });
    check('23 Katamaran + catFriendly=false -> gelb; Einrumpf -> kein Kat-Grund', item(a, 'dim', 'y') && /Katamaran/.test(item(a, 'dim').text) && !has(b, /Katamaran/), JSON.stringify([a.reasons, b.reasons]));
  }
  // 24
  {
    const r = await ev((base) => {
      const bad = [];
      SKIPPER.DATA.forEach(h => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].forEach(d => {
        const s = SKIPPER.harborStatus(h, Object.assign({}, base, { dir: d, windTrue: 30, gust: 40 }));
        if (s.level === 'g') bad.push([h.id, d]);
      }));
      return bad;
    }, base);
    check('24 Nie "immer grün": jeder Hafen bei Böen 40 in jeder Richtung nicht grün', r.length === 0, JSON.stringify(r.slice(0, 5)));
  }

  // 37 / 38 (Abnahme-Korrekturen)
  {
    const st = { ...base, dir: 'N', windTrue: 8, gust: 10 };
    const a = await hs('de-rerik', st), b = await hs('de-rerik', { ...st, boat: { ...TB, draft: 1.62 } });
    const o = await ev((base) => { const bad = []; SKIPPER.DATA.forEach(h => ['N','NE','E','SE','S','SW','W','NW'].forEach(d => { const s = SKIPPER.harborStatus(h, Object.assign({}, base, { dir: d, windTrue: 8, gust: 10 })); if (s.items.some(i => !i.noLevel && i.level === 'r') && s.level !== 'r') bad.push([h.id, d, s.level]); })); return bad; }, base);
    check('37 Rangfolge r > n > y > g: Rerik N Default -> r; mit Flachkiel -> n; nirgends verdeckt n ein rotes Item', a.level === 'r' && b.level === 'n' && o.length === 0, JSON.stringify([a.level, b.level, o.slice(0, 3)]));
  }
  {
    const fs = await ev(() => SKIPPER.BRIDGES.find(b => b.id === 'de-bro-fehmarnsund'));
    const p = { lat: fs.lat - 3 / 60, lon: fs.lon };
    const a = await E({ ...base, pos: p, dir: 'W', windTrue: 8, gust: 10 });
    const g = bridge(a, 'bridge-de-bro-fehmarnsund');
    const syn = await ev(() => {
      const mk = (h, v) => Object.assign({}, SKIPPER.BRIDGES.find(b => b.id === 'dk-bro-storeb-ltsbroen-vestbroen'), { clearanceClosed_m: h, verified: { clearance: v } });
      return { ok: SKIPPER.bridgeCheck(mk(30, true), undefined, 0), unv: SKIPPER.bridgeCheck(mk(30, false), undefined, 0), near: SKIPPER.bridgeCheck(mk(20, false), undefined, 0) };
    });
    check('38 Ungeprüfte Brücke: Fehmarnsund 22 m, Mast 18,5 -> Gate gelb "ungeprüft" + "Reserve 2,5 m"; 30 m geprüft -> g; 30 m ungeprüft -> nur Info, nie g', g?.level === 'y' && /ungeprüft/.test(g.text) && /Reserve (nur )?2,5 m/.test(g.text) && syn.ok.level === 'g' && syn.unv.level === 'i' && syn.near.level === 'y', JSON.stringify({ g, syn: [syn.ok.level, syn.unv.level, syn.near.level] }));
  }

  // ---------- Liste / Empfehlung / Rechnen ----------
  // 25
  {
    const d = await ev(() => {
      const f = (a, b) => SKIPPER.haversineNm(SKIPPER.DATA.find(x => x.id === a), SKIPPER.DATA.find(x => x.id === b));
      return { hb: f('de-heiligenhafen-marina', 'de-breege'), sr: f('de-sassnitz', 'dk-roenne-havn') };
    });
    check('25 Haversine Heiligenhafen->Breege 84±1 sm; Sassnitz->Rønne 51±1 sm', Math.abs(d.hb - 84) <= 1 && Math.abs(d.sr - 51) <= 1, JSON.stringify(d));
  }
  // 26
  {
    const p = await posOf('dk-roenne-havn');
    const r = await ev(({ p, base }) => {
      const e = SKIPPER.evaluate(Object.assign({}, base, { pos: p, dir: 'W', windTrue: 12, gust: 16 }));
      const g = e.rec.green;
      return { g: g && { id: g.h.id, rl: g.h.refugeLevel, lvl: g.status.level, dist: g.dist }, belegt: e.rec.belegt && e.rec.belegt.h.id, far: e.rec.far, fb: e.rec.fallback && e.rec.fallback.h.id,
        anyNullGreen: e.list.some(it => it.status.level === 'g' && !it.h.refugeLevel && e.rec.green === it) };
    }, { p, base });
    check('26 recommend an Rønne W 12/16: green existiert, refugeLevel in {belegt, plan, abgeleitet}, nie refugeLevel null', r.g && ['belegt', 'plan', 'abgeleitet'].includes(r.g.rl) && r.g.lvl === 'g' && !r.anyNullGreen, JSON.stringify(r));
  }
  // 27
  {
    const p = await posOf('de-rerik');
    const r = await ev(({ p, base }) => {
      const e = SKIPPER.evaluate(Object.assign({}, base, { pos: p, dir: 'SW', windTrue: 8, gust: 10 }));
      const all = e.list.map(i => i.h.id);
      const fits = SKIPPER.filterList(e.list, { fits: true }, e.state);
      const ref = SKIPPER.filterList(e.list, { refuge: true }, e.state);
      return { rerikIn: all.includes('de-rerik'), rerikFits: fits.some(i => i.h.id === 'de-rerik'), fitsN: fits.length, n: all.length, refugeNull: ref.filter(i => !i.h.refugeLevel).length, refN: ref.length };
    }, { p, base });
    check('27 Filter "passt für mein Boot" entfernt Rerik; "nur Zuflucht" zeigt keine refugeLevel null', r.rerikIn && !r.rerikFits && r.fitsN < r.n && r.refugeNull === 0 && r.refN > 0, JSON.stringify(r));
  }
  // 28
  {
    const s = await ev(() => ({ a: SKIPPER.sunTimes(54.38, 10.98, Date.UTC(2026, 5, 21, 12)), b: SKIPPER.sunTimes(54.38, 10.98, Date.UTC(2026, 11, 21, 12)) }));
    const min = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    check('28 Sonnenuntergang Heiligenhafen: 21.06. 21:55±5 MESZ; 21.12. 15:53±5 MEZ', Math.abs(min(s.a.sunset) - (21 * 60 + 55)) <= 5 && s.a.label === 'MESZ' && Math.abs(min(s.b.sunset) - (15 * 60 + 53)) <= 5 && s.b.label === 'MEZ', JSON.stringify([s.a.sunset, s.a.label, s.b.sunset, s.b.label]));
  }
  // 29
  {
    const r = await ev(() => { const a = SKIPPER.seaAreaOf({ lat: 54.5, lon: 10.3 }); return { a, names: SKIPPER.SEAAREAS.map(x => x.name) }; });
    check('29 Seegebiet Kieler Bucht (54.5, 10.3): Name aus SEAAREAS + "ungeprüft"', r.a && r.names.includes(r.a.name) && /ungeprüft/.test(r.a.label), JSON.stringify(r.a));
  }
  // 30
  {
    const so = await posOf('dk-soenderborg-havn'), ue = await posOf('de-ueckermuende');
    const r = await ev(({ so, ue }) => {
      const de15 = SKIPPER.DATA.some(h => h.country === 'DE' && SKIPPER.haversineNm(so, h) <= 15);
      return { so: SKIPPER.countryOf(so), ue: SKIPPER.countryOf(ue), de15 };
    }, { so, ue });
    check('30 Land: Sønderborg -> DK (+DE wenn DE-Hafen <=15 sm); Ueckermünde/Haff -> DE + PL', r.so[0] === 'DK' && (r.so.includes('DE') === r.de15) && r.ue.includes('DE') && r.ue.includes('PL'), JSON.stringify(r));
  }
  // 31
  {
    const r = await ev(() => {
      const ids = SKIPPER.DATA.map(h => h.id), a = SKIPPER.CONST.area;
      const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
      const bad = SKIPPER.DATA.filter(h => !(h.lat >= a.latMin && h.lat <= a.latMax && h.lon >= a.lonMin && h.lon <= a.lonMax)).map(h => h.id);
      const bids = new Set(SKIPPER.BRIDGES.map(b => b.id));
      const badBr = []; SKIPPER.DATA.forEach(h => (h.bridgeIds || []).forEach(b => { if (!bids.has(b)) badBr.push([h.id, b]); }));
      const keys = ['id', 'name', 'country', 'region', 'type', 'lat', 'lon', 'prot', 'protSource', 'entranceOpen', 'swellOpen', 'depthEntrance_m', 'depthBerthMin_m', 'depthBerthMax_m', 'maxDraft_m', 'maxLoa_m', 'maxBeam_m', 'catFriendly', 'bridgeIds', 'surge', 'season', 'vhf', 'tel', 'web', 'note', 'verified', 'src', 'refuge', 'refugeLevel', 'plans', 'distHeiligenhafen_sm', 'distBreege_sm', 'zone'];
      const schema = SKIPPER.DATA.filter(h => keys.some(k => !(k in h))).map(h => h.id);
      const jump = [].concat(SKIPPER.CONST.gates.bornholm.ids, SKIPPER.CONST.gates.anholt.ids).filter(i => !ids.includes(i));
      return { n: ids.length, dup, bad, badBr, schema, jump };
    });
    check('31 Datenintegrität: 430 Häfen, ids eindeutig, alle in area, bridgeIds auflösbar, Schema vollständig', r.n === 430 && r.dup.length === 0 && r.bad.length === 0 && r.badBr.length === 0 && r.schema.length === 0, JSON.stringify(r));
    check('31b Gate-Absprunghäfen existieren alle in den Daten', r.jump.length === 0, JSON.stringify(r.jump));
  }
  // 32
  {
    const x = await ev(() => ({
      dm1: SKIPPER.formatDM(54.5, true) + ' ' + SKIPPER.formatDM(10.3, false),
      nav: SKIPPER.utcToLocal('06:50', Date.UTC(2026, 9, 17)).text, nav2: SKIPPER.utcToLocal('18:50', Date.UTC(2026, 9, 17)).text,
      cet: SKIPPER.utcToLocal('06:50', Date.UTC(2026, 9, 26)).text, off1: SKIPPER.euOffset(Date.UTC(2026, 9, 25, 0, 59)), off2: SKIPPER.euOffset(Date.UTC(2026, 9, 25, 1, 0)),
      parse: SKIPPER.parseDM('54', '22.6'), parseBad: SKIPPER.parseDM('54', '61'),
      out: [SKIPPER.isOutOfArea({ lat: 45, lon: 9 }), SKIPPER.isOutOfArea({ lat: 54.4, lon: 11 })]
    }));
    check('32a (E1) Grad/Dezimalminuten-Format "54°30,0′ N 010°18,0′ E"', x.dm1 === '54°30,0′ N 010°18,0′ E', x.dm1);
    check('32b (E2) UTC→Ortszeit MESZ 06:50→08:50, 18:50→20:50; nach 25.10. MEZ; Umstellung 01:00 UTC', x.nav === '08:50' && x.nav2 === '20:50' && x.cet === '07:50' && x.off1 === 2 && x.off2 === 1, JSON.stringify(x));
    check('32c (E3) manuelle Eingabe parse + Plausibilität (außerhalb area)', Math.abs(x.parse - (54 + 22.6 / 60)) < 1e-9 && isNaN(x.parseBad) && x.out[0] === true && x.out[1] === false, JSON.stringify(x));
  }

  // ---------- System ----------
  // extra UI checks (gust notice, first start, layout)
  {
    const first = await ev(() => document.getElementById('scr-boot').classList.contains('active'));
    check('33a Erster Start: Boot-Tab zuerst mit "Profil übernehmen"', first && (await page.isVisible('#bt-confirm')));
    await page.click('#bt-confirm');
    await ev(() => { SKIPPER.state.windTrue = 20; SKIPPER.state.gust = 20; SKIPPER.update(); });
    await page.click('button[data-k="gust"][data-d="-1"]');
    const ui = await ev(() => ({ g: SKIPPER.state.gust, vis: document.getElementById('gustnotice').style.display }));
    check('33b UI: Böen-Minus unter Mittelwind bleibt 20 + Hinweis sichtbar', ui.g === 20 && ui.vis === 'block', JSON.stringify(ui));
  }
  // 33
  {
    await page.click('[data-dir="SW"]'); await page.click('[data-sdir="W"]');
    await page.selectOption('#regselect', await ev(() => SKIPPER.REGIONS.find(r => r.region === 'Rügen').key));
    await page.click('button[data-k="seaH"][data-d="0.25"]'); await page.click('button[data-k="pegel"][data-d="10"]');
    await page.click('[data-sicht="nebel"]'); await page.click('[data-ldir="SW"]'); await page.click('#gewitter'); await page.click('#kids');
    const overflow = [];
    for (const s of ['scr-lage', 'scr-zuflucht', 'scr-notfall', 'scr-regeln', 'scr-boot']) {
      await page.click(`nav button[data-scr="${s}"]`);
      const w = await ev(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (w.sw > w.cw) overflow.push([s, w]);
    }
    await page.click('#themebtn'); const night = await ev(() => document.documentElement.getAttribute('data-theme')); await page.click('#themebtn');
    const day = await ev(() => document.documentElement.getAttribute('data-theme'));
    await page.selectOption('#b-profile', await ev(() => SKIPPER.PROFILES.find(p => /ab 2010.*Flachkiel/.test(p.label)).id));
    const draft = await ev(() => SKIPPER.state.boat.draft);
    await page.selectOption('#b-profile', await ev(() => SKIPPER.PROFILES.find(p => p.id === 'kat').id));
    const katMissing = await ev(() => SKIPPER.boatNeeds(SKIPPER.state.boat).missing.length);
    const katHarbor = await ev(() => SKIPPER.harborStatus(SKIPPER.DATA.find(h => h.id === 'dk-marstal-havn'), Object.assign({}, SKIPPER.state, { dir: 'N', windTrue: 5, gust: 8 })).items.some(i => i.level === 'n' && /Bootsdaten fehlen/.test(i.text)));
    await page.selectOption('#b-profile', await ev(() => SKIPPER.PROFILES[0].id));
    await page.fill('#b-mast', '17,5');
    await page.click('nav button[data-scr="scr-notfall"]'); await page.click('#btn-mypos'); await page.waitForTimeout(300);
    await page.click('nav button[data-scr="scr-lage"]');
    check('33 Keine JS-Fehler, 0 externe Requests, Tabs/Nachtmodus/Boot-Profil, kein horizontales Scrollen (390 px)', errors.length === 0 && external.length === 0 && night === 'night' && day === null && draft === 1.62 && katMissing > 0 && katHarbor && overflow.length === 0,
      JSON.stringify({ errors, external, night, day, draft, katMissing, katHarbor, overflow }));
  }

  // 34/35 PDF
  {
    execFileSync('node', [path.join(__dirname, 'build-pdf.js')], { stdio: 'inherit' });
    const pdf = path.join(ROOT, 'Bordkarte_Ostsee_v1.pdf');
    const info = execFileSync('pdfinfo', [pdf]).toString();
    const pages = +/Pages:\s+(\d+)/.exec(info)[1];
    const a4 = /A4/.test(info);
    const txt = [];
    for (let i = 1; i <= pages; i++) txt.push(execFileSync('pdftotext', ['-layout', '-f', String(i), '-l', String(i), pdf, '-']).toString());
    const p1 = txt[0];
    const words = ['MAYDAY', 'NAVTEX', 'Bremen', 'JRCC'].filter(w => !p1.includes(w));
    const tel = /124 124|124124/.test(p1);
    check('34 PDF A4; Seite 1 enthält MAYDAY, NAVTEX, Bremen, 124 124/124124, JRCC', a4 && words.length === 0 && tel, JSON.stringify({ a4, words, tel }));

    const dom = await ev(() => {
      const ids = [...document.querySelectorAll('#printdoc tbody.pl')].map(x => x.dataset.hid);
      const lat = Object.fromEntries(SKIPPER.DATA.map(h => [h.id, h.lat]));
      const groups = []; let cur = null;
      const harborTable = [...document.querySelectorAll('#printdoc table')].find(t => t.querySelector('tbody.pl'));
      for (const el of harborTable.querySelectorAll('tbody')) {
        if (el.classList.contains('gh')) { cur = { head: el.textContent.trim(), ids: [] }; groups.push(cur); } else cur.ids.push(el.dataset.hid);
      }
      const heads = groups.map(g => g.head);
      const inGroupSorted = groups.every(g => g.ids.every((id, i) => i === 0 || lat[g.ids[i - 1]] >= lat[id]));
      const cols = harborTable.querySelector('thead').textContent;
      return { ids, n: SKIPPER.DATA.length, uniq: new Set(ids).size, heads, dupHeads: heads.length - new Set(heads).size, inGroupSorted, cols, nonEmpty: groups.filter(g => g.ids.length).length };
    });
    const cols = ['Name', 'Typ', 'Position', 'Schutz', 'Tiefe', 'Brücke', 'VHF', 'Tel', 'Zufl', 'Status'].every(c => dom.cols.includes(c));
    const once = dom.ids.length === dom.n && dom.uniq === dom.n && dom.dupHeads === 0;
    const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
    const heads = dom.heads.map(norm);
    const orphan = [];
    txt.forEach((t, i) => {
      const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
      const last = norm(lines[lines.length - 1] || '');
      if (heads.some(h => last === h || last.startsWith(h))) orphan.push(i + 1);
    });
    // every harbour name must appear in the text
    const alltxt = txt.join('\n');
    const lost = await ev(() => SKIPPER.DATA.map(h => h.name));
    const missingNames = lost.filter(n => !alltxt.includes(n.split(/[\s(]/)[0])).slice(0, 5);
    check('35 PDF: jeder Hafen genau einmal, Spalten vollständig, je Gruppe lat absteigend, kein Gruppenkopf als letzte Zeile', once && cols && dom.inGroupSorted && orphan.length === 0 && missingNames.length === 0, JSON.stringify({ n: dom.ids.length, uniq: dom.uniq, dupHeads: dom.dupHeads, cols, sorted: dom.inGroupSorted, orphan, missingNames }));
    console.log('   PDF pages:', pages);
  }

  // 36
  {
    await page.click('nav button[data-scr="scr-regeln"]');
    const r = await ev(() => {
      const bad = [], els = [...document.querySelectorAll('#scr-regeln [data-c]')];
      els.forEach(el => {
        const path = el.dataset.c, shown = Number(el.textContent.replace(',', '.'));
        let exp;
        if (el.dataset.k !== undefined) exp = path.split('.').reduce((a, k) => a[k], SKIPPER.effThresholds({ kids: el.dataset.k === '1', season: el.dataset.s === '1' ? 'vor' : 'sommer' }));
        else exp = path.split('.').reduce((a, k) => a[k], SKIPPER.CONST);
        if (!(shown === exp)) bad.push([path, el.textContent, exp]);
      });
      return { n: els.length, bad, kinds: new Set(els.map(e => e.dataset.c.split('.')[0])).size };
    });
    check('36 Regeln-Screen: alle Schwellen im DOM == CONST/effThresholds (data-c)', r.n >= 40 && r.bad.length === 0 && r.kinds >= 8, JSON.stringify({ n: r.n, kinds: r.kinds, bad: r.bad.slice(0, 5) }));
  }

  // 39 default profile (owner-confirmed boat), no explicit boat in state
  {
    const D = await ev(() => { const d = SKIPPER.DEFAULT_BOAT; return [d.draft, d.mast, d.loa, d.beam, SKIPPER.PROFILES[0].label]; });
    const at = async (id, st) => { const b = await ev((i) => SKIPPER.BRIDGES.find(x => x.id === i), id); return E({ ...base, boat: undefined, pos: { lat: b.lat - 3 / 60, lon: b.lon }, dir: 'W', windTrue: 8, gust: 10, ...st }); };
    const f0 = await at('dk-bro-sj-lland-far-broen', {}), f10 = await at('dk-bro-sj-lland-far-broen', { pegel: 10 });
    const sb = await at('dk-bro-storeb-ltsbroen-vestbroen', {}), fs = await at('de-bro-fehmarnsund', {});
    const bf = (r, id) => r.bridges.find(x => x.id === 'bridge-' + id);
    check('39 Default-Profil 1,55/19,0/10,50/3,30; Farø Pegel 0 nicht rot, +10 cm rot; Storebælt rot; Fehmarnsund gelb "Reserve nur 2,0 m"',
      D[0] === 1.55 && D[1] === 19 && D[2] === 10.5 && D[3] === 3.3 && /Dehler 35 CWS/.test(D[4]) &&
      bf(f0, 'dk-bro-sj-lland-far-broen').level !== 'r' && bf(f10, 'dk-bro-sj-lland-far-broen').level === 'r' &&
      bf(sb, 'dk-bro-storeb-ltsbroen-vestbroen').level === 'r' && bf(fs, 'de-bro-fehmarnsund').level === 'y' && /Reserve nur 2,0 m/.test(bf(fs, 'de-bro-fehmarnsund').text),
      JSON.stringify([D, bf(f0, 'dk-bro-sj-lland-far-broen'), bf(f10, 'dk-bro-sj-lland-far-broen'), bf(fs, 'de-bro-fehmarnsund')]));
  }
  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
  if (failed.length) { console.log('FAILED: ' + failed.map(f => f.name.slice(0, 40)).join(' | ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(2); });
