(()=>{
  if(window.__fbNotificationAlertRouter)return;
  window.__fbNotificationAlertRouter=true;

  const MAX_ROUTE_ATTEMPTS=80;

  function cleanLaunchParams(){
    try{
      const url=new URL(window.location.href);
      url.searchParams.delete('fbNotificationRoute');
      url.searchParams.delete('fbNotificationId');
      const query=url.searchParams.toString();
      const next=`${url.pathname}${query?`?${query}`:''}${url.hash||''}`;
      history.replaceState(history.state,'',next);
    }catch(_){}
  }

  async function markRead(notificationId){
    if(!notificationId)return;
    try{
      if(window.FB_NOTIFICATION_DATA?.markRead){
        await window.FB_NOTIFICATION_DATA.markRead(notificationId);
      }
    }catch(err){
      console.warn('Notification mark read:',err);
    }
  }

  function routeWhenReady(route,attempt=0){
    if(!route)return;
    const authReady=!!window.FB_AUTH?.get?.()?.familyId;
    if(typeof window.go==='function'&&authReady){
      window.go(route);
      return;
    }
    if(attempt<MAX_ROUTE_ATTEMPTS){
      setTimeout(()=>routeWhenReady(route,attempt+1),100);
    }
  }

  async function handleAlertTarget(detail={}){
    const route=String(detail.route||'');
    const notificationId=String(detail.notificationId||'');
    await markRead(notificationId);
    routeWhenReady(route);
  }

  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('message',event=>{
      const data=event.data||{};
      if(data.type!=='familybook:notification-route')return;
      handleAlertTarget(data);
    });

    // Ask Chromium/Android to check the lightweight notification worker now,
    // rather than waiting for its normal update interval.
    navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'})
      .then(registration=>registration.update?.())
      .catch(err=>console.warn('Notification worker update:',err));
  }

  function consumeLaunchTarget(){
    try{
      const url=new URL(window.location.href);
      const route=url.searchParams.get('fbNotificationRoute')||'';
      if(!route)return;
      const notificationId=url.searchParams.get('fbNotificationId')||'';
      cleanLaunchParams();
      handleAlertTarget({route,notificationId});
    }catch(err){
      console.warn('Notification launch route:',err);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',consumeLaunchTarget,{once:true});
  }else{
    consumeLaunchTarget();
  }
})();
