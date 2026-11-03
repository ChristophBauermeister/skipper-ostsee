// network first (so updates arrive immediately), cache as offline fallback
var CACHE='skipper-binnen-0.8.0';var FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-180.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}).catch(function(){}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==CACHE&&x.indexOf('skipper-binnen-')===0;}).map(function(x){return caches.delete(x);}));}));self.clients.claim();});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(u.origin!==location.origin||e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(function(r){if(r&&r.ok){var c=r.clone();caches.open(CACHE).then(function(ca){ca.put(e.request,c);});}return r;})
    .catch(function(){return caches.match(e.request).then(function(r){return r||caches.match('./index.html');});}));});
