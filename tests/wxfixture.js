// Synthetic Open-Meteo-like snapshots for planner tests (no network).
// fn(pointIndex, hourIndex, lat, lon) -> {ws, wd, wg, wh, wdir, wc, vis}
function makeWx(points, t0, fn, opts) {
  const hours = 168, o = opts || {};
  const snap = { type: 'skipper-ostsee-wx', version: 1, fetchedAt: new Date(o.fetchedAt || t0).toISOString(), source: o.source || 'open-meteo', points, t0, hours,
    ws: [], wd: [], wg: [], wc: [], vis: [], wh: o.noMarine ? null : [], wdir: o.noMarine ? null : [] };
  points.forEach((p, i) => {
    const r = { ws: [], wd: [], wg: [], wc: [], vis: [], wh: [], wdir: [] };
    for (let h = 0; h < hours; h++) {
      const v = fn(i, h, p[0], p[1]);
      r.ws.push(v.ws); r.wd.push(v.wd); r.wg.push(v.wg); r.wc.push(v.wc || 0); r.vis.push(v.vis == null ? 30000 : v.vis); r.wh.push(v.wh); r.wdir.push(v.wdir == null ? v.wd : v.wdir);
    }
    ['ws', 'wd', 'wg', 'wc', 'vis'].forEach((k) => snap[k].push(r[k]));
    if (!o.noMarine) { snap.wh.push(r.wh); snap.wdir.push(r.wdir); }
  });
  return snap;
}
// Open-Meteo multi-location JSON as the real API returns it (for request interception)
function toOpenMeteo(snap, marine) {
  const time = [];
  for (let h = 0; h < snap.hours; h++) time.push(new Date(snap.t0 + h * 3600000).toISOString().slice(0, 16));
  return snap.points.map((p, i) => marine
    ? { latitude: p[0], longitude: p[1], hourly: { time, wave_height: snap.wh[i], wave_direction: snap.wdir[i] } }
    : { latitude: p[0], longitude: p[1], hourly: { time, wind_speed_10m: snap.ws[i], wind_direction_10m: snap.wd[i], wind_gusts_10m: snap.wg[i], weather_code: snap.wc[i], visibility: snap.vis[i] } });
}
module.exports = { makeWx, toOpenMeteo };
