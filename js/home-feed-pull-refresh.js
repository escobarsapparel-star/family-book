(()=>{
  if(window.__fbHomeFeedPullRefresh)return;
  window.__fbHomeFeedPullRefresh=true;

  const THRESHOLD=74;
  const MAX_PULL=126;
  let startY=0;
  let startX=0;
  let pull=0;
  let tracking=false;
  let refreshing=false;

  function nativeApp(){
    if(document.documentElement.classList.contains('native-app'))return true;
    try{
      if(window.Capacitor?.isNativePlatform?.())return true;
      const platform=window.Capacitor?.getPlatform?.();
      if(platform&&platform!=='web')return true;
    }catch(_){}
    return location.protocol==='capacitor:';
  }

  function isHome(){
    if(!nativeApp())return false;
    if(document.querySelector('.mobile-profile-menu'))return false;
    const active=document.querySelector('#app>.app>.bottom .nav.active[data-r]')?.dataset.r;
    return active==='home'&&!!document.querySelector('#screen .family-wall-panel');
  }

  function atTop(){
    const root=document.scrollingElement||document.documentElement;
    return Math.max(window.scrollY||0,root?.scrollTop||0)<=1;
  }

  function screen(){return document.querySelector('#app>.app>.screen')}

  function indicator(){
    let el=document.querySelector('.fb-home-refresh-indicator');
    if(el)return el;
    el=document.createElement('div');
    el.className='fb-home-refresh-indicator';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    el.innerHTML='<i data-lucide="rotate-cw"></i><span>Pull to refresh</span>';
    document.body.appendChild(el);
    window.lucide?.createIcons?.();
    return el;
  }

  function paint(distance=0,state='pull'){
    const el=indicator();
    const y=Math.min(58,Math.max(0,distance*.42));
    el.classList.toggle('is-visible',distance>4||state!=='pull');
    el.classList.toggle('is-ready',state==='ready');
    el.classList.toggle('is-refreshing',state==='refreshing');
    el.style.setProperty('--fb-home-refresh-y',`${y}px`);
    el.querySelector('span').textContent=state==='refreshing'?'Refreshing feed…':state==='ready'?'Release to refresh':'Pull to refresh';
  }

  function moveScreen(distance){
    const el=screen();
    if(!el)return;
    el.style.transform=distance>0?`translateY(${Math.min(38,distance*.3)}px)`:'';
  }

  function reset(){
    document.body.classList.remove('fb-home-refresh-tracking','fb-home-refreshing');
    moveScreen(0);
    pull=0;
    tracking=false;
    if(refreshing)return;
    const el=document.querySelector('.fb-home-refresh-indicator');
    if(el){
      el.classList.remove('is-visible','is-ready','is-refreshing');
      el.style.removeProperty('--fb-home-refresh-y');
    }
  }

  async function refreshFeed(){
    if(refreshing||!isHome())return;
    refreshing=true;
    tracking=false;
    document.body.classList.remove('fb-home-refresh-tracking');
    document.body.classList.add('fb-home-refreshing');
    paint(THRESHOLD,'refreshing');
    moveScreen(54);

    try{
      const jobs=[];
      if(window.FB_SOCIAL_DATA?.load)jobs.push(Promise.resolve(window.FB_SOCIAL_DATA.load()));
      if(window.FB_FAMILY_DATA?.reload)jobs.push(Promise.resolve(window.FB_FAMILY_DATA.reload()));
      const results=await Promise.allSettled(jobs);
      const failed=results.find(x=>x.status==='rejected');
      if(failed)throw failed.reason;

      // Rebuild Home after the fresh social/family data is in memory. This also
      // rebinds the feed, memories strip, upcoming events and live profile chrome.
      window.go?.('home',{skipFamilyRefresh:true,preserveScroll:false});
      window.dispatchEvent(new CustomEvent('familybook:home-feed-refreshed',{detail:{reason:'pull-to-refresh'}}));

      const el=indicator();
      el.querySelector('span').textContent='Feed updated';
      await new Promise(resolve=>setTimeout(resolve,380));
    }catch(err){
      console.warn('Home feed refresh:',err);
      const el=indicator();
      el.querySelector('span').textContent='Could not refresh';
      await new Promise(resolve=>setTimeout(resolve,720));
    }finally{
      refreshing=false;
      reset();
    }
  }

  document.addEventListener('touchstart',event=>{
    if(refreshing||!isHome()||!atTop()||event.touches.length!==1)return;
    if(event.target.closest('input,textarea,select,[contenteditable="true"],.photo-action-sheet,.wall-image-viewer,.wall-comments-sheet'))return;
    const touch=event.touches[0];
    startY=touch.clientY;
    startX=touch.clientX;
    pull=0;
    tracking=true;
    document.body.classList.add('fb-home-refresh-tracking');
  },{passive:true});

  document.addEventListener('touchmove',event=>{
    if(!tracking||refreshing||event.touches.length!==1)return;
    const touch=event.touches[0];
    const dy=touch.clientY-startY;
    const dx=Math.abs(touch.clientX-startX);

    // Horizontal gestures belong to the memory strip / carousels, not refresh.
    if(dx>Math.max(12,Math.abs(dy)*.9)){reset();return}
    if(dy<=0||!atTop()){reset();return}

    event.preventDefault();
    pull=Math.min(MAX_PULL,dy);
    moveScreen(pull);
    paint(pull,pull>=THRESHOLD?'ready':'pull');
  },{passive:false});

  document.addEventListener('touchend',()=>{
    if(!tracking||refreshing)return;
    const shouldRefresh=pull>=THRESHOLD;
    tracking=false;
    if(shouldRefresh)refreshFeed();
    else reset();
  },{passive:true});

  document.addEventListener('touchcancel',()=>{if(!refreshing)reset()},{passive:true});

  function sync(){
    document.body.classList.toggle('fb-native-home-refresh',nativeApp());
    if(!nativeApp()||!isHome()){
      if(!refreshing)reset();
      document.querySelector('.fb-home-refresh-indicator')?.classList.remove('is-visible','is-ready','is-refreshing');
    }
  }

  window.addEventListener('resize',sync);
  window.addEventListener('load',sync);
  document.addEventListener('click',()=>setTimeout(sync,0));

  const start=()=>{
    sync();
    const root=document.querySelector('#screen');
    if(root)new MutationObserver(sync).observe(root,{childList:true,subtree:false});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.FB_HOME_PULL_REFRESH={
    refresh:refreshFeed,
    isRefreshing:()=>refreshing
  };
})();