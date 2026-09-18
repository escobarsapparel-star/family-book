(()=>{
  if(window.__fbNativePushInstalled)return;
  window.__fbNativePushInstalled=true;

  const TOKEN_KEY='fb_native_push_token';
  const APP_ID='com.familybook.app';
  let listenersBound=false;
  let registering=false;
  let lastStatus='idle';
  let pushPlugin=null;

  const auth=()=>window.FB_AUTH?.get?.()||{};
  const sb=()=>window.FB_SUPABASE?.client;
  const capacitor=()=>window.Capacitor||null;

  function isNativeAndroid(){
    try{
      const cap=capacitor();
      return !!cap?.isNativePlatform?.()&&cap?.getPlatform?.()==='android';
    }catch(_){return false}
  }

  function push(){
    if(pushPlugin)return pushPlugin;
    const cap=capacitor();
    if(!cap)return null;
    if(cap.Plugins?.PushNotifications){
      pushPlugin=cap.Plugins.PushNotifications;
      return pushPlugin;
    }
    if(typeof cap.registerPlugin==='function'){
      try{
        pushPlugin=cap.registerPlugin('PushNotifications');
        return pushPlugin;
      }catch(err){
        console.warn('Family Book push plugin registration failed:',err?.message||err);
      }
    }
    return null;
  }

  function setStatus(status,detail={}){
    lastStatus=status;
    window.dispatchEvent(new CustomEvent('familybook:push-status',{detail:{status,...detail}}));
  }

  function storedToken(){
    try{return localStorage.getItem(TOKEN_KEY)||''}catch(_){return ''}
  }

  function storeToken(token){
    try{token?localStorage.setItem(TOKEN_KEY,token):localStorage.removeItem(TOKEN_KEY)}catch(_){}
  }

  async function saveToken(token){
    token=String(token||'').trim();
    if(!token)return false;
    storeToken(token);
    const me=auth();
    if(!me.membershipId||!sb())return false;
    const {error}=await sb().rpc('register_push_device',{
      p_token:token,
      p_platform:'android',
      p_app_id:APP_ID
    });
    if(error)throw error;
    setStatus('registered');
    window.dispatchEvent(new CustomEvent('familybook:push-ready',{detail:{platform:'android'}}));
    return true;
  }

  async function unregister(){
    const token=storedToken();
    if(!token||!sb())return false;
    try{await sb().rpc('unregister_push_device',{p_token:token})}catch(_){}
    storeToken('');
    setStatus('unregistered');
    return true;
  }

  function routeFromNotification(notification){
    const data=notification?.data||{};
    let route=String(data.route||'').trim();
    const type=String(data.target_type||data.targetType||'').trim();
    const id=String(data.target_id||data.targetId||'').trim();

    if(!route&&type&&id){
      if(type==='memory')route=`view-memory:${id}`;
      else if(type==='event')route=`view-event:${id}`;
      else if(type==='member')route=`view-member:${id}`;
      else if(type==='wall_post')route='home';
    }
    if(!route)route='notifications';

    setTimeout(()=>{
      if(typeof window.go==='function')window.go(route);
      else location.hash=`#${route}`;
    },250);
  }

  async function bindListeners(){
    if(listenersBound)return true;
    const p=push();
    if(!p)return false;
    listenersBound=true;

    await p.addListener('registration',async token=>{
      try{
        setStatus('token-received');
        await saveToken(token?.value||'');
        console.info('Family Book push registered');
      }catch(err){
        setStatus('save-error',{error:String(err?.message||err)});
        console.warn('Family Book push token save failed:',err?.message||err);
      }
    });

    await p.addListener('registrationError',err=>{
      setStatus('registration-error',{error:String(err?.error||err?.message||err)});
      console.warn('Family Book push registration failed:',err?.error||err?.message||err);
      window.dispatchEvent(new CustomEvent('familybook:push-error',{detail:err||{}}));
    });

    await p.addListener('pushNotificationReceived',notification=>{
      window.dispatchEvent(new CustomEvent('familybook:push-received',{detail:notification||{}}));
    });

    await p.addListener('pushNotificationActionPerformed',action=>{
      routeFromNotification(action?.notification||{});
      window.dispatchEvent(new CustomEvent('familybook:push-opened',{detail:action||{}}));
    });
    return true;
  }

  async function permission(){
    if(!isNativeAndroid())return 'web';
    const cap=capacitor();
    if(typeof cap?.isPluginAvailable==='function'&&!cap.isPluginAvailable('PushNotifications'))return 'plugin-missing';
    const p=push();
    if(!p)return 'plugin-missing';
    try{
      const result=await p.checkPermissions();
      return result?.receive||'unknown';
    }catch(err){
      console.warn('Family Book push permission check failed:',err?.message||err);
      return 'error';
    }
  }

  async function enable(){
    if(!isNativeAndroid())return {native:false,status:'web'};
    const cap=capacitor();
    if(typeof cap?.isPluginAvailable==='function'&&!cap.isPluginAvailable('PushNotifications')){
      setStatus('plugin-missing');
      return {native:true,status:'plugin-missing'};
    }
    const p=push();
    if(!p){
      setStatus('plugin-missing');
      return {native:true,status:'plugin-missing'};
    }
    if(registering)return {native:true,status:'registering'};

    registering=true;
    try{
      await bindListeners();
      let current=await p.checkPermissions();
      if(current?.receive==='prompt'||current?.receive==='prompt-with-rationale'){
        setStatus('requesting-permission');
        current=await p.requestPermissions();
      }
      if(current?.receive!=='granted'){
        setStatus('permission-denied');
        return {native:true,status:'permission-denied'};
      }

      const existing=storedToken();
      if(existing&&auth().membershipId){
        try{await saveToken(existing)}catch(err){console.warn('Family Book saved token refresh failed:',err?.message||err)}
      }

      setStatus('registering');
      await p.register();
      return {native:true,status:'registering'};
    }catch(err){
      setStatus('error',{error:String(err?.message||err)});
      console.warn('Family Book push setup failed:',err?.message||err);
      return {native:true,status:'error',error:String(err?.message||err)};
    }finally{
      registering=false;
    }
  }

  async function refreshSavedToken(){
    const token=storedToken();
    if(token&&auth().membershipId){
      try{return await saveToken(token)}catch(err){console.warn('Family Book push refresh:',err?.message||err)}
    }
    return false;
  }

  window.addEventListener('familybook:auth-ready',()=>{
    refreshSavedToken();
    setTimeout(enable,300);
  });
  window.addEventListener('familybook:family-data-updated',refreshSavedToken);

  setTimeout(()=>{
    if(auth().membershipId)enable();
  },1200);

  window.FB_NATIVE_PUSH={
    enable,
    unregister,
    refresh:refreshSavedToken,
    permission,
    token:storedToken,
    status:()=>lastStatus,
    isNativeAndroid
  };
})();
