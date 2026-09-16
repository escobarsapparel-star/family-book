(()=>{
  const isMobile=()=>window.matchMedia?.('(max-width:759px)')?.matches;
  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const num=(v,f=50)=>{const n=Number(v);return Number.isFinite(n)?n:f};
  const clamp=v=>Math.max(0,Math.min(100,v));

  function pageInfo(){
    const page=document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
    const profile=page?.querySelector('.fb-member-profile');
    const cover=page?.querySelector('[data-basic-cover]');
    const open=cover?.querySelector('.fb-cover-open');
    const img=open?.querySelector('img');
    return {page,profile,cover,open,img,id:profile?.dataset.profileMemberId||''};
  }

  async function coverPosition(id){
    const client=sb();
    if(!client)return null;
    const {data,error}=await client.from('person_covers').select('person_id,position_x,position_y').eq('person_id',id).maybeSingle();
    if(error)throw error;
    return data||null;
  }

  async function savePosition(id,x,y){
    const client=sb();
    if(!client)throw new Error('Cover storage is unavailable.');
    const u=auth();
    const {error}=await client.from('person_covers').update({
      position_x:Number(x),
      position_y:Number(y),
      updated_by_user_id:u.supabaseUserId||null,
      updated_at:new Date().toISOString()
    }).eq('person_id',id);
    if(error)throw error;
  }

  async function openPositionEditor(){
    const {id,img}=pageInfo();
    if(!id||!img)return;
    const client=sb();
    if(!client)return;

    let data;
    try{data=await coverPosition(id)}catch(error){alert(error.message||'Could not load the cover position.');return}

    document.querySelector('.member-cover-editor')?.remove();
    const modal=document.createElement('div');
    modal.className='member-cover-editor';
    modal.innerHTML=`<div class="member-cover-editor-card" role="dialog" aria-modal="true" aria-label="Position cover photo">
      <div class="member-cover-editor-head"><div><span>Profile</span><strong>Position cover photo</strong></div><button type="button" data-cover-close aria-label="Close"><i data-lucide="x"></i></button></div>
      <div class="member-cover-preview"><img src="${img.src}" alt="Cover preview"></div>
      <div class="member-cover-position-grid">
        <label>Move left / right<input type="range" min="0" max="100" value="${num(data?.position_x)}" data-cover-x></label>
        <label>Move up / down<input type="range" min="0" max="100" value="${num(data?.position_y)}" data-cover-y></label>
      </div>
      <div class="member-cover-editor-actions"><button type="button" class="primary" data-cover-save>Save position</button></div>
      <div class="member-cover-status" data-cover-status hidden></div>
    </div>`;
    document.body.appendChild(modal);
    window.lucide?.createIcons?.();

    const preview=modal.querySelector('.member-cover-preview img');
    const x=modal.querySelector('[data-cover-x]');
    const y=modal.querySelector('[data-cover-y]');
    const save=modal.querySelector('[data-cover-save]');
    const status=modal.querySelector('[data-cover-status]');
    const render=()=>preview.style.objectPosition=`${x.value}% ${y.value}%`;
    render();
    x.oninput=render;
    y.oninput=render;

    const close=()=>modal.remove();
    modal.querySelector('[data-cover-close]').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close()});

    save.onclick=async()=>{
      save.disabled=true;
      const old=save.textContent;
      save.textContent='Saving…';
      status.hidden=true;
      try{
        await savePosition(id,x.value,y.value);
        img.style.objectPosition=`${x.value}% ${y.value}%`;
        close();
        window.dispatchEvent(new CustomEvent('familybook:basic-member-profile-ready',{detail:{memberId:id,reason:'cover-position-updated'}}));
      }catch(err){
        status.hidden=false;
        status.textContent=err?.message||'Could not save the cover position.';
        save.disabled=false;
        save.textContent=old;
      }
    };
  }

  async function startDesktopDrag(){
    const {id,cover,open,img}=pageInfo();
    if(!id||!cover||!open||!img)return;

    let data;
    try{data=await coverPosition(id)}catch(error){alert(error.message||'Could not load the cover position.');return}

    document.querySelector('.fb-cover-drag-toolbar')?.remove();
    document.querySelector('.fb-cover-drag-mode')?.classList.remove('fb-cover-drag-mode','fb-cover-dragging');

    const originalX=num(data?.position_x);
    const originalY=num(data?.position_y);
    let x=originalX,y=originalY;
    let active=false,startClientX=0,startClientY=0,startX=x,startY=y,pointerId=null;

    const toolbar=document.createElement('div');
    toolbar.className='fb-cover-drag-toolbar';
    toolbar.innerHTML='<span><i data-lucide="move"></i>Drag photo to reposition</span><div><button type="button" class="secondary" data-cover-drag-cancel>Cancel</button><button type="button" class="primary" data-cover-drag-save>Save</button></div>';
    cover.appendChild(toolbar);
    cover.classList.add('fb-cover-drag-mode');
    window.lucide?.createIcons?.();

    const apply=()=>{img.style.objectPosition=`${x}% ${y}%`};
    const stopPointer=()=>{
      active=false;
      cover.classList.remove('fb-cover-dragging');
      if(pointerId!==null){try{open.releasePointerCapture(pointerId)}catch(_){}}
      pointerId=null;
    };
    const finish=restore=>{
      stopPointer();
      open.removeEventListener('pointerdown',onDown);
      open.removeEventListener('pointermove',onMove);
      open.removeEventListener('pointerup',onUp);
      open.removeEventListener('pointercancel',onUp);
      cover.removeEventListener('click',blockClick,true);
      document.removeEventListener('keydown',onKey);
      cover.classList.remove('fb-cover-drag-mode','fb-cover-dragging');
      toolbar.remove();
      if(restore){x=originalX;y=originalY;apply()}
    };
    const blockClick=e=>{
      if(e.target.closest?.('.fb-cover-drag-toolbar'))return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    const onDown=e=>{
      if(e.button!==0||e.target.closest?.('.fb-cover-drag-toolbar'))return;
      e.preventDefault();
      active=true;
      pointerId=e.pointerId;
      startClientX=e.clientX;startClientY=e.clientY;startX=x;startY=y;
      cover.classList.add('fb-cover-dragging');
      try{open.setPointerCapture(e.pointerId)}catch(_){}
    };
    const onMove=e=>{
      if(!active||e.pointerId!==pointerId)return;
      const rect=cover.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const dx=e.clientX-startClientX,dy=e.clientY-startClientY;
      x=clamp(startX-(dx/rect.width)*100);
      y=clamp(startY-(dy/rect.height)*100);
      apply();
    };
    const onUp=e=>{if(active&&e.pointerId===pointerId)stopPointer()};
    const onKey=e=>{if(e.key==='Escape')finish(true)};

    cover.addEventListener('click',blockClick,true);
    open.addEventListener('pointerdown',onDown);
    open.addEventListener('pointermove',onMove);
    open.addEventListener('pointerup',onUp);
    open.addEventListener('pointercancel',onUp);
    document.addEventListener('keydown',onKey);

    toolbar.querySelector('[data-cover-drag-cancel]').onclick=e=>{e.stopPropagation();finish(true)};
    toolbar.querySelector('[data-cover-drag-save]').onclick=async e=>{
      e.stopPropagation();
      const save=e.currentTarget;
      save.disabled=true;
      const old=save.textContent;
      save.textContent='Saving…';
      try{
        await savePosition(id,x,y);
        finish(false);
        window.dispatchEvent(new CustomEvent('familybook:basic-member-profile-ready',{detail:{memberId:id,reason:'cover-position-updated'}}));
      }catch(err){
        save.disabled=false;
        save.textContent=old;
        alert(err?.message||'Could not save the cover position.');
      }
    };
  }

  function enhanceCoverSheet(root=document){
    root.querySelectorAll?.('.photo-action-sheet').forEach(sheet=>{
      if(sheet.dataset.coverPositionReady==='1')return;
      const heading=sheet.querySelector('h3');
      if(String(heading?.textContent||'').trim().toLowerCase()!=='cover photo')return;
      const remove=sheet.querySelector('[data-cover-action="remove"]');
      if(!remove)return;

      const button=document.createElement('button');
      button.type='button';
      button.dataset.coverPositionAction='1';
      button.innerHTML='<i data-lucide="move"></i><span>Change position</span>';
      const view=sheet.querySelector('[data-cover-action="view"]');
      sheet.insertBefore(button,view||remove);
      sheet.dataset.coverPositionReady='1';
      button.onclick=()=>{
        sheet.closest('.photo-action-backdrop')?.remove();
        if(isMobile())openPositionEditor();
        else startDesktopDrag();
      };
      window.lucide?.createIcons?.();
    });
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node.nodeType===1)enhanceCoverSheet(node.matches?.('.photo-action-sheet')?node.parentElement||node:node);
      }
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(()=>enhanceCoverSheet(document),0));
})();