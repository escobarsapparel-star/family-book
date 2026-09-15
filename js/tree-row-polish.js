(()=>{
  if(window.__fbTreeRowPolish)return;
  window.__fbTreeRowPolish=true;

  let queued=false;

  function alignRows(canvas){
    if(!canvas)return;
    const nodes=[...canvas.querySelectorAll(':scope > .ct-node')];
    if(!nodes.length)return;

    nodes.forEach(node=>{
      node.classList.remove('ct-row-centered');
      node.style.removeProperty('--ct-row-nudge');
    });

    const rows=[];
    nodes.forEach(node=>{
      const top=Number.parseFloat(node.style.top)||node.offsetTop||0;
      let row=rows.find(r=>Math.abs(r.top-top)<=2);
      if(!row){row={top,nodes:[]};rows.push(row)}
      row.nodes.push(node);
    });

    rows.forEach(row=>{
      if(row.nodes.length<2)return;
      const hasCouple=row.nodes.some(node=>node.querySelector('.ct-couple'));
      if(!hasCouple)return;

      const maxHeight=Math.max(...row.nodes.map(node=>node.offsetHeight||0));
      row.nodes.forEach(node=>{
        if(node.querySelector('.ct-couple'))return;
        const height=node.offsetHeight||0;
        const nudge=Math.max(0,Math.min(12,(maxHeight-height)/2));
        if(nudge<1)return;
        node.style.setProperty('--ct-row-nudge',`${nudge}px`);
        node.classList.add('ct-row-centered');
      });
    });
  }

  function ensureWatermark(stage){
    if(!stage)return;
    const canvas=stage.querySelector('.ct-canvas');
    if(!canvas||canvas.querySelector(':scope > .ct-family-watermark'))return;

    const mark=document.createElement('div');
    mark.className='ct-family-watermark';
    mark.setAttribute('aria-hidden','true');
    mark.innerHTML='<img src="assets/logo/family-book-logo-dark-header.png" alt="">';
    canvas.prepend(mark);
  }

  function polish(){
    document.querySelectorAll('.ct-canvas').forEach(alignRows);
    ensureWatermark(document.querySelector('#fullTreeStage'));
  }

  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{queued=false;polish()});
  }

  const screen=document.getElementById('screen')||document.getElementById('app');
  if(screen){
    new MutationObserver(mutations=>{
      const relevant=mutations.some(m=>[...m.addedNodes].some(node=>{
        if(node.nodeType!==1)return false;
        return node.matches?.('.ct-node,.ct-couple,.ct-marriage-date,.ct-canvas,.full-tree-stage') ||
          node.querySelector?.('.ct-node,.ct-couple,.ct-marriage-date,.ct-canvas,.full-tree-stage');
      }));
      if(relevant)schedule();
    }).observe(screen,{childList:true,subtree:true});
  }

  window.addEventListener('familybook:marriage-data-updated',schedule);
  window.addEventListener('resize',()=>setTimeout(polish,60),{passive:true});
  polish();
  setTimeout(polish,80);
})();
