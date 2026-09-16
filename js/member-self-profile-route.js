(()=>{
  if(window.__fbMemberSelfProfileRoute)return;
  window.__fbMemberSelfProfileRoute=true;

  const currentId=()=>String(window.FB_AUTH?.get?.()?.memberId||'owner');
  const isOwnViewRoute=route=>{
    const text=String(route||'');
    return text.startsWith('view-member:')&&text.slice('view-member:'.length)===currentId();
  };

  // Keep direct/programmatic navigation away from the retired generic
  // Member card for the signed-in person. Their canonical page is Profile.
  const originalGo=window.go;
  if(typeof originalGo==='function'){
    window.go=function(route,...args){
      return originalGo(isOwnViewRoute(route)?'profile':route,...args);
    };
  }

  // Existing app.js delegates Member-card clicks before this script loads.
  // Capture first so the old handler never gets a chance to open the legacy page.
  document.addEventListener('click',event=>{
    const view=event.target.closest?.('[data-view-member]');
    if(view&&String(view.dataset.viewMember||'')===currentId()){
      event.preventDefault();
      event.stopImmediatePropagation();
      window.go?.('profile');
      return;
    }

    const routed=event.target.closest?.('[data-r^="view-member:"]');
    if(routed&&isOwnViewRoute(routed.dataset.r)){
      event.preventDefault();
      event.stopImmediatePropagation();
      window.go?.('profile');
    }
  },true);
})();
