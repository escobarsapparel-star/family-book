(()=>{
  const MAX_PER_TARGET=200;

  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function user(){return window.FB_AUTH?.get?.()||{}}
  function familyKey(){return window.FB_AUTH?.familyStorageKey?.()||String(user().family||"family").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function accountKey(){return String(user().email||user().name||"owner").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function memberKey(){return String(user().memberId||accountKey()||"owner").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function commentsKey(){return `fb_comments_${familyKey()}`}
  function hiddenKey(){return `fb_hidden_comments_v2_${familyKey()}_${memberKey()}`}
  function legacyHiddenKey(){return `fb_hidden_comments_${familyKey()}_${accountKey()}`}
  function isAdmin(){return (user().role||"member")==="admin"}

  function current(){
    const u=user();
    return {
      id:u.memberId||"owner",
      name:u.name||"Family member",
      photo:typeof window.currentUserPhoto==="function"?window.currentUserPhoto():(u.photo||"")
    };
  }
  function initials(name){
    const p=String(name||"Family").trim().split(/\s+/).filter(Boolean);
    return e(((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase());
  }
  function avatar(name,photo){
    return photo?`<img src="${e(photo)}" alt="">`:`<span>${initials(name)}</span>`;
  }
  function readAll(){
    try{
      const v=JSON.parse(localStorage.getItem(commentsKey())||"{}");
      return v&&typeof v==="object"?v:{};
    }catch(_){return {}}
  }
  function saveAll(v){localStorage.setItem(commentsKey(),JSON.stringify(v||{}))}
  function rows(target){
    const all=readAll(),r=all[target];
    return Array.isArray(r)?r:[];
  }
  function hiddenSet(){
    try{
      const current=JSON.parse(localStorage.getItem(hiddenKey())||"[]"),legacy=JSON.parse(localStorage.getItem(legacyHiddenKey())||"[]");
      const set=new Set([...(Array.isArray(current)?current:[]),...(Array.isArray(legacy)?legacy:[])]);
      if(set.size)localStorage.setItem(hiddenKey(),JSON.stringify([...set]));
      return set;
    }catch(_){return new Set()}
  }
  function saveHidden(set){localStorage.setItem(hiddenKey(),JSON.stringify([...set]))}
  function timeAgo(ts){return window.FB_TIME?.activity?.(ts)||"Earlier"}

  function add(target,text){
    const clean=String(text||"").trim();
    if(!target||!clean)return null;
    const all=readAll(),list=Array.isArray(all[target])?all[target]:[],me=current();
    const row={
      id:`c_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      target,
      authorId:me.id,
      authorName:me.name,
      authorPhoto:me.photo,
      text:clean.slice(0,500),
      createdAt:Date.now()
    };
    list.push(row);
    all[target]=list.slice(-MAX_PER_TARGET);
    saveAll(all);
    window.dispatchEvent(new CustomEvent("familybook:comment",{detail:{target,comment:row}}));
    return row;
  }

  function remove(target,id){
    const all=readAll(),me=current(),list=Array.isArray(all[target])?all[target]:[];
    const row=list.find(x=>x.id===id);
    if(!row||(row.authorId!==me.id&&!isAdmin()))return false;
    const next=list.filter(x=>x.id!==id);
    if(next.length)all[target]=next;else delete all[target];
    saveAll(all);
    const h=hiddenSet();h.delete(id);saveHidden(h);
    window.dispatchEvent(new CustomEvent("familybook:comment-delete",{detail:{target,id}}));
    return true;
  }

  function hide(id){
    const h=hiddenSet();h.add(id);saveHidden(h);
  }
  function unhide(id){
    const h=hiddenSet();h.delete(id);saveHidden(h);
  }
  function count(target){return rows(target).length}

  function threadHtml(target,{compact=false,open=false}={}){
    const c=count(target);
    return `<section class="comment-thread ${compact?"compact":""} ${open?"open":""}" data-comment-target="${e(target)}">
      <button type="button" class="comment-toggle" data-comment-toggle>
        <i data-lucide="message-circle"></i>
        <span>${c?`${c} comment${c===1?"":"s"}`:"Comment"}</span>
        <i class="comment-toggle-chevron" data-lucide="chevron-down"></i>
      </button>
      <div class="comment-panel" ${open?"":"hidden"}>
        <div class="comment-list" data-comment-list></div>
        <form class="comment-composer" data-comment-form>
          <span class="comment-composer-avatar">${avatar(current().name,current().photo)}</span>
          <textarea data-comment-input rows="1" maxlength="500" placeholder="Write a comment…" aria-label="Write a comment"></textarea>
          <button type="submit" class="comment-send" aria-label="Post comment"><i data-lucide="send"></i></button>
        </form>
      </div>
    </section>`;
  }

  function commentHtml(row,isHidden){
    const own=row.authorId===current().id,moderator=isAdmin()&&!own;
    if(isHidden){
      return `<div class="comment-hidden" data-hidden-comment="${e(row.id)}">
        <i data-lucide="eye-off"></i><span>Comment hidden</span>
        <button type="button" data-comment-unhide="${e(row.id)}">Undo</button>
      </div>`;
    }
    return `<article class="comment-item" data-comment-id="${e(row.id)}">
      <span class="comment-avatar">${avatar(row.authorName,row.authorPhoto)}</span>
      <div class="comment-bubble">
        <div class="comment-meta"><strong>${e(row.authorName||"Family member")}</strong><span>${e(timeAgo(row.createdAt))}</span></div>
        <p>${e(row.text||"")}</p>
      </div>
      <div class="comment-menu-wrap">
        <button type="button" class="comment-menu-button" data-comment-menu aria-label="Comment options"><i data-lucide="more-horizontal"></i></button>
        <div class="comment-menu" hidden>
          <button type="button" data-comment-hide="${e(row.id)}"><i data-lucide="eye-off"></i>Hide comment</button>
          ${own||moderator?`<button type="button" class="danger" data-comment-delete="${e(row.id)}"><i data-lucide="trash-2"></i>${moderator?"Remove comment":"Delete comment"}</button>`:""}
        </div>
      </div>
    </article>`;
  }

  function render(thread){
    if(!thread)return;
    const target=thread.dataset.commentTarget,list=rows(target),hidden=hiddenSet();
    const mount=thread.querySelector("[data-comment-list]");
    const toggleText=thread.querySelector(".comment-toggle span");
    if(toggleText)toggleText.textContent=list.length?`${list.length} comment${list.length===1?"":"s"}`:"Comment";

    if(!mount)return;
    mount.innerHTML=list.length
      ? list.map(row=>commentHtml(row,hidden.has(row.id))).join("")
      : `<div class="comment-empty"><span>No comments yet</span><small>Start the family conversation.</small></div>`;

    mount.querySelectorAll("[data-comment-menu]").forEach(btn=>btn.onclick=ev=>{
      ev.stopPropagation();
      const menu=btn.parentElement.querySelector(".comment-menu");
      mount.querySelectorAll(".comment-menu").forEach(x=>{if(x!==menu)x.hidden=true});
      menu.hidden=!menu.hidden;
    });

    mount.querySelectorAll("[data-comment-hide]").forEach(btn=>btn.onclick=()=>{
      hide(btn.dataset.commentHide);render(thread);window.icons?.();
    });
    mount.querySelectorAll("[data-comment-unhide]").forEach(btn=>btn.onclick=()=>{
      unhide(btn.dataset.commentUnhide);render(thread);window.icons?.();
    });
    mount.querySelectorAll("[data-comment-delete]").forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.commentDelete;
      if(!confirm(isAdmin()?"Remove this comment from the family conversation?":"Delete this comment?"))return;
      remove(target,id);render(thread);window.icons?.();
    });

    window.icons?.();
  }

  function bind(holder=document){
    holder.querySelectorAll?.(".comment-thread[data-comment-target]").forEach(thread=>{
      if(thread.dataset.commentBound==="1")return;
      thread.dataset.commentBound="1";

      const toggle=thread.querySelector("[data-comment-toggle]");
      const panel=thread.querySelector(".comment-panel");
      const form=thread.querySelector("[data-comment-form]");
      const input=thread.querySelector("[data-comment-input]");

      toggle?.addEventListener("click",()=>{
        panel.hidden=!panel.hidden;
        thread.classList.toggle("open",!panel.hidden);
        if(!panel.hidden){render(thread);setTimeout(()=>input?.focus(),0)}
        window.icons?.();
      });

      form?.addEventListener("submit",ev=>{
        ev.preventDefault();
        const text=input?.value||"";
        if(!add(thread.dataset.commentTarget,text)){input?.focus();return}
        if(input)input.value="";
        panel.hidden=false;thread.classList.add("open");
        render(thread);
      });

      input?.addEventListener("keydown",ev=>{
        if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){
          ev.preventDefault();form?.requestSubmit();
        }
      });

      if(!panel?.hidden)render(thread);
    });
  }

  function summary(target){return {count:count(target)}}

  window.FB_COMMENTS={threadHtml,bind,rows,count,summary,add,remove,hide,unhide};
})();