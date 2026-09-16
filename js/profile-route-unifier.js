(()=>{
  const originalGo=window.go;
  if(typeof originalGo!=='function')return;

  function ownMemberRoute(){
    const id=window.FB_AUTH?.get?.()?.memberId;
    return id?`view-member:${id}`:'members';
  }

  // Retire the legacy `profile` destination everywhere in the app.
  window.go=function(route,...args){
    return originalGo(route==='profile'?ownMemberRoute():route,...args);
  };

  // The header avatar itself now opens the signed-in member profile directly.
  document.addEventListener('click',ev=>{
    const avatar=ev.target.closest?.('#topProfileButton');
    if(!avatar)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    window.go(ownMemberRoute());
  },true);
})();