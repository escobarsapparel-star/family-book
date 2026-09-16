(()=>{
  function openOwnProfile(ev){
    const target=ev.target.closest?.('#topProfileButton,[data-r="profile"],[data-profile-route="profile"],[data-desktop-route="profile"]');
    if(!target||typeof window.go!=='function')return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.go('profile');
  }
  document.addEventListener('click',openOwnProfile,true);
})();