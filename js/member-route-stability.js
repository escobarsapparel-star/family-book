(()=>{
  if(window.__fbMemberRouteStability)return;
  window.__fbMemberRouteStability=true;

  const original=window.go;
  if(typeof original!=="function")return;

  // Member/profile detail pages must not trigger the automatic family reload.
  // The reload can briefly clear the person list and make legacy viewMember()
  // fall back to the Members page, which causes the visible flash/back-jump.
  window.go=function(route,opts={}){
    const r=String(route||"");
    if(r.startsWith("view-member:")||r.startsWith("family-unit:")||r.startsWith("member-wall:")){
      return original(r,{...opts,skipFamilyRefresh:true});
    }
    return original(r,opts);
  };

  // Capture legacy member-name/card clicks before older page handlers can fire
  // a second navigation. One click = one route.
  document.addEventListener("click",ev=>{
    const target=ev.target?.closest?.("[data-view-member],[data-r]");
    if(!target)return;
    const memberId=target.dataset.viewMember;
    const explicit=target.dataset.r;
    const route=memberId?`view-member:${memberId}`:(explicit&&explicit.startsWith("view-member:")?explicit:"");
    if(!route)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.go(route,{skipFamilyRefresh:true});
  },true);
})();
