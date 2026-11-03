// network first (so updates arrive immediately), cache as offline fallback; with a weak signal the cached copy answers after 4 s, the download goes on for next time
var CACHE='skipper-paddel-0.4.5';var FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];var WAIT=4000;
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==CACHE&&x.indexOf('skipper-paddel-')===0;}).map(function(x){return caches.delete(x);}));}));self.clients.claim();});
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);if(u.origin!==location.origin||e.request.method!=='GET')return;
  var net=fetch(e.request).then(function(r){if(r&&r.ok){var c=r.clone();return caches.open(CACHE).then(function(ca){return ca.put(e.request,c);}).then(function(){return r;},function(){return r;});}return r;});
  e.waitUntil(net.catch(function(){}));
  e.respondWith(new Promise(function(done){var over=false,finish=function(r){if(!over){over=true;done(r);}},
    timer=setTimeout(function(){caches.match(e.request).then(function(r){if(r)finish(r);});},WAIT);
    net.then(function(r){clearTimeout(timer);finish(r);},function(){clearTimeout(timer);caches.match(e.request).then(function(r){finish(r||caches.match('./index.html'));});});}));});
