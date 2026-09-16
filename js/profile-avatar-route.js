(()=>{
  function openOwnMemberProfile(ev){
    const target=ev.target.closest?.('#topProfileButton,[data-r="profile"],[data-desktop-route="profile"]');
    if(!target)return;
    const memberId=window.FB_AUTH?.get?.()?.memberId;
    if(!memberId||typeof window.go!=='function')return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.go(`view-member:${memberId}`);
  }
  document.addEventListener('click',openOwnMemberProfile,true);
})();