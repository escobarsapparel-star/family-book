(()=>{
  if(window.__fbMemberRouting)return;
  window.__fbMemberRouting=true;

  const originalGo=window.go;
  if(typeof originalGo!=="function")return;

  function ownMemberId(){
    try{return window.FB_AUTH?.get?.()?.memberId||null}catch(_){return null}
  }

  function normalizeRoute(route){
    let r=String(route||"");
    if(r==="profile"){
      const id=ownMemberId();
      if(id)r=`view-member:${id}`;
    }
    return r;
  }

  function isStableMemberRoute(route){
    return route.startsWith("view-member:")
      ||route.startsWith("family-unit:")
      ||route.startsWith("member-wall:")
      ||route==="profile";
  }

  // One canonical routing layer for member/profile navigation.
  window.go=function(route,opts={}){
    const normalized=normalizeRoute(route);
    return originalGo(
      normalized,
      isStableMemberRoute(normalized)?{...opts,skipFamilyRefresh:true}:opts
    );
  };

  // Member cards/names should always open the canonical member profile route.
  document.addEventListener("click",ev=>{
    const target=ev.target?.closest?.("[data-view-member],[data-r],[data-profile-route],[data-desktop-route]");
    if(!target||target.matches?.("#topProfileButton"))return;

    let route="";
    if(target.dataset.viewMember){
      route=`view-member:${target.dataset.viewMember}`;
    }else{
      const explicit=target.dataset.r||target.dataset.profileRoute||target.dataset.desktopRoute||"";
      if(explicit==="profile"){
        const id=ownMemberId();
        if(id)route=`view-member:${id}`;
      }else if(explicit.startsWith("view-member:")){
        route=explicit;
      }
    }

    if(!route)return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    window.go(route,{skipFamilyRefresh:true});
  },true);
})();
