(()=>{
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const auth=()=>window.FB_AUTH?.get?.()||{};

  function initials(name){
    const p=String(name||"Family").trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase();
  }

  function memoryMedia(memory){
    const photos=Array.isArray(memory?.photos)?memory.photos:[];
    const p=photos.find(x=>x&&(x.thumb||x.image));
    if(!p)return {src:"",video:false};
    return {src:p.thumb||p.image||"",video:p.kind==="video"};
  }

  function authorAvatar(memory){
    const name=memory?.authorName||"Family member",photo=memory?.authorPhoto||"";
    return photo?`<img src="${esc(photo)}" alt="">`:`<span>${esc(initials(name))}</span>`;
  }

  function memoryCard(memory){
    const media=memoryMedia(memory);
    const caption=String(memory?.caption||memory?.story||"Family memory").trim()||"Family memory";
    const author=memory?.authorName||"Family member";
    return `<button class="home-memory-strip-card" type="button" data-home-memory-id="${esc(memory.id)}" aria-label="Open ${esc(caption)}">
      <span class="home-memory-strip-media">${media.src?`<img src="${esc(media.src)}" alt="${esc(caption)}">`:`<span class="home-memory-strip-placeholder"><i data-lucide="image"></i></span>`}${media.video?`<span class="home-memory-strip-video"><i data-lucide="play"></i></span>`:""}</span>
      <span class="home-memory-strip-author" title="${esc(author)}">${authorAvatar(memory)}</span>
      <span class="home-memory-strip-shade"></span>
      <span class="home-memory-strip-caption">${esc(caption)}</span>
    </button>`;
  }

  function shell(){
    return `<section class="home-memory-strip-shell" aria-label="Recent family memories">
      <div class="home-memory-strip-head">
        <div><h2>Family Memories</h2><p>Recent moments shared by your family.</p></div>
        <button type="button" class="home-memory-strip-viewall" data-home-memory-route="memories">View all</button>
      </div>
      <div class="home-memory-strip-track" id="homeMemoryStripTrack">
        <button class="home-memory-add-card" type="button" data-home-memory-route="add-memory">
          <span class="home-memory-add-icon"><i data-lucide="plus"></i></span>
          <span>Add memory</span>
        </button>
        <div class="home-memory-strip-loading"><span class="memory-spinner small"></span><span>Loading memories…</span></div>
      </div>
    </section>`;
  }

  function bindRoutes(root){
    root.querySelectorAll("[data-home-memory-route]").forEach(btn=>{
      if(btn.dataset.homeMemoryBound)return;
      btn.dataset.homeMemoryBound="1";
      btn.addEventListener("click",()=>window.go?.(btn.dataset.homeMemoryRoute));
    });
  }

  async function populate(root){
    const track=root.querySelector("#homeMemoryStripTrack");
    if(!track||track.dataset.loaded==="1")return;
    track.dataset.loaded="1";
    try{
      const list=await window.FB_MEMORIES?.getAll?.();
      if(!document.body.contains(track))return;
      const memories=Array.isArray(list)?list.slice(0,16):[];
      track.innerHTML=`<button class="home-memory-add-card" type="button" data-home-memory-route="add-memory"><span class="home-memory-add-icon"><i data-lucide="plus"></i></span><span>Add memory</span></button>${memories.length?memories.map(memoryCard).join(""):`<div class="home-memory-strip-empty"><i data-lucide="images"></i><strong>No memories yet</strong><span>Add the first family memory.</span></div>`}`;
      bindRoutes(root);
      track.querySelectorAll("[data-home-memory-id]").forEach(card=>card.addEventListener("click",()=>window.go?.(`view-memory:${card.dataset.homeMemoryId}`)));
      window.icons?.();
    }catch(err){
      console.warn("Home memories strip:",err);
      if(document.body.contains(track)){
        track.innerHTML=`<button class="home-memory-add-card" type="button" data-home-memory-route="add-memory"><span class="home-memory-add-icon"><i data-lucide="plus"></i></span><span>Add memory</span></button><div class="home-memory-strip-empty"><i data-lucide="triangle-alert"></i><strong>Could not load memories</strong><span>Try again in a moment.</span></div>`;
        bindRoutes(root);window.icons?.();
      }
    }
  }

  function install(){
    const screen=document.querySelector("#screen");
    if(!screen)return false;
    const hero=screen.querySelector(".home-hero");
    const existing=screen.querySelector(".home-memory-strip-shell");
    if(!hero&&!existing)return false;

    let strip=existing;
    if(!strip){
      hero.insertAdjacentHTML("beforebegin",shell());
      strip=screen.querySelector(".home-memory-strip-shell");
    }
    hero?.remove();
    if(strip){bindRoutes(strip);populate(strip);window.icons?.();}
    return true;
  }

  const app=document.getElementById("app");
  const observer=new MutationObserver(()=>{
    if(document.querySelector("#screen .home-hero")||document.querySelector("#screen .home-memory-strip-shell"))install();
  });
  if(app)observer.observe(app,{childList:true,subtree:true});
  install();

  window.addEventListener("familybook:family-data-updated",()=>{
    const strip=document.querySelector("#screen .home-memory-strip-shell");
    if(strip){const track=strip.querySelector("#homeMemoryStripTrack");if(track)delete track.dataset.loaded;populate(strip);}
  });
})();