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
        #app>.app>.topbar .profile-actions{position:relative}
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

      .settings-about-card.fb-help-ready{scroll-margin-top:120px}
      .fb-help-intro{margin-top:14px;padding:14px 15px;border:1px solid var(--line);border-radius:14px;background:rgba(127,127,127,.035);line-height:1.55;color:var(--ink)}
      .fb-help-intro strong{color:var(--accent)}
      .fb-help-title{margin:20px 0 10px;font-size:1rem;font-weight:900;color:var(--ink)}
      .fb-help-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .fb-help-step{display:grid;grid-template-columns:38px minmax(0,1fr);gap:10px;align-items:start;padding:12px;border:1px solid var(--line);border-radius:13px;background:rgba(127,127,127,.025)}
      .fb-help-step>span:first-child{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--fb-shell-accent-soft,rgba(70,130,90,.14));color:var(--accent)}
      .fb-help-step svg{width:20px;height:20px}
      .fb-help-step strong{display:block;font-size:.9rem;margin:1px 0 3px}
      .fb-help-step small{display:block;color:var(--muted);line-height:1.4;font-size:.76rem}
      .fb-faq-list{display:grid;gap:8px}
      .fb-faq-list details{border:1px solid var(--line);border-radius:13px;background:rgba(127,127,127,.025);overflow:hidden}
      .fb-faq-list summary{list-style:none;cursor:pointer;padding:13px 42px 13px 14px;font-weight:850;position:relative;color:var(--ink)}
      .fb-faq-list summary::-webkit-details-marker{display:none}
      .fb-faq-list summary:after{content:'+';position:absolute;right:14px;top:50%;transform:translateY(-50%);width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--fb-shell-accent-soft,rgba(70,130,90,.14));color:var(--accent);font-size:1.05rem;font-weight:900}
      .fb-faq-list details[open] summary:after{content:'−'}
      .fb-faq-answer{padding:0 14px 14px;color:var(--muted);font-size:.86rem;line-height:1.55}
      .fb-faq-answer b{color:var(--ink)}
      .fb-help-note{margin-top:14px;padding:12px 13px;border-radius:12px;background:var(--fb-shell-accent-soft,rgba(70,130,90,.12));color:var(--ink);font-size:.82rem;line-height:1.5}
      @media(max-width:759px){
        .fb-help-grid{grid-template-columns:1fr}
        .fb-help-intro{font-size:.88rem}
        .fb-help-step{padding:11px}
        .fb-faq-list summary{font-size:.9rem}
        .fb-faq-answer{font-size:.82rem}
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

  function helpMarkup(){
    return `
      <div class="fb-help-intro"><strong>Family Book</strong> is your private family space for profiles, the Family Wall, memories, your family tree, birthdays, events and shared family information. Use the guide below whenever you are unsure where something lives.</div>

      <h3 class="fb-help-title">Quick guide</h3>
      <div class="fb-help-grid">
        <div class="fb-help-step"><span><i data-lucide="user-round"></i></span><div><strong>Your profile</strong><small>Use the camera buttons to upload, take, view or remove profile and cover photos. Edit your details from your profile.</small></div></div>
        <div class="fb-help-step"><span><i data-lucide="message-circle"></i></span><div><strong>Family Wall</strong><small>Share family updates and open another member's profile by tapping their round photo or their name.</small></div></div>
        <div class="fb-help-step"><span><i data-lucide="images"></i></span><div><strong>Memories</strong><small>Keep family photos and memories together. Add people to memories when tagging is available for that item.</small></div></div>
        <div class="fb-help-step"><span><i data-lucide="git-fork"></i></span><div><strong>Family Tree</strong><small>See parents, children, couples, siblings and family branches in one shared family structure.</small></div></div>
        <div class="fb-help-step"><span><i data-lucide="calendar-days"></i></span><div><strong>Calendar</strong><small>Keep birthdays, family events and important dates together so the family can remember them.</small></div></div>
        <div class="fb-help-step"><span><i data-lucide="shield-check"></i></span><div><strong>Privacy</strong><small>Control who can see your phone number, email address, birthday year, check-ins and location-related posts.</small></div></div>
      </div>

      <h3 class="fb-help-title">Frequently asked questions</h3>
      <div class="fb-faq-list">
        <details><summary>How do I open a family member's profile?</summary><div class="fb-faq-answer">On the <b>Family Wall</b>, tap or click the person's round profile picture or their name. You can also open profiles from <b>Members</b> and the <b>Family Tree</b>.</div></details>
        <details><summary>How do I change my profile picture or cover photo?</summary><div class="fb-faq-answer">Open your profile and use the <b>camera icon</b> on the profile picture or cover. The menu lets you upload a photo, take a new photo, view the current photo and remove it.</div></details>
        <details><summary>How do I reposition my cover photo?</summary><div class="fb-faq-answer">Choose <b>Change position</b> from the cover-photo menu. On desktop, drag the cover with your mouse and save. On mobile, use the position controls and save when the photo is framed the way you want.</div></details>
        <details><summary>Why do Call, WhatsApp or Email buttons only appear for some people?</summary><div class="fb-faq-answer">Those actions only appear when that member has the matching contact information saved and their privacy settings allow you to see it. Email opens your device's mail app; on Android that may be Gmail if Gmail is configured.</div></details>
        <details><summary>Who can see my phone number or email address?</summary><div class="fb-faq-answer">Go to <b>Settings & privacy</b>. You can choose whether your phone number and email are visible to family members, family admins only, or only you.</div></details>
        <details><summary>Who can invite or manage family members?</summary><div class="fb-faq-answer"><b>Family Admins</b> can use <b>Invite & family access</b> and manage the shared family structure. Adult members keep control of their own private contact and privacy settings.</div></details>
        <details><summary>How do notifications work?</summary><div class="fb-faq-answer">Open <b>Notifications</b> or Settings to choose reminders for birthdays, events, memory tags, Family Wall posts, new memories and other family activity. Your browser or device may also need notification permission.</div></details>
        <details><summary>How do I switch between Light, Dark and System mode?</summary><div class="fb-faq-answer">On desktop, open your profile menu and choose <b>Display & accessibility</b>. You can also change the theme in Settings. <b>System</b> follows your device's appearance.</div></details>
        <details><summary>Why can't I see another member's private information?</summary><div class="fb-faq-answer">Family Book respects each member's privacy choices. A phone number, email address, birthday year or check-in may be hidden from you depending on that member's settings.</div></details>
        <details><summary>What should I do if a photo or page does not update straight away?</summary><div class="fb-faq-answer">Check your connection, reopen the page, or refresh Family Book. For a profile photo or cover, wait for the save/upload to finish before leaving the page.</div></details>
      </div>

      <div class="fb-help-note"><b>About Family Book:</b> Family Book is built as a family-focused space rather than a public social network. What you can see or change depends on your family access, role and each member's privacy settings.</div>`;
  }

  function enhanceHelpCard(){
    const card=document.querySelector('.settings-about-card');
    if(!card||card.dataset.helpReady==='1')return false;
    card.dataset.helpReady='1';
    card.classList.add('fb-help-ready');
    const head=card.querySelector('.settings-card-head');
    if(head){
      const eyebrow=head.querySelector('p');
      const title=head.querySelector('h2');
      const desc=head.querySelector('div>span');
      if(eyebrow)eyebrow.textContent='HELP & ABOUT';
      if(title)title.textContent='Family Book Guide';
      if(desc)desc.textContent='Instructions, frequently asked questions and app information.';
    }
    const version=card.querySelector('.settings-version-row');
    if(version)version.insertAdjacentHTML('beforebegin',helpMarkup());
    else card.insertAdjacentHTML('beforeend',helpMarkup());
    window.lucide?.createIcons?.();
    return true;
  }

  function openHelpAbout(){
    close();
    window.go?.('settings');
    setTimeout(()=>{
      enhanceHelpCard();
      document.querySelector('.settings-about-card')?.scrollIntoView({behavior:'smooth',block:'start'});
    },120);
  }

  function setTheme(value,pop){
    window.FB_SETTINGS?.update?.('appearance','theme',value);
    pop?.querySelectorAll('.fb-theme-choice').forEach(btn=>btn.classList.toggle('active',btn.dataset.themeChoice===value));
  }

  function enhance(){
    enhanceHelpCard();
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

  const observer=new MutationObserver(records=>{
    if(records.some(r=>Array.from(r.addedNodes||[]).some(n=>n.nodeType===1)))run();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();