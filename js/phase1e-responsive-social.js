(()=>{
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const photo=()=>{try{return window.currentUserPhoto?.()||auth().photo||""}catch(_){return auth().photo||""}};
  const initials=name=>{
    const p=String(name||"Family").trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase();
  };

  function compactMarkup(){
    const u=auth(),name=u.name||"Family member",first=String(name).trim().split(/\s+/)[0]||"there",p=photo();
    return `<div class="home-social-compact" aria-label="Create a Family Wall post">
      <span class="home-social-compact-avatar">${p?`<img src="${esc(p)}" alt="${esc(name)}">`:esc(initials(name))}</span>
      <button type="button" class="home-social-compact-prompt" data-home-open-composer>What's on your mind, ${esc(first)}?</button>
      <span class="home-social-compact-actions">
        <button type="button" class="home-social-compact-action" data-home-media-composer aria-label="Add photo or video" title="Photo or video"><i data-lucide="image"></i></button>
        <button type="button" class="home-social-compact-action" data-home-activity-composer aria-label="Choose an activity" title="Feeling or activity"><i data-lucide="smile-plus"></i></button>
      </span>
    </div>`;
  }

  function modalMarkup(){
    return `<div class="home-composer-modal" data-home-composer-modal hidden>
      <div class="home-composer-modal-card" role="dialog" aria-modal="true" aria-label="Create post">
        <div class="home-composer-modal-head"><strong>Create post</strong><button type="button" class="home-composer-modal-close" data-home-close-composer aria-label="Close composer"><i data-lucide="x"></i></button></div>
        <div class="home-composer-modal-body" data-home-composer-body></div>
      </div>
    </div>`;
  }

  function visibleModalHolder(){
    return [...document.querySelectorAll('.home-status-composer-shell')].find(holder=>{
      const modal=holder.querySelector('[data-home-composer-modal]');
      return modal&&!modal.hidden;
    })||null;
  }

  function closeVisual(holder){
    const modal=holder?.querySelector("[data-home-composer-modal]");
    if(modal){modal.hidden=true;modal.dataset.historyPushed="0"}
    document.body.classList.remove("home-composer-open");
  }

  function requestClose(holder){
    const modal=holder?.querySelector("[data-home-composer-modal]");
    if(!modal||modal.hidden)return;
    if(modal.dataset.historyPushed==="1"&&history.state?.fbComposerOpen){
      history.back();
      return;
    }
    closeVisual(holder);
  }

  function openModal(holder,mode="post"){
    const modal=holder.querySelector("[data-home-composer-modal]");
    if(!modal)return;
    modal.hidden=false;
    document.body.classList.add("home-composer-open");
    if(modal.dataset.historyPushed!=="1"){
      try{
        history.pushState({...history.state,fbComposerOpen:true},"",location.href);
        modal.dataset.historyPushed="1";
      }catch(_){modal.dataset.historyPushed="0"}
    }
    window.icons?.();
    if(mode==="media"){
      setTimeout(()=>modal.querySelector('[data-wall-attach="home"]')?.click(),40);
    }
    if(mode==="activity"){
      setTimeout(()=>modal.querySelector('.wall-activity-pill[data-activity="feeling"]')?.focus(),40);
    }
  }

  function addVisibleCancel(holder,composer){
    const actions=composer.querySelector('.wall-compose-actions');
    const postButton=composer.querySelector('#wallHomePost');
    if(!actions||!postButton||actions.querySelector('[data-home-cancel-composer]'))return;
    const cancel=document.createElement('button');
    cancel.type='button';
    cancel.className='secondary home-composer-cancel';
    cancel.dataset.homeCancelComposer='';
    cancel.innerHTML='<i data-lucide="x"></i><span>Cancel</span>';
    actions.insertBefore(cancel,postButton);
    cancel.addEventListener('click',()=>requestClose(holder));
  }

  function closeAfterSuccessfulPost(holder){
    const postButton=holder.querySelector("#wallHomePost");
    if(!postButton||postButton.dataset.closeAfterPostBound==="1")return;
    postButton.dataset.closeAfterPostBound="1";

    postButton.addEventListener("click",()=>{
      const modal=holder.querySelector("[data-home-composer-modal]");
      if(!modal||modal.hidden)return;

      let finished=false;
      const stop=()=>{
        if(finished)return;
        finished=true;
        observer.disconnect();
        clearTimeout(timeout);
      };
      const observer=new MutationObserver(()=>{
        const currentModal=holder.querySelector("[data-home-composer-modal]");
        if(!currentModal||currentModal.hidden){stop();return}
        const input=holder.querySelector("#wallHomeText");
        if(input&&input.value!=="")return;
        stop();
        requestClose(holder);
      });
      observer.observe(holder,{childList:true,subtree:true});
      const timeout=setTimeout(stop,15000);
    },true);
  }

  function install(holder){
    if(!holder||holder.dataset.socialCompact==="1")return false;
    const composer=holder.querySelector(".wall-composer");
    if(!composer)return false;

    holder.dataset.socialCompact="1";
    holder.insertAdjacentHTML("afterbegin",compactMarkup());
    holder.insertAdjacentHTML("beforeend",modalMarkup());
    const body=holder.querySelector("[data-home-composer-body]");
    body?.appendChild(composer);
    addVisibleCancel(holder,composer);

    holder.querySelector("[data-home-open-composer]")?.addEventListener("click",()=>openModal(holder,"post"));
    holder.querySelector("[data-home-media-composer]")?.addEventListener("click",()=>openModal(holder,"media"));
    holder.querySelector("[data-home-activity-composer]")?.addEventListener("click",()=>openModal(holder,"activity"));
    holder.querySelector("[data-home-close-composer]")?.addEventListener("click",()=>requestClose(holder));
    const modal=holder.querySelector("[data-home-composer-modal]");
    modal?.addEventListener("pointerdown",e=>{if(e.target===modal)requestClose(holder)});
    closeAfterSuccessfulPost(holder);
    window.icons?.();
    return true;
  }

  function scan(){
    document.querySelectorAll(".home-status-composer-shell").forEach(install);
  }

  document.addEventListener("keydown",e=>{
    if(e.key!=="Escape")return;
    const holder=visibleModalHolder();
    if(holder){e.preventDefault();requestClose(holder)}
  });

  window.addEventListener('popstate',()=>{
    const holder=visibleModalHolder();
    if(holder)closeVisual(holder);
  });

  const root=document.getElementById("app");
  const observer=new MutationObserver(()=>{
    if(document.querySelector('.home-status-composer-shell:not([data-social-compact="1"])'))scan();
  });
  if(root)observer.observe(root,{childList:true,subtree:true});
  scan();
})();
