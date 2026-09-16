(()=>{
  const originalGo=window.go;
  if(typeof originalGo!=='function')return;

  // Member detail routes now remain member detail routes. Only explicit
  // account-profile controls should open the dedicated Profile page.
  window.go=function(route,...args){
    return originalGo(route,...args);
  };

  document.addEventListener('click',ev=>{
    const target=ev.target.closest?.('[data-r],[data-profile-route],[data-desktop-route],#topProfileButton');
    if(!target)return;
    const ownProfileTrigger=target.matches?.('#topProfileButton,[data-r="profile"],[data-profile-route="profile"],[data-desktop-route="profile"]');
    if(!ownProfileTrigger)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    originalGo('profile');
  },true);
})();
