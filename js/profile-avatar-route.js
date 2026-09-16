(()=>{
  const mobile=()=>window.matchMedia?.('(max-width:759px)')?.matches;
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
  function auth(){try{return window.FB_AUTH?.get?.()||{}}catch(_){return {}}}
  function ownMemberId(){return auth().memberId||null}
  function initials(name){const p=String(name||'Family User').trim().split(/\s+/).filter(Boolean);return ((p[0]?.[0]||'F')+(p.length>1?(p.at(-1)?.[0]||''):'' )).toUpperCase()}
  function photo(){
    try{return window.currentUserPhoto?.()||auth().photo||document.querySelector('#topProfileButton img')?.src||''}catch(_){return ''}
  }
  function familyName(){
    try{return window.familyLabel?.()||auth().family||'Family'}catch(_){return auth().family||'Family'}
  }
  function closeMenu(){
    const menu=document.querySelector('.mobile-profile-menu');
    if(!menu)return;
    menu.remove();
    document.body.classList.remove('fb-mobile-menu-open');
    document.querySelector('#topProfileButton')?.setAttribute('aria-expanded','false');
  }
  function routeFromMenu(route,{about=false}={}){
    closeMenu();
    if(typeof window.go==='function')window.go(route);
    if(about){
      setTimeout(()=>document.querySelector('.settings-about-card')?.scrollIntoView({behavior:'smooth',block:'start'}),90);
    }
  }
  function openMobileMenu(){
    closeMenu();
    const u=auth(),id=ownMemberId(),src=photo(),admin=String(u.role||'')==='admin';
    const menu=document.createElement('section');
    menu.className='mobile-profile-menu';
    menu.setAttribute('role','dialog');
    menu.setAttribute('aria-modal','true');
    menu.setAttribute('aria-label','Family Book menu');
    menu.innerHTML=`
      <header class="mobile-profile-menu-head">
        <button type="button" class="mobile-profile-menu-close" aria-label="Close menu"><i data-lucide="arrow-left"></i></button>
        <h1>Menu</h1>
      </header>
      <div class="mobile-profile-menu-scroll">
        <button type="button" class="mobile-profile-menu-profile" data-mobile-menu-route="${id?`view-member:${esc(id)}`:'profile'}">
          <span class="mobile-profile-menu-avatar">${src?`<img src="${esc(src)}" alt="${esc(u.name||'Profile')} profile photo">`:esc(initials(u.name))}</span>
          <span class="mobile-profile-menu-copy"><strong>${esc(u.name||'Family User')}</strong><span>${esc(familyName())}</span><small>View your profile</small></span>
          <span class="mobile-profile-menu-chevron"><i data-lucide="chevron-right"></i></span>
        </button>

        <div class="mobile-profile-menu-grid">
          <button type="button" class="mobile-profile-menu-card" data-mobile-menu-route="memories"><span class="mobile-profile-menu-card-icon"><i data-lucide="images"></i></span><span><strong>Memories</strong><small>Photos and family moments</small></span></button>
          <button type="button" class="mobile-profile-menu-card" data-mobile-menu-route="members"><span class="mobile-profile-menu-card-icon"><i data-lucide="users-round"></i></span><span><strong>Members</strong><small>Your family directory</small></span></button>
          <button type="button" class="mobile-profile-menu-card" data-mobile-menu-route="tree"><span class="mobile-profile-menu-card-icon"><i data-lucide="git-fork"></i></span><span><strong>Family tree</strong><small>Relationships and branches</small></span></button>
          <button type="button" class="mobile-profile-menu-card" data-mobile-menu-route="calendar"><span class="mobile-profile-menu-card-icon"><i data-lucide="calendar-days"></i></span><span><strong>Calendar</strong><small>Birthdays and events</small></span></button>
          <button type="button" class="mobile-profile-menu-card" data-mobile-menu-route="notifications"><span class="mobile-profile-menu-card-icon"><i data-lucide="bell-ring"></i></span><span><strong>Notifications</strong><small>Family activity and reminders</small></span></button>
          <button type="button" class="mobile-profile-menu-card" data-mobile-menu-route="settings"><span class="mobile-profile-menu-card-icon"><i data-lucide="settings"></i></span><span><strong>Settings</strong><small>Privacy and preferences</small></span></button>
        </div>
        <button type="button" class="mobile-profile-menu-wide" data-mobile-help-about><span><i data-lucide="circle-help"></i></span><span><strong>Help & About</strong><small>Help, app information and support</small></span><i data-lucide="chevron-right"></i></button>
        ${admin?'<button type="button" class="mobile-profile-menu-admin" data-mobile-menu-route="family-access"><span><i data-lucide="user-plus"></i></span><span>Invite & family access</span><i data-lucide="chevron-right"></i></button>':''}
      </div>`;
    document.body.appendChild(menu);
    document.body.classList.add('fb-mobile-menu-open');
    document.querySelector('#topProfileButton')?.setAttribute('aria-expanded','true');
    menu.querySelector('.mobile-profile-menu-close')?.addEventListener('click',closeMenu);
    menu.querySelectorAll('[data-mobile-menu-route]').forEach(btn=>btn.addEventListener('click',()=>routeFromMenu(btn.dataset.mobileMenuRoute)));
    menu.querySelector('[data-mobile-help-about]')?.addEventListener('click',()=>routeFromMenu('settings',{about:true}));
    window.lucide?.createIcons?.();
  }
  function openOwnProfile(ev){
    const target=ev.target.closest?.('#topProfileButton,[data-r="profile"],[data-profile-route="profile"],[data-desktop-route="profile"]');
    if(!target||typeof window.go!=='function')return;

    if(target.matches('#topProfileButton')){
      if(mobile()){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        openMobileMenu();
      }
      // Desktop deliberately falls through to the existing profile-popover menu.
      return;
    }

    const id=ownMemberId();
    if(!id)return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    window.go(`view-member:${id}`);
  }
  document.addEventListener('click',openOwnProfile,true);
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeMenu()});
  window.addEventListener('resize',()=>{if(!mobile())closeMenu()});
})();