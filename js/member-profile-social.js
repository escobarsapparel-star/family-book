(()=>{
  let rebuilding=false;

  const auth=()=>window.FB_AUTH?.get?.()||{};

  function openMediaViewer(src,alt='Photo'){
    if(!src)return;
    document.querySelector('.fb-profile-media-viewer')?.remove();
    const modal=document.createElement('div');
    modal.className='fb-profile-media-viewer';
    modal.innerHTML='<button type="button" class="fb-profile-media-close" aria-label="Close"><i data-lucide="x"></i></button><div class="fb-profile-media-stage"><img alt=""></div>';
    const img=modal.querySelector('img');
    img.src=src;
    img.alt=alt;
    const close=()=>modal.remove();
    modal.querySelector('.fb-profile-media-close').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.classList.contains('fb-profile-media-stage'))close()});
    document.body.appendChild(modal);
    window.lucide?.createIcons?.();
  }
  window.FB_PROFILE_MEDIA_VIEWER=openMediaViewer;

  function memberIdFromLegacy(old,edit,activity){
    return edit?.dataset.editMember
      ||activity?.querySelector('[data-member-id]')?.dataset.memberId
      ||old.querySelector('[data-member-id]')?.dataset.memberId
      ||'';
  }

  function rebuild(){
    if(rebuilding)return;
    const page=document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
    const old=page?.querySelector('.profile-view-card:not(.fb-member-profile)');
    if(!page||!old)return;

    const avatar=old.querySelector('.profile-view-avatar');
    const name=old.querySelector(':scope > h1');
    const edit=old.querySelector('[data-edit-member]');
    const contact=old.querySelector('.member-contact-actions');
    const details=old.querySelector('.profile-details');
    const activity=old.querySelector('.member-activity-card');
    if(!avatar||!name)return;

    const id=memberIdFromLegacy(old,edit,activity);
    const isOwn=!!id&&String(auth().memberId||'')===String(id);

    rebuilding=true;
    try{
      const shell=document.createElement('div');
      shell.className='profile-view-card fb-member-profile';
      shell.dataset.basicProfileReady='1';
      if(id)shell.dataset.profileMemberId=id;
      shell.innerHTML=`
        <div class="fb-basic-cover" data-basic-cover>
          <div class="fb-basic-cover-empty"><i data-lucide="camera"></i><span>Cover photo</span></div>
        </div>
        <div class="fb-basic-avatar-slot">
          <div class="fb-avatar-home"></div>
          ${edit?'<button type="button" class="fb-profile-photo-edit" aria-label="Change profile photo"><i data-lucide="camera"></i></button>':''}
        </div>
        <div class="fb-basic-name"></div>
        <div class="fb-profile-actions" hidden></div>
        <div class="fb-profile-content"></div>`;

      shell.querySelector('.fb-avatar-home').appendChild(avatar);
      shell.querySelector('.fb-basic-name').appendChild(name);

      if(edit){
        edit.classList.add('fb-profile-edit-button');
        edit.innerHTML=`<i data-lucide="pencil"></i><span>${isOwn?'Edit profile':'Edit member'}</span>`;
        shell.querySelector('.fb-basic-name').appendChild(edit);
        shell.querySelector('.fb-profile-photo-edit').onclick=()=>edit.click();
      }

      const avatarImg=avatar.querySelector('img');
      if(avatarImg){
        avatarImg.tabIndex=0;
        avatarImg.setAttribute('role','button');
        avatarImg.setAttribute('aria-label','View profile photo');
        const viewAvatar=()=>openMediaViewer(avatarImg.currentSrc||avatarImg.src,`${name.textContent.trim()} profile photo`);
        avatarImg.addEventListener('click',viewAvatar);
        avatarImg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();viewAvatar()}});
      }

      const actionHost=shell.querySelector('.fb-profile-actions');
      if(contact&&contact.children.length){
        actionHost.hidden=false;
        actionHost.appendChild(contact);
      }

      const content=shell.querySelector('.fb-profile-content');
      if(details&&details.children.length){
        const about=document.createElement('section');
        about.className='fb-profile-section fb-profile-about';
        about.innerHTML='<div class="fb-profile-section-head"><div><span>Profile</span><h2>About</h2></div></div>';
        about.appendChild(details);
        content.appendChild(about);
      }

      if(activity){
        const activityWrap=document.createElement('section');
        activityWrap.className='fb-profile-section fb-profile-activity';
        activityWrap.appendChild(activity);
        content.appendChild(activityWrap);
      }

      old.replaceWith(shell);
      window.lucide?.createIcons?.();
      window.dispatchEvent(new CustomEvent('familybook:basic-member-profile-ready',{detail:{memberId:id}}));
    }finally{
      rebuilding=false;
    }
  }

  const schedule=()=>queueMicrotask(rebuild);
  document.addEventListener('click',schedule);
  window.addEventListener('load',schedule);
  window.addEventListener('familybook:family-data-updated',schedule);

  const install=()=>{
    const screen=document.querySelector('#screen');
    if(!screen)return setTimeout(install,50);
    new MutationObserver(schedule).observe(screen,{childList:true,subtree:true});
    schedule();
  };
  install();
})();