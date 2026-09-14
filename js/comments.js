(()=>{
  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function user(){return window.FB_AUTH?.get?.()||{}}
  function isAdmin(){return (user().role||"member")==="admin"}
  function current(){
    const u=user();
    return {id:u.memberId||"owner",name:u.name||"Family member",photo:typeof window.currentUserPhoto==="function"?window.currentUserPhoto():(u.photo||"")};
  }
  function initials(name){
    const p=String(name||"Family").trim().split(/\s+/).filter(Boolean);
    return e(((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase());
  }
  function avatar(name,photo){return photo?`<img src="${e(photo)}" alt="">`:`<span>${initials(name)}</span>`}
  function rows(target){return window.FB_SOCIAL_DATA?.getComments?.(target)||[]}
  function hiddenSet(){return window.FB_SOCIAL_DATA?.getHidden?.()||new Set()}
  function timeAgo(ts){return window.FB_TIME?.activity?.(ts)||"Earlier"}

  async function add(target,text){
    const clean=String(text||"").trim();
    if(!target||!clean)return null;
    return window.FB_SOCIAL_DATA?.addComment?.(target,clean);
  }
  async function remove(target,id){
    await window.FB_SOCIAL_DATA?.deleteComment?.(id);
    return true;
  }
  async function hide(id){await window.FB_SOCIAL_DATA?.setHidden?.(id,true)}
  async function unhide(id){await window.FB_SOCIAL_DATA?.setHidden?.(id,false)}
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
          ${own||moderator||row.canDelete?`<button type="button" class="danger" data-comment-delete="${e(row.id)}"><i data-lucide="trash-2"></i>${moderator?"Remove comment":"Delete comment"}</button>`:""}
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

    mount.querySelectorAll("[data-comment-hide]").forEach(btn=>btn.onclick=async()=>{
      btn.disabled=true;
      try{await hide(btn.dataset.commentHide);render(thread);window.icons?.()}
      catch(err){alert(err.message||"Could not hide this comment.")}
    });
    mount.querySelectorAll("[data-comment-unhide]").forEach(btn=>btn.onclick=async()=>{
      btn.disabled=true;
      try{await unhide(btn.dataset.commentUnhide);render(thread);window.icons?.()}
      catch(err){alert(err.message||"Could not restore this comment.")}
    });
    mount.querySelectorAll("[data-comment-delete]").forEach(btn=>btn.onclick=async()=>{
      const id=btn.dataset.commentDelete;
      if(!confirm(isAdmin()?"Remove this comment from the family conversation?":"Delete this comment?"))return;
      btn.disabled=true;
      try{await remove(target,id);render(thread);window.icons?.()}
      catch(err){alert(err.message||"Could not delete this comment.")}
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

      form?.addEventListener("submit",async ev=>{
        ev.preventDefault();
        const text=input?.value||"";
        const send=form.querySelector(".comment-send");
        send.disabled=true;
        try{
          const row=await add(thread.dataset.commentTarget,text);
          if(!row){input?.focus();return}
          if(input)input.value="";
          panel.hidden=false;thread.classList.add("open");
          render(thread);
        }catch(err){alert(err.message||"Could not post this comment.")}
        finally{send.disabled=false}
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
