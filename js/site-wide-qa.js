(()=>{
  if(window.__fbSiteWideQa1)return;
  window.__fbSiteWideQa1=true;

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;run()});
  };

  const ownId=()=>String(window.FB_AUTH?.get?.()?.memberId||'owner');
  const ownName=()=>String(window.FB_AUTH?.get?.()?.name||'').trim().toLowerCase().replace(/\s+/g,' ');

  function parseRichStatus(text){
    const raw=String(text||'').trim();
    for(const [prefix,type] of [['[[FB_WATCHING]]','watching'],['[[FB_LISTENING]]','listening']]){
      if(!raw.startsWith(prefix))continue;
      const rest=raw.slice(prefix.length);
      const nl=rest.indexOf('\n');
      const metaRaw=(nl>=0?rest.slice(0,nl):rest).trim();
      const note=(nl>=0?rest.slice(nl+1):'').trim();
      try{return {type,meta:JSON.parse(metaRaw),note}}catch(_){return {type,meta:null,note}}
    }
    return null;
  }

  function cleanProfileStatus(){
    const el=document.querySelector('#profileLatestStatus');
    if(!el||!window.FB_WALL?.getPosts)return;
    const posts=(window.FB_WALL.getPosts()||[]).filter(p=>{
      if(p?.authorId)return String(p.authorId)===ownId();
      const n=String(p?.authorName||'').trim().toLowerCase().replace(/\s+/g,' ');
      return n&&n===ownName();
    }).sort((a,b)=>(Number(b?.createdAt)||0)-(Number(a?.createdAt)||0));
    const p=posts[0];
    let text='No status update yet';
    if(p){
      const rich=parseRichStatus(p.text);
      if(rich?.type==='watching'&&rich.meta?.title){
        text=`Watching: ${rich.meta.title}${rich.note?` — ${rich.note}`:''}`;
      }else if(rich?.type==='listening'&&rich.meta?.title){
        const artist=rich.meta.artist?` — ${rich.meta.artist}`:'';
        text=`Listening to: ${rich.meta.title}${artist}${rich.note?` · ${rich.note}`:''}`;
      }else if(p.activity==='checkin'){
        text=`Checked in${p.location?` at ${p.location}`:''}${p.text?`: ${p.text}`:''}`;
      }else{
        const labels={watching:'Watching',listening:'Listening to',thinking:'Thinking of',feeling:'Feeling',reading:'Reading'};
        const label=labels[p.activity];
        const body=String(p.text||'').trim();
        text=label?(body?`${label}: ${body}`:label):(body||(p.media?.kind==='video'?'Shared a video':p.media?.kind==='image'?'Shared a photo':'No status update yet'));
      }
    }
    if(el.textContent!==text)el.textContent=text;
  }

  function polishMemoriesRuntime(){
    const page=document.querySelector('#screen .memories-page');
    if(!page)return;
    const count=page.querySelector('#memoryResultCount');
    if(count&&!count.hidden)count.hidden=true;
    const cards=[...page.querySelectorAll('.memory-gallery .memory-card')].filter(card=>!card.hidden&&getComputedStyle(card).display!=='none');
    const sort=page.querySelector('.memory-gallery-sort');
    if(sort){
      const shouldHide=cards.length<6;
      if(sort.hidden!==shouldHide)sort.hidden=shouldHide;
    }
    page.querySelectorAll('.memory-card-tags').forEach(el=>{if(!el.hidden)el.hidden=true});
  }

  function cleanUnknownDates(){
    document.querySelectorAll('.album-memory-choice-copy small,.memory-card-copy small').forEach(el=>{
      if(/^date unknown$/i.test(String(el.textContent||'').trim())){
        if(!el.hidden)el.hidden=true;
      }
    });
  }

  function fixNotificationRoutes(){
    document.querySelectorAll('[data-notification-route="wall"]').forEach(btn=>{
      btn.dataset.notificationRoute='home';
    });
  }

  function healTreeArt(){
    document.querySelectorAll('#fullTreeStage .ct-tree-art').forEach(img=>{
      if(img.dataset.qaTreeBound==='1')return;
      img.dataset.qaTreeBound='1';
      const fallback=()=>{
        if(img.dataset.qaFallback==='1')return;
        img.dataset.qaFallback='1';
        img.src='assets/tree/tree-of-life-poster.svg';
      };
      img.addEventListener('error',fallback,{once:true});
      if(img.complete&&!img.naturalWidth)fallback();
      else setTimeout(()=>{if(img.complete&&!img.naturalWidth)fallback()},350);
    });
  }

  function removeBrokenImagePlaceholders(){
    document.querySelectorAll('#screen img:not(.ct-tree-art)').forEach(img=>{
      if(img.dataset.qaErrorBound==='1')return;
      img.dataset.qaErrorBound='1';
      img.addEventListener('error',()=>{
        const wrap=img.closest('.memory-card-photo,.wall-memory-photo,.member-photo,.profile-view-avatar,.album-card-cover');
        if(wrap)wrap.classList.add('image-load-failed');
      });
    });
  }

  function run(){
    cleanProfileStatus();
    polishMemoriesRuntime();
    cleanUnknownDates();
    fixNotificationRoutes();
    healTreeArt();
    removeBrokenImagePlaceholders();
  }

  const screen=document.getElementById('screen')||document.getElementById('app');
  if(screen){
    new MutationObserver(mutations=>{
      const relevant=mutations.some(m=>m.type==='childList'&&m.addedNodes.length);
      if(relevant)queue();
    }).observe(screen,{childList:true,subtree:true});
  }
  window.addEventListener('hashchange',()=>setTimeout(queue,0));
  document.addEventListener('input',ev=>{if(ev.target?.closest?.('.memory-filter-panel'))queue()});
  document.addEventListener('change',ev=>{if(ev.target?.closest?.('.memory-filter-panel'))queue()});
  setTimeout(run,0);
  setTimeout(run,250);
})();
