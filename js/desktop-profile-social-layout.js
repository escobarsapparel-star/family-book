(()=>{
  if(window.__fbDesktopProfileSocialLayout)return;
  window.__fbDesktopProfileSocialLayout=true;

  const mq=window.matchMedia('(min-width: 900px)');

  function rememberText(el,key){
    if(el&&!el.dataset[key])el.dataset[key]=el.textContent||'';
  }

  function restoreText(el,key){
    if(el?.dataset?.[key]!=null&&el.dataset[key]!==undefined&&el.dataset[key]!==""){
      el.textContent=el.dataset[key];
    }
  }

  function scrollToSection(page,selector,button){
    const section=page.querySelector(selector);
    if(!section)return;
    page.querySelectorAll('.fb-desktop-profile-tab').forEach(b=>b.classList.toggle('is-active',b===button));
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function buildTabs(page,profile){
    let tabs=profile.querySelector('.fb-desktop-profile-tabs');
    if(tabs)return tabs;

    tabs=document.createElement('nav');
    tabs.className='fb-desktop-profile-tabs';
    tabs.setAttribute('aria-label','Profile sections');
    tabs.innerHTML=`
      <button type="button" class="fb-desktop-profile-tab is-active" data-profile-section="posts">Posts</button>
      <button type="button" class="fb-desktop-profile-tab" data-profile-section="about">About</button>`;

    const content=profile.querySelector('.fb-profile-content');
    if(content)profile.insertBefore(tabs,content);
    else profile.appendChild(tabs);

    tabs.addEventListener('click',e=>{
      const btn=e.target.closest('[data-profile-section]');
      if(!btn)return;
      const selector=btn.dataset.profileSection==='about'?'.fb-profile-about':'.fb-profile-activity';
      scrollToSection(page,selector,btn);
    });
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
