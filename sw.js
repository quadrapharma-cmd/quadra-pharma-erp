// Quadra Pharma ERP — Service Worker (Offline Support)
var CACHE = 'quadra-erp-v1';
var FILES = ['/'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(FILES); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).then(function(resp){
        if(!resp||resp.status!==200) return resp;
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        return resp;
      }).catch(function(){
        return caches.match('/');
      });
    })
  );
});
