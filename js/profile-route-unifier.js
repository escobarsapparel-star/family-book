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

  function normalizeRoute(route){
    const value=String(route||'');
    if(value.startsWith('view-member:')){
      const id=value.slice('view-member:'.length);
      if(String(id)===ownMemberId())return 'profile';
    }
    return route;
  }

  // Public navigation: any attempt to open the signed-in person's legacy
  // member page is redirected to the dedicated account Profile page.
  window.go=function(route,...args){
    return originalGo(normalizeRoute(route),...args);
  };

  // Catch already-rendered route buttons before their older handlers run.
  document.addEventListener('click',ev=>{
    const target=ev.target.closest?.('[data-r],[data-profile-route],[data-desktop-route]');
    if(!target)return;
    const route=target.dataset.r||target.dataset.profileRoute||target.dataset.desktopRoute||'';
    const normalized=normalizeRoute(route);
    const ownProfileTrigger=target.matches?.('#topProfileButton,[data-r="profile"],[data-profile-route="profile"],[data-desktop-route="profile"]');
    if(normalized===route&&!ownProfileTrigger)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    originalGo('profile');
  },true);
})();