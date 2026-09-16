(()=>{
  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  let lastRouteKey='';

  function memberIdFromPage(page){
    const edit=page.querySelector('[data-edit-member]');
    return edit?.dataset.editMember||'';
  }
  function canEdit(id){
    const u=auth();
    return !!id&&(String(u.memberId||'')===String(id)||u.role==='admin');
  }
  async function getCover(id){
    const {data,error}=await sb().from('person_covers').select('person_id,family_id,storage_path,position_x,position_y').eq('person_id',id).maybeSingle();
    if(error)throw error;
    if(!data)return null;
    let url='';
    try{url=await window.FB_MEDIA.getSignedUrl(data.storage_path,60*60*2)}catch(_){}
    return {...data,url};
  }
  function applyCover(page,cover){
    const card=page.querySelector('.profile-view-card');
    if(!card)return;
    if(cover?.url){
      card.style.setProperty('--member-cover-image',`url("${String(cover.url).replace(/"/g,'%22')}")`);
      card.style.setProperty('--member-cover-x',`${Number(cover.position_x)||50}%`);
      card.style.setProperty('--member-cover-y',`${Number(cover.position_y)||50}%`);
      card.classList.add('has-member-cover');
    }else{
      card.style.removeProperty('--member-cover-image');
      card.style.removeProperty('--member-cover-x');
      card.style.removeProperty('--member-cover-y');
      card.classList.remove('has-member-cover');
    }
  }
  function pickerModal(page,id,current){
    document.querySelector('.member-cover-editor')?.remove();
    const modal=document.createElement('div');
    modal.className='member-cover-editor';
    modal.innerHTML=`<div class="member-cover-editor-card">
      <div class="member-cover-editor-head"><div><strong>Cover photo</strong><small>Choose a wide photo and adjust what shows.</small></div><button type="button" data-cover-close aria-label="Close"><i data-lucide="x"></i></button></div>
      <div class="member-cover-preview ${current?.url?'has-image':''}"><span>${current?.url?'Adjust the photo position':'Choose a photo'}</span></div>
      <input type="file" accept="image/*" data-cover-file hidden>
      <input type="file" accept="image/*" capture="environment" data-cover-camera hidden>
      <div class="member-cover-pick-actions"><button type="button" class="secondary" data-cover-choose><i data-lucide="image"></i><span>Gallery</span></button><button type="button" class="secondary" data-cover-camera-btn><i data-lucide="camera"></i><span>Camera</span></button></div>
      <div class="member-cover-position-wrap">
        <label class="member-cover-position"><span>Left / right</span><input type="range" min="0" max="100" value="${Number(current?.position_x)||50}" data-cover-x></label>
        <label class="member-cover-position"><span>Up / down</span><input type="range" min="0" max="100" value="${Number(current?.position_y)||50}" data-cover-y></label>
      </div>
      <div class="member-cover-status" data-cover-status aria-live="polite"></div>
      <div class="member-cover-editor-actions">${current?'<button type="button" class="secondary danger" data-cover-remove><i data-lucide="trash-2"></i><span>Remove</span></button>':'<span></span>'}<button type="button" class="primary" data-cover-save><i data-lucide="check"></i><span>Save cover</span></button></div>
    </div>`;
    document.body.appendChild(modal);window.lucide?.createIcons?.();
    const preview=modal.querySelector('.member-cover-preview'),fileInput=modal.querySelector('[data-cover-file]'),cameraInput=modal.querySelector('[data-cover-camera]'),save=modal.querySelector('[data-cover-save]'),status=modal.querySelector('[data-cover-status]');
    let blob=null,objectUrl='';
    const x=modal.querySelector('[data-cover-x]'),y=modal.querySelector('[data-cover-y]');
    if(current?.url){preview.style.backgroundImage=`url("${String(current.url).replace(/"/g,'%22')}")`;preview.style.backgroundPosition=`${Number(current.position_x)||50}% ${Number(current.position_y)||50}%`;}
    const updatePos=()=>preview.style.backgroundPosition=`${x.value}% ${y.value}%`;
    x.oninput=updatePos;y.oninput=updatePos;
    const setStatus=(message,isError=false)=>{status.textContent=message||'';status.classList.toggle('error',!!isError)};
    const loadFile=file=>{if(!file)return;if(!file.type.startsWith('image/')){setStatus('Please choose an image.',true);return;}blob=file;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);preview.style.backgroundImage=`url("${objectUrl}")`;preview.classList.add('has-image');preview.querySelector('span').textContent='Adjust the photo position';setStatus('Photo ready to save.');};
    fileInput.onchange=()=>loadFile(fileInput.files?.[0]);cameraInput.onchange=()=>loadFile(cameraInput.files?.[0]);
    modal.querySelector('[data-cover-choose]').onclick=()=>fileInput.click();
    modal.querySelector('[data-cover-camera-btn]').onclick=()=>cameraInput.click();
    const close=()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);modal.remove()};
    modal.querySelector('[data-cover-close]').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
    save.onclick=async()=>{
      if(!blob&&current){
        save.disabled=true;setStatus('Saving position…');
        try{const {error}=await sb().from('person_covers').update({position_x:Number(x.value),position_y:Number(y.value),updated_at:new Date().toISOString()}).eq('person_id',id);if(error)throw error;close();await enhance(true);}catch(err){console.error(err);setStatus(err?.message||'Could not save the cover position.',true);save.disabled=false;}return;
      }
      if(!blob){setStatus('Choose a photo first.',true);return;}
      save.disabled=true;setStatus('Uploading cover…');
      const u=auth();const userId=u.supabaseUserId||sb()?.auth?.getUser?._currentUser?.id||'';const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';const path=`${u.familyId}/${userId||'member'}/covers/member-${id}-${Date.now()}.${ext}`;
      try{
        await window.FB_MEDIA.upload(path,blob,{contentType:blob.type||'image/jpeg',upsert:false,cacheControl:'3600'});
        setStatus('Saving cover…');
        const row={person_id:id,family_id:u.familyId,storage_path:path,position_x:Number(x.value),position_y:Number(y.value),updated_at:new Date().toISOString()};
        if(userId)row.updated_by_user_id=userId;
        const {error}=await sb().from('person_covers').upsert(row,{onConflict:'person_id'});
        if(error)throw error;
        if(current?.storage_path&&current.storage_path!==path)await window.FB_MEDIA.remove([current.storage_path],{silent:true});
        close();await enhance(true);
      }catch(err){console.error('Cover save failed:',err);setStatus(err?.message||'Could not save the cover photo.',true);save.disabled=false;}
    };
    modal.querySelector('[data-cover-remove]')?.addEventListener('click',async()=>{if(!confirm('Remove this cover photo?'))return;try{setStatus('Removing cover…');const {error}=await sb().from('person_covers').delete().eq('person_id',id);if(error)throw error;if(current?.storage_path)await window.FB_MEDIA.remove([current.storage_path],{silent:true});close();await enhance(true);}catch(err){setStatus(err?.message||'Could not remove the cover photo.',true)}});
  }
  async function enhance(force=false){
    const page=document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
    if(!page)return;
    const id=memberIdFromPage(page);if(!id)return;
    const key=`${id}:${location.hash}`;if(!force&&page.dataset.coverReady===key)return;page.dataset.coverReady=key;
    try{
      const cover=await getCover(id);applyCover(page,cover);
      page.querySelector('.member-cover-edit')?.remove();
      if(canEdit(id)){
        const card=page.querySelector('.profile-view-card');const btn=document.createElement('button');btn.type='button';btn.className='member-cover-edit';btn.innerHTML='<i data-lucide="camera"></i><span>Edit cover</span>';btn.onclick=()=>pickerModal(page,id,cover);card.appendChild(btn);window.lucide?.createIcons?.();
      }
    }catch(err){console.warn('Member cover unavailable:',err)}
  }
  document.addEventListener('click',()=>setTimeout(()=>enhance(),30));
  window.addEventListener('load',()=>setTimeout(()=>enhance(),100));
  window.addEventListener('familybook:family-data-updated',()=>setTimeout(()=>enhance(true),50));
})();
