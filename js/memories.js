(function(){
  let cloudCache=null;
  let cloudCacheAt=0;
  let cloudFamilyId="";
  let objectUrls=[];

  const client=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};

  function e(v=""){
    return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  }
  function familyKey(){
    if(window.FB_AUTH?.familyStorageKey)return window.FB_AUTH.familyStorageKey();
    const u=auth();
    const raw=(u.family||window.FB_DATA?.family||"family").trim().toLowerCase();
    return raw.replace(/^the\s+/i,"").replace(/(?:\s+family)+$/i,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")||"family";
  }

  function memorySortValue(m){
    if(m.date){
      const t=Date.parse(`${m.date}T${String(m.time||"00:00").slice(0,5)}:00`);
      if(Number.isFinite(t))return t;
    }
    return Number(m.createdAt)||0;
  }

  function invalidateCloud(){
    cloudCache=null;
    cloudCacheAt=0;
  }

  async function signedUrlMap(paths){
    return window.FB_MEDIA.signedUrlMap(paths,60*60*2);
  }

  async function loadCloud(force=false){
    const u=auth();
    if(!u.familyId)return [];
    const fresh=cloudCache && cloudFamilyId===u.familyId && (Date.now()-cloudCacheAt)<45*60*1000;
    if(!force&&fresh)return cloudCache;

    const {data,error}=await client().rpc("get_family_memories_bundle");
    if(error)throw new Error(error.message||"Could not load family memories.");

    const memories=Array.isArray(data?.memories)?data.memories:[];
    const media=Array.isArray(data?.media)?data.media:[];
    const tags=Array.isArray(data?.tags)?data.tags:[];

    const allPaths=[];
    media.forEach(row=>{
      if(row.storage_path)allPaths.push(row.storage_path);
      if(row.thumbnail_path)allPaths.push(row.thumbnail_path);
    });
    const urls=await signedUrlMap(allPaths);

    const mediaByMemory={};
    media.forEach(row=>{
      const mid=String(row.memory_id);
      const meta={
        cloudMediaId:String(row.id||""),
        storagePath:row.storage_path||"",
        thumbnailPath:row.thumbnail_path||"",
        name:row.original_filename||"",
        type:row.mime_type||"",
        width:row.width==null?null:Number(row.width),
        height:row.height==null?null:Number(row.height),
        duration:row.duration_seconds==null?null:Number(row.duration_seconds)
      };
      (mediaByMemory[mid]??=[]).push({
        id:String(row.id),
        kind:row.media_type==="video"?"video":"image",
        image:urls.get(row.storage_path)||"",
        thumb:urls.get(row.thumbnail_path)||urls.get(row.storage_path)||"",
        sortOrder:Number(row.sort_order)||0,
        meta
      });
    });
    Object.values(mediaByMemory).forEach(rows=>rows.sort((a,b)=>a.sortOrder-b.sortOrder));

    const tagsByMemory={};
    tags.forEach(row=>(tagsByMemory[String(row.memory_id)]??=[]).push(String(row.person_id)));

    const members=window.ensureOwner?.()||[];
    const byId=Object.fromEntries(members.map(m=>[m.id,m]));

    cloudCache=memories.map(row=>{
      const authorId=row.created_by_person_id?String(row.created_by_person_id):"";
      const author=byId[authorId]||{};
      return {
        id:String(row.id),
        familyKey:familyKey(),
        photos:mediaByMemory[String(row.id)]||[],
        date:row.memory_date||"",
        time:row.memory_time?String(row.memory_time).slice(0,5):"",
        dateSource:row.date_source||"manual",
        caption:row.caption||row.story||"",
        story:row.story||"",
        tags:tagsByMemory[String(row.id)]||[],
        photoMeta:(mediaByMemory[String(row.id)]||[])[0]?.meta||{},
        authorId,
        authorName:author.name||"Family member",
        authorPhoto:author.photo||"",
        canEdit:row.can_edit!==false,
        createdAt:row.created_at?new Date(row.created_at).getTime():0,
        updatedAt:row.updated_at?new Date(row.updated_at).getTime():0
      };
    }).sort((a,b)=>memorySortValue(b)-memorySortValue(a));

    cloudFamilyId=u.familyId;
    cloudCacheAt=Date.now();
    return cloudCache;
  }

  async function getAll(){return loadCloud(false)}
  async function getOne(id){
    const list=await loadCloud(false);
    return list.find(m=>m.id===String(id))||null;
  }

  function extForMime(type,kind="image"){
    const t=String(type||"").toLowerCase();
    if(t==="image/webp")return "webp";
    if(t==="image/png")return "png";
    if(t==="image/jpeg"||t==="image/jpg")return "jpg";
    if(t==="video/webm")return "webm";
    if(t==="video/quicktime")return "mov";
    if(t==="video/mp4")return "mp4";
    return kind==="video"?"mp4":"jpg";
  }

  async function uploadObject(path,blob){
    await window.FB_MEDIA.upload(path,blob,{
      contentType:blob.type||"application/octet-stream",
      upsert:false,
      cacheControl:"3600"
    });
    return path;
  }

  async function removeStorage(paths){
    await window.FB_MEDIA.remove(paths,{silent:true});
  }

  async function uploadMemoryMedia(memoryId,photo,index){
    const u=auth();
    if(!u.familyId||!u.supabaseUserId)throw new Error("Your Family Book session is not ready.");

    const meta=photo.meta||{};
    if(meta.storagePath){
      return {
        media_type:photo.kind==="video"?"video":"image",
        storage_path:meta.storagePath,
        thumbnail_path:meta.thumbnailPath||null,
        original_filename:meta.name||null,
        mime_type:meta.type||null,
        width:meta.width==null?null:Number(meta.width),
        height:meta.height==null?null:Number(meta.height),
        duration_seconds:meta.duration==null?null:Number(meta.duration),
        sort_order:index
      };
    }

    const full=photo.image;
    if(!(full instanceof Blob))throw new Error("One of the selected media files is no longer available.");

    const token=crypto.randomUUID();
    const fullExt=extForMime(full.type,photo.kind);
    const fullPath=`${u.familyId}/${u.supabaseUserId}/memories/${memoryId}/${token}.${fullExt}`;
    const uploaded=[await uploadObject(fullPath,full)];

    let thumbPath=null;
    try{
      if(photo.thumb instanceof Blob){
        const thumbExt=extForMime(photo.thumb.type,"image");
        thumbPath=`${u.familyId}/${u.supabaseUserId}/thumbnails/${memoryId}/${token}.${thumbExt}`;
        uploaded.push(await uploadObject(thumbPath,photo.thumb));
      }
    }catch(err){
      await removeStorage(uploaded);
      throw err;
    }

    return {
      media_type:photo.kind==="video"?"video":"image",
      storage_path:fullPath,
      thumbnail_path:thumbPath,
      original_filename:meta.name||null,
      mime_type:full.type||meta.type||null,
      width:meta.width==null?null:Number(meta.width),
      height:meta.height==null?null:Number(meta.height),
      duration_seconds:meta.duration==null?null:Number(meta.duration),
      sort_order:index,
      _new_paths:uploaded
    };
  }

  async function put(memory){
    const u=auth();
    if(!u.familyId)throw new Error("You are not connected to a Family Book family.");

    const id=String(memory.id||crypto.randomUUID());
    const existing=await getOne(id);
    const oldPaths=[];
    memoryPhotos(existing).forEach(p=>{
      if(p.meta?.storagePath)oldPaths.push(p.meta.storagePath);
      if(p.meta?.thumbnailPath)oldPaths.push(p.meta.thumbnailPath);
    });

    const photos=memoryPhotos(memory);
    if(!photos.length)throw new Error("Please add at least one photo or video.");

    const uploadedNow=[];
    let mediaPayload=[];
    try{
      for(let i=0;i<photos.length;i++){
        const row=await uploadMemoryMedia(id,photos[i],i);
        (row._new_paths||[]).forEach(p=>uploadedNow.push(p));
        delete row._new_paths;
        mediaPayload.push(row);
      }

      const finalPaths=new Set();
      mediaPayload.forEach(row=>{
        if(row.storage_path)finalPaths.add(row.storage_path);
        if(row.thumbnail_path)finalPaths.add(row.thumbnail_path);
      });

      const {error}=await client().rpc("save_family_memory",{
        p_memory_id:id,
        p_caption:memory.caption||null,
        p_story:memory.story||null,
        p_memory_date:memory.date||null,
        p_memory_time:memory.time||null,
        p_date_source:memory.dateSource||"manual",
        p_media:mediaPayload,
        p_tag_person_ids:(memory.tags||[])
      });
      if(error)throw new Error(error.message||"Could not save this memory.");

      const removedOld=oldPaths.filter(path=>!finalPaths.has(path));
      await removeStorage(removedOld);
      invalidateCloud();
      await loadCloud(true);
      return await getOne(id);
    }catch(err){
      await removeStorage(uploadedNow);
      throw err;
    }
  }

  async function remove(id){
    const existing=await getOne(id);
    if(!existing)return;

    const {data,error}=await client().rpc("delete_family_memory",{p_memory_id:id});
    if(error)throw new Error(error.message||"Could not delete this memory.");

    const paths=[
      ...((data?.storage_paths)||[]),
      ...((data?.thumbnail_paths)||[])
    ];
    await removeStorage(paths);
    invalidateCloud();
  }

  function cleanupUrls(){objectUrls.forEach(u=>URL.revokeObjectURL(u));objectUrls=[]}
  function blobUrl(blob){if(!blob)return "";if(typeof blob==="string")return blob;const u=URL.createObjectURL(blob);objectUrls.push(u);return u}
  function photoId(){return `pho_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}
  function memoryPhotos(m){
    if(Array.isArray(m?.photos)&&m.photos.length){
      return m.photos.filter(p=>p&&(p.image||p.thumb)).map((p,i)=>{
        const meta=p.meta||{},kind=p.kind||(String(meta.type||"").startsWith("video/")?"video":"image");
        return {id:p.id||`photo_${i}`,kind,image:p.image||p.thumb,thumb:p.thumb||p.image,meta};
      });
    }
    if(m?.image){return [{id:`legacy_${m.id||"memory"}`,kind:"image",image:m.image,thumb:m.thumb||m.image,meta:m.photoMeta||{}}]}
    return [];
  }

  function pageShell(){
    return `<section class="memories-page">
      <div class="memories-head"><div><p class="eyebrow">${e(window.familyLabel?.()||"FAMILY BOOK").toUpperCase()}</p><h1>Memories</h1><p>Keep the photos, video clips, people and stories that make your family yours.</p></div><div class="memory-head-actions"><button class="secondary" data-r="albums"><i data-lucide="folder-heart"></i><span>Albums</span></button><button class="primary memory-add-top" data-r="add-memory"><i data-lucide="image-plus"></i><span>Add memory</span></button></div></div>
      
      <section class="memory-filter-panel" id="memoryFilterPanel">
        <label class="memory-search-box"><i data-lucide="search"></i><input id="memorySearch" type="search" placeholder="Search captions, people or dates…" autocomplete="off"></label>
        <div class="memory-filter-selects">
          <label><span>Year</span><select id="memoryYearFilter"><option value="">All years</option></select></label>
          <label><span>Person</span><select id="memoryMemberFilter"><option value="">Everyone</option></select></label>
          <label><span>Album</span><select id="memoryAlbumFilter"><option value="">All albums</option></select></label>
          <button type="button" class="memory-clear-filters" id="memoryClearFilters"><i data-lucide="x"></i>Clear</button>
        </div>
        <small id="memoryResultCount"></small>
      </section>
      <div id="memoryLibrary" class="memory-library-loading"><span class="memory-spinner"></span><p>Opening your family memories…</p></div>
    </section>`;
  }
  function editorShell(id=""){
    return `<section class="memory-editor-page" data-memory-editor-id="${e(id)}">
      <button class="back-link" data-r="memories"><i data-lucide="arrow-left"></i>Back to memories</button>
      <div id="memoryEditorMount" class="memory-editor-loading"><span class="memory-spinner"></span><p>${id?"Opening memory…":"Preparing memory editor…"}</p></div>
    </section>`;
  }
  function detailShell(id){
    return `<section class="memory-detail-page" data-memory-detail-id="${e(id)}"><button class="back-link" data-r="memories"><i data-lucide="arrow-left"></i>Back to memories</button><div id="memoryDetailMount" class="memory-editor-loading"><span class="memory-spinner"></span><p>Opening memory…</p></div></section>`;
  }

  async function mountLibrary(){
    cleanupUrls();
    const el=document.querySelector("#memoryLibrary");if(!el)return;
    try{
      const list=await getAll();
      const members=window.ensureOwner?.()||[],byId=Object.fromEntries(members.map(m=>[m.id,m]));
      const search=document.querySelector("#memorySearch");
      const year=document.querySelector("#memoryYearFilter");
      const member=document.querySelector("#memoryMemberFilter");
      const album=document.querySelector("#memoryAlbumFilter");
      const clear=document.querySelector("#memoryClearFilters");
      const count=document.querySelector("#memoryResultCount");

      if(year){
        const years=[...new Set(list.map(m=>m.date?.slice(0,4)).filter(Boolean))].sort((a,b)=>Number(b)-Number(a));
        year.innerHTML=`<option value="">All years</option>${years.map(y=>`<option value="${e(y)}">${e(y)}</option>`).join("")}`;
      }
      if(member){
        const current=members.filter(m=>m.profileType!=="history"),history=members.filter(m=>m.profileType==="history");
        member.innerHTML=`<option value="">Everyone</option>${current.length?`<optgroup label="Current family">${current.map(m=>`<option value="${e(m.id)}">${e(m.name)}</option>`).join("")}</optgroup>`:""}${history.length?`<optgroup label="Family history">${history.map(m=>`<option value="${e(m.id)}">${e(m.name)}</option>`).join("")}</optgroup>`:""}`;
      }
      if(album){
        const albums=window.FB_ALBUMS?.getAll?.()||[];
        album.innerHTML=`<option value="">All albums</option>${albums.map(a=>`<option value="${e(a.id)}">${e(a.name)}</option>`).join("")}`;
      }

      function render(){
        cleanupUrls();
        const q=(search?.value||"").trim().toLowerCase();
        const yf=year?.value||"",mf=member?.value||"",af=album?.value||"";
        const selectedAlbum=af?window.FB_ALBUMS?.getOne?.(af):null;

        const filtered=list.filter(m=>{
          if(yf && !String(m.date||"").startsWith(`${yf}-`))return false;
          if(mf && !(m.tags||[]).includes(mf))return false;
          if(af && !(selectedAlbum?.memoryIds||[]).includes(m.id))return false;
          if(q){
            const names=(m.tags||[]).map(id=>byId[id]?.name||"").join(" ");
            const hay=[m.caption||"",m.date||"",m.time||"",formatDateTime(m.date,m.time),names].join(" ").toLowerCase();
            if(!hay.includes(q))return false;
          }
          return true;
        });

        if(count)count.textContent=list.length?`${filtered.length} of ${list.length} ${list.length===1?"memory":"memories"}`:"";

        if(!list.length){
          el.className="memory-empty-state";
          el.innerHTML=`<div class="memory-empty-art"><i data-lucide="images"></i><span><i data-lucide="heart"></i></span></div><p class="eyebrow">YOUR FAMILY STORY</p><h2>Add your first memory</h2><p>Choose family photos or video clips, tag the people in them and add the story behind the moment.</p><button class="primary" data-r="add-memory"><i data-lucide="images"></i>Add photos or videos</button>`;
        }else if(!filtered.length){
          el.className="memory-filter-empty";
          el.innerHTML=`<i data-lucide="search-x"></i><h2>No memories match</h2><p>Try another search, year, person or album.</p><button type="button" class="secondary" id="memoryEmptyClear">Clear filters</button>`;
          el.querySelector("#memoryEmptyClear")?.addEventListener("click",()=>{if(search)search.value="";if(year)year.value="";if(member)member.value="";if(album)album.value="";render()});
        }else{
          el.className="memory-gallery";
          el.innerHTML=filtered.map(m=>{
            const photos=memoryPhotos(m),cover=photos[0],url=cover?blobUrl(cover.thumb||cover.image):"",tags=(m.tags||[]).map(id=>byId[id]?.name).filter(Boolean);
            return `<button class="memory-card" data-r="view-memory:${e(m.id)}"><span class="memory-card-photo">${url?`<img src="${url}" alt="${e(m.caption||"Family memory")}">`:`<span class="memory-card-missing"><i data-lucide="image-off"></i></span>`}${cover?.kind==="video"?`<span class="memory-card-play"><i data-lucide="play"></i></span>`:""}${photos.length>1?`<span class="memory-photo-count"><i data-lucide="files"></i>${photos.length}</span>`:""}</span><span class="memory-card-copy"><small>${e(formatDateTime(m.date,m.time))}</small><strong>${e(m.caption||"Family memory")}</strong>${tags.length?`<span class="memory-card-tags"><i data-lucide="users-round"></i>${e(tags.slice(0,3).join(", "))}${tags.length>3?` +${tags.length-3}`:""}</span>`:""}</span></button>`;
          }).join("");
        }
        rebindRoutes();window.icons?.();
      }

      search?.addEventListener("input",render);
      year?.addEventListener("change",render);
      member?.addEventListener("change",render);
      album?.addEventListener("change",render);
      clear?.addEventListener("click",()=>{if(search)search.value="";if(year)year.value="";if(member)member.value="";if(album)album.value="";render()});
      render();
    }catch(err){
      el.className="memory-error";el.innerHTML=`<i data-lucide="circle-alert"></i><h3>Could not open Memories</h3><p>${e(err.message||"Something went wrong.")}</p>`;window.icons?.();
    }
  }

  async function mountEditor(id=""){
    cleanupUrls();
    const mount=document.querySelector("#memoryEditorMount");if(!mount)return;
    let existing=null;
    if(id){existing=await getOne(id);if(!existing){mount.innerHTML=`<div class="memory-error"><h3>Memory not found</h3><button class="primary" data-r="memories">Back to memories</button></div>`;rebindRoutes();return}}
    const members=window.ensureOwner?.()||[],currentMembers=members.filter(m=>m.profileType!=="history"),historyPeople=members.filter(m=>m.profileType==="history");
    mount.className="memory-editor-card";
    mount.innerHTML=`<div class="memory-editor-title"><div><p class="eyebrow">${id?"EDIT MEMORY":"NEW MEMORY"}</p><h1>${id?"Edit this memory":"Add a family memory"}</h1><p>Add photos, short video clips, or a mix from the same family moment. Family Book checks photo metadata when available, and you can change the date and time whenever you need to.</p></div><i data-lucide="images"></i></div>
      <form id="memoryForm" novalidate>
        <div class="memory-photo-section">
          <div id="memoryPhotoPreview" class="memory-photo-preview"></div>
          <div class="memory-photo-actions memory-media-actions"><button type="button" class="secondary" id="memoryGalleryBtn"><i data-lucide="images"></i>Add photos / videos</button><button type="button" class="secondary" id="memoryCameraBtn"><i data-lucide="camera"></i>Take photo</button><button type="button" class="secondary" id="memoryVideoBtn"><i data-lucide="video"></i>Record video</button><button type="button" class="memory-remove-all hidden" id="memoryRemoveAllBtn"><i data-lucide="trash-2"></i>Remove all</button></div>
          <input id="memoryGalleryInput" type="file" accept="image/*,video/*" multiple hidden><input id="memoryCameraInput" type="file" accept="image/*" capture="environment" hidden><input id="memoryVideoInput" type="file" accept="video/*" capture="environment" hidden>
          <div id="memoryProcessStatus" class="memory-process-status hidden"><span class="memory-spinner small"></span><span>Preparing media…</span></div>
          <p class="memory-video-note"><i data-lucide="video"></i>Video limit: 50 MB per clip. Photos are optimized automatically before private family upload.</p>
        </div>
        <div id="memoryMetaNote" class="memory-meta-note ${existing?.dateSource==="exif"?"detected":""}"><i data-lucide="${existing?.dateSource==="exif"?"scan-line":"info"}"></i><div><strong>${existing?.dateSource==="exif"?"Date detected from photo":"Photo date & time"}</strong><span>${existing?.dateSource==="exif"?"This came from image metadata. You can still edit it below.":"If metadata is available, Family Book will fill these fields automatically."}</span></div></div>
        <div class="memory-date-grid"><label>Date taken <span class="optional">(editable)</span><input id="memoryDate" type="date" value="${e(existing?.date||"")}"></label><label>Time taken <span class="optional">(optional)</span><input id="memoryTime" type="time" value="${e(existing?.time||"")}"></label></div>
        <label>Caption or story <span class="optional">(optional)</span><textarea id="memoryCaption" rows="4" maxlength="800" placeholder="What was happening in this moment?">${e(existing?.caption||"")}</textarea></label>
        <fieldset class="memory-tags"><legend>Tag people in this Memory <span class="optional">(optional)</span></legend><p>Tag current family or people from Family History. History tags connect old photos to their Family Tree profile and never create notifications for that person.</p>${currentMembers.length?`<div class="memory-tag-group"><strong>Current family</strong><div class="memory-tag-grid">${currentMembers.map(m=>tagChoice(m,(existing?.tags||[]).includes(m.id))).join("")}</div></div>`:""}${historyPeople.length?`<div class="memory-tag-group history-tag-group"><strong><i data-lucide="book-heart"></i>Family history</strong><div class="memory-tag-grid">${historyPeople.map(m=>tagChoice(m,(existing?.tags||[]).includes(m.id),true)).join("")}</div></div>`:""}${!members.length?`<span class="muted">Add family members or Family History profiles first to tag them here.</span>`:""}</fieldset>
        <div class="memory-form-actions"><button type="button" class="secondary" data-r="memories">Cancel</button><button type="submit" class="primary" id="memorySaveBtn"><i data-lucide="heart"></i>${id?"Save changes":"Save memory"}</button></div>
      </form>`;
    window.icons?.();rebindRoutes();

    let photos=memoryPhotos(existing).map(p=>({id:p.id||photoId(),kind:p.kind||"image",image:p.image,thumb:p.thumb||p.image,meta:p.meta||{}}));
    let dateSource=existing?.dateSource||"manual",dateAuto=!existing?.date;
    const preview=mount.querySelector("#memoryPhotoPreview"),status=mount.querySelector("#memoryProcessStatus"),statusText=status.querySelector("span:last-child"),metaNote=mount.querySelector("#memoryMetaNote"),dateInput=mount.querySelector("#memoryDate"),timeInput=mount.querySelector("#memoryTime"),removeAllBtn=mount.querySelector("#memoryRemoveAllBtn");

    function setMetaNote(kind,message){
      const detected=kind==="exif"||kind==="file";metaNote.classList.toggle("detected",detected);
      const icon=kind==="exif"?"scan-line":kind==="camera"?"camera":kind==="file"?"file-clock":"info";
      const title=kind==="exif"?"Date detected from photo":kind==="camera"?"Date set from camera":kind==="file"?"Date detected from file":"Memory date & time";
      metaNote.innerHTML=`<i data-lucide="${icon}"></i><div><strong>${title}</strong><span>${e(message)}</span></div>`;window.icons?.();
    }
    function renderPhotos(){
      cleanupUrls();
      if(!photos.length){
        preview.className="memory-photo-preview";
        preview.innerHTML=`<div class="memory-photo-empty"><i data-lucide="image-plus"></i><strong>Choose family photos or videos</strong><span>Select one or multiple photos / video clips from your gallery</span></div>`;
        removeAllBtn.classList.add("hidden");window.icons?.();return;
      }
      preview.className="memory-photo-preview has-photo multi-photo";
      preview.innerHTML=`<div class="memory-selected-head"><div><strong>${photos.length} ${photos.length===1?"item":"items"} selected</strong><span>${photos.length>1?"The first item is used as the Memory cover.":"You can add more photos or videos to this Memory."}</span></div></div><div class="memory-selected-grid">${photos.map((p,i)=>`<div class="memory-selected-photo ${p.kind==="video"?"is-video":""}"><img src="${blobUrl(p.thumb||p.image)}" alt="Selected memory item ${i+1}">${p.kind==="video"?`<span class="memory-video-overlay"><i data-lucide="play"></i></span><span class="memory-media-type"><i data-lucide="video"></i>Video</span>`:""}${i===0?`<span class="memory-cover-badge">Cover</span>`:""}<button type="button" class="memory-photo-remove" data-photo-remove="${e(p.id)}" aria-label="Remove item ${i+1}"><i data-lucide="x"></i></button></div>`).join("")}</div>`;
      removeAllBtn.classList.remove("hidden");
      preview.querySelectorAll("[data-photo-remove]").forEach(btn=>btn.onclick=()=>{
        photos=photos.filter(p=>p.id!==btn.dataset.photoRemove);
        renderPhotos();
        if(!photos.length&&dateAuto){dateInput.value="";timeInput.value="";dateSource="manual";setMetaNote("manual","No media is selected. Add a photo or video to continue.")}
      });
      window.icons?.();
    }
    function detectedPhotoDate(photo){
      const m=photo?.meta||{};if(!m.detectedDate)return null;
      return {date:m.detectedDate,time:m.detectedTime||"",raw:m.exifDateTime||"",source:m.detectedSource||"exif"};
    }
    function applyDetectedDate(candidates,mode){
      if(!dateAuto&&dateInput.value)return;
      const detected=candidates.map(detectedPhotoDate).filter(Boolean).sort((a,b)=>`${a.date}T${a.time||"00:00"}`.localeCompare(`${b.date}T${b.time||"00:00"}`));
      if(detected.length){
        const best=detected[0];dateInput.value=best.date;timeInput.value=best.time||"";dateSource=best.source==="file"?"file":"exif";dateAuto=true;
        if(dateSource==="file")setMetaNote("file","Family Book used the video's file date as a starting point. Check it and change it if needed.");
        else setMetaNote("exif",detected.length>1?"Family Book found dates in the selected photos and used the earliest detected Date Taken. You can edit it below.":"Family Book found the original Date Taken metadata. Check it below and change it if needed.");
      }else if((mode==="camera"||mode==="video-camera")&&!dateInput.value){
        const now=new Date();dateInput.value=localDateValue(now);timeInput.value=localTimeValue(now);dateSource="camera";dateAuto=true;setMetaNote("camera","The current date and time were filled in. You can edit them.");
      }else if(!dateInput.value){
        dateSource="manual";dateAuto=true;setMetaNote("manual","No original date was found in these files. Enter the date/time if you know it.");
      }
    }
    async function handleFiles(fileList,mode){
      const files=[...(fileList||[])].filter(Boolean).filter(file=>file.type.startsWith("image/")||file.type.startsWith("video/"));
      if(!files.length){alert("Please choose photo or video files.");return}
      status.classList.remove("hidden");
      const added=[];
      try{
        for(let i=0;i<files.length;i++){
          const file=files[i],isVideo=file.type.startsWith("video/");
          statusText.textContent=`Preparing ${i+1} of ${files.length}${isVideo?" video":""}…`;
          if(isVideo){
            const prepared=await prepareVideo(file);
            const fileDate=file.lastModified?new Date(file.lastModified):null;
            added.push({
              id:photoId(),kind:"video",image:prepared.image,thumb:prepared.thumb,
              meta:{name:file.name,type:file.type,size:file.size,width:prepared.width,height:prepared.height,duration:prepared.duration,
                detectedDate:fileDate?localDateValue(fileDate):"",detectedTime:fileDate?localTimeValue(fileDate):"",detectedSource:fileDate?"file":""}
            });
          }else{
            const meta=await readPhotoMetadata(file);
            const prepared=await preparePhoto(file);
            added.push({
              id:photoId(),kind:"image",image:prepared.image,thumb:prepared.thumb,
              meta:{name:file.name,type:file.type,size:file.size,width:prepared.width,height:prepared.height,exifDateTime:meta?.raw||"",detectedDate:meta?.date||"",detectedTime:meta?.time||"",detectedSource:meta?"exif":""}
            });
          }
        }
        photos.push(...added);renderPhotos();applyDetectedDate(added,mode);
      }catch(err){alert(err.message||"We could not prepare one of those files.")}
      finally{status.classList.add("hidden");statusText.textContent="Preparing media…"}
    }

    renderPhotos();
    mount.querySelector("#memoryGalleryBtn").onclick=()=>mount.querySelector("#memoryGalleryInput").click();
    mount.querySelector("#memoryCameraBtn").onclick=()=>mount.querySelector("#memoryCameraInput").click();
    mount.querySelector("#memoryVideoBtn").onclick=()=>mount.querySelector("#memoryVideoInput").click();
    mount.querySelector("#memoryGalleryInput").onchange=ev=>{handleFiles(ev.target.files,"gallery");ev.target.value=""};
    mount.querySelector("#memoryCameraInput").onchange=ev=>{handleFiles(ev.target.files,"camera");ev.target.value=""};
    mount.querySelector("#memoryVideoInput").onchange=ev=>{handleFiles(ev.target.files,"video-camera");ev.target.value=""};
    removeAllBtn.onclick=()=>{photos=[];renderPhotos();if(dateAuto){dateInput.value="";timeInput.value="";dateSource="manual";setMetaNote("manual","All selected media was removed. Add another photo or video to continue.")}};
    dateInput.addEventListener("change",()=>{dateAuto=false;dateSource=dateSource==="exif"||dateSource==="camera"?"edited":"manual";setMetaNote("manual","Date/time has been set or adjusted manually.")});
    timeInput.addEventListener("change",()=>{dateAuto=false;dateSource=dateSource==="exif"||dateSource==="camera"?"edited":"manual";setMetaNote("manual","Date/time has been set or adjusted manually.")});

    mount.querySelector("#memoryForm").onsubmit=async ev=>{
      ev.preventDefault();if(!photos.length){alert("Please add at least one photo or video before saving this memory.");return}
      const saveBtn=mount.querySelector("#memorySaveBtn"),old=saveBtn.innerHTML;saveBtn.disabled=true;saveBtn.textContent="Saving…";
      try{
        const tags=[...mount.querySelectorAll('input[name="memoryTags"]:checked')].map(x=>x.value);
        const now=Date.now();
        await put({
          id:existing?.id||crypto.randomUUID(),
          familyKey:familyKey(),photos,
          date:dateInput.value||"",time:timeInput.value||"",dateSource,
          caption:mount.querySelector("#memoryCaption").value.trim(),tags,photoMeta:photos[0]?.meta||{},
          authorId:existing?.authorId||(window.FB_AUTH?.get?.()?.memberId||"owner"),
          authorName:existing?.authorName||(window.FB_AUTH?.get?.()?.name||"Family member"),
          authorPhoto:existing?.authorPhoto||(typeof window.currentUserPhoto==="function"?window.currentUserPhoto():(window.FB_AUTH?.get?.()?.photo||"")),
          createdAt:existing?.createdAt||now,updatedAt:now
        });
        window.go?.("memories");
      }catch(err){alert(err.message||"Could not save this memory.");saveBtn.disabled=false;saveBtn.innerHTML=old;window.icons?.()}
    };
  }

  async function mountDetail(id){
    cleanupUrls();const mount=document.querySelector("#memoryDetailMount");if(!mount)return;
    try{
      const m=await getOne(id);if(!m){mount.innerHTML=`<div class="memory-error"><h3>Memory not found</h3><button class="primary" data-r="memories">Back to memories</button></div>`;rebindRoutes();return}
      const members=window.ensureOwner?.()||[],byId=Object.fromEntries(members.map(x=>[x.id,x]));
      const tags=(m.tags||[]).map(id=>byId[id]).filter(Boolean),photos=memoryPhotos(m);
      if(!photos.length){throw new Error("This memory no longer has a readable photo.")}
      const fullUrls=photos.map(p=>blobUrl(p.image||p.thumb)),thumbUrls=photos.map(p=>blobUrl(p.thumb||p.image));
      const mediaStage=(i)=>{
        const p=photos[i],src=fullUrls[i],poster=thumbUrls[i],label=e(m.caption||"Family memory");
        return p.kind==="video"
          ? `<video id="memoryDetailMainVideo" class="memory-detail-video" controls playsinline preload="metadata" poster="${poster}" src="${src}" aria-label="${label}"></video>`
          : `<img id="memoryDetailMainPhoto" src="${src}" alt="${label}">`;
      };
      mount.className="memory-detail-card";
      mount.innerHTML=`<div class="memory-detail-gallery"><div class="memory-detail-photo" id="memoryDetailStage">${mediaStage(0)}${photos.length>1?`<span class="memory-detail-counter">1 / ${photos.length}</span>`:""}</div>${photos.length>1?`<div class="memory-detail-thumbs">${photos.map((p,i)=>`<button type="button" class="${i===0?"active":""}" data-photo-index="${i}" aria-label="View media ${i+1}"><img src="${thumbUrls[i]}" alt="Media ${i+1}">${p.kind==="video"?`<span class="memory-thumb-play"><i data-lucide="play"></i></span>`:""}</button>`).join("")}</div>`:""}</div><div class="memory-detail-copy"><div class="memory-detail-head"><div><p class="eyebrow">FAMILY MEMORY</p><h1>${e(m.caption||"A family moment")}</h1><p class="memory-detail-date"><i data-lucide="calendar-days"></i>${e(formatDateTime(m.date,m.time))}</p></div><button class="secondary icon-button" data-r="edit-memory:${e(m.id)}" aria-label="Edit memory"><i data-lucide="pencil"></i></button></div>${tags.length?`<div class="memory-detail-tags"><span>In this memory</span><div>${tags.map(x=>`<button class="${x.profileType==="history"?"memory-history-person":""}" data-r="view-member:${e(x.id)}">${x.photo?`<img src="${x.photo}" alt="">`:`<b>${initials(x.name)}</b>`}<strong>${e(x.name)}</strong>${x.profileType==="history"?`<small><i data-lucide="leaf"></i>Family history</small>`:""}</button>`).join("")}</div></div>`:""}<div class="memory-detail-meta"><div><i data-lucide="files"></i><span>Media</span><strong>${photos.length}</strong></div><div><i data-lucide="clock-3"></i><span>Date & time</span><strong>${e(formatDateTime(m.date,m.time))}</strong></div><div><i data-lucide="scan-line"></i><span>Date source</span><strong>${e(sourceLabel(m.dateSource))}</strong></div></div>${window.FB_REACTIONS?.controlsHtml?.(`memory:${m.id}`)||""}${window.FB_COMMENTS?.threadHtml?.(`memory:${m.id}`,{open:true})||""}<div class="memory-detail-actions"><button class="secondary" data-r="edit-memory:${e(m.id)}"><i data-lucide="pencil"></i>Edit memory</button><button class="memory-delete" id="deleteMemory"><i data-lucide="trash-2"></i>Delete</button></div></div>`;
      rebindRoutes();window.FB_REACTIONS?.bind?.(mount);window.FB_COMMENTS?.bind?.(mount);window.icons?.();
      const stage=mount.querySelector("#memoryDetailStage"),counter=mount.querySelector(".memory-detail-counter");
      mount.querySelectorAll("[data-photo-index]").forEach(btn=>btn.onclick=()=>{
        const index=Number(btn.dataset.photoIndex)||0;
        stage.querySelector("video")?.pause();
        stage.querySelector("img,video")?.remove();
        stage.insertAdjacentHTML("afterbegin",mediaStage(index));
        mount.querySelectorAll("[data-photo-index]").forEach(x=>x.classList.toggle("active",x===btn));
        if(counter)counter.textContent=`${index+1} / ${photos.length}`;
        window.icons?.();
      });
      mount.querySelector("#deleteMemory").onclick=async()=>{if(!confirm("Delete this memory from Family Book?"))return;await remove(m.id);window.go?.("memories")};
    }catch(err){mount.className="memory-error";mount.innerHTML=`<i data-lucide="circle-alert"></i><h3>Could not open this memory</h3><p>${e(err.message||"Something went wrong.")}</p>`;window.icons?.()}
  }

  function tagChoice(m,checked,history=false){
    return `<label class="memory-tag-choice ${history?"history-tag-choice":""}"><input type="checkbox" name="memoryTags" value="${e(m.id)}" ${checked?"checked":""}><span class="memory-tag-avatar">${m.photo?`<img src="${m.photo}" alt="">`:`${initials(m.name)}`}</span><span>${e(m.name)}${history?`<small>Family history</small>`:""}</span><i data-lucide="check"></i></label>`;
  }
  function initials(name){const p=String(name||"Family").trim().split(/\s+/);return e(((p[0]?.[0]||"F")+(p.length>1?(p[p.length-1]?.[0]||""):"")).toUpperCase())}
  function formatDateTime(date,time){
    if(!date)return "Date unknown";
    const [y,m,d]=date.split("-").map(Number),dt=new Date(y,(m||1)-1,d||1);
    let text=new Intl.DateTimeFormat(undefined,{day:"numeric",month:"long",year:"numeric"}).format(dt);
    if(time){const [hh,mm]=time.split(":").map(Number),td=new Date(2000,0,1,hh||0,mm||0);text+=` · ${new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit"}).format(td)}`}
    return text;
  }
  function sourceLabel(v){return ({exif:"Photo metadata",file:"File date",camera:"Camera / current time",edited:"Edited manually",manual:"Entered manually"})[v]||"Not specified"}
  function localDateValue(d){const p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
  function localTimeValue(d){const p=n=>String(n).padStart(2,"0");return `${p(d.getHours())}:${p(d.getMinutes())}`}

  async function preparePhoto(file){
    let bitmap=null,width=0,height=0,drawSource=null;
    if("createImageBitmap" in window){
      try{bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});drawSource=bitmap;width=bitmap.width;height=bitmap.height}catch(_){ }
    }
    if(!drawSource){
      const url=URL.createObjectURL(file);
      try{const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error("This image could not be opened."));im.src=url});drawSource=img;width=img.naturalWidth;height=img.naturalHeight}finally{URL.revokeObjectURL(url)}
    }
    if(!width||!height)throw new Error("This image has no readable dimensions.");
    const image=await canvasBlob(drawSource,width,height,1800,.80,"image/webp");
    const thumb=await canvasBlob(drawSource,width,height,540,.72,"image/webp");
    if(bitmap)bitmap.close();
    return {image,thumb,width,height};
  }
  async function prepareVideo(file){
    const MAX_VIDEO_BYTES=50*1024*1024;
    if(file.size>MAX_VIDEO_BYTES)throw new Error("That video is larger than 50 MB. Choose a shorter or smaller clip.");
    const url=URL.createObjectURL(file),video=document.createElement("video");
    video.preload="metadata";video.muted=true;video.playsInline=true;video.src=url;
    try{
      await new Promise((resolve,reject)=>{
        const done=()=>{cleanup();resolve()},fail=()=>{cleanup();reject(new Error("This video could not be opened."))};
        const cleanup=()=>{video.removeEventListener("loadedmetadata",done);video.removeEventListener("error",fail)};
        video.addEventListener("loadedmetadata",done,{once:true});video.addEventListener("error",fail,{once:true});
      });
      const width=video.videoWidth||1280,height=video.videoHeight||720,duration=Number(video.duration)||0;
      if(duration>0){
        const seek=Math.min(Math.max(.1,duration*.08),2);
        try{
          video.currentTime=seek;
          await new Promise((resolve,reject)=>{
            const done=()=>{cleanup();resolve()},fail=()=>{cleanup();resolve()};
            const cleanup=()=>{video.removeEventListener("seeked",done);video.removeEventListener("error",fail)};
            video.addEventListener("seeked",done,{once:true});video.addEventListener("error",fail,{once:true});
            setTimeout(done,1500);
          });
        }catch(_){}
      }
      const thumb=await videoThumbBlob(video,width,height,720,.8);
      return {image:file,thumb,width,height,duration};
    }finally{URL.revokeObjectURL(url);video.removeAttribute("src");video.load()}
  }
  function videoThumbBlob(video,width,height,max,quality){
    const scale=Math.min(1,max/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");
    ctx.fillStyle="#20251f";ctx.fillRect(0,0,w,h);
    try{ctx.drawImage(video,0,0,w,h)}catch(_){}
    // Simple play marker so a blank first frame is still recognizable as video.
    const r=Math.max(18,Math.min(w,h)*.09),cx=w/2,cy=h/2;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle="rgba(0,0,0,.55)";ctx.fill();
    ctx.beginPath();ctx.moveTo(cx-r*.28,cy-r*.42);ctx.lineTo(cx+r*.48,cy);ctx.lineTo(cx-r*.28,cy+r*.42);ctx.closePath();ctx.fillStyle="#fff";ctx.fill();
    return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("Could not create a video preview.")),"image/jpeg",quality));
  }

  function canvasBlob(source,width,height,max,quality,mime="image/jpeg"){
    const scale=Math.min(1,max/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d",{alpha:false});ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.drawImage(source,0,0,w,h);
    return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("Could not prepare this photo.")),mime,quality));
  }

  async function readPhotoMetadata(file){
    if(!/jpe?g/i.test(file.type||"")&&!/\.jpe?g$/i.test(file.name||""))return null;
    try{return parseExifDate(await file.arrayBuffer())}catch(_){return null}
  }
  function parseExifDate(buffer){
    const v=new DataView(buffer);if(v.byteLength<12||v.getUint16(0,false)!==0xFFD8)return null;
    let off=2;
    while(off+4<v.byteLength){
      if(v.getUint8(off)!==0xFF){off++;continue}
      const marker=v.getUint8(off+1);off+=2;if(marker===0xDA||marker===0xD9)break;if(off+2>v.byteLength)break;
      const len=v.getUint16(off,false);if(len<2||off+len>v.byteLength)break;
      if(marker===0xE1&&len>=8&&ascii(v,off+2,6)==="Exif\0\0"){
        const tiff=off+8;if(tiff+8>v.byteLength)return null;const endian=v.getUint16(tiff,false),little=endian===0x4949;if(!little&&endian!==0x4D4D)return null;
        const u16=p=>v.getUint16(p,little),u32=p=>v.getUint32(p,little);
        if(u16(tiff+2)!==42)return null;const ifd0=tiff+u32(tiff+4);if(ifd0+2>v.byteLength)return null;
        let exifPtr=0,fallback="";
        const scanIfd=base=>{if(base+2>v.byteLength)return {};const n=u16(base),out={};for(let i=0;i<n;i++){const p=base+2+i*12;if(p+12>v.byteLength)break;const tag=u16(p),type=u16(p+2),count=u32(p+4),size=type===2?count:0;let value="";if(type===2&&size>0){const at=size<=4?p+8:tiff+u32(p+8);if(at>=0&&at+size<=v.byteLength)value=ascii(v,at,size).replace(/\0+$/g,"").trim()}if(tag===0x8769)out.exif=tiff+u32(p+8);if(tag===0x0132)out.fallback=value;if(tag===0x9003)out.original=value;if(tag===0x9004)out.digitized=value}return out};
        const first=scanIfd(ifd0);exifPtr=first.exif||0;fallback=first.fallback||"";let exif={};if(exifPtr)exif=scanIfd(exifPtr);
        const raw=exif.original||exif.digitized||first.original||first.digitized||fallback;if(!raw)return null;const m=raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);if(!m)return null;
        return {date:`${m[1]}-${m[2]}-${m[3]}`,time:`${m[4]}:${m[5]}`,raw};
      }
      off+=len;
    }
    return null;
  }
  function ascii(v,start,len){let s="";for(let i=0;i<len&&start+i<v.byteLength;i++)s+=String.fromCharCode(v.getUint8(start+i));return s}

  async function removePersonTag(personId){
    const {error}=await client().rpc("remove_memory_person_tag",{p_person_id:personId});
    if(error)throw new Error(error.message||"Could not remove this person from Memory tags.");
    invalidateCloud();
  }

  function rebindRoutes(){
    document.querySelectorAll("#screen [data-r]").forEach(b=>b.onclick=()=>window.go?.(b.dataset.r));
  }
  async function bindRoute(r){
    if(r==="memories")return mountLibrary();
    if(r==="add-memory")return mountEditor("");
    if(r.startsWith("edit-memory:"))return mountEditor(r.split(":")[1]);
    if(r.startsWith("view-memory:"))return mountDetail(r.split(":")[1]);
  }

  window.FB_MEMORIES={pageShell,editorShell,detailShell,bindRoute,getAll,getOne,getPhotos:memoryPhotos,removePersonTag,refresh:()=>loadCloud(true),_parseExifDate:parseExifDate};
})();
