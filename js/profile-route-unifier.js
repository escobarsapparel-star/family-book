(()=>{
  const originalGo=window.go;
  if(typeof originalGo!=='function')return;

  function ownMemberId(){
    const auth=window.FB_AUTH?.get?.()||{};
    if(auth.memberId)return String(auth.memberId);
    try{
      const people=window.ensureOwner?.()||window.FB_FAMILY_DATA?.getPeople?.()||[];
      const email=String(auth.email||'').trim().toLowerCase();
      const accountId=String(auth.supabaseUserId||'');
      const match=people.find(p=>accountId&&String(p.accountId||'')===accountId)
        ||people.find(p=>email&&String(p.email||'').trim().toLowerCase()===email)
        ||people.find(p=>p?.id==='owner');
      if(match?.id)return String(match.id);
    }catch(_){}
    return 'owner';
  }
  function ownMemberRoute(){return `view-member:${ownMemberId()}`;}

  window.go=function(route,...args){
    return originalGo(route==='profile'?ownMemberRoute():route,...args);
  };

  document.addEventListener('click',ev=>{
    const target=ev.target.closest?.('#topProfileButton,[data-r="profile"],[data-profile-route="profile"],[data-desktop-route="profile"]');
    if(!target)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.go(ownMemberRoute());
  },true);

  // Final guard: the retired account-profile screen must never remain rendered,
  // even if older app code reaches its private lexical `go("profile")` route.
  let redirecting=false;
  const guard=()=>{
    if(redirecting||!document.querySelector('.account-profile-view'))return;
    redirecting=true;
    window.go(ownMemberRoute());
    setTimeout(()=>{redirecting=false},0);
  };
  const screen=document.querySelector('#screen');
  if(screen)new MutationObserver(guard).observe(screen,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',guard,{once:true});
  guard();
})();