(()=>{
  if(window.__fbDesktopProfileSocialLayout)return;
  window.__fbDesktopProfileSocialLayout=true;

  const mq=window.matchMedia('(min-width: 900px)');
  const auth=()=>window.FB_AUTH?.get?.()||{};

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

  function isOwnProfile(profile){
    const id=profileMemberId(profile);
    return !!id&&id===String(auth().memberId||'');
  }

  function setActive(page,button){
    page.querySelectorAll('.fb-desktop-profile-tab').forEach(b=>b.classList.toggle('is-active',b===button));
  }

  function scrollToSection(page,selector,button){
    const section=page.querySelector(selector);
    if(!section)return;
    setActive(page,button);
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function openMemories(profile){
    const id=profileMemberId(profile);
    const own=isOwnProfile(profile);
    window.go?.('memories');

    let tries=0;
    const selectContributor=()=>{
      const key=own?'mine':`author:${id}`;
      const chip=document.querySelector(`[data-memory-contributor="${CSS.escape(key)}"]`);
      if(chip){chip.click();return}

      if(!own&&id){
        const memberFilter=document.querySelector('#memoryMemberFilter');
        if(memberFilter&&[...memberFilter.options].some(o=>String(o.value)===id)){
          memberFilter.value=id;
          memberFilter.dispatchEvent(new Event('change',{bubbles:true}));
          return;
        }
      }

      if(++tries<30)setTimeout(selectContributor,100);
    };
    setTimeout(selectContributor,80);
  }

  function tabMarkup(){
    return `
      <button type="button" class="fb-desktop-profile-tab is-active" data-profile-section="posts">Posts</button>
      <button type="button" class="fb-desktop-profile-tab" data-profile-section="about">About</button>
      <button type="button" class="fb-desktop-profile-tab" data-profile-action="memories">Memories</button>
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

    if(tabs.dataset.profileNavVersion!=='2'){
      tabs.innerHTML=tabMarkup();
      tabs.dataset.profileNavVersion='2';
    }

    if(tabs.dataset.profileNavBound!=='1'){
      tabs.dataset.profileNavBound='1';
      tabs.addEventListener('click',e=>{
        const btn=e.target.closest('.fb-desktop-profile-tab');
        if(!btn)return;

        const action=btn.dataset.profileAction||'';
        if(action==='memories'){
          openMemories(profile);
          return;
        }
        if(action==='tree'){
          window.go?.('tree');
          return;
        }

        const section=btn.dataset.profileSection||'';
        if(section==='about')scrollToSection(page,'.fb-profile-about',btn);
        else if(section==='posts')scrollToSection(page,'.fb-profile-activity',btn);
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
    page.querySelector('.fb-desktop-profile-tabs')?.remove();
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
