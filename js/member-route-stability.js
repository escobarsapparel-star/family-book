(()=>{
  if(window.__fbMemberRouteStability)return;
  window.__fbMemberRouteStability=true;

  const original=window.go;
  if(typeof original!=="function")return;

  function canonicalMemberRoute(route){
    const r=String(route||'');
    if(!r.startsWith('view-member:'))return r;
    const id=r.slice('view-member:'.length);
    if(!id)return r;

    // Keep every member on the canonical view-member route. The clean
    // member-profile presentation is applied there by member-profile-social.js.
    // History members remain on the same route and are excluded from that
    // presentation override by its own selector.
    return r;
  }

  window.go=function(route,opts={}){
    const normalized=canonicalMemberRoute(route);
    const stable=normalized.startsWith('view-member:')||normalized.startsWith('family-unit:')||normalized.startsWith('member-wall:')||normalized==='profile';
    return original(normalized,stable?{...opts,skipFamilyRefresh:true}:opts);
  };

  // Capture member-card/name clicks before older handlers can redirect to a
  // second profile system.
  document.addEventListener('click',ev=>{
    const target=ev.target?.closest?.('[data-view-member],[data-r]');
    if(!target)return;
    const memberId=target.dataset.viewMember;
    const explicit=target.dataset.r;
    const raw=memberId?`view-member:${memberId}`:(explicit&&explicit.startsWith('view-member:')?explicit:'');
    if(!raw)return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.go(raw,{skipFamilyRefresh:true});
  },true);
})();
