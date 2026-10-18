// Builds index.html from src/app.html + data/*.json (no npm dependencies).
// Usage: node tools/build.js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const fail = (msg) => { console.error('BUILD ERROR: ' + msg); process.exit(1); };

// Merge all region files (order does not matter, the app sorts)
const files = fs.readdirSync(path.join(ROOT, 'data')).filter((f) => /^harbours-.*\.json$/.test(f)).sort();
if (!files.length) fail('no data/harbours-*.json found');
const DATA = [];
files.forEach((f) => {
  const arr = read('data/' + f);
  if (!Array.isArray(arr)) fail(f + ' is not an array');
  arr.forEach((h) => DATA.push(h));
});

const BRIDGES = read('data/bridges.json').BRIDGES;
const HAZARDS = read('data/hazards.json').HAZARDS;
const radio = read('data/radio.json');
const RADIO = radio.RADIO;
const RADIO_SOURCES = radio.sources;
const SEAAREAS = read('data/seaareas.json').SEAAREAS;
const BOATS = read('data/boats.json');

// Validation
const seen = new Set();
DATA.forEach((h) => {
  if (!h.id) fail('harbour without id: ' + JSON.stringify(h).slice(0, 80));
  if (seen.has(h.id)) fail('duplicate harbour id: ' + h.id);
  seen.add(h.id);
  if (typeof h.lat !== 'number' || typeof h.lon !== 'number') fail('harbour without lat/lon: ' + h.id);
});
const bridgeIds = new Set();
BRIDGES.forEach((b) => {
  if (bridgeIds.has(b.id)) fail('duplicate bridge id: ' + b.id);
  bridgeIds.add(b.id);
});
DATA.forEach((h) => (h.bridgeIds || []).forEach((id) => {
  if (!bridgeIds.has(id)) fail('harbour ' + h.id + ' references unknown bridge ' + id);
}));

// Embed as minified JSON; "<" is escaped so the data can never close the script tag
const js = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(new RegExp('\\u2028', 'g'), '\\u2028').replace(new RegExp('\\u2029', 'g'), '\\u2029');
const dataJs = [
  'var DATA=' + js(DATA) + ';',
  'var BRIDGES=' + js(BRIDGES) + ';',
  'var HAZARDS=' + js(HAZARDS) + ';',
  'var RADIO=' + js(RADIO) + ';',
  'var RADIO_SOURCES=' + js(RADIO_SOURCES) + ';',
  'var SEAAREAS=' + js(SEAAREAS) + ';',
  'var BOATS=' + js(BOATS) + ';'
].join('\n');

const src = fs.readFileSync(path.join(ROOT, 'src', 'app.html'), 'utf8');
if (src.indexOf('/*@@DATA@@*/') < 0) fail('placeholder /*@@DATA@@*/ missing in src/app.html');
const out = src.replace('/*@@DATA@@*/', () => dataJs);
fs.writeFileSync(path.join(ROOT, 'index.html'), out);
console.log('index.html written: ' + out.length + ' bytes, ' + DATA.length + ' harbours, ' + BRIDGES.length + ' bridges, ' + HAZARDS.length + ' hazards');
