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

  // Replace the legacy profile renderer itself. This catches app.js's private
  // lexical go('profile') path without modifying the large app.js file.
  if(typeof window.viewMember==='function'){
    window.profilePage=function(){return window.viewMember(ownMemberId());};
  }

  // Also normalize public navigation calls.
  window.go=function(route,...args){
    return originalGo(route==='profile'?ownMemberRoute():route,...args);
  };

  // Header avatar, mobile Profile nav, Settings My profile, and desktop
  // profile card all open the same member profile.
  document.addEventListener('click',ev=>{
    const target=ev.target.closest?.('#topProfileButton,[data-r="profile"],[data-profile-route="profile"],[data-desktop-route="profile"]');
    if(!target)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.go(ownMemberRoute());
  },true);

  // Safety net for any legacy profile markup rendered by stale handlers.
  let redirecting=false;
  const guard=()=>{
    if(redirecting||!document.querySelector('.account-profile-view'))return;
    redirecting=true;
    window.go(ownMemberRoute());
    setTimeout(()=>{redirecting=false},0);
  };
  const observeScreen=()=>{
    const screen=document.querySelector('#screen');
    if(screen&&!screen.dataset.profileGuard){
      screen.dataset.profileGuard='1';
      new MutationObserver(guard).observe(screen,{childList:true,subtree:true});
    }
    guard();
  };
  document.addEventListener('DOMContentLoaded',observeScreen,{once:true});
  window.addEventListener('load',observeScreen,{once:true});
  observeScreen();
})();