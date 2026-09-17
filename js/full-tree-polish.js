(()=>{
  if(window.__fbFullTreePolish)return;
  window.__fbFullTreePolish=true;

  const exportDataUrlCache=new Map();
  const memberInitialsSafe=name=>String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'FB';

  function people(){
    try{
      const cloud=window.FB_FAMILY_DATA?.getPeople?.();
      if(Array.isArray(cloud)&&cloud.length)return cloud;
    }catch(_){}
    try{
      const local=window.getMembers?.();
      if(Array.isArray(local))return local;
    }catch(_){}
    return [];
  }

  function setInitials(avatar,name){
    const initials=memberInitialsSafe(name);
    if(avatar.querySelector('img')||avatar.textContent.trim()!==initials)avatar.textContent=initials;
  }

  async function resolvePhoto(person){
    const direct=String(person?.photo||'').trim();
    if(direct)return direct;
    const path=String(person?.photoPath||'').trim();
    if(!path||!window.FB_MEDIA?.getSignedUrl)return '';
    try{return await window.FB_MEDIA.getSignedUrl(path,7200)}catch(_){return ''}
  }

  async function syncTreePhotos(root=document){
    const page=root.querySelector?.('.full-tree-page')||document.querySelector('.full-tree-page');
    if(!page||!page.isConnected)return;
    const byId=new Map(people().map(p=>[String(p.id),p]));
    const cards=[...page.querySelectorAll('.ct-person[data-view-member]')];
    await Promise.allSettled(cards.map(async card=>{
      const person=byId.get(String(card.dataset.viewMember||''));
      if(!person)return;
      const avatar=card.querySelector('.ct-avatar');
      if(!avatar)return;
      const photo=await resolvePhoto(person);
      if(!photo){setInitials(avatar,person.name);return}
      let img=avatar.querySelector('img');
      if(!img){
        img=document.createElement('img');
        img.alt='';
        img.decoding='async';
        img.loading='eager';
        avatar.replaceChildren(img);
      }
      if(img.getAttribute('src')!==photo)img.setAttribute('src',photo);
      img.onerror=()=>{if(avatar.isConnected)setInitials(avatar,person.name)};
    }));
  }

  function blobToDataUrl(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=()=>reject(reader.error||new Error('Could not prepare profile photo.'));
      reader.readAsDataURL(blob);
    });
  }

  async function exportPhotoDataUrl(person){
    const key=String(person?.photoPath||person?.photo||person?.id||'');
    if(exportDataUrlCache.has(key))return exportDataUrlCache.get(key);
    let value='';
    try{
      const path=String(person?.photoPath||'').trim();
      if(path&&window.FB_MEDIA?.download){
        value=await blobToDataUrl(await window.FB_MEDIA.download(path));
      }else{
        const src=await resolvePhoto(person);
        if(src.startsWith('data:'))value=src;
        else if(src){
          const response=await fetch(src,{cache:'no-store'});
          if(response.ok)value=await blobToDataUrl(await response.blob());
        }
      }
    }catch(err){
      console.warn('Full tree export photo fallback:',err?.message||err);
    }
    if(key)exportDataUrlCache.set(key,value);
    return value;
  }

  async function prepareExportPhotos(page){
    const byId=new Map(people().map(p=>[String(p.id),p]));
    const restores=[];
    const cards=[...page.querySelectorAll('.ct-person[data-view-member]')];
    await Promise.allSettled(cards.map(async card=>{
      const person=byId.get(String(card.dataset.viewMember||''));
      const avatar=card.querySelector('.ct-avatar');
      if(!person||!avatar)return;
      const dataUrl=await exportPhotoDataUrl(person);
      if(!dataUrl)return;
      let img=avatar.querySelector('img');
      if(!img){
        img=document.createElement('img');
        img.alt='';
        img.decoding='sync';
        avatar.replaceChildren(img);
        restores.push(()=>{if(avatar.isConnected)setInitials(avatar,person.name)});
      }else{
        const oldSrc=img.getAttribute('src')||'';
        restores.push(()=>{if(img.isConnected)img.setAttribute('src',oldSrc)});
      }
      img.setAttribute('src',dataUrl);
    }));
    return ()=>restores.reverse().forEach(fn=>{try{fn()}catch(_){}});
  }

  function waitForTreeImages(canvas){
    const imgs=[...canvas.querySelectorAll('.ct-avatar img')];
    return Promise.all(imgs.map(img=>new Promise(resolve=>{
      if(img.complete){
        if(img.decode)img.decode().catch(()=>{}).finally(resolve);else resolve();
        return;
      }
      const done=()=>resolve();
      img.addEventListener('load',done,{once:true});
      img.addEventListener('error',done,{once:true});
      setTimeout(done,3000);
    })));
  }

  function schedulePhotoPasses(page){
    [0,300,1000].forEach(delay=>setTimeout(()=>{if(page?.isConnected)syncTreePhotos(page)},delay));
  }

  function installExport(){
    const page=document.querySelector('.full-tree-page');
    const btn=document.getElementById('treeExport');
    const stage=document.getElementById('fullTreeStage');
    const canvas=stage?.querySelector('.ct-canvas');
    if(!page||!btn||!stage||!canvas||btn.dataset.fullTreePolish==='1')return;
    btn.dataset.fullTreePolish='1';
    btn.onclick=async()=>{
      const old=btn.innerHTML;
      btn.disabled=true;
      btn.textContent='Creating image…';
      const oldTransform=canvas.style.transform;
      let restoreExportPhotos=()=>{};
      canvas.style.transform='none';
      try{
        await syncTreePhotos(page);
        restoreExportPhotos=await prepareExportPhotos(page);
        await waitForTreeImages(canvas);
        if(!window.html2canvas)throw new Error('Image export library is still loading. Try again in a moment.');
        const width=Number(stage.dataset.width)||canvas.scrollWidth||canvas.offsetWidth;
        const height=Number(stage.dataset.height)||canvas.scrollHeight||canvas.offsetHeight;
        const dark=document.documentElement.dataset.theme==='dark';
        const out=await html2canvas(canvas,{
          backgroundColor:dark?'#0b130e':'#f5efe4',
          scale:2,
          useCORS:true,
          allowTaint:false,
          imageTimeout:8000,
          logging:false,
          width,
          height,
          windowWidth:Math.max(document.documentElement.clientWidth,width),
          windowHeight:Math.max(document.documentElement.clientHeight,height)
        });
        const a=document.createElement('a');
        const label=(window.familyLabel?.()||'family').replace(/\s+/g,'-').toLowerCase();
        a.download=`${label}-tree.png`;
        a.href=out.toDataURL('image/png');
        a.click();
      }catch(err){
        alert(err?.message||'Could not export the tree image.');
      }finally{
        restoreExportPhotos();
        canvas.style.transform=oldTransform;
        btn.disabled=false;
        btn.innerHTML=old;
        window.icons?.();
      }
    };
  }

  function install(){
    const page=document.querySelector('.full-tree-page');
    if(!page||page.dataset.fullTreePolishInstalled==='1')return;
    page.dataset.fullTreePolishInstalled='1';
    installExport();
    schedulePhotoPasses(page);
  }

  const screen=document.getElementById('screen');
  if(screen)new MutationObserver(()=>install()).observe(screen,{childList:true});
  window.addEventListener('familybook:family-data-updated',()=>{
    exportDataUrlCache.clear();
    const page=document.querySelector('.full-tree-page');
    if(page)schedulePhotoPasses(page);
  });
  install();
})();
