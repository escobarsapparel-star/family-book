(()=>{
  const originalGo=window.go;
  if(typeof originalGo!=='function')return;

  function ownMemberId(){
    try{return window.FB_AUTH?.get?.()?.memberId||null}catch(_){return null}
  }

  // There is one profile presentation: the clean member profile.
  // Redirect the old account-profile route to the signed-in person's member record.
  window.go=function(route,...args){
    if(route==='profile'){
      const id=ownMemberId();
      if(id)route=`view-member:${id}`;
    }
    return originalGo(route,...args);
  };

  document.addEventListener('click',ev=>{
    const target=ev.target.closest?.('[data-r],[data-profile-route],[data-desktop-route],#topProfileButton');
    if(!target)return;
    const ownProfileTrigger=target.matches?.('#topProfileButton,[data-r="profile"],[data-profile-route="profile"],[data-desktop-route="profile"]');
    if(!ownProfileTrigger)return;
    const id=ownMemberId();
    if(!id)return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    originalGo(`view-member:${id}`);
  },true);
})();
