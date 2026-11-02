/* Offline cache for Skipper-Assistent Sardinien-Korsika. Cache-first, falls back to network; all errors are swallowed. */
var CACHE='skipper-sardinien-v0.4.0-20261102';
var SHARE='skipper-sardinien-share';   // GPX received through the Web Share Target (kept apart from the app cache so updates do not delete it)
var FAMILY='skipper-sardinien-v';  // only older versions of THIS app's cache are removed (the other app lives on the same origin)
var FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-180.png'];
var VENDOR=['./vendor/pmtiles.js','./vendor/maplibre-gl.js','./vendor/maplibre-gl.css'];   // offline map pack libraries: cached when first used, carried over to a new version only if an older cache had them
function carryVendor(c){
  return caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE&&k.indexOf(FAMILY)===0;}).map(function(k){return caches.open(k).then(function(o){return o.match('./vendor/maplibre-gl.js');});}));})
    .then(function(f){return f.some(Boolean)?c.addAll(VENDOR).catch(function(){}):null;});
}
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES).then(function(){return carryVendor(c);});}).then(function(){return self.skipWaiting();}).catch(function(){}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE&&k.indexOf(FAMILY)===0;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}).catch(function(){}));
});
/* Web Share Target (manifest share_target): POST multipart with the GPX file -> keep it in the SHARE cache, redirect to the app which imports it.
   Works offline: only the cache is touched. Anything unexpected ends in a plain redirect to the app. */
function handleShare(req){
  var back=new URL('./index.html',self.registration.scope).href;
  return req.formData().then(function(fd){
    var f=fd.get('gpx'),txt=fd.get('text');
    if(!f||typeof f==='string'){
      if(typeof txt==='string'&&txt.indexOf('<gpx')>=0)f=new Blob([txt],{type:'application/gpx+xml'});else return null;
    }
    var name=f.name||'geteilt.gpx';
    return caches.open(SHARE).then(function(c){
      return c.put(new URL('./shared-gpx',self.registration.scope).href,new Response(f,{headers:{'X-Name':encodeURIComponent(name),'Content-Type':'application/octet-stream'}}));
    }).then(function(){return back+'?gpx-share=1';});
  }).catch(function(){return null;}).then(function(u){return Response.redirect(u||back,303);});
}
self.addEventListener('fetch',function(e){
  if(e.request.method==='POST'&&/\/share-target$/.test(new URL(e.request.url).pathname)){e.respondWith(handleShare(e.request));return;}
  if(e.request.method!=='GET')return;
  var vendor=/\/vendor\//.test(e.request.url);
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(function(r){
    if(r)return r;
    if(vendor)return fetch(e.request).then(function(n){if(n&&n.ok){var cp=n.clone();caches.open(CACHE).then(function(c){return c.put(e.request,cp);}).catch(function(){});}return n;}).catch(function(){return new Response('',{status:404});});
    return fetch(e.request).catch(function(){return caches.match('./index.html');});
  }));
});
