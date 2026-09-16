(()=>{
  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
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
      <div class="member-cover-editor-head"><strong>Cover photo</strong><button type="button" data-cover-close aria-label="Close"><i data-lucide="x"></i></button></div>
      <div class="member-cover-preview ${current?.url?'has-image':''}" style="${current?.url?`background-image:url('${esc(current.url)}');background-position:${Number(current.position_x)||50}% ${Number(current.position_y)||50}%`:''}"><span>${current?.url?'Drag the position sliders below':'Choose a photo to preview it here'}</span></div>
      <input type="file" accept="image/*" data-cover-file hidden>
      <input type="file" accept="image/*" capture="environment" data-cover-camera hidden>
      <div class="member-cover-pick-actions"><button type="button" class="secondary" data-cover-choose><i data-lucide="image"></i>Choose photo</button><button type="button" class="secondary" data-cover-camera-btn><i data-lucide="camera"></i>Take photo</button></div>
      <label class="member-cover-position">Horizontal position<input type="range" min="0" max="100" value="${Number(current?.position_x)||50}" data-cover-x></label>
      <label class="member-cover-position">Vertical position<input type="range" min="0" max="100" value="${Number(current?.position_y)||50}" data-cover-y></label>
      <div class="member-cover-editor-actions">${current?'<button type="button" class="secondary danger" data-cover-remove><i data-lucide="trash-2"></i>Remove</button>':''}<button type="button" class="primary" data-cover-save disabled>Save cover</button></div>
    </div>`;
    document.body.appendChild(modal);window.lucide?.createIcons?.();
    const preview=modal.querySelector('.member-cover-preview'),fileInput=modal.querySelector('[data-cover-file]'),cameraInput=modal.querySelector('[data-cover-camera]'),save=modal.querySelector('[data-cover-save]');
    let blob=null,objectUrl='';
    const x=modal.querySelector('[data-cover-x]'),y=modal.querySelector('[data-cover-y]');
    const updatePos=()=>preview.style.backgroundPosition=`${x.value}% ${y.value}%`;
    x.oninput=updatePos;y.oninput=updatePos;
    const loadFile=file=>{if(!file)return;if(!file.type.startsWith('image/'))return alert('Please choose an image.');blob=file;if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);preview.style.backgroundImage=`url("${objectUrl}")`;preview.classList.add('has-image');preview.querySelector('span').textContent='Adjust the position, then save';save.disabled=false;};
    fileInput.onchange=()=>loadFile(fileInput.files?.[0]);cameraInput.onchange=()=>loadFile(cameraInput.files?.[0]);
    modal.querySelector('[data-cover-choose]').onclick=()=>fileInput.click();
    modal.querySelector('[data-cover-camera-btn]').onclick=()=>cameraInput.click();
    const close=()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);modal.remove()};
    modal.querySelector('[data-cover-close]').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
    save.onclick=async()=>{if(!blob)return;save.disabled=true;save.textContent='Saving…';const u=auth();const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';const path=`${u.familyId}/${u.supabaseUserId}/covers/member-${id}-${Date.now()}.${ext}`;try{await window.FB_MEDIA.upload(path,blob,{contentType:blob.type||'image/jpeg',upsert:false,cacheControl:'3600'});const {error}=await sb().from('person_covers').upsert({person_id:id,family_id:u.familyId,storage_path:path,position_x:Number(x.value),position_y:Number(y.value),updated_by_user_id:u.supabaseUserId,updated_at:new Date().toISOString()},{onConflict:'person_id'});if(error)throw error;if(current?.storage_path&&current.storage_path!==path)await window.FB_MEDIA.remove([current.storage_path],{silent:true});close();await enhance(true);}catch(err){console.error(err);alert(err?.message||'Could not save the cover photo.');save.disabled=false;save.textContent='Save cover';}};
    modal.querySelector('[data-cover-remove]')?.addEventListener('click',async()=>{if(!confirm('Remove this cover photo?'))return;try{const {error}=await sb().from('person_covers').delete().eq('person_id',id);if(error)throw error;if(current?.storage_path)await window.FB_MEDIA.remove([current.storage_path],{silent:true});close();await enhance(true);}catch(err){alert(err?.message||'Could not remove the cover photo.')}});
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
