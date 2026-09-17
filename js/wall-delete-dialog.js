(()=>{
  if(window.__fbWallDeleteDialog)return;
  window.__fbWallDeleteDialog=true;

  const STYLE_ID='fb-wall-delete-dialog-style';
  const DIALOG_ID='fbWallDeleteDialog';
  const nativeConfirm=typeof window.confirm==='function'?window.confirm.bind(window):null;
  let currentId='';
  let currentTrigger=null;
  let lastDeleteTrigger=null;
  let busy=false;

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      body.fb-wall-delete-open{overflow:hidden}
      .fb-wall-delete-dialog[hidden]{display:none!important}
      .fb-wall-delete-dialog{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:20px}
      .fb-wall-delete-scrim{position:absolute;inset:0;border:0;background:rgba(0,0,0,.64);backdrop-filter:blur(3px)}
      .fb-wall-delete-card{position:relative;z-index:1;width:min(430px,calc(100vw - 28px));border:1px solid var(--line);border-radius:22px;background:var(--paper);color:var(--ink);box-shadow:0 28px 90px rgba(0,0,0,.36);padding:20px}
      .fb-wall-delete-icon{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;margin-bottom:14px;background:rgba(174,72,72,.12);color:#a94c4c}
      .fb-wall-delete-icon svg{width:22px;height:22px}
      .fb-wall-delete-card h3{margin:0 0 7px;font-size:1.12rem;line-height:1.2}
      .fb-wall-delete-card p{margin:0;color:var(--muted);font-size:.86rem;line-height:1.48}
      .fb-wall-delete-error{margin-top:10px!important;color:#b24f4f!important;font-size:.76rem!important;font-weight:700}
      .fb-wall-delete-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
      .fb-wall-delete-actions button{min-height:42px;border-radius:12px;padding:0 16px;font:inherit;font-weight:800}
      .fb-wall-delete-cancel{border:1px solid var(--line);background:transparent;color:inherit}
      .fb-wall-delete-cancel:hover{background:var(--cream)}
      .fb-wall-delete-confirm{border:1px solid #a94c4c;background:#a94c4c;color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:7px}
      .fb-wall-delete-confirm:hover{background:#973f3f;border-color:#973f3f}
      .fb-wall-delete-confirm:disabled,.fb-wall-delete-cancel:disabled{opacity:.6;cursor:wait}
      .fb-wall-delete-confirm svg{width:16px;height:16px}
      html[data-theme="dark"] .fb-wall-delete-card{background:#182019;border-color:#39443c;color:#f3ecdd}
      html[data-theme="dark"] .fb-wall-delete-card p{color:#b9b0a4}
      html[data-theme="dark"] .fb-wall-delete-cancel{border-color:#3f4a42;color:#e7dfd3}
      html[data-theme="dark"] .fb-wall-delete-cancel:hover{background:#202820}
      html[data-theme="dark"] .fb-wall-delete-icon{background:rgba(203,91,91,.15);color:#e08080}
      @media(max-width:560px){
        .fb-wall-delete-dialog{place-items:end center;padding:0}
        .fb-wall-delete-card{width:100%;border-radius:24px 24px 0 0;border-left:0;border-right:0;border-bottom:0;padding:22px 18px max(22px,env(safe-area-inset-bottom))}
        .fb-wall-delete-actions{display:grid;grid-template-columns:1fr 1fr}
        .fb-wall-delete-actions button{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDialog(){
    ensureStyle();
    let dialog=document.getElementById(DIALOG_ID);
    if(dialog)return dialog;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="${DIALOG_ID}" class="fb-wall-delete-dialog" hidden>
        <button type="button" class="fb-wall-delete-scrim" data-fb-wall-delete-cancel aria-label="Cancel"></button>
        <section class="fb-wall-delete-card" role="dialog" aria-modal="true" aria-labelledby="fbWallDeleteTitle">
          <div class="fb-wall-delete-icon"><i data-lucide="trash-2"></i></div>
          <h3 id="fbWallDeleteTitle">Delete this post?</h3>
          <p>This update will be removed from the Family Wall. This action can’t be undone.</p>
          <p class="fb-wall-delete-error" data-fb-wall-delete-error hidden></p>
          <div class="fb-wall-delete-actions">
            <button type="button" class="fb-wall-delete-cancel" data-fb-wall-delete-cancel>Cancel</button>
            <button type="button" class="fb-wall-delete-confirm" data-fb-wall-delete-confirm><i data-lucide="trash-2"></i><span>Delete post</span></button>
          </div>
        </section>
      </div>`);
    dialog=document.getElementById(DIALOG_ID);
    dialog.querySelectorAll('[data-fb-wall-delete-cancel]').forEach(btn=>btn.addEventListener('click',closeDialog));
    dialog.querySelector('[data-fb-wall-delete-confirm]')?.addEventListener('click',deleteCurrentPost);
    window.icons?.();
    return dialog;
  }

  function openDialog(id,trigger){
    if(!id)return;
    const dialog=ensureDialog();
    currentId=id;
    currentTrigger=trigger||null;
    busy=false;
    const error=dialog.querySelector('[data-fb-wall-delete-error]');
    if(error){error.hidden=true;error.textContent=''}
    dialog.querySelectorAll('button').forEach(b=>b.disabled=false);
    const confirm=dialog.querySelector('[data-fb-wall-delete-confirm]');
    if(confirm)confirm.innerHTML='<i data-lucide="trash-2"></i><span>Delete post</span>';
    dialog.hidden=false;
    document.body.classList.add('fb-wall-delete-open');
    window.icons?.();
    requestAnimationFrame(()=>dialog.querySelector('[data-fb-wall-delete-confirm]')?.focus());
  }

  function closeDialog(){
    if(busy)return;
    const dialog=document.getElementById(DIALOG_ID);
    if(dialog)dialog.hidden=true;
    document.body.classList.remove('fb-wall-delete-open');
    currentTrigger?.focus?.();
    currentId='';
    currentTrigger=null;
  }

  function removeRenderedPost(id){
    document.querySelectorAll('[data-wall-delete]').forEach(button=>{
      if(button.dataset.wallDelete===id)button.closest('.wall-post')?.remove();
    });
  }

  async function deleteCurrentPost(){
    if(busy||!currentId)return;
    const dialog=ensureDialog();
    const confirm=dialog.querySelector('[data-fb-wall-delete-confirm]');
    const cancel=dialog.querySelector('.fb-wall-delete-cancel');
    const error=dialog.querySelector('[data-fb-wall-delete-error]');
    busy=true;
    if(confirm){confirm.disabled=true;confirm.innerHTML='<span>Deleting…</span>'}
    if(cancel)cancel.disabled=true;
    if(error){error.hidden=true;error.textContent=''}

    try{
      const id=currentId;
      const result=await window.FB_SOCIAL_DATA?.deletePost?.(id);
      if(result===false)throw new Error('The post could not be deleted.');
      removeRenderedPost(id);
      busy=false;
      const d=document.getElementById(DIALOG_ID);
      if(d)d.hidden=true;
      document.body.classList.remove('fb-wall-delete-open');
      currentId='';
      currentTrigger=null;
      window.dispatchEvent(new CustomEvent('fb:wall-post-deleted',{detail:{id}}));
    }catch(err){
      busy=false;
      if(confirm){confirm.disabled=false;confirm.innerHTML='<i data-lucide="trash-2"></i><span>Delete post</span>'}
      if(cancel)cancel.disabled=false;
      if(error){error.textContent=err?.message||'Could not delete this post. Please try again.';error.hidden=false}
      window.icons?.();
    }
  }

  /* Track the delete control before the legacy onclick runs. Some mobile browsers
     still execute the original confirm() handler despite click interception, so
     this gives the confirm shim the exact post id to open in our in-app dialog. */
  document.addEventListener('pointerdown',event=>{
    const trigger=event.target.closest?.('[data-wall-delete]');
    if(trigger)lastDeleteTrigger=trigger;
  },true);

  document.addEventListener('click',event=>{
    const trigger=event.target.closest?.('[data-wall-delete]');
    if(!trigger)return;
    lastDeleteTrigger=trigger;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openDialog(trigger.dataset.wallDelete,trigger);
  },true);

  /* Final safety net for the legacy Wall code. Only replace this one exact
     confirmation; every other site/browser confirm keeps its native behavior. */
  if(nativeConfirm){
    window.confirm=function(message){
      if(String(message||'').trim()==='Delete this family update?'){
        const trigger=lastDeleteTrigger||document.activeElement?.closest?.('[data-wall-delete]')||null;
        if(trigger?.dataset?.wallDelete)openDialog(trigger.dataset.wallDelete,trigger);
        return false;
      }
      return nativeConfirm(message);
    };
  }

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const dialog=document.getElementById(DIALOG_ID);
    if(dialog&&!dialog.hidden)closeDialog();
  });
})();
