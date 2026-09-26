(()=>{
  const desktop=()=>window.matchMedia?.('(min-width:760px)')?.matches;
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
  const auth=()=>{try{return window.FB_AUTH?.get?.()||{}}catch(_){return {}}};
  const ownMemberId=()=>auth().memberId||null;
  const familyName=()=>{try{return window.familyLabel?.()||auth().family||'Family'}catch(_){return auth().family||'Family'}};
  const photo=()=>{
    try{
      return window.FB_PROFILE_PHOTO?.direct?.()||
        window.currentUserPhoto?.()||
        document.querySelector('#topProfileButton img')?.src||
        '';
    }catch(_){return ''}
  };
  const initials=name=>{const p=String(name||'Family User').trim().split(/\s+/).filter(Boolean);return ((p[0]?.[0]||'F')+(p.length>1?(p.at(-1)?.[0]||''):'' )).toUpperCase()};

  async function hydrateAccountPhoto(pop){
    if(!pop)return;
    try{
      const src=(await window.FB_PROFILE_PHOTO?.resolve?.())||photo();
      if(!src||!/^(data:|blob:|https?:)/i.test(String(src)))return;
      const avatar=pop.querySelector('.fb-account-avatar');
      if(!avatar)return;
      let img=avatar.querySelector('img');
      if(!img){
        img=document.createElement('img');
        img.alt=(auth().name||'Profile')+' profile photo';
        img.addEventListener('error',()=>img.remove(),{once:true});
        avatar.appendChild(img);
      }
      if(img.src!==src)img.src=src;
    }catch(_){}
  }

  function close(){
    const pop=document.querySelector('#profilePopover');
    if(pop)pop.hidden=true;
    document.querySelector('#topProfileButton')?.setAttribute('aria-expanded','false');
  }

  function route(route,focus=''){
    close();
    if(focus)window.FB_SETTINGS?.setFocus?.(focus);
    window.go?.(route);
  }

  function openHelpAbout(){
    close();
    window.go?.('settings');
    setTimeout(()=>{
      document.querySelector('.settings-about-card')?.scrollIntoView({behavior:'smooth',block:'start'});
    },120);
  }

  function setTheme(value,pop){
    window.FB_SETTINGS?.update?.('appearance','theme',value);
    pop?.querySelectorAll('.fb-theme-choice').forEach(btn=>btn.classList.toggle('active',btn.dataset.themeChoice===value));
  }

  function enhance(){
    if(!desktop())return;
    const pop=document.querySelector('#profilePopover');
    if(!pop||pop.dataset.fbDesktopComplete==='1')return;
    const u=auth(),id=ownMemberId(),src=photo(),admin=String(u.role||'')==='admin';
    const currentTheme=window.FB_SETTINGS?.get?.()?.appearance?.theme||'system';

    pop.innerHTML=`
      <button type="button" class="fb-account-card" data-fb-account-profile>
        <span class="fb-account-avatar">${src?`<img src="${esc(src)}" alt="${esc(u.name||'Profile')} profile photo">`:esc(initials(u.name))}</span>
        <span class="fb-account-copy"><strong>${esc(u.name||'Family User')}</strong><span>${esc(familyName())}</span><small>View your profile</small></span>
        <span class="fb-account-chevron"><i data-lucide="chevron-right"></i></span>
      </button>
      <div class="profile-popover-menu">
        <button type="button" class="fb-desktop-menu-row" data-fb-menu="notifications"><i data-lucide="bell-ring"></i><span><strong>Notifications</strong><small>Family activity and reminders</small></span><i class="fb-menu-chevron" data-lucide="chevron-right"></i></button>
        <button type="button" class="fb-desktop-menu-row" data-fb-menu="settings"><i data-lucide="settings"></i><span><strong>Settings & privacy</strong><small>Account, privacy and preferences</small></span><i class="fb-menu-chevron" data-lucide="chevron-right"></i></button>
        <button type="button" class="fb-desktop-menu-row" data-fb-menu="display"><i data-lucide="monitor-cog"></i><span><strong>Display & accessibility</strong><small>Light, Dark or System theme</small></span><i class="fb-menu-chevron" data-lucide="chevron-down"></i></button>
        <div class="fb-theme-panel" data-fb-theme-panel hidden>
          <button type="button" class="fb-theme-choice ${currentTheme==='system'?'active':''}" data-theme-choice="system"><i data-lucide="monitor-smartphone"></i><strong>System</strong></button>
          <button type="button" class="fb-theme-choice ${currentTheme==='light'?'active':''}" data-theme-choice="light"><i data-lucide="sun"></i><strong>Light</strong></button>
          <button type="button" class="fb-theme-choice ${currentTheme==='dark'?'active':''}" data-theme-choice="dark"><i data-lucide="moon"></i><strong>Dark</strong></button>
        </div>
        ${admin?'<button type="button" class="fb-desktop-menu-row fb-admin-row" data-fb-menu="family-access"><i data-lucide="user-plus"></i><span><strong>Invite & family access</strong><small>Manage invitations and family access</small></span><i class="fb-menu-chevron" data-lucide="chevron-right"></i></button>':''}
        <button type="button" class="fb-desktop-menu-row" data-fb-menu="help"><i data-lucide="circle-help"></i><span><strong>Help & About</strong><small>Guide, FAQ and app information</small></span><i class="fb-menu-chevron" data-lucide="chevron-right"></i></button>
      </div>
      <button type="button" class="profile-popover-signout" data-fb-menu="signout"><i data-lucide="log-out"></i>Sign out</button>`;

    pop.dataset.fbDesktopComplete='1';
    hydrateAccountPhoto(pop);
    pop.querySelector('[data-fb-account-profile]')?.addEventListener('click',()=>id?route(`view-member:${id}`):route('profile'));
    pop.querySelector('[data-fb-menu="notifications"]')?.addEventListener('click',()=>route('notifications'));
    pop.querySelector('[data-fb-menu="settings"]')?.addEventListener('click',()=>route('settings'));
    pop.querySelector('[data-fb-menu="family-access"]')?.addEventListener('click',()=>route('family-access'));
    pop.querySelector('[data-fb-menu="help"]')?.addEventListener('click',openHelpAbout);
    pop.querySelector('[data-fb-menu="signout"]')?.addEventListener('click',async()=>{close();await window.FB_AUTH?.logout?.();window.location.reload()});

    const display=pop.querySelector('[data-fb-menu="display"]');
    const themePanel=pop.querySelector('[data-fb-theme-panel]');
    display?.addEventListener('click',()=>{
      themePanel.hidden=!themePanel.hidden;
      const icon=display.querySelector('.fb-menu-chevron');
      icon?.setAttribute('data-lucide',themePanel.hidden?'chevron-down':'chevron-up');
      window.lucide?.createIcons?.();
    });
    pop.querySelectorAll('.fb-theme-choice').forEach(btn=>btn.addEventListener('click',ev=>{ev.stopPropagation();setTheme(btn.dataset.themeChoice,pop)}));
    window.lucide?.createIcons?.();
  }

  const run=()=>setTimeout(enhance,0);
  window.addEventListener('load',run);
  document.addEventListener('click',run);
  window.addEventListener('familybook:family-data-updated',()=>{
    const pop=document.querySelector('#profilePopover');
    if(pop)delete pop.dataset.fbDesktopComplete;
    run();
  });
  window.addEventListener('resize',run);
  window.addEventListener('familybook:media-provider-changed',run);

  const observer=new MutationObserver(records=>{
    if(records.some(r=>Array.from(r.addedNodes||[]).some(n=>n.nodeType===1)))run();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();