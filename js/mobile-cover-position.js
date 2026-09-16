(()=>{
  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const num=(v,f=50)=>{const n=Number(v);return Number.isFinite(n)?n:f};

  function pageInfo(){
    const page=document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
    const profile=page?.querySelector('.fb-member-profile');
    const cover=page?.querySelector('[data-basic-cover]');
    const img=cover?.querySelector('.fb-cover-open img');
    return {page,profile,cover,img,id:profile?.dataset.profileMemberId||''};
  }

  async function openPositionEditor(){
    const {id,img}=pageInfo();
    if(!id||!img)return;
    const client=sb();
    if(!client)return;

    const {data,error}=await client.from('person_covers').select('person_id,position_x,position_y').eq('person_id',id).maybeSingle();
    if(error){alert(error.message||'Could not load the cover position.');return}

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
        const u=auth();
        const {error:saveError}=await client.from('person_covers').update({
          position_x:Number(x.value),
          position_y:Number(y.value),
          updated_by_user_id:u.supabaseUserId||null,
          updated_at:new Date().toISOString()
        }).eq('person_id',id);
        if(saveError)throw saveError;
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

  function enhanceCoverSheet(root=document){
    root.querySelectorAll?.('.photo-action-sheet').forEach(sheet=>{
      if(sheet.dataset.coverPositionReady==='1')return;
      const heading=sheet.querySelector('h3');
      if(String(heading?.textContent||'').trim().toLowerCase()!=='cover photo')return;
      const remove=sheet.querySelector('[data-cover-action="remove"]');
      if(!remove)return; // Existing cover + editable member only.

      const button=document.createElement('button');
      button.type='button';
      button.dataset.coverPositionAction='1';
      button.innerHTML='<i data-lucide="move"></i><span>Change position</span>';
      const view=sheet.querySelector('[data-cover-action="view"]');
      sheet.insertBefore(button,view||remove);
      sheet.dataset.coverPositionReady='1';
      button.onclick=()=>{
        sheet.closest('.photo-action-backdrop')?.remove();
        openPositionEditor();
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