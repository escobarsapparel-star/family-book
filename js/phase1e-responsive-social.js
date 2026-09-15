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

  function openModal(holder,mode="post"){
    const modal=holder.querySelector("[data-home-composer-modal]");
    if(!modal)return;
    modal.hidden=false;
    document.body.classList.add("home-composer-open");
    window.icons?.();
    if(mode==="media"){
      setTimeout(()=>modal.querySelector('[data-wall-attach="home"]')?.click(),40);
    }
    if(mode==="activity"){
      setTimeout(()=>modal.querySelector('.wall-activity-pill[data-activity="feeling"]')?.focus(),40);
    }
  }

  function closeModal(holder){
    const modal=holder.querySelector("[data-home-composer-modal]");
    if(modal)modal.hidden=true;
    document.body.classList.remove("home-composer-open");
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

    holder.querySelector("[data-home-open-composer]")?.addEventListener("click",()=>openModal(holder,"post"));
    holder.querySelector("[data-home-media-composer]")?.addEventListener("click",()=>openModal(holder,"media"));
    holder.querySelector("[data-home-activity-composer]")?.addEventListener("click",()=>openModal(holder,"activity"));
    holder.querySelector("[data-home-close-composer]")?.addEventListener("click",()=>closeModal(holder));
    const modal=holder.querySelector("[data-home-composer-modal]");
    modal?.addEventListener("pointerdown",e=>{if(e.target===modal)closeModal(holder)});
    window.icons?.();
    return true;
  }

  function scan(){
    document.querySelectorAll(".home-status-composer-shell").forEach(install);
  }

  document.addEventListener("keydown",e=>{
    if(e.key!=="Escape")return;
    const holder=document.querySelector(".home-status-composer-shell");
    const modal=holder?.querySelector("[data-home-composer-modal]");
    if(modal&&!modal.hidden)closeModal(holder);
  });

  const root=document.getElementById("app");
  const observer=new MutationObserver(()=>{
    if(document.querySelector('.home-status-composer-shell:not([data-social-compact="1"])'))scan();
  });
  if(root)observer.observe(root,{childList:true,subtree:true});
  scan();
})();
