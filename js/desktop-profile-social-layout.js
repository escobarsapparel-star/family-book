(()=>{
  if(window.__fbDesktopProfileSocialLayout)return;
  window.__fbDesktopProfileSocialLayout=true;

  const mq=window.matchMedia('(min-width: 900px)');

  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));

  function rememberText(el,key){
    if(el&&!el.dataset[key])el.dataset[key]=el.textContent||'';
  }

  function restoreText(el,key){
    if(el?.dataset?.[key]!=null&&el.dataset[key]!==undefined&&el.dataset[key]!==""){
      el.textContent=el.dataset[key];
    }
  }

  function profileMemberId(profile){
    return String(profile?.dataset?.profileMemberId||'');
  }

  function profileName(profile){
    return profile?.querySelector('.fb-basic-name h1')?.textContent?.trim()||'Family member';
  }

  function setActive(page,button){
    page.querySelectorAll('.fb-desktop-profile-tab').forEach(b=>b.classList.toggle('is-active',b===button));
  }

  function setProfileMode(profile,mode='main'){
    profile.classList.toggle('fb-profile-show-memories',mode==='memories');
    profile.classList.toggle('fb-profile-show-tree',mode==='tree');
    const memories=profile.querySelector('.fb-profile-memory-panel');
    const tree=profile.querySelector('.fb-profile-tree-panel');
    if(memories)memories.hidden=mode!=='memories';
    if(tree)tree.hidden=mode!=='tree';
  }

  function showMainContent(page,button,selector){
    const profile=page.querySelector('.fb-member-profile');
    if(!profile)return;
    setProfileMode(profile,'main');
    setActive(page,button);
    const section=profile.querySelector(selector);
    section?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function formatMemoryDate(m){
    const raw=String(m?.date||'');
    if(!raw)return 'Family memory';
    const d=new Date(`${raw}T12:00:00`);
    if(Number.isNaN(d.getTime()))return raw;
    return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(d);
  }

  function ensureMemoryPanel(profile){
    let panel=profile.querySelector('.fb-profile-memory-panel');
    if(panel)return panel;
    panel=document.createElement('section');
    panel.className='fb-profile-memory-panel';
    panel.hidden=true;
    const content=profile.querySelector('.fb-profile-content');
    if(content)content.insertAdjacentElement('afterend',panel);
    else profile.appendChild(panel);
    return panel;
  }

  async function renderProfileMemories(profile,panel){
    const id=profileMemberId(profile);
    const name=profileName(profile);
    const renderKey=`${id}:${window.FB_MEMORIES?.getAll?'ready':'missing'}`;
    if(panel.dataset.renderKey===renderKey&&panel.dataset.loaded==='1')return;

    panel.dataset.renderKey=renderKey;
    panel.dataset.loaded='0';
    panel.hidden=false;
    panel.innerHTML='<div class="fb-profile-memory-loading"><span class="memory-spinner"></span><p>Opening My Memories…</p></div>';

    try{
      const all=await window.FB_MEMORIES?.getAll?.()||[];
      const list=all.filter(m=>String(m.authorId||'')===id);

      if(!list.length){
        panel.innerHTML=`<div class="fb-profile-memory-empty"><i data-lucide="images"></i><h2>My Memories</h2><p>${esc(name)} has not uploaded any memories yet.</p></div>`;
        panel.dataset.loaded='1';
        window.icons?.();
        return;
      }

      const cards=list.map(m=>{
        const photos=window.FB_MEMORIES?.getPhotos?.(m)||[];
        const cover=photos[0]||null;
        const url=cover?.thumb||cover?.image||'';
        const caption=m.caption||m.story||'Family memory';
        return `<button type="button" class="memory-card fb-profile-memory-card" data-profile-memory-id="${esc(m.id)}">
          <span class="memory-card-photo">
            ${url?`<img src="${esc(url)}" alt="${esc(caption)}">`:'<span class="memory-card-missing"><i data-lucide="image-off"></i></span>'}
            ${cover?.kind==='video'?'<span class="memory-card-play"><i data-lucide="play"></i></span>':''}
            ${photos.length>1?`<span class="memory-photo-count"><i data-lucide="files"></i>${photos.length}</span>`:''}
          </span>
          <span class="memory-card-copy"><small>${esc(formatMemoryDate(m))}</small><strong>${esc(caption)}</strong></span>
        </button>`;
      }).join('');

      panel.innerHTML=`
        <div class="fb-profile-memory-head"><div><span>PROFILE</span><h2>My Memories</h2><p>${list.length} ${list.length===1?'memory':'memories'} uploaded by ${esc(name)}.</p></div></div>
        <div class="fb-profile-memory-grid">${cards}</div>`;

      panel.querySelectorAll('[data-profile-memory-id]').forEach(card=>{
        card.addEventListener('click',()=>window.go?.(`view-memory:${card.dataset.profileMemoryId}`));
      });
      panel.dataset.loaded='1';
      window.icons?.();
    }catch(err){
      console.warn('Profile My Memories:',err);
      panel.innerHTML='<div class="fb-profile-memory-empty"><i data-lucide="circle-alert"></i><h2>My Memories</h2><p>Could not load these memories right now.</p></div>';
      window.icons?.();
    }
  }

  async function showMemories(page,profile,button){
    const panel=ensureMemoryPanel(profile);
    setActive(page,button);
    setProfileMode(profile,'memories');
    panel.hidden=false;
    await renderProfileMemories(profile,panel);
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function familyPeople(){
    try{return window.FB_FAMILY_DATA?.getPeople?.()||[]}catch(_){return []}
  }

  function familyRelationships(){
    try{return window.FB_FAMILY_DATA?.getRelationships?.()||[]}catch(_){return []}
  }

  function uniqueIds(values){return [...new Set(values.filter(Boolean).map(String))]}

  function immediateFamilyFor(id){
    const people=familyPeople();
    const byId=new Map(people.map(p=>[String(p.id),p]));
    const rels=familyRelationships();
    const parents=[],children=[],partners=[],siblings=[];

    rels.forEach(r=>{
      const from=String(r.from||r.from_person_id||'');
      const to=String(r.to||r.to_person_id||'');
      const type=String(r.type||r.relationship_type||'');
      if(!from||!to)return;

      if(type==='parent_of'){
        if(to===id)parents.push(from);
        if(from===id)children.push(to);
      }else if(type==='child_of'){
        if(from===id)parents.push(to);
        if(to===id)children.push(from);
      }else if(type==='spouse_of'){
        if(from===id)partners.push(to);
        if(to===id)partners.push(from);
      }else if(type==='sibling_of'){
        if(from===id)siblings.push(to);
        if(to===id)siblings.push(from);
      }
    });

    uniqueIds(parents).forEach(parentId=>{
      rels.forEach(r=>{
        const from=String(r.from||r.from_person_id||'');
        const to=String(r.to||r.to_person_id||'');
        const type=String(r.type||r.relationship_type||'');
        if(type==='parent_of'&&from===parentId&&to!==id)siblings.push(to);
        if(type==='child_of'&&to===parentId&&from!==id)siblings.push(from);
      });
    });

    const toPeople=ids=>uniqueIds(ids).map(pid=>byId.get(pid)).filter(Boolean).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    return {
      person:byId.get(id)||null,
      parents:toPeople(parents),
      partners:toPeople(partners),
      siblings:toPeople(siblings).filter(p=>String(p.id)!==id),
      children:toPeople(children)
    };
  }

  function treeAvatarMarkup(person){
    if(person?.photo)return `<img src="${esc(person.photo)}" alt="">`;
    const parts=String(person?.name||'Family Member').trim().split(/\s+/).filter(Boolean);
    const initials=((parts[0]?.[0]||'F')+(parts.length>1?(parts.at(-1)?.[0]||''):'' )).toUpperCase();
    return `<span>${esc(initials)}</span>`;
  }

  function treePersonCard(person,{focus=false,label=''}={}){
    if(!person)return '';
    return `<button type="button" class="fb-profile-tree-person${focus?' is-focus':''}" data-profile-tree-person="${esc(person.id)}" ${focus?'aria-current="true"':''}>
      <span class="fb-profile-tree-avatar">${treeAvatarMarkup(person)}</span>
      <span class="fb-profile-tree-copy">${label?`<small>${esc(label)}</small>`:''}<strong>${esc(person.name||'Family member')}</strong></span>
    </button>`;
  }

  function familyRow(label,people,className=''){
    if(!people.length)return '';
    return `<div class="fb-profile-tree-level ${className}"><span class="fb-profile-tree-level-label">${esc(label)}</span><div class="fb-profile-tree-row">${people.map(p=>treePersonCard(p)).join('')}</div></div>`;
  }

  function ensureTreePanel(profile){
    let panel=profile.querySelector('.fb-profile-tree-panel');
    if(panel)return panel;
    panel=document.createElement('section');
    panel.className='fb-profile-tree-panel';
    panel.hidden=true;
    const memoryPanel=profile.querySelector('.fb-profile-memory-panel');
    const content=profile.querySelector('.fb-profile-content');
    if(memoryPanel)memoryPanel.insertAdjacentElement('afterend',panel);
    else if(content)content.insertAdjacentElement('afterend',panel);
    else profile.appendChild(panel);
    return panel;
  }

  function renderProfileTree(profile,panel){
    const id=profileMemberId(profile);
    const name=profileName(profile);
    const family=immediateFamilyFor(id);
    const person=family.person||{id,name,photo:profile.querySelector('.profile-view-avatar img')?.src||''};
    const hasRelations=family.parents.length||family.partners.length||family.siblings.length||family.children.length;

    const partnerRow=family.partners.length
      ? `<div class="fb-profile-tree-focus-row">${treePersonCard(person,{focus:true,label:'Profile'})}${family.partners.map(p=>`<span class="fb-profile-tree-heart"><i data-lucide="heart"></i></span>${treePersonCard(p,{label:'Partner'})}`).join('')}</div>`
      : `<div class="fb-profile-tree-focus-row">${treePersonCard(person,{focus:true,label:'Profile'})}</div>`;

    panel.innerHTML=`
      <div class="fb-profile-tree-head"><div><span>PROFILE</span><h2>Family Tree</h2><p>Immediate family branch for ${esc(name)}.</p></div></div>
      <div class="fb-profile-tree-canvas">
        ${familyRow('Parents',family.parents,'is-parents')}
        ${family.parents.length?'<span class="fb-profile-tree-connector" aria-hidden="true"></span>':''}
        <div class="fb-profile-tree-focus">${partnerRow}</div>
        ${family.siblings.length?familyRow('Siblings',family.siblings,'is-siblings'):''}
        ${family.children.length?'<span class="fb-profile-tree-connector" aria-hidden="true"></span>':''}
        ${familyRow('Children',family.children,'is-children')}
        ${!hasRelations?'<div class="fb-profile-tree-empty"><i data-lucide="git-fork"></i><strong>No family connections added yet</strong><span>This profile will grow here as relationships are added to the Family Tree.</span></div>':''}
      </div>`;

    panel.querySelectorAll('[data-profile-tree-person]').forEach(card=>{
      const target=String(card.dataset.profileTreePerson||'');
      if(!target||target===id)return;
      card.addEventListener('click',()=>window.go?.(`view-member:${target}`));
    });
    window.icons?.();
  }

  function showTree(page,profile,button){
    const panel=ensureTreePanel(profile);
    setActive(page,button);
    setProfileMode(profile,'tree');
    panel.hidden=false;
    renderProfileTree(profile,panel);
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function tabMarkup(){
    return `
      <button type="button" class="fb-desktop-profile-tab is-active" data-profile-section="posts">Posts</button>
      <button type="button" class="fb-desktop-profile-tab" data-profile-section="about">About</button>
      <button type="button" class="fb-desktop-profile-tab" data-profile-action="memories">My Memories</button>
      <button type="button" class="fb-desktop-profile-tab" data-profile-action="tree">Family Tree</button>`;
  }

  function buildTabs(page,profile){
    let tabs=profile.querySelector('.fb-desktop-profile-tabs');
    if(!tabs){
      tabs=document.createElement('nav');
      tabs.className='fb-desktop-profile-tabs';
      tabs.setAttribute('aria-label','Profile sections');
      const content=profile.querySelector('.fb-profile-content');
      if(content)profile.insertBefore(tabs,content);
      else profile.appendChild(tabs);
    }

    if(tabs.dataset.profileNavVersion!=='4'){
      tabs.innerHTML=tabMarkup();
      tabs.dataset.profileNavVersion='4';
      tabs.dataset.profileNavBound='0';
    }

    if(tabs.dataset.profileNavBound!=='1'){
      tabs.dataset.profileNavBound='1';
      tabs.addEventListener('click',e=>{
        const btn=e.target.closest('.fb-desktop-profile-tab');
        if(!btn)return;

        const action=btn.dataset.profileAction||'';
        if(action==='memories'){
          showMemories(page,profile,btn);
          return;
        }
        if(action==='tree'){
          showTree(page,profile,btn);
          return;
        }

        const section=btn.dataset.profileSection||'';
        if(section==='about')showMainContent(page,btn,'.fb-profile-about');
        else if(section==='posts')showMainContent(page,btn,'.fb-profile-activity');
      });
    }
    return tabs;
  }

  function applyDesktop(page){
    const profile=page.querySelector('.fb-member-profile');
    if(!profile)return;
    page.classList.add('fb-desktop-social-profile');
    buildTabs(page,profile);

    const heading=profile.querySelector('.fb-profile-activity .member-activity-head h2');
    if(heading){rememberText(heading,'fbDesktopOriginalText');heading.textContent='Posts'}

    const all=profile.querySelector('.fb-profile-activity .member-activity-all');
    if(all){rememberText(all,'fbDesktopOriginalText');all.textContent='View all posts'}
  }

  function cleanupMobile(page){
    page.classList.remove('fb-desktop-social-profile');
    const profile=page.querySelector('.fb-member-profile');
    setProfileMode(profile,'main');
    page.querySelector('.fb-desktop-profile-tabs')?.remove();
    page.querySelector('.fb-profile-memory-panel')?.remove();
    page.querySelector('.fb-profile-tree-panel')?.remove();
    const heading=page.querySelector('.fb-profile-activity .member-activity-head h2');
    const all=page.querySelector('.fb-profile-activity .member-activity-all');
    restoreText(heading,'fbDesktopOriginalText');
    restoreText(all,'fbDesktopOriginalText');
  }

  function enhance(){
    document.querySelectorAll('.member-profile-view:not(.history-profile-view):not(.account-profile-view)').forEach(page=>{
      if(mq.matches)applyDesktop(page);else cleanupMobile(page);
    });
  }

  const schedule=()=>requestAnimationFrame(enhance);
  mq.addEventListener?.('change',schedule);
  window.addEventListener('load',schedule);
  window.addEventListener('familybook:basic-member-profile-ready',schedule);
  window.addEventListener('familybook:family-data-updated',schedule);
  document.addEventListener('click',schedule);

  const root=document.getElementById('app');
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  schedule();
})();
