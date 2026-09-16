(()=>{
  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const numberOr=(v,fallback=50)=>{const n=Number(v);return Number.isFinite(n)?n:fallback};

  function memberIdFromPage(page){
    return page?.querySelector('.fb-member-profile')?.dataset.profileMemberId
      ||page?.querySelector('[data-edit-member]')?.dataset.editMember
      ||page?.querySelector('[data-member-id]')?.dataset.memberId
      ||'';
  }

  function canEdit(id){
    const u=auth();
    return !!id&&(String(u.memberId||'')===String(id)||u.role==='admin');
  }

  async function getCover(id){
    const client=sb();
    if(!client)return null;
    const {data,error}=await client.from('person_covers').select('person_id,family_id,storage_path,position_x,position_y').eq('person_id',id).maybeSingle();
    if(error)throw error;
    if(!data?.storage_path)return null;
    const url=await window.FB_MEDIA?.getSignedUrl?.(data.storage_path,7200);
    return url?{...data,url}:null;
  }

  function openViewer(url){
    if(!url)return;
    if(typeof window.FB_PROFILE_MEDIA_VIEWER==='function')return window.FB_PROFILE_MEDIA_VIEWER(url,'Cover photo');
  }

  function renderCover(page,id,current){
    const cover=page?.querySelector('[data-basic-cover]');
    if(!cover)return;
    cover.dataset.loadedFor=id;
    cover.innerHTML='';

    if(current?.url){
      const open=document.createElement('button');
      open.type='button';
      open.className='fb-cover-open';
      open.setAttribute('aria-label','View cover photo');
      const img=document.createElement('img');
      img.src=current.url;
      img.alt='Cover photo';
      img.style.objectPosition=`${numberOr(current.position_x)}% ${numberOr(current.position_y)}%`;
      open.appendChild(img);
      open.onclick=()=>openViewer(current.url);
      cover.appendChild(open);
    }else{
      const empty=document.createElement('div');
      empty.className='fb-basic-cover-empty';
      empty.innerHTML='<i data-lucide="camera"></i><span>No cover photo yet</span>';
      cover.appendChild(empty);
    }

    if(canEdit(id)){
      const edit=document.createElement('button');
      edit.type='button';
      edit.className='fb-cover-edit';
      edit.innerHTML=`<i data-lucide="camera"></i><span>${current?'Change cover':'Add cover'}</span>`;
      edit.onclick=e=>{e.stopPropagation();pickerModal(page,id,current)};
      cover.appendChild(edit);
      if(!current){
        cover.querySelector('.fb-basic-cover-empty')?.addEventListener('click',()=>pickerModal(page,id,current));
        cover.classList.add('is-editable-empty');
      }
    }else{
      cover.classList.remove('is-editable-empty');
    }
    window.lucide?.createIcons?.();
  }

  function pickerModal(page,id,current){
    document.querySelector('.member-cover-editor')?.remove();
    const modal=document.createElement('div');
    modal.className='member-cover-editor';
    modal.innerHTML=`<div class="member-cover-editor-card" role="dialog" aria-modal="true" aria-label="Cover photo editor">
      <div class="member-cover-editor-head"><div><span>Profile</span><strong>Cover photo</strong></div><button type="button" data-cover-close aria-label="Close"><i data-lucide="x"></i></button></div>
      <div class="member-cover-preview"><img alt="Cover preview" hidden><div class="member-cover-preview-empty"><i data-lucide="image"></i><span>Choose a photo to preview</span></div></div>
      <input type="file" accept="image/*" data-cover-file hidden>
      <input type="file" accept="image/*" capture="environment" data-cover-camera hidden>
      <div class="member-cover-pick-actions"><button type="button" class="secondary" data-cover-choose><i data-lucide="image"></i>Gallery</button><button type="button" class="secondary" data-cover-camera-btn><i data-lucide="camera"></i>Camera</button></div>
      <div class="member-cover-position-grid">
        <label>Horizontal<input type="range" min="0" max="100" value="${numberOr(current?.position_x)}" data-cover-x></label>
        <label>Vertical<input type="range" min="0" max="100" value="${numberOr(current?.position_y)}" data-cover-y></label>
      </div>
      <div class="member-cover-editor-actions">${current?'<button type="button" class="secondary danger" data-cover-remove><i data-lucide="trash-2"></i>Remove</button>':''}<button type="button" class="primary" data-cover-save ${current?'':'disabled'}>Save cover</button></div>
      <div class="member-cover-status" data-cover-status hidden></div>
    </div>`;

    document.body.appendChild(modal);
    window.lucide?.createIcons?.();

    const preview=modal.querySelector('.member-cover-preview');
    const previewImg=preview.querySelector('img');
    const previewEmpty=preview.querySelector('.member-cover-preview-empty');
    const fileInput=modal.querySelector('[data-cover-file]');
    const cameraInput=modal.querySelector('[data-cover-camera]');
    const save=modal.querySelector('[data-cover-save]');
    const x=modal.querySelector('[data-cover-x]');
    const y=modal.querySelector('[data-cover-y]');
    const status=modal.querySelector('[data-cover-status]');
    let blob=null;
    let objectUrl='';

    const showStatus=(text,type='error')=>{status.hidden=!text;status.textContent=text||'';status.dataset.type=type};
    const showPreview=(url)=>{
      if(!url)return;
      previewImg.src=url;
      previewImg.hidden=false;
      previewEmpty.hidden=true;
      previewImg.style.objectPosition=`${x.value}% ${y.value}%`;
    };
    if(current?.url)showPreview(current.url);

    const updatePos=()=>{if(!previewImg.hidden)previewImg.style.objectPosition=`${x.value}% ${y.value}%`;if(current||blob)save.disabled=false};
    x.oninput=updatePos;
    y.oninput=updatePos;

    const loadFile=file=>{
      if(!file)return;
      if(!String(file.type||'').startsWith('image/')){showStatus('Please choose an image file.');return}
      blob=file;
      if(objectUrl)URL.revokeObjectURL(objectUrl);
      objectUrl=URL.createObjectURL(file);
      showPreview(objectUrl);
      save.disabled=false;
      showStatus('','success');
    };

    fileInput.onchange=()=>loadFile(fileInput.files?.[0]);
    cameraInput.onchange=()=>loadFile(cameraInput.files?.[0]);
    modal.querySelector('[data-cover-choose]').onclick=()=>fileInput.click();
    modal.querySelector('[data-cover-camera-btn]').onclick=()=>cameraInput.click();

    const close=()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);modal.remove()};
    modal.querySelector('[data-cover-close]').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close()});

    save.onclick=async()=>{
      if(!blob&&!current)return;
      save.disabled=true;
      const oldHtml=save.innerHTML;
      save.textContent='Saving…';
      showStatus('','success');
      const u=auth();
      let path=current?.storage_path||'';
      let uploadedPath='';
      try{
        if(blob){
          const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
          path=`${u.familyId}/${u.supabaseUserId}/covers/member-${id}-${Date.now()}.${ext}`;
          uploadedPath=path;
          await window.FB_MEDIA.upload(path,blob,{contentType:blob.type||'image/jpeg',upsert:false,cacheControl:'3600'});
        }
        const client=sb();
        if(!client)throw new Error('Cover storage is unavailable.');
        const {error}=await client.from('person_covers').upsert({
          person_id:id,
          family_id:u.familyId,
          storage_path:path,
          position_x:Number(x.value),
          position_y:Number(y.value),
          updated_by_user_id:u.supabaseUserId,
          updated_at:new Date().toISOString()
        },{onConflict:'person_id'});
        if(error)throw error;
        if(blob&&current?.storage_path&&current.storage_path!==path){
          await window.FB_MEDIA.remove([current.storage_path],{silent:true});
        }
        close();
        await load(true);
      }catch(err){
        console.error('Cover save:',err);
        if(uploadedPath&&uploadedPath!==current?.storage_path){
          try{await window.FB_MEDIA.remove([uploadedPath],{silent:true})}catch(_){}
        }
        showStatus(err?.message||'Could not save the cover photo.');
        save.disabled=false;
        save.innerHTML=oldHtml;
        window.lucide?.createIcons?.();
      }
    };

    modal.querySelector('[data-cover-remove]')?.addEventListener('click',async()=>{
      if(!confirm('Remove this cover photo?'))return;
      try{
        const client=sb();
        if(!client)throw new Error('Cover storage is unavailable.');
        const {error}=await client.from('person_covers').delete().eq('person_id',id);
        if(error)throw error;
        if(current?.storage_path)await window.FB_MEDIA.remove([current.storage_path],{silent:true});
        close();
        await load(true);
      }catch(err){showStatus(err?.message||'Could not remove the cover photo.')}
    });
  }

  async function load(force=false){
    const page=document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
    const cover=page?.querySelector('[data-basic-cover]');
    if(!page||!cover)return;
    const id=memberIdFromPage(page);
    if(!id)return;
    if(!force&&cover.dataset.loadedFor===id)return;
    cover.dataset.loadedFor=id;
    try{
      const current=await getCover(id);
      renderCover(page,id,current);
    }catch(err){
      console.warn('Member cover unavailable:',err);
      renderCover(page,id,null);
    }
  }

  document.addEventListener('click',()=>setTimeout(()=>load(),20));
  window.addEventListener('load',()=>setTimeout(()=>load(),100));
  window.addEventListener('familybook:basic-member-profile-ready',()=>load(true));
  window.addEventListener('familybook:family-data-updated',()=>setTimeout(()=>load(true),50));
})();