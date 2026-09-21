(()=>{
  let rebuilding=false;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const familyData=()=>window.FB_FAMILY_DATA;

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

  function memberById(id){
    return familyData()?.getPeople?.().find(m=>String(m.id)===String(id))||null;
  }

  function isManagedDependant(id){
    if(!id)return false;
    const u=auth(),me=String(u.memberId||''),target=memberById(id);
    if(!me||!target||!target.managedProfile||target.accountId)return false;
    const rels=familyData()?.getRelationships?.()||[];
    return rels.some(r=>
      (r.type==='parent_of'&&String(r.from)===me&&String(r.to)===String(id))||
      (r.type==='child_of'&&String(r.from)===String(id)&&String(r.to)===me)
    );
  }

  function canManagePhoto(id){
    if(!id)return false;
    const u=auth();
    return String(u.memberId||'')===String(id)||isManagedDependant(id);
  }

  function visibleEmailFromDetails(details){
    if(!details)return '';
    for(const row of details.querySelectorAll('.profile-detail')){
      const label=row.querySelector('span')?.textContent?.trim().toLowerCase()||'';
      if(label==='email')return row.querySelector('strong')?.textContent?.trim()||'';
    }
    return '';
  }

  async function uploadDependantPhoto(id,photo){
    if(!photo)return '';
    const u=auth();
    if(!u.familyId||!u.supabaseUserId)throw new Error('Your Family Book session is not ready.');
    const response=await fetch(photo),blob=await response.blob();
    const ext=blob.type==='image/png'?'png':'jpg';
    const path=`${u.familyId}/${u.supabaseUserId}/profiles/${id}-${Date.now()}.${ext}`;
    await window.FB_MEDIA.upload(path,blob,{
      contentType:blob.type||'image/jpeg',
      upsert:false,
      cacheControl:'3600'
    });
    return path;
  }

  async function saveDependantProfilePhoto(id,photo){
    const api=familyData(),member=memberById(id),client=window.FB_SUPABASE?.client;
    if(!api?.reload||!member||!client)throw new Error('Profile storage is unavailable.');
    if(!isManagedDependant(id))throw new Error('Only a parent can update this dependant profile photo.');

    const oldPath=member.photoPath||'';
    let newPath='';
    try{
      newPath=await uploadDependantPhoto(id,photo);
      const {error}=await client.rpc('set_dependant_profile_photo',{
        p_person_id:id,
        p_photo_path:newPath||null
      });
      if(error)throw error;
    }catch(err){
      if(newPath)await window.FB_MEDIA.remove([newPath],{silent:true});
      throw err;
    }

    if(oldPath&&oldPath!==newPath)await window.FB_MEDIA.remove([oldPath],{silent:true});
    await api.reload();
    window.dispatchEvent(new CustomEvent('familybook:family-data-updated',{detail:{reason:'dependant-profile-photo-updated',memberId:id}}));
  }

  async function saveProfilePhoto(id,photo){
    if(isManagedDependant(id))return saveDependantProfilePhoto(id,photo);

    const api=familyData();
    if(!api?.getPeople||!api?.syncMembers)throw new Error('Profile storage is unavailable.');
    const list=api.getPeople();
    const index=list.findIndex(m=>String(m.id)===String(id));
    if(index<0)throw new Error('This family member could not be found.');
    list[index]={...list[index],photo:photo||''};
    await api.syncMembers(list);
    await api.reload?.();
    window.dispatchEvent(new CustomEvent('familybook:family-data-updated',{detail:{reason:'profile-photo-updated',memberId:id}}));
  }

  function openImageCropper(src,onDone){
    document.querySelector('.cropper-backdrop')?.remove();
    const d=document.createElement('div');
    d.className='cropper-backdrop';
    d.innerHTML=`<div class="cropper-card" role="dialog" aria-modal="true"><div class="cropper-head"><button type="button" class="crop-cancel"><i data-lucide="x"></i></button><div><h3>Crop profile photo</h3><p>Move and zoom the photo inside the frame.</p></div><button type="button" class="crop-save">Save</button></div><div class="crop-canvas-wrap"><canvas width="512" height="512"></canvas><div class="crop-ring"></div></div><div class="crop-zoom"><i data-lucide="minus"></i><input type="range" min="1" max="3" value="1" step="0.01" aria-label="Zoom"><i data-lucide="plus"></i></div></div>`;
    document.body.appendChild(d);window.lucide?.createIcons?.();
    const canvas=d.querySelector('canvas'),ctx=canvas.getContext('2d'),range=d.querySelector('input[type="range"]'),img=new Image();
    let zoom=1,ox=0,oy=0,base=1,drag=false,lastX=0,lastY=0;
    const S=512;
    const bounds=()=>{const w=img.naturalWidth*base*zoom,h=img.naturalHeight*base*zoom;return {w,h,mx:Math.max(0,(w-S)/2),my:Math.max(0,(h-S)/2)}};
    const clamp=()=>{const b=bounds();ox=Math.max(-b.mx,Math.min(b.mx,ox));oy=Math.max(-b.my,Math.min(b.my,oy))};
    const draw=()=>{if(!img.naturalWidth)return;clamp();const b=bounds();ctx.clearRect(0,0,S,S);ctx.fillStyle='#eee7dc';ctx.fillRect(0,0,S,S);ctx.drawImage(img,(S-b.w)/2+ox,(S-b.h)/2+oy,b.w,b.h)};
    img.onload=()=>{base=Math.max(S/img.naturalWidth,S/img.naturalHeight);draw()};
    img.src=src;
    range.oninput=()=>{zoom=Number(range.value);draw()};
    canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{if(!drag)return;const k=S/canvas.getBoundingClientRect().width;ox+=(e.clientX-lastX)*k;oy+=(e.clientY-lastY)*k;lastX=e.clientX;lastY=e.clientY;draw()});
    canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);
    d.querySelector('.crop-cancel').onclick=()=>d.remove();
    d.querySelector('.crop-save').onclick=()=>{draw();const data=canvas.toDataURL('image/jpeg',.88);d.remove();onDone(data)};
  }

  function chooseProfilePhoto(mode,id){
    const input=document.createElement('input');
    input.type='file';
    input.accept='image/*';
    if(mode==='camera')input.setAttribute('capture','environment');
    input.onchange=()=>{
      const file=input.files?.[0];
      if(!file)return;
      if(!String(file.type||'').startsWith('image/'))return alert('Please choose an image.');
      const reader=new FileReader();
      reader.onload=()=>openImageCropper(reader.result,async data=>{
        try{await saveProfilePhoto(id,data)}catch(err){alert(err?.message||'Could not update the profile photo.')}
      });
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function openProfilePhotoMenu(id,src,name){
    document.querySelector('.photo-action-backdrop')?.remove();
    const editable=canManagePhoto(id);
    const d=document.createElement('div');
    d.className='photo-action-backdrop';
    d.innerHTML=`<div class="photo-action-sheet fb-profile-action-sheet" role="dialog" aria-modal="true"><div class="photo-sheet-handle"></div><h3>Profile picture</h3>${editable?'<button data-profile-photo-action="gallery"><i data-lucide="folder-open"></i><span>Upload photo</span></button><button data-profile-photo-action="camera"><i data-lucide="camera"></i><span>Take photo</span></button>':''}${src?'<button data-profile-photo-action="view"><i data-lucide="circle-user-round"></i><span>See profile picture</span></button>':''}${editable&&src?'<button class="photo-remove" data-profile-photo-action="remove"><i data-lucide="trash-2"></i><span>Remove photo</span></button>':''}<button class="photo-cancel" data-profile-photo-action="cancel">Cancel</button></div>`;
    document.body.appendChild(d);window.lucide?.createIcons?.();
    const close=()=>d.remove();
    d.addEventListener('click',e=>{if(e.target===d)close()});
    d.querySelectorAll('[data-profile-photo-action]').forEach(btn=>btn.onclick=async()=>{
      const action=btn.dataset.profilePhotoAction;
      if(action==='cancel')return close();
      if(action==='view'){close();return openMediaViewer(src,`${name} profile photo`)}
      if(action==='gallery'||action==='camera'){close();return chooseProfilePhoto(action,id)}
      if(action==='remove'){
        close();
        if(!confirm('Remove this profile photo?'))return;
        try{await saveProfilePhoto(id,'')}catch(err){alert(err?.message||'Could not remove the profile photo.')}
      }
    });
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
    const photoEditable=canManagePhoto(id);
    const visibleEmail=visibleEmailFromDetails(details);

    rebuilding=true;
    try{
      const shell=document.createElement('div');
      shell.className='profile-view-card fb-member-profile';
      shell.dataset.basicProfileReady='1';
      if(id)shell.dataset.profileMemberId=id;
      shell.innerHTML=`
        <div class="fb-basic-cover" data-basic-cover>${isOwn?'<div class="fb-basic-cover-empty"><i data-lucide="camera"></i><span>Cover photo</span></div>':''}</div>
        <div class="fb-basic-avatar-slot">
          <div class="fb-avatar-home"></div>
          ${photoEditable?'<button type="button" class="fb-profile-photo-edit" aria-label="Profile picture options"><i data-lucide="camera"></i></button>':''}
        </div>
        <div class="fb-basic-name"></div>
        <div class="fb-profile-actions" hidden></div>
        <div class="fb-profile-content"></div>`;

      shell.querySelector('.fb-avatar-home').appendChild(avatar);
      shell.querySelector('.fb-basic-name').appendChild(name);

      if(edit&&isOwn){
        edit.classList.add('fb-profile-edit-button');
        edit.innerHTML='<i data-lucide="pencil"></i><span>Edit profile</span>';
        shell.querySelector('.fb-basic-name').appendChild(edit);
      }

      const avatarImg=avatar.querySelector('img');
      const currentSrc=()=>avatarImg?.currentSrc||avatarImg?.src||'';
      const openPhotoOptions=()=>openProfilePhotoMenu(id,currentSrc(),name.textContent.trim());
      avatar.tabIndex=0;
      avatar.setAttribute('role','button');
      avatar.setAttribute('aria-label',photoEditable?'Profile picture options':'View profile picture');
      avatar.addEventListener('click',()=>photoEditable?openPhotoOptions():openMediaViewer(currentSrc(),`${name.textContent.trim()} profile photo`));
      avatar.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();photoEditable?openPhotoOptions():openMediaViewer(currentSrc(),`${name.textContent.trim()} profile photo`)}});
      shell.querySelector('.fb-profile-photo-edit')?.addEventListener('click',e=>{e.stopPropagation();openPhotoOptions()});

      let contactActions=contact;
      if(!contactActions&&visibleEmail){
        contactActions=document.createElement('div');
        contactActions.className='member-contact-actions';
      }
      if(visibleEmail&&contactActions&&!contactActions.querySelector('.fb-email-action')){
        const emailAction=document.createElement('a');
        emailAction.className='fb-email-action';
        emailAction.href=`mailto:${visibleEmail}`;
        emailAction.setAttribute('aria-label',`Email ${name.textContent.trim()}`);
        emailAction.innerHTML='<i data-lucide="mail"></i><span>Email</span>';
        contactActions.appendChild(emailAction);
      }

      const actionHost=shell.querySelector('.fb-profile-actions');
      if(contactActions&&contactActions.children.length){
        actionHost.hidden=false;
        actionHost.appendChild(contactActions);
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