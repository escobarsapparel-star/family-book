(()=>{
  if(window.__fbMemoriesContributorGroups||!window.FB_MEMORIES)return;
  window.__fbMemoriesContributorGroups=true;

  const originalBind=window.FB_MEMORIES.bindRoute?.bind(window.FB_MEMORIES);
  if(!originalBind)return;

  let mode='all';
  let focusId='';
  let sourceCards=new Map();
  let allMemories=[];

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
  const auth=()=>{try{return window.FB_AUTH?.get?.()||{}}catch(_){return {}}};
  const people=()=>{try{return window.ensureOwner?.()||[]}catch(_){return []}};
  const initials=name=>String(name||'Family').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'F';

  function memoryStamp(m){
    if(m?.date){
      const t=Date.parse(`${m.date}T${String(m.time||'00:00').slice(0,5)}:00`);
      if(Number.isFinite(t))return t;
    }
    return Number(m?.createdAt)||0;
  }

  function memoryIdFromCard(card){
    const route=String(card?.dataset?.r||'');
    return route.startsWith('view-memory:')?route.slice('view-memory:'.length):'';
  }

  function captureNativeGallery(page){
    const library=page?.querySelector('#memoryLibrary');
    if(!library||!library.classList.contains('memory-gallery'))return false;
    const next=new Map();
    library.querySelectorAll(':scope > .memory-card').forEach(card=>{
      const id=memoryIdFromCard(card);
      if(id)next.set(id,card.cloneNode(true));
    });
    sourceCards=next;
    return true;
  }

  function currentSort(page){
    return page.querySelector('#memorySortOrder')?.value==='oldest'?'oldest':'newest';
  }

  function sortedVisible(page){
    const dir=currentSort(page)==='oldest'?1:-1;
    return allMemories
      .filter(m=>sourceCards.has(String(m.id)))
      .slice()
      .sort((a,b)=>dir*(memoryStamp(a)-memoryStamp(b)));
  }

  function memberMap(){return new Map(people().map(p=>[String(p.id),p]))}

  function authorFor(memory,byId){
    const id=String(memory?.authorId||'');
    const person=byId.get(id)||{};
    return {
      id,
      name:person.name||memory?.authorName||'Family member',
      photo:person.photo||memory?.authorPhoto||''
    };
  }

  function avatarMarkup(info,sizeClass=''){
    return `<span class="memory-contributor-avatar ${sizeClass}">${info.photo?`<img src="${esc(info.photo)}" alt="">`:esc(initials(info.name))}</span>`;
  }

  function hasHistoryMemories(list,byId){
    return list.some(m=>(m.tags||[]).some(id=>byId.get(String(id))?.profileType==='history'));
  }

  function contributorList(list,byId){
    const own=String(auth().memberId||'');
    const seen=new Map();
    list.forEach(m=>{
      const a=authorFor(m,byId);
      if(!a.id||a.id===own||seen.has(a.id))return;
      seen.set(a.id,a);
    });
    return [...seen.values()];
  }

  function chipButton({key,label,icon='',info=null,active=false}){
    const leading=info?avatarMarkup(info,'small'):`<i data-lucide="${icon}"></i>`;
    return `<button type="button" class="memory-contributor-chip${active?' active':''}" data-memory-contributor="${esc(key)}">${leading}<span>${esc(label)}</span></button>`;
  }

  function installChips(page){
    const byId=memberMap();
    const meta=page.querySelector('.memory-gallery-meta');
    const panel=page.querySelector('.memory-filter-panel');
    if(!panel)return;
    let bar=page.querySelector('.memory-contributor-chipbar');
    if(!bar){
      bar=document.createElement('div');
      bar.className='memory-contributor-chipbar';
      (meta||panel.nextSibling)?panel.insertAdjacentElement('afterend',bar):panel.parentNode.appendChild(bar);
    }

    const contributors=contributorList(allMemories,byId);
    const history=hasHistoryMemories(allMemories,byId);
    const activeKey=mode==='author'?`author:${focusId}`:mode;
    const pieces=[
      chipButton({key:'all',label:'All family',icon:'users-round',active:activeKey==='all'}),
      chipButton({key:'mine',label:'Mine',icon:'user-round',active:activeKey==='mine'})
    ];
    contributors.forEach(info=>pieces.push(chipButton({key:`author:${info.id}`,label:info.name.split(' ')[0]||info.name,info,active:activeKey===`author:${info.id}`})));
    if(history)pieces.push(chipButton({key:'history',label:'Family History',icon:'heart',active:activeKey==='history'}));
    bar.innerHTML=pieces.join('');

    bar.querySelectorAll('[data-memory-contributor]').forEach(btn=>btn.addEventListener('click',()=>{
      const key=btn.dataset.memoryContributor||'all';
      if(key.startsWith('author:')){mode='author';focusId=key.slice(7)}
      else{mode=key;focusId=''}
      installChips(page);
      renderGrouped(page);
    }));
    window.icons?.();
  }

  function cloneCard(memory,{history=false}={}){
    const template=sourceCards.get(String(memory.id));
    if(!template)return null;
    const card=template.cloneNode(true);
    card.classList.add('memory-group-card');
    if(history){
      const copy=card.querySelector('.memory-card-copy');
      if(copy&&!copy.querySelector('.memory-card-author')){
        const byId=memberMap();
        const a=authorFor(memory,byId);
        const line=document.createElement('span');
        line.className='memory-card-author';
        line.innerHTML=`${avatarMarkup(a,'tiny')}<span>Added by ${esc(a.name)}</span>`;
        copy.appendChild(line);
      }
    }
    card.addEventListener('click',ev=>{
      ev.preventDefault();
      const route=String(card.dataset.r||'');
      if(route)window.go?.(route);
    });
    return card;
  }

  function groupHeader({title,subtitle,info,count,viewKey,showView=true}){
    return `<div class="memory-contributor-head">
      <div class="memory-contributor-person">${avatarMarkup(info||{name:title,photo:''})}<div><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></div></div>
      ${showView?`<button type="button" class="memory-contributor-view" data-memory-view="${esc(viewKey)}">View all <span>(${count})</span><i data-lucide="arrow-right"></i></button>`:''}
    </div>`;
  }

  function makeSection(page,{title,subtitle,info,memories,viewKey,history=false,showView=true}){
    const section=document.createElement('section');
    section.className='memory-contributor-section';
    section.innerHTML=groupHeader({title,subtitle,info,count:memories.length,viewKey,showView});
    const grid=document.createElement('div');
    grid.className='memory-contributor-grid';
    memories.forEach(m=>{
      const card=cloneCard(m,{history});
      if(card)grid.appendChild(card);
    });
    section.appendChild(grid);
    section.querySelector('[data-memory-view]')?.addEventListener('click',()=>{
      const key=section.querySelector('[data-memory-view]')?.dataset.memoryView||'';
      if(key.startsWith('author:')){mode='author';focusId=key.slice(7)}
      else if(key.startsWith('history:')){mode='history';focusId=key.slice(8)}
      installChips(page);
      renderGrouped(page);
      page.querySelector('#memoryLibrary')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
    return section;
  }

  function renderAuthorGroups(page,list,byId){
    const own=String(auth().memberId||'');
    const library=page.querySelector('#memoryLibrary');
    const groups=new Map();
    list.forEach(m=>{
      const a=authorFor(m,byId);
      const key=a.id||`unknown:${a.name}`;
      if(!groups.has(key))groups.set(key,{info:a,items:[]});
      groups.get(key).items.push(m);
    });

    let entries=[...groups.entries()];
    entries.sort((a,b)=>{
      if(a[0]===own)return -1;
      if(b[0]===own)return 1;
      return memoryStamp(b[1].items[0])-memoryStamp(a[1].items[0]);
    });

    if(mode==='mine')entries=entries.filter(([key])=>key===own);
    if(mode==='author')entries=entries.filter(([key])=>key===focusId);

    if(!entries.length){
      library.innerHTML=`<div class="memory-group-empty"><i data-lucide="images"></i><strong>${mode==='mine'?'No memories added by you yet':'No memories found'}</strong><span>${mode==='mine'?'Your first family memory will appear here after you add it.':'Try another contributor or clear the current filters.'}</span></div>`;
      return;
    }

    entries.forEach(([key,group])=>{
      const mine=key===own;
      const single=mode==='mine'||mode==='author';
      const title=mine?'Your memories':`Added by ${group.info.name}`;
      const subtitle=mine?'Memories you’ve added to Family Book.':`Memories added by ${group.info.name}.`;
      library.appendChild(makeSection(page,{title,subtitle,info:group.info,memories:group.items,viewKey:`author:${key}`,showView:!single&&group.items.length>4}));
    });
  }

  function renderHistoryGroups(page,list,byId){
    const library=page.querySelector('#memoryLibrary');
    const historyPeople=people().filter(p=>p.profileType==='history');
    const groups=[];
    historyPeople.forEach(person=>{
      const items=list.filter(m=>(m.tags||[]).map(String).includes(String(person.id)));
      if(items.length)groups.push({person,items});
    });
    groups.sort((a,b)=>memoryStamp(b.items[0])-memoryStamp(a.items[0]));
    const shown=focusId?groups.filter(g=>String(g.person.id)===String(focusId)):groups;
    if(!shown.length){
      library.innerHTML='<div class="memory-group-empty"><i data-lucide="heart"></i><strong>No Family History memories found</strong><span>Memories tagged with Family History profiles will appear here.</span></div>';
      return;
    }
    shown.forEach(({person,items})=>{
      const info={id:String(person.id),name:person.name||'Family member',photo:person.photo||''};
      library.appendChild(makeSection(page,{title:`Remembering ${info.name}`,subtitle:`${items.length} ${items.length===1?'memory':'memories'} connected to ${info.name}.`,info,memories:items,viewKey:`history:${info.id}`,history:true,showView:!focusId&&items.length>4}));
    });
  }

  function renderGrouped(page){
    const library=page?.querySelector('#memoryLibrary');
    if(!library||!sourceCards.size)return;
    const byId=memberMap();
    const visible=sortedVisible(page);
    library.className='memory-contributor-library';
    library.innerHTML='';

    if(mode==='history')renderHistoryGroups(page,visible,byId);
    else renderAuthorGroups(page,visible,byId);

    const count=page.querySelector('#memoryResultCount');
    if(count){
      const shown=mode==='mine'?visible.filter(m=>String(m.authorId||'')===String(auth().memberId||'')).length:
        mode==='author'?visible.filter(m=>String(m.authorId||'')===String(focusId)).length:
        mode==='history'&&focusId?visible.filter(m=>(m.tags||[]).map(String).includes(String(focusId))).length:
        visible.length;
      count.textContent=`${shown} ${shown===1?'memory':'memories'}`;
    }
    window.icons?.();
  }

  function bindRefresh(page){
    if(page.dataset.contributorGroupsBound==='1')return;
    page.dataset.contributorGroupsBound='1';
    const schedule=()=>setTimeout(async()=>{
      try{
        allMemories=await window.FB_MEMORIES.getAll?.()||[];
        if(captureNativeGallery(page)){
          installChips(page);
          renderGrouped(page);
        }else if(page.querySelector('#memoryLibrary')){
          installChips(page);
          renderGrouped(page);
        }
      }catch(err){console.warn('Memory contributor refresh:',err)}
    },30);
    page.querySelector('#memorySearch')?.addEventListener('input',schedule);
    page.querySelector('#memoryYearFilter')?.addEventListener('change',schedule);
    page.querySelector('#memoryMemberFilter')?.addEventListener('change',schedule);
    page.querySelector('#memoryAlbumFilter')?.addEventListener('change',schedule);
    page.querySelector('#memoryClearFilters')?.addEventListener('click',schedule);
    page.querySelector('#memorySortOrder')?.addEventListener('change',()=>setTimeout(()=>renderGrouped(page),0));
  }

  async function enhance(){
    const page=document.querySelector('#screen .memories-page');
    if(!page)return;
    allMemories=await window.FB_MEMORIES.getAll?.()||[];
    if(!captureNativeGallery(page))return;
    installChips(page);
    bindRefresh(page);
    renderGrouped(page);
  }

  window.FB_MEMORIES.bindRoute=async function(route){
    const result=await originalBind(route);
    if(route==='memories'){
      mode='all';focusId='';sourceCards=new Map();
      try{await enhance()}catch(err){console.warn('Memories contributor groups:',err)}
    }
    return result;
  };
})();