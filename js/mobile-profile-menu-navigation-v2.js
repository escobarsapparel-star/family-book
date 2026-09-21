(()=>{
  if(window.__fbMobileProfileMenuNavigation)return;
  window.__fbMobileProfileMenuNavigation=true;

  const FLAG='fbMobileProfileMenu';
  let pendingNavigation=null;

  const mobile=()=>window.matchMedia?.('(max-width:759px)')?.matches;
  const menu=()=>document.querySelector('.mobile-profile-menu');
  const hasMenuState=()=>!!history.state?.[FLAG];

  function closeVisual(){
    const m=menu();
    if(m)m.remove();
    document.body.classList.remove('fb-mobile-menu-open');
    document.querySelector('#topProfileButton')?.setAttribute('aria-expanded','false');
  }

  function markMenuOpen(){
    if(hasMenuState())return;
    try{
      const base=history.state&&typeof history.state==='object'?history.state:{};
      history.pushState({...base,[FLAG]:true},'',location.href);
    }catch(err){console.warn('Family Book profile menu history:',err)}
  }

  function prepareMenu(){
    const m=menu();
    if(!m)return;
    // The mobile tab row already sits above this overlay. Let CSS keep the
    // menu flush to the bottom so Home/calendar content cannot show through.
    m.style.removeProperty('bottom');
    markMenuOpen();
  }

  function finishNavigation(job){
    if(!job?.route)return;
    try{window.go?.(job.route)}catch(err){console.warn('Family Book profile menu route:',err)}
    if(job.about){
      setTimeout(()=>document.querySelector('.settings-about-card')?.scrollIntoView({behavior:'smooth',block:'start'}),90);
    }
  }

  function dismiss(job=null){
    if(job)pendingNavigation=job;
    const shouldPop=hasMenuState();
    closeVisual();
    if(shouldPop){
      try{history.back();return}catch(_){}
    }
    const next=pendingNavigation;
    pendingNavigation=null;
    if(next)setTimeout(()=>finishNavigation(next),0);
  }

  function externalRouteTarget(target){
    const el=target?.closest?.('.bottom [data-r],.brand-home[data-r],#topNotificationButton');
    if(!el)return null;
    if(el.id==='topNotificationButton')return {route:'notifications'};
    const route=String(el.dataset.r||'').trim();
    return route?{route}:null;
  }

  document.addEventListener('click',ev=>{
    const m=menu();
    if(!m)return;

    const close=ev.target.closest?.('.mobile-profile-menu-close');
    const help=ev.target.closest?.('[data-mobile-help-about]');
    const inside=ev.target.closest?.('[data-mobile-menu-route]');
    const external=externalRouteTarget(ev.target);
    if(!close&&!help&&!inside&&!external)return;

    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    if(close){dismiss();return}
    if(help){dismiss({route:'settings',about:true});return}
    if(inside){
      const route=String(inside.dataset.mobileMenuRoute||'').trim();
      if(route)dismiss({route});
      return;
    }
    if(external)dismiss(external);
  },true);

  window.addEventListener('popstate',event=>{
    const stateHasMenu=!!event.state?.[FLAG];
    if(stateHasMenu&&mobile()){
      if(!menu())setTimeout(()=>document.querySelector('#topProfileButton')?.click(),0);
      return;
    }

    if(menu())closeVisual();
    if(pendingNavigation){
      const next=pendingNavigation;
      pendingNavigation=null;
      setTimeout(()=>finishNavigation(next),0);
    }
  });

  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&menu()){
      ev.preventDefault();
      dismiss();
    }
  });

  window.addEventListener('resize',()=>{
    if(!mobile()&&menu())dismiss();
  });

  const observer=new MutationObserver(()=>prepareMenu());
  observer.observe(document.body,{childList:true});
  prepareMenu();

  window.FB_MOBILE_PROFILE_MENU={
    isOpen:()=>!!menu(),
    close:()=>dismiss()
  };
})();
