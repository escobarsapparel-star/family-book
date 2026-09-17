(()=>{
  if(window.__fbFullTreePolish)return;
  window.__fbFullTreePolish=true;

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

  function syncTreePhotos(root=document){
    const page=root.querySelector?.('.full-tree-page')||document.querySelector('.full-tree-page');
    if(!page)return;
    const byId=new Map(people().map(p=>[String(p.id),p]));
    page.querySelectorAll('.ct-person[data-view-member]').forEach(card=>{
      const person=byId.get(String(card.dataset.viewMember||''));
      if(!person)return;
      const avatar=card.querySelector('.ct-avatar');
      if(!avatar)return;
      const photo=String(person.photo||'').trim();
      if(!photo){
        if(!avatar.querySelector('img'))avatar.textContent=memberInitialsSafe(person.name);
        return;
      }
      let img=avatar.querySelector('img');
      if(!img){
        img=document.createElement('img');
        img.alt='';
        img.decoding='async';
        img.loading='eager';
        avatar.replaceChildren(img);
      }
      if(img.src!==photo)img.src=photo;
      img.onerror=()=>{
        if(!avatar.isConnected)return;
        avatar.textContent=memberInitialsSafe(person.name);
      };
    });
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
      setTimeout(done,2500);
    })));
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
      canvas.style.transform='none';
      try{
        syncTreePhotos(page);
        await waitForTreeImages(canvas);
        if(!window.html2canvas)throw new Error('Image export library is still loading. Try again in a moment.');
        const width=Number(stage.dataset.width)||canvas.scrollWidth||canvas.offsetWidth;
        const height=Number(stage.dataset.height)||canvas.scrollHeight||canvas.offsetHeight;
        const dark=document.documentElement.dataset.theme==='dark';
        const out=await html2canvas(canvas,{
          backgroundColor:dark?'#101713':'#f5efe4',
          scale:2,
          useCORS:true,
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
        canvas.style.transform=oldTransform;
        btn.disabled=false;
        btn.innerHTML=old;
        window.icons?.();
      }
    };
  }

  function install(){
    const page=document.querySelector('.full-tree-page');
    if(!page)return;
    syncTreePhotos(page);
    installExport();
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>install()).observe(app,{childList:true,subtree:true});
  window.addEventListener('familybook:family-data-updated',()=>setTimeout(install,0));
  install();
})();
