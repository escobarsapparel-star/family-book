(()=>{
  if(window.__fbQuickMemoryFaceTags)return;
  window.__fbQuickMemoryFaceTags=true;

  let root=null;
  let tagPoints=[];
  let mediaIndex=0;
  let pendingPoint=null;
  let saveArmed=false;
  let previewObserver=null;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const people=()=>{
    let rows=[];
    try{rows=window.ensureOwner?.()||[]}catch(_){}
    if(!rows.length){try{rows=window.FB_FAMILY_DATA?.getPeople?.()||[]}catch(_){} }
    return rows.filter(p=>p?.id&&p?.name).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  };
  const initials=name=>{
    const p=String(name||'Family').trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0]||'F')+(p.length>1?(p.at(-1)?.[0]||''):'')).toUpperCase();
  };
  const byId=()=>new Map(people().map(p=>[String(p.id),p]));
  const uniqueIds=()=>[...new Set(tagPoints.map(t=>String(t.personId)).filter(Boolean))];
  const thumbs=()=>root?[...root.querySelectorAll('#quickMemoryPreview .quick-memory-thumb')]:[];

  function patchRpc(){
    const sb=window.FB_SUPABASE?.client;
    if(!sb||sb.__fbQuickTagRpcPatched)return;
    try{
      const original=sb.rpc.bind(sb);
      sb.rpc=function(fn,args,...rest){
        if(fn==='save_family_memory'&&saveArmed&&root?.isConnected&&Array.isArray(args?.p_tag_person_ids)&&args.p_tag_person_ids.length===0){
          args={...args,p_tag_person_ids:uniqueIds()};
          saveArmed=false;
        }
        return original(fn,args,...rest);
      };
      sb.__fbQuickTagRpcPatched=true;
    }catch(err){console.warn('Quick Memory tags could not attach to save:',err)}
  }

  function updateSummary(){
    if(!root)return;
    const button=root.querySelector('#quickMemoryFaceTagButton');
    const summary=root.querySelector('#quickMemoryFaceTagSummary');
    const ids=uniqueIds(),map=byId();
    if(button){
      button.hidden=!thumbs().length;
      button.innerHTML=`<i data-lucide="scan-face"></i>${ids.length?`Tagged people (${ids.length})`:'Tag people'}`;
    }
    if(summary){
      summary.hidden=!ids.length;
      summary.innerHTML=ids.map(id=>{
        const p=map.get(id);if(!p)return '';
        return `<span class="quick-face-tag-chip">${p.photo?`<img src="${esc(p.photo)}" alt="">`:`<b>${esc(initials(p.name))}</b>`}<span>${esc(p.name)}</span><button type="button" data-face-untag="${esc(id)}" aria-label="Remove ${esc(p.name)}"><i data-lucide="x"></i></button></span>`;
      }).join('');
      summary.querySelectorAll('[data-face-untag]').forEach(btn=>btn.onclick=()=>{
        tagPoints=tagPoints.filter(t=>String(t.personId)!==String(btn.dataset.faceUntag));
        updateSummary();
        if(!root.querySelector('#quickMemoryFaceTagLayer')?.hidden)renderStage();
      });
    }
    window.icons?.();
  }

  function closePicker(){
    pendingPoint=null;
    const picker=root?.querySelector('#quickMemoryFacePersonPicker');
    if(picker)picker.hidden=true;
  }

  function renderPeople(query=''){
    const list=root?.querySelector('#quickMemoryFacePersonResults');
    if(!list)return;
    const q=String(query||'').trim().toLowerCase();
    let rows=people();
    if(q)rows=rows.filter(p=>String(p.name||'').toLowerCase().includes(q));
    const shown=rows.slice(0,q?8:6);
    list.innerHTML=shown.length?shown.map(p=>`<button type="button" class="quick-face-person" data-face-person="${esc(p.id)}">${p.photo?`<img src="${esc(p.photo)}" alt="">`:`<b>${esc(initials(p.name))}</b>`}<span><strong>${esc(p.name)}</strong>${p.profileType==='history'?'<small>Family history</small>':''}</span><i data-lucide="plus"></i></button>`).join(''):'<p class="quick-face-person-empty">No matching family member.</p>';
    if(!q&&rows.length>shown.length)list.insertAdjacentHTML('beforeend','<small class="quick-face-person-more">Search to find more family members.</small>');
    list.querySelectorAll('[data-face-person]').forEach(btn=>btn.onclick=()=>{
      if(!pendingPoint)return;
      const personId=String(btn.dataset.facePerson||'');
      tagPoints=tagPoints.filter(t=>String(t.personId)!==personId);
      tagPoints.push({personId,mediaIndex,x:pendingPoint.x,y:pendingPoint.y});
      closePicker();
      renderStage();
      renderMediaStrip();
      updateSummary();
    });
    window.icons?.();
  }

  function openPicker(){
    const picker=root?.querySelector('#quickMemoryFacePersonPicker');
    const input=root?.querySelector('#quickMemoryFacePersonSearch');
    if(!picker)return;
    picker.hidden=false;
    if(input){input.value='';input.oninput=()=>renderPeople(input.value)}
    renderPeople('');
  }

  function mediaNode(index,main=false){
    const thumb=thumbs()[index];
    if(!thumb)return '';
    const img=thumb.querySelector('img');
    const video=thumb.querySelector('video');
    if(img)return `<img ${main?'class="quick-face-main-media"':''} src="${esc(img.src)}" alt="${main?'Tap a person to tag':`Media ${index+1}`}">`;
    if(video)return `<video ${main?'class="quick-face-main-media"':''} src="${esc(video.currentSrc||video.src)}" muted playsinline preload="metadata"></video>`;
    return '';
  }

  function renderMediaStrip(){
    const strip=root?.querySelector('#quickMemoryFaceMediaStrip');
    if(!strip)return;
    const items=thumbs();
    if(items.length<=1){strip.hidden=true;strip.innerHTML='';return}
    strip.hidden=false;
    strip.innerHTML=items.map((_,i)=>{
      const count=tagPoints.filter(t=>t.mediaIndex===i).length;
      return `<button type="button" class="${i===mediaIndex?'active':''}" data-face-media="${i}" aria-label="Choose media ${i+1}">${mediaNode(i)}${count?`<span>${count}</span>`:''}</button>`;
    }).join('');
    strip.querySelectorAll('[data-face-media]').forEach(btn=>btn.onclick=()=>{
      mediaIndex=Number(btn.dataset.faceMedia)||0;
      closePicker();renderStage();renderMediaStrip();
    });
  }

  function renderStage(){
    const stage=root?.querySelector('#quickMemoryFaceStage');
    const items=thumbs();
    if(!stage||!items.length)return;
    mediaIndex=Math.max(0,Math.min(mediaIndex,items.length-1));
    const map=byId();
    const isVideo=!!items[mediaIndex].querySelector('video');
    const markers=tagPoints.filter(t=>t.mediaIndex===mediaIndex).map(t=>{
      const p=map.get(String(t.personId));if(!p)return '';
      return `<button type="button" class="quick-face-marker" style="left:${Number(t.x).toFixed(2)}%;top:${Number(t.y).toFixed(2)}%" data-face-remove="${esc(t.personId)}" aria-label="Remove ${esc(p.name)} tag">${p.photo?`<img src="${esc(p.photo)}" alt="">`:`<b>${esc(initials(p.name))}</b>`}<span>${esc(p.name)}</span></button>`;
    }).join('');
    stage.innerHTML=`<div class="quick-face-canvas" id="quickMemoryFaceCanvas">${mediaNode(mediaIndex,true)}${isVideo?'<span class="quick-face-video-note"><i data-lucide="video"></i>Tap the visible frame</span>':''}${markers}</div><p><i data-lucide="scan-face"></i>Tap a face or person, then choose who it is.</p>`;
    const canvas=stage.querySelector('#quickMemoryFaceCanvas');
    canvas.onclick=e=>{
      if(e.target.closest('[data-face-remove]'))return;
      const rect=canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      pendingPoint={
        x:Math.max(2,Math.min(98,((e.clientX-rect.left)/rect.width)*100)),
        y:Math.max(2,Math.min(98,((e.clientY-rect.top)/rect.height)*100))
      };
      openPicker();
    };
    stage.querySelectorAll('[data-face-remove]').forEach(btn=>btn.onclick=e=>{
      e.stopPropagation();
      tagPoints=tagPoints.filter(t=>String(t.personId)!==String(btn.dataset.faceRemove));
      renderStage();renderMediaStrip();updateSummary();
    });
    window.icons?.();
  }

  function openTagger(){
    const layer=root?.querySelector('#quickMemoryFaceTagLayer');
    if(!layer||!thumbs().length)return;
    mediaIndex=Math.max(0,Math.min(mediaIndex,thumbs().length-1));
    layer.hidden=false;
    closePicker();renderMediaStrip();renderStage();
  }
  function closeTagger(){
    const layer=root?.querySelector('#quickMemoryFaceTagLayer');
    if(layer)layer.hidden=true;
    closePicker();
  }

  function install(overlay){
    if(!overlay||overlay.dataset.faceTagsInstalled==='1')return;
    overlay.dataset.faceTagsInstalled='1';
    root=overlay;tagPoints=[];mediaIndex=0;pendingPoint=null;saveArmed=false;
    patchRpc();

    const actions=overlay.querySelector('.quick-memory-actions');
    if(!actions)return;
    const tagButton=document.createElement('button');
    tagButton.type='button';tagButton.id='quickMemoryFaceTagButton';tagButton.className='secondary quick-face-tag-button';tagButton.hidden=true;
    tagButton.innerHTML='<i data-lucide="scan-face"></i>Tag people';
    actions.appendChild(tagButton);

    const summary=document.createElement('div');
    summary.id='quickMemoryFaceTagSummary';summary.className='quick-face-tag-summary';summary.hidden=true;
    actions.insertAdjacentElement('afterend',summary);

    const layer=document.createElement('div');
    layer.id='quickMemoryFaceTagLayer';layer.className='quick-face-layer';layer.hidden=true;
    layer.innerHTML=`<button type="button" class="quick-face-backdrop" data-face-close aria-label="Close tagging"></button><section class="quick-face-panel" role="dialog" aria-modal="true" aria-labelledby="quickFaceTitle"><header><div><p class="eyebrow">PEOPLE IN THIS MEMORY</p><h3 id="quickFaceTitle">Tag people</h3><p>Tap a face or person first. Then choose who it is.</p></div><button type="button" class="quick-memory-close" data-face-close aria-label="Close"><i data-lucide="x"></i></button></header><div id="quickMemoryFaceMediaStrip" class="quick-face-media-strip" hidden></div><div id="quickMemoryFaceStage" class="quick-face-stage"></div><section id="quickMemoryFacePersonPicker" class="quick-face-picker" hidden><div class="quick-face-picker-head"><strong>Who is this?</strong><button type="button" data-face-picker-close aria-label="Close people picker"><i data-lucide="x"></i></button></div><label class="quick-face-search"><i data-lucide="search"></i><input id="quickMemoryFacePersonSearch" type="search" placeholder="Search family" autocomplete="off"></label><div id="quickMemoryFacePersonResults" class="quick-face-person-results"></div></section><footer><button type="button" class="primary" data-face-close><i data-lucide="check"></i>Done tagging</button></footer></section>`;
    overlay.appendChild(layer);

    tagButton.onclick=openTagger;
    layer.querySelectorAll('[data-face-close]').forEach(x=>x.onclick=closeTagger);
    layer.querySelector('[data-face-picker-close]')?.addEventListener('click',closePicker);
    overlay.querySelector('#quickMemorySave')?.addEventListener('click',()=>{saveArmed=true;setTimeout(()=>{saveArmed=false},8000)},{capture:true});

    const preview=overlay.querySelector('#quickMemoryPreview');
    previewObserver?.disconnect();
    if(preview){
      previewObserver=new MutationObserver(()=>{
        const count=thumbs().length;
        tagPoints=[];
        if(!count){mediaIndex=0;closeTagger()}
        else{
          mediaIndex=Math.min(mediaIndex,count-1);
          if(!layer.hidden)closeTagger();
        }
        updateSummary();
      });
      previewObserver.observe(preview,{childList:true});
    }
    updateSummary();window.icons?.();
  }

  function scan(){
    const overlay=document.querySelector('.quick-memory-overlay');
    if(overlay){install(overlay);return}
    if(root){
      previewObserver?.disconnect();previewObserver=null;
      root=null;tagPoints=[];pendingPoint=null;mediaIndex=0;saveArmed=false;
    }
  }

  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||!root)return;
    const picker=root.querySelector('#quickMemoryFacePersonPicker');
    const layer=root.querySelector('#quickMemoryFaceTagLayer');
    if(picker&&!picker.hidden){e.stopImmediatePropagation();closePicker();return}
    if(layer&&!layer.hidden){e.stopImmediatePropagation();closeTagger()}
  },true);
  scan();
})();