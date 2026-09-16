(()=>{
  if(window.__fbMemberRouteStability)return;
  window.__fbMemberRouteStability=true;

  const original=window.go;
  if(typeof original!=="function")return;

  const currentId=()=>String(window.FB_AUTH?.get?.()?.memberId||'owner');
  const memberById=id=>{
    try{return (window.ensureOwner?.()||window.FB_FAMILY_DATA?.getPeople?.()||[]).find(x=>String(x.id)===String(id))||null}
    catch(_){return null}
  };

  function canonicalMemberRoute(route){
    const r=String(route||'');
    if(!r.startsWith('view-member:'))return r;
    const id=r.slice('view-member:'.length);
    if(!id)return r;

    // The signed-in person's canonical page is My Profile, never the old
    // generic Member card.
    if(String(id)===currentId())return 'profile';

    const member=memberById(id);
    // Current family members use the newer profile/wall page. Only Family
    // History profiles keep the dedicated history detail route.
    if(member&&member.profileType!=='history')return `member-wall:${id}`;
    return r;
  }

  // Normalize every programmatic Member navigation as well as suppressing the
  // automatic family reload on detail routes. This makes the retired generic
  // Member card unreachable during normal use.
  window.go=function(route,opts={}){
    const normalized=canonicalMemberRoute(route);
    const stable=normalized.startsWith('view-member:')||normalized.startsWith('family-unit:')||normalized.startsWith('member-wall:')||normalized==='profile';
    return original(normalized,stable?{...opts,skipFamilyRefresh:true}:opts);
  };

  // Capture legacy card/name clicks before older app.js handlers can fire a
  // second route. One click now resolves to one canonical profile page.
  document.addEventListener('click',ev=>{
    const target=ev.target?.closest?.('[data-view-member],[data-r]');
    if(!target)return;
    const memberId=target.dataset.viewMember;
    const explicit=target.dataset.r;
    const raw=memberId?`view-member:${memberId}`:(explicit&&explicit.startsWith('view-member:')?explicit:'');
    if(!raw)return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.go(canonicalMemberRoute(raw),{skipFamilyRefresh:true});
  },true);
})();
