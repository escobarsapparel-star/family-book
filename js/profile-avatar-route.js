(()=>{
  function ownMemberId(){
    try{
      const auth=window.FB_AUTH?.get?.()||{};
      return auth.memberId||null;
    }catch(_){return null}
  }
  function openOwnProfile(ev){
    const target=ev.target.closest?.('#topProfileButton,[data-r="profile"],[data-profile-route="profile"],[data-desktop-route="profile"]');
    if(!target||typeof window.go!=='function')return;
    const id=ownMemberId();
    if(!id)return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    window.go(`view-member:${id}`);
  }
  document.addEventListener('click',openOwnProfile,true);
})();