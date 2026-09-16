(()=>{
  const desktop=()=>window.matchMedia?.('(min-width:760px)')?.matches;
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
  const auth=()=>{try{return window.FB_AUTH?.get?.()||{}}catch(_){return {}}};
  const ownMemberId=()=>auth().memberId||null;
  const familyName=()=>{try{return window.familyLabel?.()||auth().family||'Family'}catch(_){return auth().family||'Family'}};
  const photo=()=>{try{return window.currentUserPhoto?.()||auth().photo||document.querySelector('#topProfileButton img')?.src||''}catch(_){return ''}};
  const initials=name=>{const p=String(name||'Family User').trim().split(/\s+/).filter(Boolean);return ((p[0]?.[0]||'F')+(p.length>1?(p.at(-1)?.[0]||''):'' )).toUpperCase()};

  function installStyles(){
    if(document.querySelector('#fbDesktopAccountMenuStyles'))return;
    const style=document.createElement('style');
    style.id='fbDesktopAccountMenuStyles';
    style.textContent=`
      @media(min-width:760px){
        #profilePopover .fb-account-card{width:100%;border:0;border-radius:14px;background:var(--fb-shell-panel-2,rgba(127,127,127,.06));color:inherit;padding:10px;display:grid;grid-template-columns:52px minmax(0,1fr) 34px;align-items:center;gap:11px;text-align:left;cursor:pointer}
        #profilePopover .fb-account-card:hover{background:color-mix(in srgb,var(--fb-shell-panel-2,rgba(127,127,127,.06)) 80%,var(--fb-shell-accent-soft,rgba(70,130,90,.12)))}
        #profilePopover .fb-account-avatar{width:52px;height:52px;border-radius:50%;overflow:hidden;display:grid;place-items:center;font-weight:900;background:var(--fb-shell-accent-soft,rgba(70,130,90,.14));border:1px solid var(--fb-shell-border,var(--line))}
        #profilePopover .fb-account-avatar img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}
        #profilePopover .fb-account-copy{min-width:0;display:grid;gap:2px}
        #profilePopover .fb-account-copy strong{font-size:.98rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #profilePopover .fb-account-copy span{font-size:.78rem;color:var(--fb-shell-muted,var(--muted));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #profilePopover .fb-account-copy small{font-size:.76rem;color:var(--fb-shell-accent,var(--accent));font-weight:800}
        #profilePopover .fb-account-chevron{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--fb-shell-panel,var(--paper));color:var(--fb-shell-muted,var(--muted))}
        #profilePopover .fb-account-chevron svg{width:18px;height:18px}
        #profilePopover .fb-desktop-menu-row{grid-template-columns:38px minmax(0,1fr) 20px!important}
        #profilePopover .fb-desktop-menu-row>span:nth-child(2){min-width:0;display:grid;gap:2px}
        #profilePopover .fb-desktop-menu-row>.fb-menu-chevron{width:18px;height:18px;padding:0;border-radius:0;background:transparent;color:var(--fb-shell-muted,var(--muted))}
        #profilePopover .fb-theme-panel{margin:2px 2px 7px 46px;padding:8px;border-radius:12px;background:var(--fb-shell-panel-2,rgba(127,127,127,.06));display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
        #profilePopover .fb-theme-panel[hidden]{display:none!important}
        #profilePopover .fb-theme-choice{min-height:62px!important;padding:8px 5px!important;border:1px solid var(--fb-shell-border,var(--line))!important;border-radius:10px!important;display:flex!important;flex-direction:column;justify-content:center;gap:5px!important;text-align:center!important;background:var(--fb-shell-panel,var(--paper))!important}
        #profilePopover .fb-theme-choice svg{width:18px!important;height:18px!important;padding:0!important;border-radius:0!important;background:transparent!important;margin:auto}
        #profilePopover .fb-theme-choice strong{font-size:.74rem!important}
        #profilePopover .fb-theme-choice.active{outline:2px solid var(--fb-shell-accent,var(--accent));outline-offset:-2px}
        #profilePopover .fb-admin-row{margin-top:2px}
      }
    `;
    document.head.appendChild(style);
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
    setTimeout(()=>document.querySelector('.settings-about-card')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
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
        <button type="button" class="fb-desktop-menu-row" data-fb-menu="help"><i data-lucide="circle-help"></i><span><strong>Help & About</strong><small>Help, app information and support</small></span><i class="fb-menu-chevron" data-lucide="chevron-right"></i></button>
      </div>
      <button type="button" class="profile-popover-signout" data-fb-menu="signout"><i data-lucide="log-out"></i>Sign out</button>`;

    pop.dataset.fbDesktopComplete='1';
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

  installStyles();
  const run=()=>setTimeout(enhance,0);
  window.addEventListener('load',run);
  document.addEventListener('click',run);
  window.addEventListener('familybook:family-data-updated',()=>{
    const pop=document.querySelector('#profilePopover');
    if(pop)delete pop.dataset.fbDesktopComplete;
    run();
  });
  window.addEventListener('resize',run);
})();
