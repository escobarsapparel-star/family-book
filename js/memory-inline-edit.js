(()=>{
  if(window.__fbMemoryInlineEdit)return;
  window.__fbMemoryInlineEdit=true;

  const api=window.FB_MEMORIES;
  const client=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  if(!api?.getOne||!api?.getPhotos)return;

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const initials=name=>{
    const p=String(name||"Family").trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase();
  };
  const extForMime=(type,kind="image")=>{
    const t=String(type||"").toLowerCase();
    if(t==="image/webp")return "webp";
    if(t==="image/png")return "png";
    if(t==="image/jpeg"||t==="image/jpg")return "jpg";
    if(t==="video/webm")return "webm";
    if(t==="video/quicktime")return "mov";
    if(t==="video/mp4")return "mp4";
    return kind==="video"?"mp4":"jpg";
  };

  function canvasBlob(source,width,height,max,quality,mime="image/jpeg"){
    const scale=Math.min(1,max/Math.max(width,height));
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;
    const ctx=c.getContext("2d",{alpha:false});ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(source,0,0,w,h);
    return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("Could not prepare this photo.")),mime,quality));
  }

  async function prepareImage(file){
    let source=null,bitmap=null,width=0,height=0,url="";
    if("createImageBitmap" in window){
      try{bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});source=bitmap;width=bitmap.width;height=bitmap.height}catch(_){ }
    }
    if(!source){
      url=URL.createObjectURL(file);
      try{
        source=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("This image could not be opened."));img.src=url});
        width=source.naturalWidth;height=source.naturalHeight;
      }finally{URL.revokeObjectURL(url)}
    }
    if(!width||!height)throw new Error("This image has no readable dimensions.");
    const image=await canvasBlob(source,width,height,1800,.80,"image/webp");
    const thumb=await canvasBlob(source,width,height,540,.72,"image/webp");
    bitmap?.close?.();
    return {id:crypto.randomUUID(),kind:"image",image,thumb,meta:{name:file.name||"photo",type:image.type,size:image.size,width,height}};
  }

  function videoThumbBlob(video,width,height,max=720,quality=.8){
    const scale=Math.min(1,max/Math.max(width,height));
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;
    const ctx=c.getContext("2d");ctx.fillStyle="#20251f";ctx.fillRect(0,0,w,h);
    try{ctx.drawImage(video,0,0,w,h)}catch(_){}
    return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("Could not create a video preview.")),"image/jpeg",quality));
  }

  async function prepareVideo(file){
    if(file.size>50*1024*1024)throw new Error("That video is larger than 50 MB. Choose a shorter or smaller clip.");
    const url=URL.createObjectURL(file),video=document.createElement("video");
    video.preload="metadata";video.muted=true;video.playsInline=true;video.src=url;
    try{
      await new Promise((resolve,reject)=>{video.addEventListener("loadedmetadata",resolve,{once:true});video.addEventListener("error",()=>reject(new Error("This video could not be opened.")),{once:true})});
      const width=video.videoWidth||1280,height=video.videoHeight||720,duration=Number(video.duration)||0;
      if(duration>0){
        video.currentTime=Math.min(Math.max(.1,duration*.08),2);
        await new Promise(resolve=>{const done=()=>resolve();video.addEventListener("seeked",done,{once:true});setTimeout(done,1200)});
      }
      const thumb=await videoThumbBlob(video,width,height);
      return {id:crypto.randomUUID(),kind:"video",image:file,thumb,meta:{name:file.name||"video",type:file.type||"video/mp4",size:file.size,width,height,duration}};
    }finally{URL.revokeObjectURL(url);video.removeAttribute("src");video.load()}
  }

  async function prepareFile(file){
    if(file.type?.startsWith("video/"))return prepareVideo(file);
    if(file.type?.startsWith("image/"))return prepareImage(file);
    throw new Error("Please choose a photo or video file.");
  }

  async function uploadObject(path,blob){
    await window.FB_MEDIA.upload(path,blob,{contentType:blob.type||"application/octet-stream",upsert:false,cacheControl:"3600"});
    return path;
  }

  async function uploadMedia(memoryId,item,index){
    const u=auth(),meta=item.meta||{};
    if(meta.storagePath){
      return {media_type:item.kind==="video"?"video":"image",storage_path:meta.storagePath,thumbnail_path:meta.thumbnailPath||null,original_filename:meta.name||null,mime_type:meta.type||null,width:meta.width==null?null:Number(meta.width),height:meta.height==null?null:Number(meta.height),duration_seconds:meta.duration==null?null:Number(meta.duration),sort_order:index};
    }
    if(!u.familyId||!u.supabaseUserId)throw new Error("Your Family Book session is not ready.");
    if(!(item.image instanceof Blob))throw new Error("One of the selected media files is no longer available.");
    const token=crypto.randomUUID();
    const fullPath=`${u.familyId}/${u.supabaseUserId}/memories/${memoryId}/${token}.${extForMime(item.image.type,item.kind)}`;
    const uploaded=[await uploadObject(fullPath,item.image)];
    let thumbPath=null;
    try{
      if(item.thumb instanceof Blob){
        thumbPath=`${u.familyId}/${u.supabaseUserId}/thumbnails/${memoryId}/${token}.${extForMime(item.thumb.type,"image")}`;
        uploaded.push(await uploadObject(thumbPath,item.thumb));
      }
    }catch(err){await window.FB_MEDIA.remove(uploaded,{silent:true});throw err}
    return {row:{media_type:item.kind==="video"?"video":"image",storage_path:fullPath,thumbnail_path:thumbPath,original_filename:meta.name||null,mime_type:item.image.type||meta.type||null,width:meta.width==null?null:Number(meta.width),height:meta.height==null?null:Number(meta.height),duration_seconds:meta.duration==null?null:Number(meta.duration),sort_order:index},uploaded};
  }

  async function saveMemory(m,caption,tags,items){
    if(!client())throw new Error("Family Book is not connected yet.");
    const oldPaths=[];
    api.getPhotos(m).forEach(p=>{if(p.meta?.storagePath)oldPaths.push(p.meta.storagePath);if(p.meta?.thumbnailPath)oldPaths.push(p.meta.thumbnailPath)});
    const uploadedNow=[],media=[];
    try{
      for(let i=0;i<items.length;i++){
        const result=await uploadMedia(m.id,items[i],i);
        if(result?.row){media.push(result.row);(result.uploaded||[]).forEach(p=>uploadedNow.push(p))}else media.push(result);
      }
      const finalPaths=new Set();media.forEach(r=>{if(r.storage_path)finalPaths.add(r.storage_path);if(r.thumbnail_path)finalPaths.add(r.thumbnail_path)});
      const {error}=await client().rpc("save_family_memory",{p_memory_id:m.id,p_caption:caption||null,p_story:m.story||null,p_memory_date:m.date||null,p_memory_time:m.time||null,p_date_source:m.dateSource||"manual",p_media:media,p_tag_person_ids:tags});
      if(error)throw new Error(error.message||"Could not save this memory.");
      const removed=oldPaths.filter(p=>!finalPaths.has(p));
      if(removed.length)await window.FB_MEDIA.remove(removed,{silent:true});
      await api.refresh?.();
    }catch(err){if(uploadedNow.length)await window.FB_MEDIA.remove(uploadedNow,{silent:true});throw err}
  }

  function previewUrl(item,urls){
    const value=item.thumb||item.image;
    if(typeof value==="string")return value;
    if(value instanceof Blob){const url=URL.createObjectURL(value);urls.push(url);return url}
    return "";
  }

  async function openInline(id){
    const page=document.querySelector(`.memory-detail-page[data-memory-detail-id="${CSS.escape(String(id))}"]`);
    const mount=page?.querySelector("#memoryDetailMount.memory-detail-card");
    if(!mount||mount.classList.contains("memory-inline-editing"))return;
    const m=await api.getOne(id).catch(()=>null);if(!m)return;
    if(m.canEdit===false){alert("You do not have permission to edit this memory.");return}

    const copy=mount.querySelector(".memory-detail-copy"),intro=copy?.querySelector(".memory-detail-intro");
    if(!copy||!intro)return;
    const members=window.ensureOwner?.()||[];
    let items=api.getPhotos(m).map(p=>({...p,meta:{...(p.meta||{})}}));
    const urls=[];

    const editor=document.createElement("section");
    editor.className="memory-inline-editor";
    editor.innerHTML=`
      <div class="memory-inline-editor-head"><div><strong>Edit memory</strong><small>Update the details without leaving this memory.</small></div><button type="button" class="memory-inline-close" aria-label="Cancel editing"><i data-lucide="x"></i></button></div>
      <label class="memory-inline-field"><span>Caption / story</span><textarea id="memoryInlineCaption" maxlength="800" rows="4" placeholder="What was happening in this moment?">${esc(m.caption||"")}</textarea></label>
      <fieldset class="memory-inline-people"><legend>People in this memory <small>(optional)</small></legend><div class="memory-inline-person-grid">${members.map(person=>`<label class="memory-inline-person ${person.profileType==="history"?"history":""}"><input type="checkbox" value="${esc(person.id)}" ${(m.tags||[]).includes(person.id)?"checked":""}><span class="memory-inline-avatar">${person.photo?`<img src="${esc(person.photo)}" alt="">`:esc(initials(person.name))}</span><span class="memory-inline-person-name">${esc(person.name)}${person.profileType==="history"?`<small>Family history</small>`:""}</span><i data-lucide="check"></i></label>`).join("")}</div></fieldset>
      <section class="memory-inline-media"><div class="memory-inline-media-head"><div><strong>Media</strong><small>Keep, add or remove photos and videos.</small></div><div class="memory-inline-media-actions"><button type="button" data-pick="gallery"><i data-lucide="images"></i><span>Add</span></button><button type="button" data-pick="camera"><i data-lucide="camera"></i><span>Photo</span></button><button type="button" data-pick="video"><i data-lucide="video"></i><span>Video</span></button></div></div><div class="memory-inline-media-grid" id="memoryInlineMediaGrid"></div><input id="memoryInlineGallery" type="file" accept="image/*,video/*" multiple hidden><input id="memoryInlineCamera" type="file" accept="image/*" capture="environment" hidden><input id="memoryInlineVideo" type="file" accept="video/*" capture="environment" hidden><p class="memory-inline-status hidden" id="memoryInlineStatus">Preparing media…</p></section>
      ${m.date?`<div class="memory-inline-capture"><i data-lucide="scan-line"></i><div><strong>Original capture</strong><span>${esc(m.date)}${m.time?` · ${esc(String(m.time).slice(0,5))}`:""}</span></div></div>`:""}
      <div class="memory-inline-actions"><button type="button" class="memory-inline-cancel">Cancel</button><button type="button" class="memory-inline-save"><i data-lucide="check"></i>Save changes</button></div>`;

    intro.insertAdjacentElement("afterend",editor);
    mount.classList.add("memory-inline-editing");

    const grid=editor.querySelector("#memoryInlineMediaGrid");
    const status=editor.querySelector("#memoryInlineStatus");
    const renderMedia=()=>{
      urls.splice(0).forEach(u=>URL.revokeObjectURL(u));
      grid.innerHTML=items.map((item,index)=>`<div class="memory-inline-media-item ${item.kind==="video"?"video":""}"><img src="${esc(previewUrl(item,urls))}" alt="Memory media ${index+1}">${item.kind==="video"?'<span class="memory-inline-video-mark"><i data-lucide="play"></i></span>':""}<button type="button" data-remove-media="${index}" aria-label="Remove media"><i data-lucide="x"></i></button>${index===0?'<span class="memory-inline-cover">Cover</span>':""}</div>`).join("");
      grid.querySelectorAll("[data-remove-media]").forEach(btn=>btn.onclick=()=>{if(items.length<=1){alert("A memory needs at least one photo or video.");return}items.splice(Number(btn.dataset.removeMedia),1);renderMedia()});
      window.icons?.();
    };
    renderMedia();

    async function addFiles(files){
      const list=[...(files||[])].filter(f=>f.type?.startsWith("image/")||f.type?.startsWith("video/"));if(!list.length)return;
      status.classList.remove("hidden");
      try{for(const file of list)items.push(await prepareFile(file));renderMedia()}catch(err){alert(err.message||"Could not prepare that media.")}finally{status.classList.add("hidden")}
    }

    const gallery=editor.querySelector("#memoryInlineGallery"),camera=editor.querySelector("#memoryInlineCamera"),video=editor.querySelector("#memoryInlineVideo");
    editor.querySelector('[data-pick="gallery"]').onclick=()=>gallery.click();
    editor.querySelector('[data-pick="camera"]').onclick=()=>camera.click();
    editor.querySelector('[data-pick="video"]').onclick=()=>video.click();
    gallery.onchange=e=>{addFiles(e.target.files);e.target.value=""};camera.onchange=e=>{addFiles(e.target.files);e.target.value=""};video.onchange=e=>{addFiles(e.target.files);e.target.value=""};

    const cleanup=()=>{urls.forEach(u=>URL.revokeObjectURL(u));mount.classList.remove("memory-inline-editing");editor.remove();window.icons?.()};
    editor.querySelector(".memory-inline-close").onclick=cleanup;
    editor.querySelector(".memory-inline-cancel").onclick=cleanup;
    editor.querySelector(".memory-inline-save").onclick=async()=>{
      const btn=editor.querySelector(".memory-inline-save"),old=btn.innerHTML;btn.disabled=true;btn.textContent="Saving…";
      try{
        const caption=editor.querySelector("#memoryInlineCaption").value.trim();
        const tags=[...editor.querySelectorAll('.memory-inline-person input:checked')].map(x=>x.value);
        await saveMemory(m,caption,tags,items);
        urls.forEach(u=>URL.revokeObjectURL(u));
        await api.bindRoute?.(`view-memory:${m.id}`);
      }catch(err){alert(err.message||"Could not save this memory.");btn.disabled=false;btn.innerHTML=old;window.icons?.()}
    };
    window.icons?.();
  }

  document.addEventListener("click",event=>{
    const trigger=event.target?.closest?.('.memory-detail-page [data-r^="edit-memory:"]');
    if(!trigger)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    const id=String(trigger.dataset.r||"").slice("edit-memory:".length);
    if(id)openInline(id);
  },true);

  window.FB_MEMORY_INLINE_EDIT={open:openInline};
})();