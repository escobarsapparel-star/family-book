(()=>{
  const TYPES={
    love:{label:"Love",icon:"heart"},
    like:{label:"Like",icon:"thumbs-up"},
    celebrate:{label:"Celebrate",icon:"party-popper"}
  };

  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function user(){return window.FB_AUTH?.get?.()||{}}
  function targetRows(target){return window.FB_SOCIAL_DATA?.getReactions?.(target)||{}}
  function initials(name){
    const parts=String(name||"Family member").trim().split(/\s+/).filter(Boolean);
    return e(((parts[0]?.[0]||"F")+(parts.length>1?(parts.at(-1)?.[0]||""):"")).toUpperCase());
  }
  function reactionRows(target,type=""){
    return Object.entries(targetRows(target))
      .map(([userId,row])=>({userId,...row}))
      .filter(row=>row&&TYPES[row.type]&&(!type||row.type===type))
      .sort((a,b)=>(Number(b.at)||0)-(Number(a.at)||0)||String(a.name||"").localeCompare(String(b.name||"")));
  }

  function summary(target){
    const rows=targetRows(target),u=user();
    const counts={love:0,like:0,celebrate:0};
    let mine="";
    Object.values(rows).forEach(r=>{if(r&&TYPES[r.type])counts[r.type]++});
    if(rows[u.supabaseUserId]?.type)mine=rows[u.supabaseUserId].type;
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    return {counts,mine,total,rows};
  }

  async function toggle(target,type){
    if(!target||!TYPES[type])return summary(target);
    await window.FB_SOCIAL_DATA?.setReaction?.(target,type);
    window.dispatchEvent(new CustomEvent("familybook:reaction",{detail:{target,type}}));
    return summary(target);
  }

  function controlsHtml(target,{compact=false}={}){
    const s=summary(target);
    return `<div class="reaction-bar ${compact?"compact":""}" data-reaction-target="${e(target)}">
      ${Object.entries(TYPES).map(([id,t])=>`<button type="button" class="reaction-button ${s.mine===id?"active":""}" data-reaction-type="${id}" aria-label="${e(t.label)}"><i data-lucide="${t.icon}"></i><span>${e(t.label)}</span><b data-reaction-count="${id}">${s.counts[id]||""}</b></button>`).join("")}
      <button type="button" class="reaction-total" data-reaction-total aria-label="View who reacted" ${s.total?"":"hidden"}>${s.total?`${s.total} reaction${s.total===1?"":"s"}`:""}</button>
    </div>`;
  }

  function refreshBar(bar){
    if(!bar)return;
    const target=bar.dataset.reactionTarget,s=summary(target);
    bar.querySelectorAll("[data-reaction-type]").forEach(btn=>{
      const type=btn.dataset.reactionType;
      btn.classList.toggle("active",s.mine===type);
      const count=btn.querySelector(`[data-reaction-count="${type}"]`);
      if(count)count.textContent=s.counts[type]||"";
    });
    const total=bar.querySelector("[data-reaction-total]");
    if(total){
      total.textContent=s.total?`${s.total} reaction${s.total===1?"":"s"}`:"";
      total.hidden=!s.total;
    }
  }

  function closeViewer(){
    const overlay=document.querySelector(".reaction-viewer-overlay");
    if(!overlay)return;
    overlay.remove();
    document.body.classList.remove("reaction-viewer-open");
  }

  function viewerRowsHtml(target,filter=""){
    const rows=reactionRows(target,filter);
    if(!rows.length)return '<div class="reaction-viewer-empty"><i data-lucide="users-round"></i><strong>No reactions here yet</strong></div>';
    return rows.map(row=>{
      const t=TYPES[row.type];
      const avatar=row.photo?'<img src="'+e(row.photo)+'" alt="">':'<span>'+initials(row.name)+'</span>';
      const attrs=row.personId?' data-reaction-person="'+e(row.personId)+'" role="button" tabindex="0"':"";
      return '<div class="reaction-viewer-person"'+attrs+'>'+
        '<span class="reaction-viewer-avatar">'+avatar+'</span>'+
        '<span class="reaction-viewer-name"><strong>'+e(row.name||"Family member")+'</strong><small>'+e(t.label)+'</small></span>'+
        '<span class="reaction-viewer-badge is-'+e(row.type)+'" aria-label="'+e(t.label)+'"><i data-lucide="'+e(t.icon)+'"></i></span>'+
      '</div>';
    }).join("");
  }

  function bindViewerPeople(root){
    root?.querySelectorAll?.("[data-reaction-person]").forEach(row=>{
      const open=()=>{
        const id=row.dataset.reactionPerson;
        closeViewer();
        if(id)window.go?.("view-member:"+id);
      };
      row.addEventListener("click",open);
      row.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}});
    });
  }

  function openViewer(target,initialFilter=""){
    const sum=summary(target);
    if(!sum.total)return;
    closeViewer();
    const filters=[["","All",sum.total],...Object.entries(TYPES).map(([id,t])=>[id,t.label,sum.counts[id]||0])];
    const overlay=document.createElement("div");
    overlay.className="reaction-viewer-overlay";
    const tabs=filters.map(([id,label,count])=>'<button type="button" data-reaction-filter="'+e(id)+'" class="'+(id===initialFilter?"active":"")+'" '+(count?"":"disabled")+' >'+e(label)+(count?' <b>'+count+'</b>':"")+'</button>').join("");
    overlay.innerHTML='<section class="reaction-viewer" role="dialog" aria-modal="true" aria-label="Reactions">'+
      '<div class="reaction-viewer-head"><div><p>FAMILY REACTIONS</p><h2>Who reacted</h2></div><button type="button" class="reaction-viewer-close" aria-label="Close"><i data-lucide="x"></i></button></div>'+
      '<div class="reaction-viewer-tabs">'+tabs+'</div>'+
      '<div class="reaction-viewer-list">'+viewerRowsHtml(target,initialFilter)+'</div></section>';
    document.body.appendChild(overlay);
    document.body.classList.add("reaction-viewer-open");
    const list=overlay.querySelector(".reaction-viewer-list");
    overlay.querySelector(".reaction-viewer-close")?.addEventListener("click",closeViewer);
    overlay.addEventListener("click",ev=>{if(ev.target===overlay)closeViewer()});
    const onKey=ev=>{if(ev.key==="Escape"){document.removeEventListener("keydown",onKey);closeViewer()}};
    document.addEventListener("keydown",onKey);
    overlay.querySelectorAll("[data-reaction-filter]").forEach(btn=>btn.addEventListener("click",()=>{
      if(btn.disabled)return;
      overlay.querySelectorAll("[data-reaction-filter]").forEach(x=>x.classList.toggle("active",x===btn));
      list.innerHTML=viewerRowsHtml(target,btn.dataset.reactionFilter||"");
      bindViewerPeople(list);
      window.icons?.();
    }));
    bindViewerPeople(list);
    window.icons?.();
  }

  function bind(holder=document){
    holder.querySelectorAll?.(".reaction-bar[data-reaction-target]").forEach(bar=>{
      if(bar.dataset.reactionBound==="1")return;
      bar.dataset.reactionBound="1";
      bar.querySelector("[data-reaction-total]")?.addEventListener("click",ev=>{
        ev.preventDefault();ev.stopPropagation();openViewer(bar.dataset.reactionTarget);
      });
      bar.querySelectorAll("[data-reaction-type]").forEach(btn=>btn.onclick=async ev=>{
        ev.preventDefault();ev.stopPropagation();
        btn.disabled=true;
        try{
          await toggle(bar.dataset.reactionTarget,btn.dataset.reactionType);
          refreshBar(bar);
          window.icons?.();
        }catch(err){alert(err.message||"Could not save this reaction.")}
        finally{btn.disabled=false}
      });
    });
  }

  window.FB_REACTIONS={controlsHtml,bind,summary,toggle,refreshBar,openViewer,closeViewer};
})();
