(()=>{
  const api=window.FB_MEMORIES;
  if(!api?.bindRoute||!api?.getOne)return;

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const formatDateTime=(date,time)=>{
    if(!date)return "";
    const [y,m,d]=String(date).split("-").map(Number);
    const dt=new Date(y,(m||1)-1,d||1);
    let text=new Intl.DateTimeFormat(undefined,{day:"numeric",month:"long",year:"numeric"}).format(dt);
    if(time){
      const [hh,mm]=String(time).split(":").map(Number);
      const td=new Date(2000,0,1,hh||0,mm||0);
      text+=` · ${new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit"}).format(td)}`;
    }
    return text;
  };
  const initials=name=>{
    const p=String(name||"Family member").trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase();
  };

  async function polish(id){
    const page=document.querySelector(`.memory-detail-page[data-memory-detail-id="${CSS.escape(String(id))}"]`);
    const mount=page?.querySelector("#memoryDetailMount.memory-detail-card");
    if(!mount||mount.dataset.detailPolished===String(id))return;

    const m=await api.getOne(id).catch(()=>null);
    if(!m||!document.body.contains(mount))return;
    mount.dataset.detailPolished=String(id);
    mount.classList.add("memory-detail-polished");

    const copy=mount.querySelector(".memory-detail-copy");
    const head=copy?.querySelector(".memory-detail-head");
    if(!copy||!head)return;

    const caption=String(m.caption||"").trim();
    const story=String(m.story||"").trim();
    const dateText=formatDateTime(m.date,m.time);
    const photos=api.getPhotos?.(m)||[];

    const title=head.querySelector("h1");
    if(title)title.textContent=caption||"Family memory";

    const date=head.querySelector(".memory-detail-date");
    if(date){
      if(dateText)date.innerHTML=`<i data-lucide="calendar-days"></i><span>${esc(dateText)}</span>`;
      else date.remove();
    }

    const originalTopEdit=head.querySelector('[data-r^="edit-memory:"]');
    const bottomActions=copy.querySelector(".memory-detail-actions");
    const bottomEdit=bottomActions?.querySelector('[data-r^="edit-memory:"]');
    const deleteBtn=bottomActions?.querySelector("#deleteMemory");
    const editBtn=bottomEdit||originalTopEdit;
    if(originalTopEdit&&originalTopEdit!==editBtn)originalTopEdit.remove();

    const controls=document.createElement("div");
    controls.className="memory-detail-head-actions";
    if(editBtn){
      editBtn.className="memory-detail-edit-action";
      editBtn.innerHTML='<i data-lucide="pencil"></i><span>Edit</span>';
      controls.appendChild(editBtn);
    }

    const moreWrap=document.createElement("div");
    moreWrap.className="memory-detail-more-wrap";
    const moreBtn=document.createElement("button");
    moreBtn.type="button";
    moreBtn.className="memory-detail-more-button";
    moreBtn.setAttribute("aria-label","More memory options");
    moreBtn.setAttribute("aria-expanded","false");
    moreBtn.innerHTML='<i data-lucide="ellipsis"></i>';
    const menu=document.createElement("div");
    menu.className="memory-detail-more-menu hidden";
    if(deleteBtn){
      deleteBtn.className="memory-detail-menu-delete";
      deleteBtn.innerHTML='<i data-lucide="trash-2"></i><span>Delete memory</span>';
      menu.appendChild(deleteBtn);
    }
    moreWrap.append(moreBtn,menu);
    controls.appendChild(moreWrap);

    const oldActionNode=head.lastElementChild;
    if(oldActionNode&&oldActionNode!==head.firstElementChild&&!oldActionNode.classList.contains("memory-detail-head-actions"))oldActionNode.remove();
    head.appendChild(controls);
    bottomActions?.remove();

    const oldMeta=copy.querySelector(".memory-detail-meta");
    oldMeta?.remove();

    const intro=document.createElement("section");
    intro.className="memory-detail-intro";
    const authorName=String(m.authorName||"Family member").trim()||"Family member";
    const authorPhoto=String(m.authorPhoto||"");
    intro.innerHTML=`<div class="memory-detail-author">${authorPhoto?`<img src="${esc(authorPhoto)}" alt="">`:`<span>${esc(initials(authorName))}</span>`}<div><small>Shared by</small><strong>${esc(authorName)}</strong></div></div><div class="memory-detail-facts">${photos.length>1?`<span><i data-lucide="images"></i>${photos.length} media items</span>`:""}${m.dateSource==="exif"&&dateText?`<span><i data-lucide="scan-line"></i>Original capture</span>`:""}</div>`;
    head.insertAdjacentElement("afterend",intro);

    if(!caption){
      const empty=document.createElement("button");
      empty.type="button";
      empty.className="memory-detail-add-caption";
      empty.dataset.r=`edit-memory:${m.id}`;
      empty.innerHTML='<i data-lucide="message-square-plus"></i><span><strong>Add a caption or story</strong><small>Give this memory a little context.</small></span>';
      intro.insertAdjacentElement("afterend",empty);
      empty.onclick=()=>window.go?.(empty.dataset.r);
    }else if(story&&story!==caption){
      const storyBox=document.createElement("section");
      storyBox.className="memory-detail-story";
      storyBox.innerHTML=`<span>Story</span><p>${esc(story)}</p>`;
      intro.insertAdjacentElement("afterend",storyBox);
    }

    const tags=copy.querySelector(".memory-detail-tags");
    if(tags){
      const label=tags.querySelector(":scope > span");
      if(label)label.textContent="People in this memory";
    }

    moreBtn.onclick=ev=>{
      ev.stopPropagation();
      const open=menu.classList.toggle("hidden")===false;
      moreBtn.setAttribute("aria-expanded",open?"true":"false");
    };
    menu.onclick=ev=>ev.stopPropagation();
    const closeMenu=()=>{menu.classList.add("hidden");moreBtn.setAttribute("aria-expanded","false")};
    document.addEventListener("click",closeMenu,{once:true,capture:false});
    moreBtn.addEventListener("click",()=>{
      if(!menu.classList.contains("hidden"))setTimeout(()=>document.addEventListener("click",closeMenu,{once:true}),0);
    });

    window.icons?.();
  }

  const original=api.bindRoute.bind(api);
  api.bindRoute=async function(route){
    const result=await original(route);
    if(String(route||"").startsWith("view-memory:")){
      const id=String(route).slice("view-memory:".length);
      await polish(id);
    }
    return result;
  };
})();