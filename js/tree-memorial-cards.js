(()=>{
  if(window.__fbTreeMemorialCards)return;
  window.__fbTreeMemorialCards=true;

  const people=()=>{
    try{return window.FB_FAMILY_DATA?.getPeople?.()||[]}catch(_){return []}
  };

  const formatDate=value=>{
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:'';
  };

  function decorate(root=document){
    const byId=new Map(people().map(p=>[String(p.id),p]));
    root.querySelectorAll?.('.ct-person[data-view-member]').forEach(card=>{
      const person=byId.get(String(card.dataset.viewMember||''));
      if(!person)return;
      const memorial=person.profileType==='history'||person.inMemory===true||!!person.passedDate;
      card.classList.toggle('fb-tree-memorial-card',memorial);
      card.querySelectorAll(':scope > .fb-tree-memorial-ribbon,:scope > .fb-tree-memorial-detail').forEach(el=>el.remove());
      if(!memorial)return;

      const ribbon=document.createElement('span');
      ribbon.className='fb-tree-memorial-ribbon';
      ribbon.textContent='In Loving Memory';
      card.appendChild(ribbon);

      const passed=formatDate(person.passedDate);
      if(passed){
        const detail=document.createElement('span');
        detail.className='fb-tree-memorial-detail';
        detail.textContent=`Passed ${passed}`;
        card.appendChild(detail);
      }
      if(person.story)card.title=String(person.story);
    });
  }

  const screen=document.getElementById('screen');
  if(screen)new MutationObserver(()=>decorate(screen)).observe(screen,{childList:true,subtree:true});
  window.addEventListener('familybook:family-data-updated',()=>setTimeout(()=>decorate(),0));
  [0,250,900].forEach(delay=>setTimeout(()=>decorate(),delay));
})();