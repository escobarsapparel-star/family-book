(()=>{
  if(window.__FB_WALL_IMAGE_VIEWER__)return;
  window.__FB_WALL_IMAGE_VIEWER__=true;

  let viewer=null;
  let viewerImg=null;
  let lastTrigger=null;

  function ensureViewer(){
    if(viewer&&document.body.contains(viewer))return viewer;
    viewer=document.createElement('div');
    viewer.id='fbWallImageViewer';
    viewer.className='fb-wall-image-viewer';
    viewer.hidden=true;
    viewer.innerHTML=`
      <div class="fb-wall-image-viewer-backdrop" data-wall-viewer-close></div>
      <div class="fb-wall-image-viewer-stage" role="dialog" aria-modal="true" aria-label="Wall photo viewer">
        <button type="button" class="fb-wall-image-viewer-close" data-wall-viewer-close aria-label="Close photo"><i data-lucide="x"></i></button>
        <img class="fb-wall-image-viewer-image" alt="Wall photo enlarged">
      </div>`;
    document.body.appendChild(viewer);
    viewerImg=viewer.querySelector('.fb-wall-image-viewer-image');
    viewer.querySelectorAll('[data-wall-viewer-close]').forEach(el=>el.addEventListener('click',close));
    window.icons?.();
    return viewer;
  }

  function open(img){
    if(!img)return;
    const src=img.currentSrc||img.src;
    if(!src)return;
    lastTrigger=img;
    ensureViewer();
    viewerImg.src=src;
    viewerImg.alt=img.alt||'Wall photo enlarged';
    viewer.hidden=false;
    document.documentElement.classList.add('wall-image-viewer-open');
    viewer.querySelector('.fb-wall-image-viewer-close')?.focus({preventScroll:true});
  }

  function close(){
    if(!viewer||viewer.hidden)return;
    viewer.hidden=true;
    if(viewerImg)viewerImg.removeAttribute('src');
    document.documentElement.classList.remove('wall-image-viewer-open');
    try{lastTrigger?.focus?.({preventScroll:true})}catch(_){}
    lastTrigger=null;
  }

  async function upgradeMemoryPreview(img){
    if(!img||img.dataset.wallMemoryQuality==='full'||img.dataset.wallMemoryQuality==='loading')return;
    const holder=img.closest?.('[data-wall-memory]');
    const memoryId=holder?.dataset?.wallMemory;
    if(!memoryId)return;

    img.dataset.wallMemoryQuality='loading';
    try{
      let memory=null;
      if(typeof window.FB_MEMORIES?.getOne==='function'){
        memory=await window.FB_MEMORIES.getOne(memoryId);
      }
      if(!memory&&typeof window.FB_MEMORIES?.getAll==='function'){
        const all=await window.FB_MEMORIES.getAll();
        memory=(all||[]).find(item=>String(item?.id||'')===String(memoryId))||null;
      }
      if(!memory){img.dataset.wallMemoryQuality='missing';return;}

      const photos=window.FB_MEMORIES?.getPhotos?.(memory)||memory.photos||[];
      const full=photos[0]?.image||memory.image||photos[0]?.thumb||memory.thumb||'';
      if(!full){img.dataset.wallMemoryQuality='missing';return;}

      if(typeof full==='string'){
        if((img.currentSrc||img.src)!==full)img.src=full;
      }else if(full instanceof Blob){
        const url=URL.createObjectURL(full);
        img.addEventListener('load',()=>URL.revokeObjectURL(url),{once:true});
        img.src=url;
      }
      img.dataset.wallMemoryQuality='full';
    }catch(err){
      img.dataset.wallMemoryQuality='failed';
      console.warn('Family Book could not upgrade this Wall Memory preview.',err);
    }
  }

  function decorate(root=document){
    root.querySelectorAll?.('.wall-post-attachment img').forEach(img=>{
      if(img.dataset.wallViewerReady==='1')return;
      img.dataset.wallViewerReady='1';
      img.tabIndex=0;
      img.setAttribute('role','button');
      img.setAttribute('aria-label',img.alt?`Open ${img.alt}`:'Open wall photo');
      img.title='Open photo';
    });

    root.querySelectorAll?.('.wall-memory-photo img').forEach(img=>{
      upgradeMemoryPreview(img);
    });
  }

  document.addEventListener('click',ev=>{
    const img=ev.target.closest?.('.wall-post-attachment img');
    if(!img)return;
    ev.preventDefault();
    ev.stopPropagation();
    open(img);
  });

  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&viewer&&!viewer.hidden){ev.preventDefault();close();return;}
    if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches?.('.wall-post-attachment img')){
      ev.preventDefault();open(ev.target);
    }
  });

  const observer=new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType!==1)return;
      if(node.matches?.('.wall-post-attachment img,.wall-memory-photo img'))decorate(node.parentElement||node);
      else decorate(node);
    }));
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
    decorate();
    observer.observe(document.body,{childList:true,subtree:true});
  },{once:true});
  else{
    decorate();
    observer.observe(document.body,{childList:true,subtree:true});
  }
})();
