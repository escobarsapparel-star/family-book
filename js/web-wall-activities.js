(()=>{
  if(window.__fbWebWallActivities)return;
  window.__fbWebWallActivities=true;

  const WATCHING_PREFIX='[[FB_WATCHING]]';
  const LISTENING_PREFIX='[[FB_LISTENING]]';
  const FEELINGS=[
    ['happy','Happy','😊'],['grateful','Grateful','🙏'],['loved','Loved','🥰'],['excited','Excited','🤩'],
    ['blessed','Blessed','✨'],['relaxed','Relaxed','😌'],['proud','Proud','😎'],['hopeful','Hopeful','🌤️'],
    ['silly','Silly','🤪'],['tired','Tired','😴'],['sad','Sad','😢'],['worried','Worried','😟'],
    ['frustrated','Frustrated','😤'],['angry','Angry','😠'],['sick','Sick','🤒'],['lonely','Lonely','😔']
  ].map(([id,label,emoji])=>({id,label,emoji}));
  const selected={home:{feeling:null,watching:null,listening:null},profile:{feeling:null,watching:null,listening:null}};
  const timers={watching:null,listening:null};
  let searchSeq=0;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const icons=()=>window.icons?.();
  const scopeInput=scope=>document.querySelector(scope==='home'?'#wallHomeText':'#profileStatusText');
  const scopeHolder=scope=>document.querySelector(`[data-activity-scope="${scope}"]`);
  const scopeActivity=scope=>scopeHolder(scope)?.querySelector('[data-activity].active')?.dataset.activity||document.querySelector(`[data-activity-select="${scope}"]`)?.value||'update';
  const timeSuffix=span=>{
    const text=String(span?.textContent||'').trim();
    const parts=text.split(' · ');
    return parts.length>1?parts.at(-1):'';
  };
  const setActivityLine=(span,line)=>{
    if(!span)return;
    const t=timeSuffix(span);
    span.textContent=t?`${line} · ${t}`:line;
  };
  const firstBodyParagraph=post=>post.querySelector('.wall-post-body > p');

  function parsePrefixed(raw,prefix){
    const text=String(raw||'');
    if(!text.startsWith(prefix))return null;
    const rest=text.slice(prefix.length);
    const nl=rest.indexOf('\n');
    const metaText=(nl>=0?rest.slice(0,nl):rest).trim();
    const note=(nl>=0?rest.slice(nl+1):'').trim();
    try{return {meta:JSON.parse(metaText),note}}catch(_){return null}
  }
  function parseFeeling(raw){
    const lines=String(raw||'').split(/\r?\n/),first=(lines.shift()||'').trim();
    const feeling=FEELINGS.find(f=>first===`${f.emoji} ${f.label}`);
    return feeling?{feeling,note:lines.join('\n').trim()}:null;
  }
  function replaceBodyText(p,note){
    if(!p)return;
    if(note){p.textContent=note;p.hidden=false}
    else p.remove();
  }
  function richCard(type,meta){
    if(type==='watching'){
      const movie=meta.media_type==='movie';
      return `<div class="web-wall-rich-card web-wall-watch-card">${meta.poster_url?`<img src="${esc(meta.poster_url)}" alt="">`:`<span class="web-wall-rich-placeholder"><i data-lucide="tv"></i></span>`}<div><span>Watching</span><strong>${esc(meta.title||'')}</strong><small>${movie?'Movie':'TV series'}${meta.year?` • ${esc(meta.year)}`:''}</small></div></div>`;
    }
    return `<div class="web-wall-rich-card web-wall-listen-card">${meta.artwork_url?`<img src="${esc(meta.artwork_url)}" alt="">`:`<span class="web-wall-rich-placeholder"><i data-lucide="music-2"></i></span>`}<div><span>Listening to</span><strong>${esc(meta.title||'')}</strong><small>${esc(meta.artist||'Unknown artist')}${meta.album?` • ${esc(meta.album)}`:''}</small>${meta.track_url?`<a href="${esc(meta.track_url)}" target="_blank" rel="noopener"><i data-lucide="external-link"></i>Apple Music</a>`:''}</div></div>`;
  }

  function enhancePost(post){
    if(!post||post.dataset.webActivityEnhanced==='1')return;
    const body=post.querySelector('.wall-post-body'),p=firstBodyParagraph(post),headSpan=post.querySelector('.wall-post-head > div:nth-child(2) > span');
    if(!body||!headSpan){post.dataset.webActivityEnhanced='1';return}
    const raw=String(p?.textContent||'').trim();
    const header=String(headSpan.textContent||'').toLowerCase();

    const watching=parsePrefixed(raw,WATCHING_PREFIX);
    if(watching?.meta?.title){
      setActivityLine(headSpan,`is watching 🎬 ${watching.meta.title}`);
      replaceBodyText(p,watching.note);
      body.querySelector('.web-wall-rich-card')?.remove();
      const anchor=body.querySelector('.wall-post-attachment,.wall-map-link,.reaction-controls,.comment-thread');
      anchor?.insertAdjacentHTML('beforebegin',richCard('watching',watching.meta))||body.insertAdjacentHTML('beforeend',richCard('watching',watching.meta));
      post.dataset.webActivityEnhanced='1';icons();return;
    }

    const listening=parsePrefixed(raw,LISTENING_PREFIX);
    if(listening?.meta?.title){
      setActivityLine(headSpan,`is listening to 🎵 ${listening.meta.title}`);
      replaceBodyText(p,listening.note);
      body.querySelector('.web-wall-rich-card')?.remove();
      const anchor=body.querySelector('.wall-post-attachment,.wall-map-link,.reaction-controls,.comment-thread');
      anchor?.insertAdjacentHTML('beforebegin',richCard('listening',listening.meta))||body.insertAdjacentHTML('beforeend',richCard('listening',listening.meta));
      post.dataset.webActivityEnhanced='1';icons();return;
    }

    if(header.includes('is feeling')){
      const data=parseFeeling(raw);
      if(data){setActivityLine(headSpan,`is feeling ${data.feeling.emoji} ${data.feeling.label}`);replaceBodyText(p,data.note)}
      post.dataset.webActivityEnhanced='1';return;
    }
    if(header.includes('is thinking of')){
      if(raw)setActivityLine(headSpan,`is thinking of 💭 ${raw}`);
      p?.remove();post.dataset.webActivityEnhanced='1';return;
    }
    if(header.includes('is reading')){
      if(raw)setActivityLine(headSpan,`is reading 📖 ${raw}`);
      p?.remove();post.dataset.webActivityEnhanced='1';return;
    }
    post.dataset.webActivityEnhanced='1';
  }
  function enhanceFeeds(){document.querySelectorAll('.family-wall-feed .wall-post,.member-wall-feed .wall-post,#memberActivityFeed .wall-post').forEach(enhancePost)}

  function modalShell(){
    if(document.querySelector('#webWallActivityPicker'))return;
    document.body.insertAdjacentHTML('beforeend',`<div id="webWallActivityPicker" class="web-wall-picker" hidden>
      <button class="web-wall-picker-scrim" type="button" data-web-picker-close aria-label="Close"></button>
      <section class="web-wall-picker-card" role="dialog" aria-modal="true">
        <header><button type="button" data-web-picker-close aria-label="Back"><i data-lucide="arrow-left"></i></button><strong data-web-picker-title>Family activity</strong></header>
        <div data-web-picker-body></div>
      </section>
    </div>`);
    document.querySelectorAll('[data-web-picker-close]').forEach(b=>b.addEventListener('click',closePicker));icons();
  }
  function openPicker(title,html){
    modalShell();const modal=document.querySelector('#webWallActivityPicker');
    modal.querySelector('[data-web-picker-title]').textContent=title;
    modal.querySelector('[data-web-picker-body]').innerHTML=html;
    modal.hidden=false;document.body.classList.add('web-wall-picker-open');icons();
    return modal;
  }
  function closePicker(){const m=document.querySelector('#webWallActivityPicker');if(m)m.hidden=true;document.body.classList.remove('web-wall-picker-open')}

  function refreshPill(scope,type){
    const btn=scopeHolder(scope)?.querySelector(`[data-activity="${type}"]`);if(!btn)return;
    if(type==='feeling'){
      const f=selected[scope].feeling;btn.innerHTML=f?`<span class="web-feeling-emoji">${f.emoji}</span><span>${esc(f.label)}</span>`:'<i data-lucide="smile"></i><span>Feeling</span>';
    }else if(type==='watching'){
      const w=selected[scope].watching;btn.innerHTML=w?`<i data-lucide="tv"></i><span>${esc(w.title)}</span>`:'<i data-lucide="tv"></i><span>Watching</span>';
    }else if(type==='listening'){
      const l=selected[scope].listening;btn.innerHTML=l?`<i data-lucide="headphones"></i><span>${esc(l.title)}</span>`:'<i data-lucide="headphones"></i><span>Listening to</span>';
    }
    icons();renderSelection(scope);
  }
  function selectionMeta(scope){
    const activity=scopeActivity(scope);
    if(activity==='watching'&&selected[scope].watching)return {type:'watching',meta:selected[scope].watching};
    if(activity==='listening'&&selected[scope].listening)return {type:'listening',meta:selected[scope].listening};
    if(activity==='feeling'&&selected[scope].feeling)return {type:'feeling',meta:selected[scope].feeling};
    return null;
  }
  function renderSelection(scope){
    const input=scopeInput(scope);if(!input)return;
    let mount=input.parentElement?.querySelector(`.web-wall-selection[data-scope="${scope}"]`);
    if(!mount){mount=document.createElement('div');mount.className='web-wall-selection';mount.dataset.scope=scope;input.insertAdjacentElement('beforebegin',mount)}
    const data=selectionMeta(scope);
    if(!data){mount.hidden=true;mount.innerHTML='';return}
    mount.hidden=false;
    if(data.type==='feeling')mount.innerHTML=`<div class="web-selection-feeling"><span>${data.meta.emoji}</span><strong>Feeling ${esc(data.meta.label)}</strong></div>`;
    else mount.innerHTML=richCard(data.type,data.meta);
    icons();
  }

  function openFeeling(scope){
    const modal=openPicker('How are you feeling?',`<label class="web-picker-search"><i data-lucide="search"></i><input type="search" placeholder="Search feelings" data-feeling-search></label><div class="web-feeling-grid">${FEELINGS.map(f=>`<button type="button" data-feeling="${f.id}"><span>${f.emoji}</span><strong>${esc(f.label)}</strong></button>`).join('')}</div>`);
    const grid=modal.querySelector('.web-feeling-grid');
    modal.querySelector('[data-feeling-search]')?.addEventListener('input',ev=>{const q=ev.target.value.trim().toLowerCase();grid.querySelectorAll('[data-feeling]').forEach(b=>b.hidden=q&&!b.textContent.toLowerCase().includes(q))});
    grid.addEventListener('click',ev=>{const b=ev.target.closest('[data-feeling]');if(!b)return;selected[scope].feeling=FEELINGS.find(f=>f.id===b.dataset.feeling)||null;refreshPill(scope,'feeling');closePicker()});
  }

  function resultShell(kind){
    const icon=kind==='watching'?'tv':'music-2',placeholder=kind==='watching'?'Search movies or TV shows':'Search songs or artists';
    return `<label class="web-picker-search"><i data-lucide="search"></i><input type="search" placeholder="${placeholder}" data-media-search="${kind}" autocomplete="off"></label><div class="web-media-results" data-media-results><div class="web-media-empty"><i data-lucide="${icon}"></i><strong>Start typing to search</strong></div></div>${kind==='watching'?'<small class="web-media-credit">Movie & TV data provided by TMDB</small>':''}`;
  }
  function renderResults(modal,kind,results=[],state=''){
    const mount=modal.querySelector('[data-media-results]');if(!mount)return;
    if(state==='loading'){mount.innerHTML='<div class="web-media-empty"><i data-lucide="loader-circle"></i><strong>Searching…</strong></div>';icons();return}
    if(state==='error'){mount.innerHTML='<div class="web-media-empty"><i data-lucide="circle-alert"></i><strong>Search unavailable</strong></div>';icons();return}
    if(!results.length){mount.innerHTML='<div class="web-media-empty"><i data-lucide="search-x"></i><strong>No results found</strong></div>';icons();return}
    mount._results=results;
    mount.innerHTML=results.map((r,i)=>kind==='watching'
      ?`<button type="button" class="web-media-result" data-result="${i}">${r.poster_url?`<img src="${esc(r.poster_url)}" alt="">`:`<span class="web-media-no-image"><i data-lucide="tv"></i></span>`}<span><strong>${esc(r.title)}</strong><small>${r.media_type==='movie'?'Movie':'TV series'}${r.year?` • ${esc(r.year)}`:''}</small>${r.overview?`<em>${esc(r.overview)}</em>`:''}</span><i data-lucide="chevron-right"></i></button>`
      :`<button type="button" class="web-media-result web-song-result" data-result="${i}">${r.artwork_url?`<img src="${esc(r.artwork_url)}" alt="">`:`<span class="web-media-no-image"><i data-lucide="music-2"></i></span>`}<span><strong>${esc(r.title)}</strong><small>${esc(r.artist||'Unknown artist')}</small>${r.album?`<em>${esc(r.album)}${r.genre?` • ${esc(r.genre)}`:''}</em>`:''}</span><i data-lucide="chevron-right"></i></button>`).join('');
    icons();
  }
  async function searchMedia(modal,kind,q){
    const query=String(q||'').trim(),seq=++searchSeq;if(query.length<2){renderResults(modal,kind,[]);return}
    renderResults(modal,kind,[],'loading');
    try{
      const client=window.FB_SUPABASE?.client;if(!client)throw new Error('Supabase is not ready.');
      const fn=kind==='watching'?'tmdb-search':'music-search';
      const {data,error}=await client.functions.invoke(fn,{body:{query}});if(seq!==searchSeq)return;if(error||data?.error)throw new Error(error?.message||data?.error||'Search failed');
      renderResults(modal,kind,Array.isArray(data?.results)?data.results:[]);
    }catch(_){if(seq===searchSeq)renderResults(modal,kind,[],'error')}
  }
  function openMediaPicker(scope,kind){
    const title=kind==='watching'?'What are you watching?':'What are you listening to?';
    const modal=openPicker(title,resultShell(kind)),input=modal.querySelector(`[data-media-search="${kind}"]`),mount=modal.querySelector('[data-media-results]');
    input?.focus();
    input?.addEventListener('input',ev=>{clearTimeout(timers[kind]);timers[kind]=setTimeout(()=>searchMedia(modal,kind,ev.target.value),350)});
    mount?.addEventListener('click',ev=>{const b=ev.target.closest('[data-result]');if(!b)return;const item=mount._results?.[Number(b.dataset.result)];if(!item)return;
      if(kind==='watching')selected[scope].watching={id:item.id,media_type:item.media_type,title:item.title,year:item.year||'',poster_url:item.poster_url||null};
      else selected[scope].listening={track_id:item.track_id,title:item.title,artist:item.artist||'',album:item.album||'',artwork_url:item.artwork_url||null,track_url:item.track_url||null,genre:item.genre||''};
      refreshPill(scope,kind);closePicker();
    });
  }

  function bindComposer(scope){
    const holder=scopeHolder(scope);if(!holder||holder.dataset.webActivitiesBound==='1')return;
    holder.dataset.webActivitiesBound='1';
    holder.querySelectorAll('[data-activity]').forEach(btn=>btn.addEventListener('click',()=>{
      const type=btn.dataset.activity;
      if(type==='feeling')setTimeout(()=>openFeeling(scope),0);
      else if(type==='watching')setTimeout(()=>openMediaPicker(scope,'watching'),0);
      else if(type==='listening')setTimeout(()=>openMediaPicker(scope,'listening'),0);
      else setTimeout(()=>renderSelection(scope),0);
    }));
    renderSelection(scope);
  }
  function bindComposers(){bindComposer('home');bindComposer('profile')}

  function storedText(scope,note){
    const activity=scopeActivity(scope),clean=String(note||'').trim();
    if(activity==='feeling'&&selected[scope].feeling){const f=selected[scope].feeling;return `${f.emoji} ${f.label}${clean?`\n${clean}`:''}`}
    if(activity==='watching'&&selected[scope].watching){const w=selected[scope].watching;const meta={id:Number(w.id)||0,media_type:w.media_type==='movie'?'movie':'tv',title:String(w.title||'').slice(0,180),year:String(w.year||'').slice(0,4),poster_url:w.poster_url||null};return `${WATCHING_PREFIX}${JSON.stringify(meta)}${clean?`\n${clean}`:''}`}
    if(activity==='listening'&&selected[scope].listening){const l=selected[scope].listening;const meta={track_id:Number(l.track_id)||0,title:String(l.title||'').slice(0,180),artist:String(l.artist||'').slice(0,180),album:String(l.album||'').slice(0,180),artwork_url:l.artwork_url||null,track_url:l.track_url||null,genre:String(l.genre||'').slice(0,80)};return `${LISTENING_PREFIX}${JSON.stringify(meta)}${clean?`\n${clean}`:''}`}
    return clean;
  }

  document.addEventListener('click',ev=>{
    const btn=ev.target.closest('#wallHomePost,#profileStatusPost');if(!btn)return;
    const scope=btn.id==='wallHomePost'?'home':'profile',input=scopeInput(scope);if(!input)return;
    const original=input.value,encoded=storedText(scope,original);
    if(encoded!==original){input.value=encoded;setTimeout(()=>{if(document.body.contains(input)&&input.value===encoded)input.value=original},0)}
    setTimeout(()=>{if(input.value===''){selected[scope]={feeling:null,watching:null,listening:null};['feeling','watching','listening'].forEach(t=>refreshPill(scope,t));renderSelection(scope)}},1200);
  },true);

  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!document.querySelector('#webWallActivityPicker')?.hidden)closePicker()});

  const root=document.getElementById('app')||document.body;
  const observer=new MutationObserver(()=>{enhanceFeeds();bindComposers()});
  observer.observe(root,{childList:true,subtree:true});
  enhanceFeeds();bindComposers();modalShell();
})();
