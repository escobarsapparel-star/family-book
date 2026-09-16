(()=>{
  function openHelpAbout(){
    const pop=document.querySelector('#profilePopover');
    if(pop)pop.hidden=true;
    document.querySelector('#topProfileButton')?.setAttribute('aria-expanded','false');
    window.go?.('settings');
    setTimeout(()=>document.querySelector('.settings-about-card')?.scrollIntoView({behavior:'smooth',block:'start'}),90);
  }

  function enhance(){
    const pop=document.querySelector('#profilePopover');
    const menu=pop?.querySelector('.profile-popover-menu');
    if(!menu||menu.querySelector('[data-profile-help-about]'))return;

    const help=document.createElement('button');
    help.type='button';
    help.dataset.profileHelpAbout='1';
    help.innerHTML='<i data-lucide="circle-help"></i><span><strong>Help & About</strong><small>Help, app information and support</small></span>';
    help.addEventListener('click',ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      openHelpAbout();
    });
    menu.appendChild(help);
    window.lucide?.createIcons?.();
  }

  const run=()=>setTimeout(enhance,0);
  window.addEventListener('load',run);
  document.addEventListener('click',run);
  window.addEventListener('familybook:family-data-updated',run);
})();
