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
