function skRace(e,net){e.waitUntil(net.catch(function(){}));return new Promise(function(ok,no){var sent=false;function send(r){if(!sent){sent=true;ok(r);}}net.then(send,no);setTimeout(function(){caches.match(e.request).then(function(r){if(r)send(r);});},4000);});}
// network first (so updates arrive immediately), cache as offline fallback
var CACHE='skipper-binnen-0.12.0';var FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-180.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==CACHE&&x.indexOf('skipper-binnen-')===0;}).map(function(x){return caches.delete(x);}));}));self.clients.claim();});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(u.origin!==location.origin||e.request.method!=='GET')return;
  e.respondWith(skRace(e,fetch(e.request).then(function(r){if(r&&r.ok){var c=r.clone();caches.open(CACHE).then(function(ca){ca.put(e.request,c);});}return r;})
    .catch(function(){return caches.match(e.request).then(function(r){return r||caches.match('./index.html');});})));});
