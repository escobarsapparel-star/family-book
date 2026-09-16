(()=>{
  function rebuild(){
    const page=document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
    const old=page?.querySelector('.profile-view-card');
    if(!page||!old||old.dataset.basicProfileReady==='1')return;
    const avatar=old.querySelector('.profile-view-avatar');
    const name=old.querySelector(':scope > h1');
    const edit=old.querySelector('[data-edit-member]');
    if(!avatar||!name)return;

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
  }
  document.addEventListener('click',()=>setTimeout(rebuild,0));
  window.addEventListener('load',()=>setTimeout(rebuild,0));
  window.addEventListener('familybook:family-data-updated',()=>setTimeout(rebuild,0));
})();