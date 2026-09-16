(()=>{
  if(window.__fbWallFeelingPicker)return;
  window.__fbWallFeelingPicker=true;

  const FEELINGS=[
    {id:"happy",emoji:"😊",label:"Happy"},
    {id:"blessed",emoji:"🙏",label:"Blessed"},
    {id:"grateful",emoji:"🥰",label:"Grateful"},
    {id:"excited",emoji:"🤩",label:"Excited"},
    {id:"loved",emoji:"❤️",label:"Loved"},
    {id:"proud",emoji:"🙌",label:"Proud"},
    {id:"relaxed",emoji:"😌",label:"Relaxed"},
    {id:"tired",emoji:"😴",label:"Tired"},
    {id:"sad",emoji:"😔",label:"Sad"},
    {id:"worried",emoji:"😟",label:"Worried"},
    {id:"frustrated",emoji:"😤",label:"Frustrated"},
    {id:"sick",emoji:"🤒",label:"Sick"}
  ];

  const state={home:null,profile:null};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const inputFor=scope=>document.querySelector(scope==="home"?"#wallHomeText":"#profileStatusText");
  const selectFor=scope=>document.querySelector(`[data-activity-select="${scope}"]`);
  const feelingFor=id=>FEELINGS.find(x=>x.id===id)||null;

  function currentActivity(scope){
    return selectFor(scope)?.value||"update";
  }

  function ensurePanel(scope){
    const input=inputFor(scope);if(!input)return null;
    const host=input.parentElement;if(!host)return null;
    let panel=host.querySelector(`[data-feeling-panel="${scope}"]`);
    if(panel)return panel;

    panel=document.createElement("section");
    panel.className="wall-feeling-picker";
    panel.dataset.feelingPanel=scope;
    panel.hidden=true;
    panel.innerHTML=`<div class="wall-feeling-head"><div><strong>How are you feeling?</strong><span>Choose one, then add a note below if you want.</span></div></div><div class="wall-feeling-grid">${FEELINGS.map(f=>`<button type="button" class="wall-feeling-option" data-feeling="${esc(f.id)}"><span>${f.emoji}</span><strong>${esc(f.label)}</strong></button>`).join("")}</div><small class="wall-feeling-message" data-feeling-message hidden>Choose a feeling before posting.</small>`;
    input.before(panel);
    return panel;
  }

  function renderSelection(scope){
    const panel=ensurePanel(scope);if(!panel)return;
    const selected=state[scope];
    panel.querySelectorAll("[data-feeling]").forEach(btn=>btn.classList.toggle("active",btn.dataset.feeling===selected?.id));
    const message=panel.querySelector("[data-feeling-message]");
    if(message)message.hidden=true;
  }

  function show(scope){
    const panel=ensurePanel(scope);if(!panel)return;
    panel.hidden=false;
    renderSelection(scope);
    const input=inputFor(scope);
    if(input){
      const selected=state[scope];
      input.placeholder=selected
        ? `Want to say more about feeling ${selected.label.toLowerCase()}? (optional)`
        : "Choose a feeling above, then add a note if you'd like.";
    }
  }

  function hide(scope,clear=false){
    const panel=document.querySelector(`[data-feeling-panel="${scope}"]`);
    if(panel)panel.hidden=true;
    if(clear)state[scope]=null;
  }

  function sync(scope){
    if(currentActivity(scope)==="feeling")show(scope);
    else hide(scope,true);
  }

  function choose(scope,id){
    const feeling=feelingFor(id);if(!feeling)return;
    state[scope]=feeling;
    renderSelection(scope);
    const input=inputFor(scope);
    if(input)input.placeholder=`Want to say more about feeling ${feeling.label.toLowerCase()}? (optional)`;
  }

  function scopeFromActivityElement(el){
    const holder=el?.closest?.("[data-activity-scope]");
    if(holder)return holder.dataset.activityScope||"home";
    const select=el?.closest?.("[data-activity-select]");
    if(select)return select.dataset.activitySelect||"home";
    return "";
  }

  document.addEventListener("click",event=>{
    const choice=event.target?.closest?.("[data-feeling]");
    if(choice){
      const panel=choice.closest("[data-feeling-panel]");
      choose(panel?.dataset.feelingPanel||"home",choice.dataset.feeling);
      return;
    }

    const activity=event.target?.closest?.("[data-activity]");
    if(activity){
      const scope=scopeFromActivityElement(activity);
      if(scope)setTimeout(()=>sync(scope),0);
    }
  });

  document.addEventListener("change",event=>{
    const select=event.target;
    if(!(select instanceof HTMLSelectElement)||!select.matches("[data-activity-select]"))return;
    const scope=select.dataset.activitySelect||"home";
    setTimeout(()=>sync(scope),0);
  });

  document.addEventListener("click",event=>{
    const post=event.target?.closest?.("#wallHomePost,#profileStatusPost");
    if(!post)return;
    const scope=post.id==="wallHomePost"?"home":"profile";
    if(currentActivity(scope)!=="feeling")return;

    const feeling=state[scope];
    if(!feeling){
      event.preventDefault();
      event.stopImmediatePropagation();
      show(scope);
      const panel=ensurePanel(scope);
      const message=panel?.querySelector("[data-feeling-message]");
      if(message)message.hidden=false;
      panel?.classList.remove("needs-choice");
      void panel?.offsetWidth;
      panel?.classList.add("needs-choice");
      return;
    }

    const input=inputFor(scope);
    if(!input)return;
    const note=input.value.trim();
    const prefix=`${feeling.emoji} ${feeling.label}`;
    if(!note.startsWith(prefix))input.value=note?`${prefix} — ${note}`:prefix;
  },true);

  const social=window.FB_SOCIAL_DATA;
  if(social&&typeof social.savePost==="function"){
    const originalSave=social.savePost.bind(social);
    social.savePost=async function(post,attachment){
      const result=await originalSave(post,attachment);
      if(post?.activity==="feeling"){
        state.home=null;state.profile=null;
        requestAnimationFrame(()=>{sync("home");sync("profile")});
      }
      return result;
    };
  }
})();
