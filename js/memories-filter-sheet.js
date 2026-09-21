(()=>{
  if(window.__fbMemoriesFilterSheet||!window.FB_MEMORIES)return;
  window.__fbMemoriesFilterSheet=true;
  const originalBind=window.FB_MEMORIES.bindRoute?.bind(window.FB_MEMORIES);
  if(!originalBind)return;
  let keyboardController=null;

  function install(){
    const page=document.querySelector('#screen .memories-page');
    const sheet=page?.querySelector('#memoryFilterSheet');
    const toggle=page?.querySelector('#memoryFilterToggle');
    if(!page||!sheet||!toggle||page.dataset.filterSheetBound==='1')return;
    page.dataset.filterSheetBound='1';
    const close=()=>{sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true');toggle.setAttribute('aria-expanded','false');document.body.classList.remove('memory-filter-open')};
    const open=()=>{sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');toggle.setAttribute('aria-expanded','true');document.body.classList.add('memory-filter-open');setTimeout(()=>sheet.querySelector('select')?.focus(),50)};
    const controls=[
      {id:'memoryYearFilter',label:'Year'},
      {id:'memoryMemberFilter',label:'Person'},
      {id:'memoryAlbumFilter',label:'Album'}
    ];
    const update=()=>{
      const active=controls.map(item=>({item,el:page.querySelector(`#${item.id}`)})).filter(x=>x.el?.value);
      const badge=page.querySelector('#memoryFilterBadge');
      const chips=page.querySelector('#memoryActiveFilters');
      if(badge){badge.textContent=String(active.length);badge.hidden=!active.length}
      if(chips){
        chips.innerHTML=active.map(({item,el})=>`<button type="button" class="memory-filter-chip" data-clear-filter="${item.id}" aria-label="Remove ${item.label} filter"><span>${item.label}: ${String(el.selectedOptions?.[0]?.textContent||'')}</span><i data-lucide="x"></i></button>`).join('');
        chips.querySelectorAll('[data-clear-filter]').forEach(btn=>btn.addEventListener('click',()=>{const el=page.querySelector(`#${btn.dataset.clearFilter}`);if(el){el.value='';el.dispatchEvent(new Event('change',{bubbles:true}))}}));
      }
      window.icons?.();
    };
    toggle.addEventListener('click',open);
    page.querySelector('#memoryFilterBackdrop')?.addEventListener('click',close);
    page.querySelector('#memoryFilterClose')?.addEventListener('click',close);
    page.querySelector('#memoryApplyFilters')?.addEventListener('click',()=>{update();close()});
    page.querySelector('#memoryClearFilters')?.addEventListener('click',()=>setTimeout(update,0));
    controls.forEach(({id})=>page.querySelector(`#${id}`)?.addEventListener('change',update));
    keyboardController?.abort();
    keyboardController=new AbortController();
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&sheet.classList.contains('open'))close()},{signal:keyboardController.signal});
    update();
  }

  window.FB_MEMORIES.bindRoute=async function(route){
    const result=await originalBind(route);
    if(route==='memories')install();
    return result;
  };
})();
