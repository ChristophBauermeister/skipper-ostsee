// network first (so updates arrive immediately), cache as offline fallback; with a weak signal the cached copy answers after 4 s, the download goes on for next time
var CACHE='skipper-paddel-0.5.0';var FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];var WAIT=4000;
var SHARE='skipper-paddel-share';   // GPX received through the Web Share Target (kept apart from the app cache so updates do not delete it)
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==CACHE&&x!==SHARE&&x.indexOf('skipper-paddel-')===0;}).map(function(x){return caches.delete(x);}));}));self.clients.claim();});
/* Web Share Target: POST multipart with the GPX file -> keep it in the SHARE cache, redirect to the app which checks it. Works offline, anything unexpected ends in a plain redirect to the app. */
function handleShare(req){
  var back=new URL('./index.html',self.registration.scope).href;
  return req.formData().then(function(fd){
    var f=fd.get('gpx'),txt=fd.get('text');
    if(!f||typeof f==='string'){if(typeof txt==='string'&&txt.indexOf('<gpx')>=0)f=new Blob([txt],{type:'application/gpx+xml'});else return null;}
    var name=f.name||'geteilt.gpx';
    return caches.open(SHARE).then(function(c){return c.put(new URL('./shared-gpx',self.registration.scope).href,new Response(f,{headers:{'X-Name':encodeURIComponent(name),'Content-Type':'application/octet-stream'}}));}).then(function(){return back+'?gpx-share=1';});
  }).catch(function(){return null;}).then(function(u){return Response.redirect(u||back,303);});
}
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);
  if(e.request.method==='POST'&&/\/share-target$/.test(u.pathname)){e.respondWith(handleShare(e.request));return;}
  if(u.origin!==location.origin||e.request.method!=='GET')return;
  var net=fetch(e.request).then(function(r){if(r&&r.ok){var c=r.clone();return caches.open(CACHE).then(function(ca){return ca.put(e.request,c);}).then(function(){return r;},function(){return r;});}return r;});
  e.waitUntil(net.catch(function(){}));
  e.respondWith(new Promise(function(done){var over=false,finish=function(r){if(!over){over=true;done(r);}},
    timer=setTimeout(function(){caches.match(e.request).then(function(r){if(r)finish(r);});},WAIT);
    net.then(function(r){clearTimeout(timer);finish(r);},function(){clearTimeout(timer);caches.match(e.request).then(function(r){finish(r||caches.match('./index.html'));});});}));});
