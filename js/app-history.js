(()=>{
  if(window.__fbAppHistoryInstalled)return;
  const originalGo=window.go;
  if(typeof originalGo!=="function")return;
  window.__fbAppHistoryInstalled=true;

  let currentRoute=String(history.state?.fbRoute||"home");
  let handlingPop=false;

  const routeState=route=>({
    ...(history.state&&typeof history.state==="object"?history.state:{}),
    fbApp:true,
    fbRoute:String(route||"home")
  });

  if(!history.state?.fbApp||!history.state?.fbRoute){
    try{history.replaceState(routeState("home"),"",location.href)}catch(_){}
    currentRoute="home";
  }

  function goWithHistory(route,opts={}){
    const next=String(route||"home");
    const skipHistory=handlingPop||opts?.history===false||opts?.replaceHistory===true;

    if(!skipHistory&&next!==currentRoute){
      try{
        const nextState={
          ...(history.state&&typeof history.state==="object"?history.state:{}),
          fbApp:true,
          fbRoute:next
        };
        delete nextState.fbComposerOpen;
        history.pushState(nextState,"",location.href);
      }catch(_){}
    }else if(opts?.replaceHistory===true){
      try{
        const nextState=routeState(next);
        delete nextState.fbComposerOpen;
        history.replaceState(nextState,"",location.href);
      }catch(_){}
    }

    currentRoute=next;
    return originalGo(next,opts);
  }

  window.go=goWithHistory;

  window.addEventListener("popstate",event=>{
    const next=event.state?.fbRoute;
    if(!event.state?.fbApp||!next||next===currentRoute)return;

    handlingPop=true;
    try{
      currentRoute=String(next);
      originalGo(currentRoute,{history:false});
    }finally{
      handlingPop=false;
    }
  });

  window.FB_APP_HISTORY={
    current:()=>currentRoute,
    back:()=>history.back(),
    home:()=>goWithHistory("home")
  };
})();

function fbLoadStyle(href,key){
  if(document.querySelector(`link[data-fb-loader="${key}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=href;
  link.dataset.fbLoader=key;
  document.head.appendChild(link);
}
function fbLoadScript(src,key){
  if(document.querySelector(`script[data-fb-loader="${key}"]`))return;
  const script=document.createElement('script');
  script.src=src;
  script.dataset.fbLoader=key;
  document.body.appendChild(script);
}

// Date entry is handled once, globally, by local-date-picker.js loaded in index.html.
// Do not load a second date-picker implementation here.

fbLoadStyle('css/member-edit-desktop-fix.css?v=1','member-edit-desktop-fix');
fbLoadStyle('css/member-relationship-manager.css?v=3','member-relationship-manager-style');
fbLoadScript('js/member-relationship-manager.js?v=9','member-relationship-manager-script');
fbLoadStyle('css/member-edit-mobile-actions.css?v=1','member-edit-mobile-actions-style');
fbLoadScript('js/member-edit-mobile-actions.js?v=2','member-edit-mobile-actions-script');
fbLoadScript('js/tree-age-order.js?v=1','tree-age-order-script');
fbLoadStyle('css/full-tree-dark.css?v=3','full-tree-dark-style');
fbLoadScript('js/full-tree-polish.js?v=4','full-tree-polish-script');
fbLoadScript('js/tree-spouse-ancestor-root.js?v=1','tree-spouse-ancestor-root-script');
fbLoadStyle('css/tree-memorial-cards.css?v=1','tree-memorial-cards-style');
fbLoadScript('js/tree-memorial-cards.js?v=1','tree-memorial-cards-script');
fbLoadStyle('css/relationship-context.css?v=1','relationship-context-style');
fbLoadScript('js/person-sex.js?v=2','person-sex-script');
fbLoadScript('js/relationship-context.js?v=4','relationship-context-script');
fbLoadStyle('css/home-quick-memory-tags.css?v=quick-memory-tags-1','home-quick-memory-tags-style');
fbLoadScript('js/home-quick-memory-tags.js?v=quick-memory-tags-1','home-quick-memory-tags-script');
fbLoadScript('js/notification-alert-router.js?v=notification-alert-router-1','notification-alert-router-script');
fbLoadStyle('css/home-feed-cleanup.css?v=1','home-feed-cleanup-style');
fbLoadScript('js/home-feed-cleanup.js?v=1','home-feed-cleanup-script');
fbLoadStyle('css/member-form-layout-fix.css?v=2','member-form-layout-fix-style');
fbLoadScript('js/member-sex-position.js?v=1','member-sex-position-script');
fbLoadStyle('css/family-identity-settings.css?v=1','family-identity-settings-style');
fbLoadScript('js/family-identity-settings.js?v=3','family-identity-settings-script');
fbLoadScript('js/mobile-profile-menu-navigation.js?v=1','mobile-profile-menu-navigation-script');

// Legal footer + versioned POPIA/terms/child-media/PAIA information and acceptance.
fbLoadStyle('css/legal-consent.css?v=legal-20260919-1','legal-consent-style');
fbLoadScript('js/legal-consent.js?v=legal-20260919-2','legal-consent-script');
