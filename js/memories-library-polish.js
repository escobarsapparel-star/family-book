(()=>{
  if(window.__fbMemoriesLibraryPolish||!window.FB_MEMORIES)return;
  window.__fbMemoriesLibraryPolish=true;

  const SORT_KEY='familybook:memories-sort';
  const originalBind=window.FB_MEMORIES.bindRoute?.bind(window.FB_MEMORIES);
  if(!originalBind)return;

  function memoryStamp(m){
    if(m?.date){
      const t=Date.parse(`${m.date}T${String(m.time||'00:00').slice(0,5)}:00`);
      if(Number.isFinite(t))return t;
    }
    return Number(m?.createdAt)||0;
  }

  function currentSort(){
    try{return localStorage.getItem(SORT_KEY)==='oldest'?'oldest':'newest'}catch(_){return 'newest'}
  }

  function applySort(page){
    const gallery=page?.querySelector('.memory-gallery');
    const select=page?.querySelector('#memorySortOrder');
    if(!gallery||!select)return;
    const dir=select.value==='oldest'?1:-1;
    [...gallery.querySelectorAll('.memory-card')]
      .sort((a,b)=>dir*((Number(a.dataset.memorySort)||0)-(Number(b.dataset.memorySort)||0)))
      .forEach(card=>gallery.appendChild(card));
  }

  async function decorateCards(page){
    if(!page||!document.body.contains(page))return;
    let list=[];
    try{list=await window.FB_MEMORIES.getAll?.()||[]}catch(_){ }
    if(!document.body.contains(page))return;
    const stamps=new Map(list.map(m=>[String(m.id),memoryStamp(m)]));

    page.querySelectorAll('.memory-card').forEach(card=>{
      const route=String(card.dataset.r||'');
      const id=route.startsWith('view-memory:')?route.slice('view-memory:'.length):'';
      card.dataset.memorySort=String(stamps.get(id)||0);
      const dateLine=card.querySelector('.memory-card-copy small');
      if(dateLine&&(/^date unknown$/i.test(dateLine.textContent.trim())||!dateLine.textContent.trim())){
        dateLine.hidden=true;
        dateLine.textContent='';
      }
    });
    applySort(page);
  }

  function installToolbar(page){
    if(page.querySelector('.memory-gallery-meta'))return;
    const panel=page.querySelector('.memory-filter-panel');
    if(!panel)return;

    const row=document.createElement('div');
    row.className='memory-gallery-meta';
    const count=page.querySelector('#memoryResultCount');
    if(count){
      count.classList.add('memory-gallery-count');
      row.appendChild(count);
    }else{
      const fallback=document.createElement('span');
      fallback.className='memory-gallery-count';
      row.appendChild(fallback);
    }

    const sort=document.createElement('label');
    sort.className='memory-gallery-sort';
    sort.innerHTML='<i data-lucide="arrow-up-down"></i><span>Sort</span><select id="memorySortOrder" aria-label="Sort memories"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>';
    const select=sort.querySelector('select');
    select.value=currentSort();
    select.addEventListener('change',()=>{
      try{localStorage.setItem(SORT_KEY,select.value)}catch(_){ }
      applySort(page);
    });
    row.appendChild(sort);
    panel.insertAdjacentElement('afterend',row);
    window.icons?.();
  }

  function bindRefresh(page){
    if(page.dataset.memoryPolishBound==='1')return;
    page.dataset.memoryPolishBound='1';
    const refresh=()=>setTimeout(()=>decorateCards(page),0);
    page.querySelector('#memorySearch')?.addEventListener('input',refresh);
    page.querySelector('#memoryYearFilter')?.addEventListener('change',refresh);
    page.querySelector('#memoryMemberFilter')?.addEventListener('change',refresh);
    page.querySelector('#memoryAlbumFilter')?.addEventListener('change',refresh);
    page.querySelector('#memoryClearFilters')?.addEventListener('click',refresh);
  }

  async function polish(){
    const page=document.querySelector('#screen .memories-page');
    if(!page)return;
    page.classList.add('memories-polished');
    installToolbar(page);
    bindRefresh(page);
    await decorateCards(page);
  }

  window.FB_MEMORIES.bindRoute=async function(route){
    const result=await originalBind(route);
    if(route==='memories'){
      try{await polish()}catch(err){console.warn('Memories polish:',err)}
    }
    return result;
  };
})();
