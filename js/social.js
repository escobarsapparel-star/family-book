(()=>{
  const TYPES={
    love:{label:"Love",icon:"heart"},
    like:{label:"Like",icon:"thumbs-up"},
    celebrate:{label:"Celebrate",icon:"party-popper"}
  };

  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function user(){return window.FB_AUTH?.get?.()||{}}
  function targetRows(target){return window.FB_SOCIAL_DATA?.getReactions?.(target)||{}}

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
      <span class="reaction-total" data-reaction-total>${s.total?`${s.total} reaction${s.total===1?"":"s"}`:""}</span>
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
    if(total)total.textContent=s.total?`${s.total} reaction${s.total===1?"":"s"}`:"";
  }

  function bind(holder=document){
    holder.querySelectorAll?.(".reaction-bar[data-reaction-target]").forEach(bar=>{
      if(bar.dataset.reactionBound==="1")return;
      bar.dataset.reactionBound="1";
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

  window.FB_REACTIONS={controlsHtml,bind,summary,toggle,refreshBar};
})();
