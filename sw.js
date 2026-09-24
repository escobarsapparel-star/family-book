self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil(self.clients.claim());
});

function routeForNotification(notification){
  const data=notification?.data||{};
  const type=String(data.targetType||'');
  const id=String(data.targetId||'');
  if(type==='memory'&&id)return `view-memory:${id}`;
  if(type==='event'&&id)return `view-event:${id}`;
  if(type==='person'&&id)return `view-member:${id}`;
  if(type==='post')return 'wall';
  return '';
}

function notificationId(notification){
  const tag=String(notification?.tag||'');
  return tag.startsWith('family-book-')?tag.slice('family-book-'.length):'';
}

self.addEventListener('notificationclick',event=>{
  const notification=event.notification;
  const route=routeForNotification(notification);
  const id=notificationId(notification);
  notification?.close?.();

  event.waitUntil((async()=>{
    const payload={
      type:'familybook:notification-route',
      route,
      notificationId:id
    };

    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if('focus' in client){
        await client.focus();
        client.postMessage?.(payload);
        return;
      }
    }

    if(self.clients.openWindow){
      const params=new URLSearchParams();
      if(route)params.set('fbNotificationRoute',route);
      if(id)params.set('fbNotificationId',id);
      const suffix=params.toString();
      await self.clients.openWindow(`./${suffix?`?${suffix}`:''}`);
    }
  })());
});


const FB_MEDIA_CACHE = 'family-book-b2-images-v1';

function isBackblazeImageRequest(request){
  if(request.method!=='GET'||request.destination!=='image')return false;
  try{
    const url=new URL(request.url);
    return /(^|\.)backblazeb2\.com$/i.test(url.hostname);
  }catch(_){return false}
}

function stableMediaCacheKey(request){
  const url=new URL(request.url);
  // B2 signed URLs change query parameters as signatures expire. The object
  // path is immutable in Family Book, so cache by bucket/object URL only.
  url.search='';
  url.hash='';
  return new Request(url.toString(),{method:'GET',mode:'no-cors'});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(!isBackblazeImageRequest(request))return;
  event.respondWith((async()=>{
    const cache=await caches.open(FB_MEDIA_CACHE);
    const key=stableMediaCacheKey(request);
    const cached=await cache.match(key);
    if(cached)return cached;

    const response=await fetch(request);
    if(response.ok||response.type==='opaque'){
      try{await cache.put(key,response.clone())}catch(_){}
    }
    return response;
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='familybook:clear-media-cache'){
    event.waitUntil(caches.delete(FB_MEDIA_CACHE));
  }
});
