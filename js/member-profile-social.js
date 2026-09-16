(()=>{
  let rebuilding=false;

  function rebuild(){
    if(rebuilding)return;
    const page=document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
    const old=page?.querySelector('.profile-view-card:not(.fb-basic-member-profile)');
    if(!page||!old)return;

    const avatar=old.querySelector('.profile-view-avatar');
    const name=old.querySelector(':scope > h1');
    const edit=old.querySelector('[data-edit-member]');
    if(!avatar||!name)return;

    rebuilding=true;
    try{
      const shell=document.createElement('div');
      shell.className='profile-view-card fb-basic-member-profile';
      shell.dataset.basicProfileReady='1';
      shell.innerHTML='<div class="fb-basic-cover" data-basic-cover><div class="fb-basic-cover-empty"><i data-lucide="camera"></i><span>Add cover photo</span></div></div><div class="fb-basic-avatar-slot"></div><div class="fb-basic-name"></div>';
      shell.querySelector('.fb-basic-avatar-slot').appendChild(avatar);
      shell.querySelector('.fb-basic-name').appendChild(name);
      if(edit)shell.querySelector('.fb-basic-name').appendChild(edit);
      old.replaceWith(shell);
      window.lucide?.createIcons?.();
      window.dispatchEvent(new CustomEvent('familybook:basic-member-profile-ready'));
    }finally{rebuilding=false}
  }

  const schedule=()=>queueMicrotask(rebuild);
  document.addEventListener('click',schedule);
  window.addEventListener('load',schedule);
  window.addEventListener('familybook:family-data-updated',schedule);

  // The app renders routes by replacing #screen.innerHTML. Watch that route
  // container directly so the legacy card is removed even when navigation is
  // triggered programmatically rather than by a normal click.
  const install=()=>{
    const screen=document.querySelector('#screen');
    if(!screen)return setTimeout(install,50);
    new MutationObserver(schedule).observe(screen,{childList:true,subtree:true});
    schedule();
  };
  install();
})();