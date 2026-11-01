// Generates 390x844 screenshots into ../screens (run after tools/build.js)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'screens');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.SKIPPER);
  const shot = (n, full = true) => page.screenshot({ path: path.join(out, n + '.png'), fullPage: full });
  const go = async (scr) => { await page.click(`nav button[data-scr="${scr}"]`); await page.evaluate(() => window.scrollTo(0, 0)); };
  const set = (st) => page.evaluate((s) => { Object.assign(SKIPPER.state, s); SKIPPER.update(); }, st);
  const posOf = (id) => page.evaluate((i) => { const h = SKIPPER.DATA.find(x => x.id === i); return { lat: h.lat, lon: h.lon, src: 'manual', t: Date.now() }; }, id);
  // fixed midday clock so the screenshots do not depend on the time of day
  const NOW = Date.UTC(2026, 6, 15, 9, 0);

  await shot('00-boot-erststart');
  await page.click('#bt-confirm');
  await set({ now: NOW });
  await shot('01-lage-leer');
  // Bornholm gate from Sassnitz
  await set({ pos: await posOf('de-sassnitz'), dir: 'SW', windTrue: 15, gust: 23, seaDir: 'SW', seaH: 1.0 });
  await shot('02-lage-bornholm-gate-ab-sassnitz');
  // refuge from Rønne
  await set({ pos: await posOf('dk-roenne-havn'), dir: 'W', windTrue: 12, gust: 16, seaDir: 'W', seaH: 0.5 });
  await go('scr-zuflucht'); await shot('03-zuflucht-ab-roenne', false);
  // bridge gate Storebælt
  await go('scr-lage');
  const vb = await page.evaluate(() => SKIPPER.BRIDGES.find(b => b.id === 'dk-bro-storeb-ltsbroen-vestbroen'));
  await set({ pos: { lat: vb.lat - 3 / 60, lon: vb.lon, src: 'manual', t: Date.now() }, dir: 'W', windTrue: 8, gust: 10, seaDir: null, seaH: 0 });
  await shot('04-lage-bruecken-gate-storebaelt');
  // emergency
  await set({ pos: await posOf('de-sassnitz') });
  await go('scr-notfall'); await shot('05-notfall');
  // rules
  await go('scr-regeln'); await shot('06-regeln');
  // boat
  await go('scr-boot'); await shot('07-boot');
  // night mode
  await page.click('#themebtn');
  await set({ pos: await posOf('de-sassnitz'), dir: 'SW', windTrue: 15, gust: 23, seaDir: 'SW', seaH: 1.0, kids: true });
  await go('scr-lage'); await shot('08-nacht-lage');
  await go('scr-zuflucht'); await shot('09-nacht-zuflucht', false);
  await go('scr-notfall'); await shot('10-nacht-notfall', false);
  // v1.4: target (day mode)
  await page.click('#themebtn');
  await set({ pos: await posOf('de-sassnitz'), dir: 'NE', windTrue: 15, gust: 20, seaDir: null, seaH: 0, kids: false, speed: 5.5 });
  await page.evaluate(() => { SKIPPER.state.target = null; SKIPPER.state.courseMode = 'auto'; });
  await go('scr-lage');
  await page.fill('#tsearch', 'ronne'); await page.waitForSelector('#tsug [data-tid]');
  await page.click('#tsug [data-tid]');
  const y0 = await page.evaluate(() => { const h = [...document.querySelectorAll('#scr-lage h2')].find(x => /Ziel/.test(x.textContent)); return Math.max(0, h.getBoundingClientRect().top + window.scrollY - 8); });
  await page.addStyleTag({ content: 'nav{position:static !important}' });
  await page.screenshot({ path: path.join(out, '11-lage-ziel-sassnitz-roenne-kreuzen.png'), fullPage: true, clip: { x: 0, y: y0, width: 390, height: 1500 } });
  await page.addStyleTag({ content: 'nav{position:fixed !important}' });
  await page.evaluate(() => { SKIPPER.state.target = null; SKIPPER.update(); });
  await set({ pos: await posOf('dk-roenne-havn'), dir: 'W', windTrue: 12, gust: 16 });
  await go('scr-zuflucht');
  await page.click('#zlist [data-target]');
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot('12-zuflucht-als-ziel', false);
  // v1.6: bridge banner with opening times and contact (Wolgast)
  await page.evaluate(() => { SKIPPER.state.target = null; });
  const wg = await page.evaluate(() => SKIPPER.BRIDGES.find(b => b.id === 'de-bro-wolgast'));
  await set({ pos: { lat: wg.lat - 2 / 60, lon: wg.lon, src: 'manual', t: Date.now() }, dir: 'W', windTrue: 8, gust: 10, seaDir: null, seaH: 0 });
  await go('scr-lage');
  const yb = await page.evaluate(() => { const h = [...document.querySelectorAll('#scr-lage h2')].find(x => /Brücken in der Nähe/.test(x.textContent)); return Math.max(0, h.getBoundingClientRect().top + window.scrollY - 8); });
  await page.addStyleTag({ content: 'nav{position:static !important}' });
  await page.screenshot({ path: path.join(out, '13-lage-bruecke-wolgast-kontakt.png'), fullPage: true, clip: { x: 0, y: yb, width: 390, height: 900 } });
  await page.addStyleTag({ content: 'nav{position:fixed !important}' });
  // v2.0: Törnplaner (fixture weather, no network)
  {
    const { makeWx } = require('./wxfixture.js');
    const pts = await page.evaluate(() => SKIPPER.WXGRID.points);
    const t0 = Date.UTC(2026, 6, 15);
    const snap = makeWx(pts, t0, (i, h) => ({ ws: 11 + 3 * Math.sin(h / 9), wd: 240 + 20 * Math.sin(h / 20), wg: 16 + 4 * Math.sin(h / 9), wh: 0.5 + 0.2 * Math.sin(h / 12) }), { fetchedAt: Date.UTC(2026, 6, 15, 5) });
    await page.evaluate((s) => SKIPPER.wxSet(s), snap);
    await set({ pos: await posOf('de-heiligenhafen-marina'), dir: 'SW', windTrue: 12, gust: 17, seaDir: null, seaH: 0 });
    await go('scr-toern');
    await page.evaluate(() => { document.getElementById('p-date').value = '2026-07-15'; document.getElementById('p-date').dispatchEvent(new Event('change')); });
    await page.selectOption('#p-start', 'de-heiligenhafen-marina'); await page.selectOption('#p-days', '5');
    await page.evaluate(() => { const r = SKIPPER.planTrip({ mode: 'rund', start: 'de-heiligenhafen-marina', date: '2026-07-15', days: 5, depHour: 8, maxLegH: 8, daylight: true, speed: 5.5 }); SKIPPER.PL.plan = SKIPPER.planSerialize(r); SKIPPER.renderPlan(); document.getElementById('wxstate').textContent = 'Wetterstand 07:00 MESZ, 15.07. (Open-Meteo) · 108 Punkte'; });
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('15-toern-wetter-form', false);
    await page.waitForTimeout(200);
    const ym = await page.evaluate(() => { SKIPPER.mapFit(null); return document.getElementById('planhead').getBoundingClientRect().top + window.scrollY - 8; });
    await page.evaluate((y) => window.scrollTo(0, y), ym);
    await shot('16-toern-karte', false);
    await page.evaluate(() => { const d = document.querySelector('#planres details.wpd'); if (d) d.open = true; });
    const yp = await page.evaluate(() => document.getElementById('planres').getBoundingClientRect().top + window.scrollY - 8);
    await page.addStyleTag({ content: 'nav{position:static !important}' });
    await page.screenshot({ path: path.join(out, '14-toern-plan.png'), fullPage: true, clip: { x: 0, y: yp, width: 390, height: 1400 } });
    await page.addStyleTag({ content: 'nav{position:fixed !important}' });
  }
  const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  await browser.close();
  console.log('errors:', JSON.stringify(errs), 'scrollWidth/clientWidth:', JSON.stringify(w));
})().catch(e => { console.error(e); process.exit(1); });
