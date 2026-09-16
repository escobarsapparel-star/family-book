(()=>{
  if(window.__fbMembersDirectProfile)return;
  window.__fbMembersDirectProfile=true;

  // Keep the Members directory, but open a member through the canonical
  // view-member route so member-profile-social.js can replace the legacy
  // profile card with the clean cover/avatar/name presentation.
  document.addEventListener('click',ev=>{
    const trigger=ev.target.closest('.members-page [data-view-member]');
    if(!trigger)return;
    const id=trigger.dataset.viewMember;
    if(!id)return;

    let member=null;
    try{member=(window.ensureOwner?.()||[]).find(x=>String(x.id)===String(id))||null}catch(_){}
    if(member?.profileType==='history')return;

    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    window.go?.(`view-member:${id}`);
  },true);
})();
