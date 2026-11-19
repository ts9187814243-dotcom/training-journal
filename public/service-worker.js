const CACHE_NAME='training-journal-pwa-v14';
const STATIC_FILES=['/','/index.html','/css/style.css','/js/app.js','/js/coach-renderer.js','/css/coach.css','/manifest.webmanifest','/icons/app-icon.jpg','/images/mountain-bg-hq.jpg'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('training-journal-pwa-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  // Do not intercept third-party APIs, authentication, or AI requests.
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request);
        if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put('/index.html',response.clone());}
        return response;
      }catch(error){
        return (await caches.match('/index.html'))||(await caches.match('/'));
      }
    })());
    return;
  }
  if(STATIC_FILES.includes(url.pathname)){
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      try{
        const response=await fetch(request);
        if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone());}
        return response;
      }catch(error){return cached||Response.error();}
    })());
  }
});
