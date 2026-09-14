(()=>{
  let urls=[];
  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function cleanup(){urls.forEach(u=>{try{URL.revokeObjectURL(u)}catch(_){}});urls=[]}
  function blobUrl(blob){if(!blob)return "";if(typeof blob==="string")return blob;try{const u=URL.createObjectURL(blob);urls.push(u);return u}catch(_){return ""}}
  function getAll(){return window.FB_ORGANIZER_DATA?.getAlbums?.()||[]}
  function getOne(id){return window.FB_ORGANIZER_DATA?.getAlbum?.(id)||null}
  async function save(album){return window.FB_ORGANIZER_DATA?.saveAlbum?.(album)}
  async function remove(id){return window.FB_ORGANIZER_DATA?.deleteAlbum?.(id)}
  function idsForMemory(memoryId){return getAll().filter(a=>(a.memoryIds||[]).includes(memoryId)).map(a=>a.id)}
  function countForMemory(memoryId){return idsForMemory(memoryId).length}

  function pageShell(){
    return `<section class="albums-page"><div class="albums-head"><div><p class="eyebrow">${e((window.familyLabel?.()||"Family").toUpperCase())}</p><h1>Family Albums</h1><p>Build albums from existing Memories or upload photos directly into an album.</p></div><div class="albums-head-actions"><button class="secondary" data-r="memories"><i data-lucide="images"></i>Memories</button><button class="primary" data-r="new-album"><i data-lucide="folder-plus"></i>New album</button></div></div><div id="albumLibrary" class="album-loading">Loading albums…</div></section>`;
  }
  function editorShell(id=""){
    return `<section class="album-editor-page" data-album-editor-id="${e(id)}"><button class="back-link" data-r="albums"><i data-lucide="arrow-left"></i>Back to albums</button><div id="albumEditorMount" class="album-loading">Opening album editor…</div></section>`;
  }
  function detailShell(id){
    return `<section class="album-detail-page" data-album-detail-id="${e(id)}"><button class="back-link" data-r="albums"><i data-lucide="arrow-left"></i>Back to albums</button><div id="albumDetailMount" class="album-loading">Opening album…</div></section>`;
  }

  function canvasBlob(source,width,height,max,quality){
    const scale=Math.min(1,max/Math.max(width,height));
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;
    const ctx=c.getContext("2d",{alpha:false});ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(source,0,0,w,h);
    return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("Could not prepare this photo.")),"image/webp",quality));
  }

  async function preparePhoto(file){
    if(!file?.type?.startsWith("image/"))throw new Error("Albums currently accept photos only.");
    let bitmap=null,source=null,width=0,height=0;
    if("createImageBitmap" in window){
      try{
        bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
        source=bitmap;width=bitmap.width;height=bitmap.height;
      }catch(_){}
    }
    if(!source){
      const url=URL.createObjectURL(file);
      try{
        const img=await new Promise((resolve,reject)=>{
          const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error("This photo could not be opened."));im.src=url;
        });
        source=img;width=img.naturalWidth;height=img.naturalHeight;
      }finally{URL.revokeObjectURL(url)}
    }
    if(!width||!height)throw new Error("This photo has no readable dimensions.");
    const image=await canvasBlob(source,width,height,1800,.80);
    const thumb=await canvasBlob(source,width,height,540,.72);
    if(bitmap)bitmap.close();
    return {image,thumb,width,height,name:file.name||"album-photo"};
  }

  async function prepareFiles(files,onProgress){
    const list=[...(files||[])].filter(f=>f.type?.startsWith("image/"));
    if(!list.length)throw new Error("Choose at least one photo.");
    const out=[];
    for(let i=0;i<list.length;i++){
      onProgress?.(i,list.length,list[i].name);
      out.push(await preparePhoto(list[i]));
    }
    onProgress?.(list.length,list.length,"");
    return out;
  }

  async function coverData(album,byId,limit=4){
    const out=[];
    for(const md of (album.media||[])){
      const u=md.thumb||md.image;
      if(u)out.push({url:u,caption:md.name||"Album photo"});
      if(out.length>=limit)return out;
    }
    for(const id of (album.memoryIds||[])){
      const m=byId[id];if(!m)continue;
      const p=window.FB_MEMORIES?.getPhotos?.(m)?.[0];
      if(p){const u=blobUrl(p.thumb||p.image);if(u)out.push({url:u,caption:m.caption||"Family memory"})}
      if(out.length>=limit)break;
    }
    return out;
  }

  function collageHtml(photos){
    if(!photos.length)return `<span class="album-empty-cover"><i data-lucide="images"></i></span>`;
    return `<span class="album-collage count-${Math.min(photos.length,4)}">${photos.map(p=>`<img src="${p.url}" alt="${e(p.caption)}">`).join("")}</span>`;
  }

  async function refreshOrganizer(){
    try{await window.FB_ORGANIZER_DATA?.load?.()}catch(err){console.warn("Album refresh:",err)}
  }

  async function mountLibrary(){
    cleanup();const mount=document.querySelector('#albumLibrary');if(!mount)return;
    await refreshOrganizer();
    const albums=getAll(),memories=await window.FB_MEMORIES.getAll(),byId=Object.fromEntries(memories.map(m=>[m.id,m]));
    if(!albums.length){
      mount.className='album-empty-state';
      mount.innerHTML=`<i data-lucide="folder-heart"></i><h2>Create your first family album</h2><p>Upload photos directly, add existing Memories, or combine both.</p><button class="primary" data-r="new-album"><i data-lucide="folder-plus"></i>Create album</button>`;
      bindRoutes();window.icons?.();return;
    }
    const cards=[];
    for(const a of albums){
      const photos=await coverData(a,byId,4);
      const validMemories=(a.memoryIds||[]).filter(id=>byId[id]).length,total=(a.media||[]).length+validMemories;
      cards.push(`<button class="album-card" data-r="album:${e(a.id)}"><span class="album-card-cover">${collageHtml(photos)}</span><span class="album-card-copy"><strong>${e(a.name)}</strong><small>${total} ${total===1?'item':'items'}</small>${a.description?`<span>${e(a.description)}</span>`:''}</span></button>`);
    }
    mount.className='album-grid';mount.innerHTML=cards.join('');bindRoutes();window.icons?.();
  }

  function pendingHtml(files){
    if(!files.length)return `<small>No new photos selected yet.</small>`;
    return `<div class="album-pending-list">${files.map((f,i)=>`<span><i data-lucide="image"></i>${e(f.name||`Photo ${i+1}`)}</span>`).join("")}</div>`;
  }

  async function mountEditor(id=""){
    cleanup();const mount=document.querySelector('#albumEditorMount');if(!mount)return;
    await refreshOrganizer();
    const existing=id?getOne(id):null,memories=await window.FB_MEMORIES.getAll(),selected=new Set(existing?.memoryIds||[]);
    let stagedFiles=[];

    mount.className='album-editor-card';
    mount.innerHTML=`<div class="album-editor-heading"><p class="eyebrow">${existing?'EDIT ALBUM':'NEW ALBUM'}</p><h1>${existing?'Update family album':'Create family album'}</h1><p>Add new photos directly to this Album, choose existing Memories, or use both.</p></div><form id="albumForm">
      <label class="field"><span>Album name</span><input id="albumName" maxlength="80" required placeholder="e.g. Christmas 2026" value="${e(existing?.name||'')}"></label>
      <label class="field"><span>Description <small>optional</small></span><textarea id="albumDescription" maxlength="300" rows="3" placeholder="What is this album about?">${e(existing?.description||'')}</textarea></label>
      <section class="album-upload-panel">
        <div><strong>Upload new photos</strong><small>These photos stay in this Album and do not need to become Memories.</small></div>
        <button type="button" class="secondary" id="albumChoosePhotos"><i data-lucide="upload"></i>Choose photos</button>
        <input id="albumPhotoInput" type="file" accept="image/*" multiple hidden>
        <div id="albumPendingPhotos" class="album-pending">${pendingHtml(stagedFiles)}</div>
      </section>
      <div class="album-picker-head"><div><strong>Add existing Memories</strong><small id="albumSelectedCount">${selected.size} selected</small></div><label class="album-picker-search"><i data-lucide="search"></i><input id="albumMemorySearch" type="search" placeholder="Search Memories…"></label></div>
      <div class="album-memory-picker" id="albumMemoryPicker"></div>
      <div class="album-form-actions"><button type="button" class="secondary" data-r="albums">Cancel</button><button type="submit" class="primary"><i data-lucide="check"></i>${existing?'Save changes':'Create album'}</button></div>
    </form>`;

    const picker=mount.querySelector('#albumMemoryPicker'),search=mount.querySelector('#albumMemorySearch'),count=mount.querySelector('#albumSelectedCount');
    const fileInput=mount.querySelector('#albumPhotoInput'),pending=mount.querySelector('#albumPendingPhotos');

    mount.querySelector('#albumChoosePhotos').onclick=()=>fileInput.click();
    fileInput.onchange=()=>{
      stagedFiles=[...stagedFiles,...[...(fileInput.files||[])]].filter(f=>f.type?.startsWith("image/")).slice(0,30);
      pending.innerHTML=pendingHtml(stagedFiles);window.icons?.();fileInput.value="";
    };

    function renderPicker(){
      cleanup();const q=(search?.value||'').trim().toLowerCase(),rows=memories.filter(m=>!q||`${m.caption||''} ${m.date||''}`.toLowerCase().includes(q));
      if(!rows.length){
        picker.innerHTML=`<div class="album-picker-empty"><i data-lucide="image-off"></i><span>${memories.length?'No Memories match your search.':'No Memories yet — you can still upload photos directly above.'}</span></div>`;
        window.icons?.();return;
      }
      picker.innerHTML=rows.map(m=>{
        const p=window.FB_MEMORIES.getPhotos(m)?.[0],u=p?blobUrl(p.thumb||p.image):'';
        return `<label class="album-memory-choice"><input type="checkbox" value="${e(m.id)}" ${selected.has(m.id)?'checked':''}><span class="album-memory-thumb ${p?.kind==="video"?"has-video":""}">${u?`<img src="${u}" alt="">`:`<i data-lucide="image"></i>`}${p?.kind==="video"?`<b><i data-lucide="play"></i></b>`:""}</span><span class="album-memory-choice-copy"><strong>${e(m.caption||'Family memory')}</strong><small>${e(m.date||'Date unknown')}</small></span><i class="album-choice-check" data-lucide="check"></i></label>`;
      }).join('');
      picker.querySelectorAll('input[type="checkbox"]').forEach(box=>box.onchange=()=>{
        box.checked?selected.add(box.value):selected.delete(box.value);
        if(count)count.textContent=`${selected.size} selected`;
      });
      window.icons?.();
    }

    search?.addEventListener('input',renderPicker);renderPicker();bindRoutes();window.icons?.();

    mount.querySelector('#albumForm').onsubmit=async ev=>{
      ev.preventDefault();
      const name=mount.querySelector('#albumName').value.trim();
      if(!name){mount.querySelector('#albumName').focus();return}
      const btn=mount.querySelector('#albumForm button[type="submit"]'),old=btn?.innerHTML;
      if(btn)btn.disabled=true;
      try{
        if(btn)btn.innerHTML=`<span class="memory-spinner small"></span>Saving album…`;
        const row=await save({
          id:existing?.id||crypto.randomUUID(),
          name,
          description:mount.querySelector('#albumDescription').value,
          memoryIds:[...selected]
        });

        if(stagedFiles.length){
          if(btn)btn.innerHTML=`<span class="memory-spinner small"></span>Preparing photos…`;
          const prepared=await prepareFiles(stagedFiles,(done,total)=>{
            if(btn)btn.innerHTML=`<span class="memory-spinner small"></span>Preparing ${Math.min(done+1,total)} of ${total}…`;
          });
          if(btn)btn.innerHTML=`<span class="memory-spinner small"></span>Uploading photos…`;
          await window.FB_ORGANIZER_DATA.uploadAlbumPhotos(row.id,prepared);
        }
        window.go?.(`album:${row.id}`);
      }catch(err){
        alert(err.message||"Could not save this album.");
      }finally{
        if(btn){btn.disabled=false;btn.innerHTML=old||"Save"}
        window.icons?.();
      }
    };
  }

  function openPhotoViewer(media){
    document.querySelector('.album-photo-viewer')?.remove();
    const d=document.createElement('div');d.className='album-photo-viewer';
    d.innerHTML=`<div class="album-photo-viewer-card"><button class="album-viewer-close" type="button" aria-label="Close"><i data-lucide="x"></i></button><img src="${media.image}" alt="${e(media.name||'Album photo')}"><small>${e(media.name||'Album photo')}</small></div>`;
    document.body.appendChild(d);window.icons?.();
    const close=()=>d.remove();
    d.querySelector('.album-viewer-close').onclick=close;
    d.onclick=ev=>{if(ev.target===d)close()};
  }

  async function uploadFromDetail(albumId,files,button){
    const list=[...(files||[])].filter(f=>f.type?.startsWith("image/"));
    if(!list.length)return;
    const old=button.innerHTML;button.disabled=true;
    try{
      const prepared=await prepareFiles(list,(done,total)=>{
        button.innerHTML=`<span class="memory-spinner small"></span>Preparing ${Math.min(done+1,total)} of ${total}…`;
      });
      button.innerHTML=`<span class="memory-spinner small"></span>Uploading…`;
      await window.FB_ORGANIZER_DATA.uploadAlbumPhotos(albumId,prepared);
      await mountDetail(albumId);
    }catch(err){
      alert(err.message||"Could not upload Album photos.");
      button.disabled=false;button.innerHTML=old;window.icons?.();
    }
  }

  async function mountDetail(id){
    cleanup();const mount=document.querySelector('#albumDetailMount');if(!mount)return;
    await refreshOrganizer();
    const album=getOne(id);
    if(!album){
      mount.className='album-empty-state';mount.innerHTML=`<i data-lucide="folder-x"></i><h2>Album not found</h2><button class="secondary" data-r="albums">Back to albums</button>`;
      bindRoutes();window.icons?.();return;
    }

    const all=await window.FB_MEMORIES.getAll(),byId=Object.fromEntries(all.map(m=>[m.id,m])),memories=(album.memoryIds||[]).map(mid=>byId[mid]).filter(Boolean);
    const cover=await coverData(album,byId,4),total=(album.media||[]).length+memories.length;

    mount.className='album-detail-card';
    mount.innerHTML=`<div class="album-detail-hero">${collageHtml(cover)}<div class="album-detail-overlay"><p class="eyebrow">FAMILY ALBUM</p><h1>${e(album.name)}</h1><p>${e(album.description||`${total} ${total===1?'item':'items'} in this album`)}</p></div></div>
      <div class="album-detail-toolbar"><span><i data-lucide="images"></i>${total} ${total===1?'item':'items'}</span><div>
        <button class="primary" id="albumUploadMore"><i data-lucide="upload"></i>Upload photos</button>
        <input id="albumUploadInput" type="file" accept="image/*" multiple hidden>
        <button class="secondary" data-r="edit-album:${e(album.id)}"><i data-lucide="pencil"></i>Edit album</button>
        <button class="album-delete" id="deleteAlbum"><i data-lucide="trash-2"></i>Delete</button>
      </div></div>
      <div id="albumMemoryGrid" class="album-memory-grid"></div>`;

    const grid=mount.querySelector('#albumMemoryGrid');
    const direct=(album.media||[]).map(md=>`<article class="album-memory-card album-direct-card">
      <button class="album-direct-image" type="button" data-album-photo="${e(md.id)}"><span>${md.thumb||md.image?`<img src="${md.thumb||md.image}" alt="${e(md.name||'Album photo')}">`:`<i data-lucide="image"></i>`}</span><strong>${e(md.name||'Album photo')}</strong><small>Uploaded photo</small></button>
      <button class="album-photo-remove" type="button" data-remove-album-photo="${e(md.id)}" aria-label="Remove photo"><i data-lucide="trash-2"></i></button>
    </article>`);

    const linked=memories.map(m=>{
      const p=window.FB_MEMORIES.getPhotos(m)?.[0],u=p?blobUrl(p.thumb||p.image):'';
      return `<button class="album-memory-card" data-r="view-memory:${e(m.id)}"><span class="${p?.kind==="video"?"has-video":""}">${u?`<img src="${u}" alt="${e(m.caption||'Family memory')}">`:`<i data-lucide="image"></i>`}${p?.kind==="video"?`<b><i data-lucide="play"></i></b>`:""}</span><strong>${e(m.caption||'Family memory')}</strong><small>${e(m.date||'Date unknown')} · Memory</small></button>`;
    });

    if(!direct.length&&!linked.length){
      grid.innerHTML=`<div class="album-detail-empty"><i data-lucide="images"></i><h2>This album is empty</h2><p>Upload photos directly or add existing Memories.</p><div class="album-empty-actions"><button class="primary" id="albumEmptyUpload"><i data-lucide="upload"></i>Upload photos</button><button class="secondary" data-r="edit-album:${e(album.id)}">Add Memories</button></div></div>`;
    }else grid.innerHTML=[...direct,...linked].join('');

    bindRoutes();window.icons?.();

    const uploadBtn=mount.querySelector('#albumUploadMore'),uploadInput=mount.querySelector('#albumUploadInput');
    uploadBtn.onclick=()=>uploadInput.click();
    uploadInput.onchange=()=>uploadFromDetail(album.id,uploadInput.files,uploadBtn);
    mount.querySelector('#albumEmptyUpload')?.addEventListener('click',()=>uploadInput.click());

    mount.querySelectorAll('[data-album-photo]').forEach(btn=>btn.onclick=()=>{
      const md=(album.media||[]).find(x=>x.id===btn.dataset.albumPhoto);
      if(md)openPhotoViewer(md);
    });

    mount.querySelectorAll('[data-remove-album-photo]').forEach(btn=>btn.onclick=async()=>{
      const md=(album.media||[]).find(x=>x.id===btn.dataset.removeAlbumPhoto);
      if(!md||!confirm('Remove this uploaded photo from the Album?'))return;
      btn.disabled=true;
      try{
        await window.FB_ORGANIZER_DATA.deleteAlbumMedia(md.id);
        await mountDetail(album.id);
      }catch(err){
        alert(err.message||"Could not remove this Album photo.");
        btn.disabled=false;
      }
    });

    mount.querySelector('#deleteAlbum').onclick=async()=>{
      if(!confirm(`Delete the album “${album.name}”? Linked Memories themselves will not be deleted.`))return;
      const btn=mount.querySelector('#deleteAlbum');btn.disabled=true;
      try{await remove(album.id);window.go?.('albums')}
      catch(err){alert(err.message||"Could not delete this album.");btn.disabled=false}
    };
  }

  function bindRoutes(){document.querySelectorAll('#screen [data-r]').forEach(b=>b.onclick=()=>window.go?.(b.dataset.r))}
  async function bindRoute(r){
    if(r==='albums')return mountLibrary();
    if(r==='new-album')return mountEditor('');
    if(r.startsWith('edit-album:'))return mountEditor(r.split(':')[1]);
    if(r.startsWith('album:'))return mountDetail(r.split(':')[1]);
  }

  window.FB_ALBUMS={pageShell,editorShell,detailShell,bindRoute,getAll,getOne,save,remove,idsForMemory,countForMemory};
})();
