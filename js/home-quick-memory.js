(()=>{
  if(window.FB_QUICK_MEMORY)return;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const client=()=>window.FB_SUPABASE?.client;
  let overlay=null;
  let selected=[];
  let objectUrls=[];

  function extFor(type,kind='image'){
    const t=String(type||'').toLowerCase();
    if(t==='image/webp')return 'webp';
    if(t==='image/png')return 'png';
    if(t==='image/jpeg'||t==='image/jpg')return 'jpg';
    if(t==='video/webm')return 'webm';
    if(t==='video/quicktime')return 'mov';
    if(t==='video/mp4')return 'mp4';
    return kind==='video'?'mp4':'jpg';
  }

  function cleanupUrls(){
    objectUrls.forEach(u=>URL.revokeObjectURL(u));
    objectUrls=[];
  }
  function previewUrl(blob){
    const u=URL.createObjectURL(blob);objectUrls.push(u);return u;
  }

  function imageToBlob(canvas,type='image/jpeg',quality=.9){
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not prepare this photo.')),type,quality));
  }

  async function prepareImage(file){
    let detected=null;
    if(/jpe?g/i.test(file.type||'')||/\.jpe?g$/i.test(file.name||'')){
      try{detected=window.FB_MEMORIES?._parseExifDate?.(await file.arrayBuffer())||null}catch(_){detected=null}
    }

    let bitmap=null;
    try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(_){bitmap=await createImageBitmap(file)}
    const ow=bitmap.width,oh=bitmap.height;
    const fullScale=Math.min(1,2560/Math.max(ow,oh));
    const fw=Math.max(1,Math.round(ow*fullScale)),fh=Math.max(1,Math.round(oh*fullScale));
    const fullCanvas=document.createElement('canvas');fullCanvas.width=fw;fullCanvas.height=fh;
    fullCanvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,fw,fh);
    const full=await imageToBlob(fullCanvas,'image/jpeg',.9);

    const thumbScale=Math.min(1,640/Math.max(ow,oh));
    const tw=Math.max(1,Math.round(ow*thumbScale)),th=Math.max(1,Math.round(oh*thumbScale));
    const thumbCanvas=document.createElement('canvas');thumbCanvas.width=tw;thumbCanvas.height=th;
    thumbCanvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,tw,th);
    const thumb=await imageToBlob(thumbCanvas,'image/jpeg',.82);
    bitmap.close?.();

    return {kind:'image',full,thumb,name:file.name||'photo.jpg',type:'image/jpeg',width:fw,height:fh,duration:null,detected};
  }

  async function videoThumb(file){
    return new Promise(resolve=>{
      const url=URL.createObjectURL(file);
      const video=document.createElement('video');
      video.preload='metadata';video.muted=true;video.playsInline=true;
      const done=result=>{URL.revokeObjectURL(url);video.remove();resolve(result)};
      const timeout=setTimeout(()=>done({thumb:null,width:null,height:null,duration:null}),5000);
      video.onerror=()=>{clearTimeout(timeout);done({thumb:null,width:null,height:null,duration:null})};
      video.onloadedmetadata=()=>{
        const duration=Number.isFinite(video.duration)?video.duration:null;
        const target=duration?Math.min(1,Math.max(.05,duration/3)):0;
        const capture=()=>{
          try{
            const ow=video.videoWidth||0,oh=video.videoHeight||0;
            if(!ow||!oh)throw new Error('No video dimensions');
            const scale=Math.min(1,640/Math.max(ow,oh));
            const c=document.createElement('canvas');c.width=Math.max(1,Math.round(ow*scale));c.height=Math.max(1,Math.round(oh*scale));
            c.getContext('2d').drawImage(video,0,0,c.width,c.height);
            c.toBlob(blob=>{clearTimeout(timeout);done({thumb:blob,width:ow,height:oh,duration})},'image/jpeg',.8);
          }catch(_){clearTimeout(timeout);done({thumb:null,width:video.videoWidth||null,height:video.videoHeight||null,duration})}
        };
        if(target>0){video.onseeked=capture;try{video.currentTime=target}catch(_){capture()}}
        else capture();
      };
      video.src=url;
    });
  }

  async function prepareVideo(file){
    if(file.size>50*1024*1024)throw new Error(`${file.name||'Video'} is larger than the 50 MB video limit.`);
    const meta=await videoThumb(file);
    return {kind:'video',full:file,thumb:meta.thumb,name:file.name||'video.mp4',type:file.type||'video/mp4',width:meta.width,height:meta.height,duration:meta.duration,detected:null};
  }

  function metadataFrom(items){
    const found=items.map(x=>x.detected).filter(Boolean).sort((a,b)=>`${a.date}T${a.time||'00:00'}`.localeCompare(`${b.date}T${b.time||'00:00'}`));
    return found[0]||null;
  }

  function metadataLabel(meta){
    if(!meta?.date)return '';
    const [y,m,d]=meta.date.split('-').map(Number);
    let date=meta.date;
    try{date=new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d,12))}catch(_){}
    if(!meta.time)return date;
    const [hh,mm]=meta.time.split(':').map(Number);let time=meta.time;
    try{time=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'}).format(new Date(2000,0,1,hh,mm))}catch(_){}
    return `${date} · ${time}`;
  }

  function renderSelection(){
    if(!overlay)return;
    const preview=overlay.querySelector('#quickMemoryPreview');
    const metaBox=overlay.querySelector('#quickMemoryMeta');
    const save=overlay.querySelector('#quickMemorySave');
    if(!selected.length){
      preview.innerHTML='<div class="quick-memory-empty"><i data-lucide="images"></i><strong>Choose family photos or videos</strong><span>Upload quickly without leaving Home.</span></div>';
      metaBox.hidden=true;save.disabled=true;window.icons?.();return;
    }
    preview.innerHTML=selected.map((item,i)=>{
      const src=previewUrl(item.thumb||item.full);
      return `<div class="quick-memory-thumb">${item.kind==='video'?`<video src="${esc(src)}" muted playsinline></video><span class="quick-memory-play"><i data-lucide="play"></i></span>`:`<img src="${esc(src)}" alt="Selected photo">`}<button type="button" data-quick-remove="${i}" aria-label="Remove"><i data-lucide="x"></i></button></div>`;
    }).join('');
    preview.querySelectorAll('[data-quick-remove]').forEach(btn=>btn.onclick=()=>{selected.splice(Number(btn.dataset.quickRemove),1);cleanupUrls();renderSelection()});
    const meta=metadataFrom(selected);
    if(meta){metaBox.hidden=false;metaBox.innerHTML=`<i data-lucide="scan-line"></i><span><strong>Original capture found</strong>${esc(metadataLabel(meta))}</span>`}else metaBox.hidden=true;
    save.disabled=false;window.icons?.();
  }

  function setBusy(busy,text='Saving memory…'){
    if(!overlay)return;
    const save=overlay.querySelector('#quickMemorySave');
    const close=overlay.querySelectorAll('[data-quick-close]');
    close.forEach(x=>x.disabled=busy);
    save.disabled=busy||!selected.length;
    save.innerHTML=busy?`<span class="memory-spinner small"></span>${esc(text)}`:'<i data-lucide="heart"></i>Save memory';
    window.icons?.();
  }

  async function uploadBlob(path,blob){
    await window.FB_MEDIA.upload(path,blob,{contentType:blob.type||'application/octet-stream',upsert:false,cacheControl:'3600'});
    return path;
  }

  async function save(){
    if(!selected.length||!overlay)return;
    const u=auth();
    if(!u.familyId||!u.supabaseUserId)throw new Error('Your Family Book session is not ready.');
    if(!client())throw new Error('Family Book could not connect to the database.');
    setBusy(true);
    const memoryId=crypto.randomUUID();
    const uploaded=[];
    try{
      const media=[];
      for(let i=0;i<selected.length;i++){
        const item=selected[i],token=crypto.randomUUID();
        setBusy(true,`Uploading ${i+1} of ${selected.length}…`);
        const fullExt=extFor(item.full.type||item.type,item.kind);
        const fullPath=`${u.familyId}/${u.supabaseUserId}/memories/${memoryId}/${token}.${fullExt}`;
        uploaded.push(await uploadBlob(fullPath,item.full));
        let thumbPath=null;
        if(item.thumb){
          thumbPath=`${u.familyId}/${u.supabaseUserId}/thumbnails/${memoryId}/${token}.jpg`;
          uploaded.push(await uploadBlob(thumbPath,item.thumb));
        }
        media.push({media_type:item.kind,storage_path:fullPath,thumbnail_path:thumbPath,original_filename:item.name||null,mime_type:item.full.type||item.type||null,width:item.width==null?null:Number(item.width),height:item.height==null?null:Number(item.height),duration_seconds:item.duration==null?null:Number(item.duration),sort_order:i});
      }
      const meta=metadataFrom(selected);
      const caption=overlay.querySelector('#quickMemoryCaption').value.trim();
      const {error}=await client().rpc('save_family_memory',{
        p_memory_id:memoryId,
        p_caption:caption||null,
        p_story:null,
        p_memory_date:meta?.date||null,
        p_memory_time:meta?.time||null,
        p_date_source:meta?.date?'exif':'manual',
        p_media:media,
        p_tag_person_ids:[]
      });
      if(error)throw new Error(error.message||'Could not save this memory.');
      await window.FB_MEMORIES?.refresh?.();
      close();
      window.dispatchEvent(new CustomEvent('familybook:memories-updated',{detail:{memoryId}}));
    }catch(err){
      if(uploaded.length){try{await window.FB_MEDIA.remove(uploaded,{silent:true})}catch(_){}}
      setBusy(false);
      alert(err?.message||'Could not save this memory.');
    }
  }

  async function handleFiles(files){
    const list=[...(files||[])].filter(f=>f?.type?.startsWith('image/')||f?.type?.startsWith('video/'));
    if(!list.length)return;
    const status=overlay?.querySelector('#quickMemoryStatus');
    if(status){status.hidden=false;status.textContent='Preparing media…'}
    try{
      for(let i=0;i<list.length;i++){
        if(status)status.textContent=`Preparing ${i+1} of ${list.length}…`;
        selected.push(list[i].type.startsWith('video/')?await prepareVideo(list[i]):await prepareImage(list[i]));
      }
      cleanupUrls();renderSelection();
    }catch(err){alert(err?.message||'Could not prepare that media.');}
    finally{if(status)status.hidden=true}
  }

  function close(){
    if(!overlay)return;
    cleanupUrls();selected=[];
    overlay.remove();overlay=null;
    document.documentElement.classList.remove('quick-memory-open');
  }

  function open(){
    if(overlay){overlay.querySelector('#quickMemoryFile')?.click();return}
    selected=[];cleanupUrls();
    overlay=document.createElement('div');
    overlay.className='quick-memory-overlay';
    overlay.innerHTML=`<div class="quick-memory-backdrop" data-quick-close></div><section class="quick-memory-modal" role="dialog" aria-modal="true" aria-labelledby="quickMemoryTitle"><header><div><p class="eyebrow">QUICK MEMORY</p><h2 id="quickMemoryTitle">Add a family memory</h2><p>Choose media, add an optional caption, and save. You stay on Home.</p></div><button type="button" class="quick-memory-close" data-quick-close aria-label="Close"><i data-lucide="x"></i></button></header><div id="quickMemoryPreview" class="quick-memory-preview"></div><div class="quick-memory-actions"><button type="button" class="primary" id="quickMemoryChoose"><i data-lucide="images"></i>Choose photos / videos</button><button type="button" class="secondary" id="quickMemoryCamera"><i data-lucide="camera"></i>Take photo</button></div><input id="quickMemoryFile" type="file" accept="image/*,video/*" multiple hidden><input id="quickMemoryCameraInput" type="file" accept="image/*" capture="environment" hidden><div id="quickMemoryStatus" class="quick-memory-status" hidden>Preparing media…</div><div id="quickMemoryMeta" class="quick-memory-meta" hidden></div><label class="quick-memory-caption"><span>Caption <small>(optional)</small></span><textarea id="quickMemoryCaption" maxlength="800" placeholder="What was happening in this moment?"></textarea></label><footer><button type="button" class="secondary" data-quick-close>Cancel</button><button type="button" class="primary" id="quickMemorySave" disabled><i data-lucide="heart"></i>Save memory</button></footer></section>`;
    document.body.appendChild(overlay);document.documentElement.classList.add('quick-memory-open');
    overlay.querySelectorAll('[data-quick-close]').forEach(x=>x.onclick=close);
    overlay.querySelector('#quickMemoryChoose').onclick=()=>overlay.querySelector('#quickMemoryFile').click();
    overlay.querySelector('#quickMemoryCamera').onclick=()=>overlay.querySelector('#quickMemoryCameraInput').click();
    overlay.querySelector('#quickMemoryFile').onchange=e=>{handleFiles(e.target.files);e.target.value=''};
    overlay.querySelector('#quickMemoryCameraInput').onchange=e=>{handleFiles(e.target.files);e.target.value=''};
    overlay.querySelector('#quickMemorySave').onclick=save;
    renderSelection();window.icons?.();
    setTimeout(()=>overlay?.querySelector('#quickMemoryChoose')?.focus(),0);
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay)close()});
  window.FB_QUICK_MEMORY={open,close};
})();