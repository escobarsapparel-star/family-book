(()=>{
  if(window.__fbFamilyAccessAvatarFix)return;
  window.__fbFamilyAccessAvatarFix=true;

  const isDirectUrl=v=>/^(https?:|data:|blob:)/i.test(String(v||''));

  async function repairAvatar(img){
    if(!img||img.dataset.fbAvatarResolved==='1'||img.dataset.fbAvatarResolving==='1')return;
    const raw=img.getAttribute('src')||'';
    if(!raw||isDirectUrl(raw)){
      img.dataset.fbAvatarResolved='1';
      return;
    }
    if(!window.FB_MEDIA?.getSignedUrl)return;

    img.dataset.fbAvatarResolving='1';
    try{
      const url=await window.FB_MEDIA.getSignedUrl(raw,7200);
      if(url){
        img.src=url;
        img.dataset.fbAvatarResolved='1';
      }
    }catch(err){
      console.warn('Family access avatar:',err);
    }finally{
      delete img.dataset.fbAvatarResolving;
    }
  }

  function scan(root=document){
    root.querySelectorAll?.('.family-access-page .family-account-avatar img').forEach(repairAvatar);
  }

  const run=()=>setTimeout(()=>scan(),0);
  window.addEventListener('load',run);
  document.addEventListener('click',run);
  window.addEventListener('familybook:family-data-updated',run);
  new MutationObserver(mutations=>{
    for(const m of mutations){
      for(const node of m.addedNodes){
        if(node.nodeType!==1)continue;
        if(node.matches?.('.family-account-avatar img'))repairAvatar(node);
        scan(node);
      }
    }
  }).observe(document.documentElement,{childList:true,subtree:true});
})();