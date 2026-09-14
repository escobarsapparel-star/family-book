(()=>{
  const TYPES={
    love:{label:"Love",icon:"heart"},
    like:{label:"Like",icon:"thumbs-up"},
    celebrate:{label:"Celebrate",icon:"party-popper"}
  };

  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function user(){return window.FB_AUTH?.get?.()||{}}
  function familyKey(){return window.FB_AUTH?.familyStorageKey?.()||String(user().family||"family").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function key(){return `fb_reactions_${familyKey()}`}
  function current(){
    const u=user();
    return {
      id:u.memberId||"owner",
      name:u.name||"Family member",
      photo:typeof window.currentUserPhoto==="function"?window.currentUserPhoto():(u.photo||"")
    };
  }
  function read(){
    try{
      const v=JSON.parse(localStorage.getItem(key())||"{}");
      return v&&typeof v==="object"?v:{};
    }catch(_){return {}}
  }
  function save(v){localStorage.setItem(key(),JSON.stringify(v||{}))}
  function targetRows(target){
    const all=read();
    const rows=all[target];
    return rows&&typeof rows==="object"?rows:{};
  }
  function summary(target){
    const rows=targetRows(target),me=current();
    const counts={love:0,like:0,celebrate:0};
    let mine="";
    Object.values(rows).forEach(r=>{
      if(r&&TYPES[r.type])counts[r.type]++;
    });
    if(rows[me.id]?.type)mine=rows[me.id].type;
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    return {counts,mine,total,rows};
  }
  function toggle(target,type){
    if(!target||!TYPES[type])return summary(target);
    const all=read(),rows=all[target]&&typeof all[target]==="object"?all[target]:{},me=current();
    if(rows[me.id]?.type===type)delete rows[me.id];
    else rows[me.id]={type,name:me.name,photo:me.photo,at:Date.now()};
    if(Object.keys(rows).length)all[target]=rows;else delete all[target];
    save(all);
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
      bar.querySelectorAll("[data-reaction-type]").forEach(btn=>btn.onclick=ev=>{
        ev.preventDefault();ev.stopPropagation();
        toggle(bar.dataset.reactionTarget,btn.dataset.reactionType);
        refreshBar(bar);
        window.icons?.();
      });
    });
  }

  window.FB_REACTIONS={controlsHtml,bind,summary,toggle,refreshBar};
})();