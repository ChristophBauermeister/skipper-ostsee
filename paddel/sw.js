// network first (so updates arrive immediately), cache as offline fallback; with a weak signal the cached copy answers after 4 s, the download goes on for next time
var CACHE='skipper-paddel-0.9.0';var FILES=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];var WAIT=4000;
var SHARE='skipper-paddel-share';   // GPX received through the Web Share Target (kept apart from the app cache so updates do not delete it)
/* Region data (spec 2026-11-07-skipper-daten-nachladen): reviere/<id>.<hash>.json never changes under its name, so it lives in DATA,
   a cache that no app update deletes. A file is only kept when its SHA-256 prefix matches the name; an older hash of the same region
   is only dropped once the new one is stored, so a cut or broken download leaves the old region in use. */
var DATA='skipper-paddel-daten';
var REG=/\/reviere\/([a-z0-9-]+)\.([0-9a-f]{12})\.json$/,IDX=/\/reviere\/index\.json$/;
function own(x){return x!==CACHE&&x!==SHARE&&x!==DATA&&x.indexOf('skipper-paddel-')===0;}   // caches of older app versions
function regionKeys(c){return c.keys().then(function(k){return k.filter(function(r){return REG.test(new URL(r.url).pathname);});});}
function hasData(){return caches.open(DATA).then(regionKeys).then(function(k){return k.length>0;},function(){return false;});}
function firstMatch(names,req){var i=0;function next(){if(i>=names.length)return Promise.resolve(undefined);return caches.open(names[i++]).then(function(c){return c.match(req);}).then(function(r){return r||next();});}return next();}
/* offline answer: the current version first; while DATA holds no region yet, an older version (with its data built in) goes first */
function fallback(req){return Promise.all([hasData(),caches.keys()]).then(function(a){var old=a[1].filter(own),cur=[CACHE,DATA];return firstMatch(a[0]?cur.concat(old):old.concat(cur),req);});}
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES);}).then(function(){return self.skipWaiting();}));});
/* older version caches go only once DATA has a region; until then they are the way back to a working app offline */
self.addEventListener('activate',function(e){e.waitUntil(Promise.all([hasData(),caches.keys()]).then(function(a){return a[0]?Promise.all(a[1].filter(function(x){return own(x)&&x.indexOf('skipper-paddel-')===0;}).map(function(x){return caches.delete(x);})):null;}));self.clients.claim();});
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
function hex12(buf){return crypto.subtle.digest('SHA-256',buf).then(function(d){return Array.prototype.map.call(new Uint8Array(d),function(b){return(b<16?'0':'')+b.toString(16);}).join('').slice(0,12);});}
function json(body,h){var o={'Content-Type':'application/json'};for(var k in h||{})o[k]=h[k];return new Response(body,{headers:o});}
/* the stored file of region id under another hash, if any; marked X-Old so the app can say newer data is waiting */
function sameRegion(c,id,key){return regionKeys(c).then(function(k){var o=k.filter(function(r){return r.url!==key&&REG.exec(new URL(r.url).pathname)[1]===id;})[0];return o?c.match(o).then(function(r){return r&&r.text().then(function(x){return json(x,{'X-Old':'1'});});}):undefined;});}
function dropOthers(c,id,key){return regionKeys(c).then(function(k){return Promise.all(k.filter(function(r){return r.url!==key&&REG.exec(new URL(r.url).pathname)[1]===id;}).map(function(r){return c.delete(r);}));});}
/* reviere/<id>.<hash>.json: cache first; from the network only kept when ok, parseable and the hash matches; on any failure the region's older file answers */
function regionFile(req,key,id,hash){
  return caches.open(DATA).then(function(c){return c.match(key).then(function(hit){
    if(hit)return hit;
    var old=function(r){return sameRegion(c,id,key).then(function(o){return o||r;});};
    return fetch(req).then(function(r){
      if(!r.ok)return old(r);
      return r.arrayBuffer().then(function(buf){
        return (self.crypto&&crypto.subtle?hex12(buf):Promise.resolve('')).then(function(h){
          var good=h===hash;if(good){try{JSON.parse(new TextDecoder().decode(buf));}catch(x){good=false;}}
          if(!good)return old(new Response('',{status:502}));
          return c.put(key,json(buf)).then(function(){return dropOthers(c,id,key);}).then(function(){return json(buf);},function(){return json(buf,{'X-Cache-Failed':'1'});});
        });
      });
    }).catch(function(err){return sameRegion(c,id,key).then(function(o){if(o)return o;throw err;});});
  });});
}
/* after a fresh index: drop regions no longer listed, and older hashes whose current file is already stored */
function prune(key,idx){
  var cur={},base=key.replace(IDX,'/reviere/');(idx.reviere||[]).forEach(function(r){cur[r.id]=base+r.file;});
  return caches.open(DATA).then(function(c){return regionKeys(c).then(function(k){var have={};k.forEach(function(r){have[r.url]=1;});
    return Promise.all(k.filter(function(r){var id=REG.exec(new URL(r.url).pathname)[1];return !cur[id]||(r.url!==cur[id]&&have[cur[id]]);}).map(function(r){return c.delete(r);}));});});
}
/* network first with the usual WAIT; a good answer is copied into DATA (not CACHE, so it survives updates) */
function respond(e,net,offline){
  e.waitUntil(net.catch(function(){}));
  e.respondWith(new Promise(function(done){var over=false,finish=function(r){if(!over){over=true;done(r);}},
    timer=setTimeout(function(){offline().then(function(r){if(r)finish(r);});},WAIT);
    net.then(function(r){clearTimeout(timer);finish(r);},function(){clearTimeout(timer);offline().then(function(r){finish(r||fallback('./index.html'));});});}));
}
self.addEventListener('fetch',function(e){var u=new URL(e.request.url);
  if(e.request.method==='POST'&&/\/share-target$/.test(u.pathname)){e.respondWith(handleShare(e.request));return;}
  if(u.origin!==location.origin||e.request.method!=='GET')return;
  var key=u.origin+u.pathname,m=REG.exec(u.pathname);
  if(m){e.respondWith(regionFile(e.request,key,m[1],m[2]));return;}
  if(IDX.test(u.pathname)){
    var inet=fetch(e.request).then(function(r){if(!r||!r.ok)return r;
      return r.clone().text().then(function(t){var idx=JSON.parse(t);return caches.open(DATA).then(function(c){return c.put(key,json(t));}).then(function(){return prune(key,idx);});}).then(function(){return r;},function(){return r;});});
    respond(e,inet,function(){return caches.open(DATA).then(function(c){return c.match(key);}).then(function(r){return r?r.text().then(function(t){return json(t,{'X-Offline':'1'});}):r;});});return;
  }
  var net=fetch(e.request).then(function(r){if(r&&r.ok){var c=r.clone();return caches.open(CACHE).then(function(ca){return ca.put(e.request,c);}).then(function(){return r;},function(){return r;});}return r;});
  respond(e,net,function(){return fallback(e.request);});});
