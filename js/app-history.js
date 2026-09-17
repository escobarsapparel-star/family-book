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

  // Make the page entry itself the Family Book Home entry. Subsequent in-app
  // navigation gets pushed on top of this, so browser/Android Back walks the
  // Family Book screen stack before it can leave the site.
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
    // Composer/overlay history entries deliberately reuse the same fbRoute.
    // Their own handler closes the overlay; do not rerender the page underneath.
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

// Family Book date entry uses DD/MM/YYYY everywhere while preserving ISO
// YYYY-MM-DD values internally for the existing save/database logic.
fbLoadStyle('css/date-picker-ddmmyyyy.css?v=2','date-dmy-style');
fbLoadScript('js/date-picker-ddmmyyyy.js?v=2','date-dmy-script');

// Member editor presentation layers. These do not alter family data or the
// relationship save/RPC logic; they only make large families easier to manage.
fbLoadStyle('css/member-edit-desktop-fix.css?v=1','member-edit-desktop-fix');
fbLoadStyle('css/member-relationship-manager.css?v=1','member-relationship-manager-style');
fbLoadScript('js/member-relationship-manager.js?v=2','member-relationship-manager-script');
