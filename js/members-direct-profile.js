(()=>{
  if(window.__fbMembersDirectProfile)return;
  window.__fbMembersDirectProfile=true;

  // Current members should open the newer member profile/wall directly.
  // Keep historical/biography profiles on the existing view-member route.
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
    window.go?.(`member-wall:${id}`);
  },true);
})();
