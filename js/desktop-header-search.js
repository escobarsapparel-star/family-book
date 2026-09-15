(()=>{
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const members=()=>window.ensureOwner?.()||window.FB_FAMILY_DATA?.getPeople?.()||[];
  const posts=()=>window.FB_SOCIAL_DATA?.getPosts?.()||[];

  function cleanPostText(post){
    const raw=String(post?.text||"").trim();
    const markerMatch=raw.match(/^\[\[FB_(LISTENING|WATCHING)\]\](\{[^\n]*\})(?:\n([\s\S]*))?$/);
    if(markerMatch){
      try{
        const meta=JSON.parse(markerMatch[2]);
        const title=String(meta.title||meta.track_name||meta.name||"").trim();
        const note=String(markerMatch[3]||"").trim();
        return [title,note].filter(Boolean).join(" — ")||post.activity||"Family post";
      }catch(_){}
    }
    return raw.replace(/^\[\[FB_[A-Z_]+\]\]/,"").trim()||String(post?.activity||"Family post").replace(/_/g," ");
  }

  function timeLabel(ts){
    try{return window.FB_TIME?.activity?.(ts)||""}catch(_){return ""}
  }

  function searchShell(){
    return `<div class="desktop-family-search" id="desktopFamilySearch">
      <div class="desktop-family-search-box">
        <i data-lucide="search"></i>
        <input id="desktopFamilySearchInput" type="search" autocomplete="off" spellcheck="false" placeholder="Search members and posts" aria-label="Search members and posts" aria-expanded="false" aria-controls="desktopFamilySearchResults">
        <button type="button" id="desktopFamilySearchClear" aria-label="Clear search" hidden><i data-lucide="x"></i></button>
      </div>
      <div class="desktop-family-search-results" id="desktopFamilySearchResults" hidden></div>
    </div>`;
  }

  function memberResult(m){
    const p=m.photo||"";
    const initials=String(m.name||"Family member").trim().split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join("").toUpperCase()||"F";
    return `<button type="button" class="desktop-search-result" data-search-member="${esc(m.id)}">
      <span class="desktop-search-avatar">${p?`<img src="${esc(p)}" alt="">`:`${esc(initials)}`}</span>
      <span class="desktop-search-copy"><strong>${esc(m.name||"Family member")}</strong><small>${esc(m.relationship||m.email||"Family member")}</small></span>
      <i data-lucide="chevron-right"></i>
    </button>`;
  }

  function postResult(p){
    const text=cleanPostText(p);
    const short=text.length>78?`${text.slice(0,78).trim()}…`:text;
    const meta=[p.authorName||"Family member",timeLabel(p.createdAt)].filter(Boolean).join(" · ");
    return `<button type="button" class="desktop-search-result desktop-search-post" data-search-post="${esc(p.id)}">
      <span class="desktop-search-post-icon"><i data-lucide="message-circle"></i></span>
      <span class="desktop-search-copy"><strong>${esc(short||"Family Wall post")}</strong><small>${esc(meta)}</small></span>
      <i data-lucide="chevron-right"></i>
    </button>`;
  }

  function renderSearch(query){
    const results=document.querySelector("#desktopFamilySearchResults");
    const input=document.querySelector("#desktopFamilySearchInput");
    const clear=document.querySelector("#desktopFamilySearchClear");
    if(!results||!input)return;
    const q=String(query||"").trim().toLowerCase();
    if(clear)clear.hidden=!q;
    if(q.length<2){
      results.hidden=true;results.innerHTML="";input.setAttribute("aria-expanded","false");return;
    }

    const memberMatches=members().filter(m=>{
      const hay=[m.name,m.relationship,m.email].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0,6);

    const postMatches=posts().filter(p=>{
      const hay=[p.authorName,p.text,p.activity,p.location,cleanPostText(p)].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    }).slice(0,6);

    if(!memberMatches.length&&!postMatches.length){
      results.innerHTML=`<div class="desktop-search-empty"><i data-lucide="search-x"></i><strong>No Family Book results</strong><small>Try a family member's name or words from a post.</small></div>`;
    }else{
      results.innerHTML=`${memberMatches.length?`<section><p>Members</p>${memberMatches.map(memberResult).join("")}</section>`:""}${postMatches.length?`<section><p>Posts</p>${postMatches.map(postResult).join("")}</section>`:""}`;
    }
    results.hidden=false;input.setAttribute("aria-expanded","true");
    bindResultActions(results);window.icons?.();
  }

  function closeSearch(clearValue=false){
    const results=document.querySelector("#desktopFamilySearchResults"),input=document.querySelector("#desktopFamilySearchInput"),clear=document.querySelector("#desktopFamilySearchClear");
    if(results){results.hidden=true;results.innerHTML=""}
    if(input){input.setAttribute("aria-expanded","false");if(clearValue)input.value=""}
    if(clear)clear.hidden=!(input?.value||"").trim();
  }

  function focusPost(postId){
    const post=posts().find(p=>String(p.id)===String(postId));
    try{window.go?.("home")}catch(_){}
    closeSearch(true);
    setTimeout(()=>{
      const cards=[...document.querySelectorAll(".wall-post:not(.wall-memory-post)")];
      if(!cards.length)return;
      const raw=String(post?.text||"").trim().toLowerCase();
      const visible=cleanPostText(post).toLowerCase();
      const author=String(post?.authorName||"").trim().toLowerCase();
      const needles=[raw.slice(0,48),visible.slice(0,48)].filter(x=>x.length>4);
      let card=cards.find(el=>needles.some(n=>el.textContent.toLowerCase().includes(n)));
      if(!card&&author)card=cards.find(el=>el.textContent.toLowerCase().includes(author));
      if(card){
        card.scrollIntoView({behavior:"smooth",block:"center"});
        card.classList.add("desktop-search-highlight");
        setTimeout(()=>card.classList.remove("desktop-search-highlight"),2200);
      }
    },180);
  }

  function bindResultActions(root){
    root.querySelectorAll("[data-search-member]").forEach(btn=>btn.onclick=()=>{
      closeSearch(true);
      try{window.go?.(`view-member:${btn.dataset.searchMember}`)}catch(_){}
    });
    root.querySelectorAll("[data-search-post]").forEach(btn=>btn.onclick=()=>focusPost(btn.dataset.searchPost));
  }

  function bindSearch(){
    const wrap=document.querySelector("#desktopFamilySearch");
    const input=document.querySelector("#desktopFamilySearchInput");
    const clear=document.querySelector("#desktopFamilySearchClear");
    if(!wrap||!input||wrap.dataset.bound)return;
    wrap.dataset.bound="1";
    input.addEventListener("input",()=>renderSearch(input.value));
    input.addEventListener("focus",()=>{if(input.value.trim().length>=2)renderSearch(input.value)});
    input.addEventListener("keydown",e=>{if(e.key==="Escape"){closeSearch();input.blur()}});
    clear?.addEventListener("click",()=>{input.value="";closeSearch();input.focus()});
    document.addEventListener("pointerdown",e=>{if(!wrap.contains(e.target))closeSearch()});
  }

  function install(){
    const app=document.querySelector("#app>.app"),top=app?.querySelector(".topbar"),brand=top?.querySelector(".brand-home");
    if(!app||!top||!brand||top.querySelector(".desktop-header-left"))return false;

    const left=document.createElement("div");
    left.className="desktop-header-left";
    brand.classList.add("desktop-header-brand");
    brand.innerHTML=`<img class="desktop-brand-logo" src="assets/logo/family-book-logo-dark.png" alt="Family Book">`;
    top.insertBefore(left,top.firstChild);
    left.appendChild(brand);
    left.insertAdjacentHTML("beforeend",searchShell());
    bindSearch();window.icons?.();
    return true;
  }

  const root=document.getElementById("app");
  const observer=new MutationObserver(()=>install());
  if(root)observer.observe(root,{childList:true,subtree:true});
  install();
})();
