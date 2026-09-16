(()=>{
  if(window.__fbFamilySpotlight)return;
  window.__fbFamilySpotlight=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const isDesktop=()=>window.matchMedia?window.matchMedia('(min-width:1180px)').matches:window.innerWidth>=1180;
  let pool=[];
  let index=0;
  let mode='archive';
  let refreshing=false;
  let wasDesktop=isDesktop();
  let lastRefreshAt=0;
  let lastMemories=[];

  const memoryPhotos=m=>window.FB_MEMORIES?.getPhotos?.(m)||[];
  const firstVisual=m=>{
    const p=memoryPhotos(m)[0];
    if(!p)return '';
    return p.thumb||p.image||'';
  };
  const parsedDate=value=>{
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
    return Number.isNaN(d.getTime())?null:d;
  };
  const dateLabel=value=>{
    const d=parsedDate(value);if(!d)return '';
    try{return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(d)}catch(_){return value}
  };
  const daySeed=()=>{
    const d=new Date();
    return Number(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`)||0;
  };

  function choosePool(memories){
    const now=new Date(),month=now.getMonth()+1,day=now.getDate(),year=now.getFullYear();
    const visual=memories.filter(m=>firstVisual(m));
    const onThisDay=visual.filter(m=>{
      if(String(m.dateSource||'').toLowerCase()!=='exif')return false;
      const p=String(m.date||'').split('-').map(Number);
      return p.length===3&&p[0]<year&&p[1]===month&&p[2]===day;
    });
    mode=onThisDay.length?'today':'archive';
    pool=onThisDay.length?onThisDay:visual;
    index=pool.length?daySeed()%pool.length:0;
  }

  function weeklySummary(memories){
    const cutoff=Date.now()-(7*24*60*60*1000);
    const recent=memories.filter(m=>Number(m.createdAt||0)>=cutoff);
    let comments=0,reactions=0;
    recent.forEach(m=>{
      try{comments+=Number(window.FB_COMMENTS?.count?.(`memory:${m.id}`)||0)}catch(_){}
      try{reactions+=Number(window.FB_REACTIONS?.summary?.(`memory:${m.id}`)?.total||0)}catch(_){}
    });
    const parts=[`${recent.length} memor${recent.length===1?'y':'ies'}`];
    if(comments)parts.push(`${comments} comment${comments===1?'':'s'}`);
    if(reactions)parts.push(`${reactions} reaction${reactions===1?'':'s'}`);
    return parts.join(' · ');
  }

  function cardHtml(memory,summary){
    if(!memory){
      return `<section class="family-spotlight" id="familySpotlight"><div class="family-spotlight-head"><div><small>Family Spotlight</small><strong>Build your family archive</strong></div><i data-lucide="sparkles"></i></div><div class="family-spotlight-empty"><i data-lucide="images"></i><p>Shared family memories will appear here.</p><button type="button" data-r="add-memory">Add a memory</button></div></section>`;
    }
    const image=firstVisual(memory);
    const title=String(memory.caption||memory.story||'Family memory').trim()||'Family memory';
    const d=parsedDate(memory.date);
    const now=new Date();
    const years=d?Math.max(1,now.getFullYear()-d.getFullYear()):0;
    const kicker=mode==='today'?'On this day':'From the family archive';
    const sub=mode==='today'&&d?`${years} year${years===1?'':'s'} ago · ${dateLabel(memory.date)}`:(memory.date?dateLabel(memory.date):'A shared family memory');
    return `<section class="family-spotlight" id="familySpotlight" data-memory-id="${esc(memory.id)}">
      <div class="family-spotlight-head"><div><small>Family Spotlight</small><strong>${esc(kicker)}</strong></div><i data-lucide="sparkles"></i></div>
      <button type="button" class="family-spotlight-photo" data-spotlight-open aria-label="Open ${esc(title)}"><img src="${esc(image)}" alt=""><span>${esc(kicker)}</span></button>
      <div class="family-spotlight-copy"><strong>${esc(title)}</strong><small>${esc(sub)}</small></div>
      <div class="family-spotlight-actions"><button type="button" data-spotlight-open><i data-lucide="external-link"></i>Open memory</button>${pool.length>1?`<button type="button" data-spotlight-shuffle aria-label="Show another family memory"><i data-lucide="shuffle"></i></button>`:''}</div>
      <div class="family-spotlight-week"><span>This week in the family</span><strong>${esc(summary)}</strong></div>
    </section>`;
  }

  function bind(card){
    card.querySelectorAll('[data-spotlight-open]').forEach(btn=>btn.onclick=()=>{
      const id=card.dataset.memoryId;
      if(id)window.go?.(`view-memory:${id}`);
    });
    const shuffle=card.querySelector('[data-spotlight-shuffle]');
    if(shuffle)shuffle.onclick=()=>{
      if(pool.length<2)return;
      index=(index+1)%pool.length;
      renderCurrent();
    };
    card.querySelector('[data-r="add-memory"]')?.addEventListener('click',()=>window.go?.('add-memory'));
  }

  function renderCurrent(summaryText){
    const old=document.querySelector('#familySpotlight');
    const rail=document.querySelector('.desktop-left-rail');
    if(!rail||!isDesktop())return;
    const summary=summaryText||old?.dataset.weekSummary||weeklySummary(lastMemories)||'';
    const wrap=document.createElement('div');
    wrap.innerHTML=cardHtml(pool[index]||null,summary||'No new memories yet');
    const card=wrap.firstElementChild;
    card.dataset.weekSummary=summary||'No new memories yet';
    if(old)old.replaceWith(card);else rail.appendChild(card);
    bind(card);
    window.icons?.();
  }

  async function refresh(force=false){
    if(refreshing||!isDesktop())return;
    const rail=document.querySelector('.desktop-left-rail');
    if(!rail||!window.FB_MEMORIES?.getAll)return;
    if(!force&&lastMemories.length&&Date.now()-lastRefreshAt<60000){
      choosePool(lastMemories);
      renderCurrent(weeklySummary(lastMemories));
      return;
    }
    refreshing=true;
    try{
      const memories=await window.FB_MEMORIES.getAll();
      const list=Array.isArray(memories)?memories:[];
      lastMemories=list;
      lastRefreshAt=Date.now();
      choosePool(list);
      renderCurrent(weeklySummary(list));
    }catch(err){
      console.warn('Family Spotlight could not load',err);
    }finally{refreshing=false}
  }

  function mount(){
    if(!isDesktop())return false;
    const rail=document.querySelector('.desktop-left-rail');
    if(!rail)return false;
    if(!rail.querySelector('#familySpotlight'))refresh(false);
    return true;
  }

  const root=document.getElementById('app');
  if(root)new MutationObserver(mutations=>{
    const railAdded=mutations.some(m=>[...m.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('.desktop-left-rail')||node.querySelector?.('.desktop-left-rail'))));
    if(railAdded&&isDesktop()&&!document.querySelector('#familySpotlight'))mount();
  }).observe(root,{childList:true,subtree:true});
  mount();
  window.addEventListener('familybook:family-data-updated',()=>refresh(true));
  window.addEventListener('familybook:reaction',()=>refresh(false));
  window.addEventListener('resize',()=>{
    const desktop=isDesktop();
    if(desktop&&!wasDesktop)setTimeout(mount,60);
    wasDesktop=desktop;
  },{passive:true});
})();