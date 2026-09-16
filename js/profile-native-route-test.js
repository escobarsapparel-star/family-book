(()=>{
  function ownProfile(){
    const id=window.FB_AUTH?.get?.()?.memberId||'owner';
    if(typeof window.go==='function') window.go(`view-member:${id}`);
  }

  // Test the intended final behaviour without touching the live branch.
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('#topProfileButton,[data-r="profile"],[data-profile-route="profile"],[data-desktop-route="profile"]');
    if(!target)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    ownProfile();
  },true);

  window.FB_PROFILE_ROUTE_TEST={open:ownProfile};
})();
