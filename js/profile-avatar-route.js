(()=>{
  // The header avatar represents the signed-in family member, so it should
  // open that member's social profile directly rather than the account menu.
  function openSignedInMemberProfile(ev){
    const button=ev.target.closest?.('#topProfileButton');
    if(!button)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const memberId=window.FB_AUTH?.get?.()?.memberId;
    if(memberId&&typeof window.go==='function')window.go(`view-member:${memberId}`);
  }

  document.addEventListener('click',openSignedInMemberProfile,true);
})();
