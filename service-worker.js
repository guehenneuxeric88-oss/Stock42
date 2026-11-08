const CACHE='stock42-v54';
const LOCAL=['./','./index.html','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(LOCAL)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  ]));
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);

  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request,{cache:'no-store'}).then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put('./index.html',copy));
        return resp;
      }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  // Public scanner and Excel libraries are cached after the first online load.
  // An offline launch can then reuse those exact previously loaded resources.
  const libraryOrigins=['https://unpkg.com','https://cdn.sheetjs.com'];
  if(libraryOrigins.includes(url.origin)){
    e.respondWith(
      fetch(e.request).then(resp=>{
        if(resp.ok||resp.type==='opaque'){
          const copy=resp.clone();
          e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}));
        }
        return resp;
      }).catch(async()=>await caches.match(e.request)||Response.error())
    );
    return;
  }
  if(url.origin===location.origin){
    e.respondWith(
      fetch(e.request,{cache:'no-store'}).then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
        return resp;
      }).catch(()=>caches.match(e.request))
    );
  }
});