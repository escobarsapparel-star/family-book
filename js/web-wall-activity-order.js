(()=>{
  if(window.__fbWebWallActivityOrder)return;
  window.__fbWebWallActivityOrder=true;
  const fix=()=>document.querySelectorAll('.wall-post-body').forEach(body=>{
    const card=body.querySelector('.web-wall-rich-card');
    const reactions=body.querySelector('.reaction-bar');
    if(card&&reactions&&card.nextElementSibling!==reactions)body.insertBefore(card,reactions);
  });
  const root=document.getElementById('app');
  if(root)new MutationObserver(fix).observe(root,{childList:true,subtree:true});
  fix();
})();
