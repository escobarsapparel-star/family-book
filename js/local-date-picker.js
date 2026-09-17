(()=>{
  if(window.__fbLocalDatePicker)return;
  window.__fbLocalDatePicker=true;

  const pad=n=>String(n).padStart(2,"0");
  const parseISO=value=>{
    const m=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return Number.isNaN(d.getTime())?null:d;
  };
  const toISO=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const toDisplay=value=>{
    const d=parseISO(value);
    return d?`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`:"";
  };
  const sameDay=(a,b)=>a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();

  let activeSource=null;
  let cursor=null;
  let overlay=null;

  function icon(name){
    const paths={
      calendar:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
      x:'<path d="M18 6 6 18M6 6l12 12"/>',
      left:'<path d="m15 18-6-6 6-6"/>',
      right:'<path d="m9 18 6-6-6-6"/>'
    };
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||""}</svg>`;
  }

  function ensureOverlay(){
    if(overlay&&document.body.contains(overlay))return overlay;
    overlay=document.createElement("div");
    overlay.className="fb-date-overlay";
    overlay.hidden=true;
    overlay.innerHTML=`<section class="fb-date-dialog" role="dialog" aria-modal="true" aria-labelledby="fbDateTitle">
      <div class="fb-date-dialog-head">
        <div><p>Family Book</p><h2 id="fbDateTitle">Select date</h2></div>
        <button type="button" class="fb-date-close" aria-label="Close">${icon("x")}</button>
      </div>
      <div class="fb-date-nav">
        <button type="button" data-date-prev aria-label="Previous month">${icon("left")}</button>
        <div class="fb-date-month"></div>
        <button type="button" data-date-next aria-label="Next month">${icon("right")}</button>
      </div>
      <div class="fb-date-weekdays">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<span>${x}</span>`).join("")}</div>
      <div class="fb-date-grid"></div>
      <div class="fb-date-dialog-foot"><small>Date format: DD/MM/YYYY</small><button type="button" class="fb-date-clear">Clear date</button></div>
    </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click",e=>{if(e.target===overlay)closePicker()});
    overlay.querySelector(".fb-date-close").addEventListener("click",closePicker);
    overlay.querySelector("[data-date-prev]").addEventListener("click",()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);render()});
    overlay.querySelector("[data-date-next]").addEventListener("click",()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);render()});
    overlay.querySelector(".fb-date-clear").addEventListener("click",()=>{
      if(!activeSource)return;
      activeSource.value="";
      activeSource.dispatchEvent(new Event("input",{bubbles:true}));
      activeSource.dispatchEvent(new Event("change",{bubbles:true}));
      syncDisplay(activeSource);
      closePicker();
    });
    return overlay;
  }

  function render(){
    if(!activeSource||!cursor)return;
    const root=ensureOverlay();
    const month=root.querySelector(".fb-date-month");
    const grid=root.querySelector(".fb-date-grid");
    const clear=root.querySelector(".fb-date-clear");
    month.textContent=new Intl.DateTimeFormat("en-ZA",{month:"long",year:"numeric"}).format(cursor);
    clear.hidden=activeSource.dataset.fbDateRequired==="1";

    const selected=parseISO(activeSource.value);
    const today=new Date();
    today.setHours(0,0,0,0);
    const min=parseISO(activeSource.min);
    const max=parseISO(activeSource.max);
    const first=new Date(cursor.getFullYear(),cursor.getMonth(),1);
    const count=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
    const blanks=(first.getDay()+6)%7;
    let html="";
    for(let i=0;i<blanks;i++)html+='<span class="fb-date-blank"></span>';
    for(let day=1;day<=count;day++){
      const d=new Date(cursor.getFullYear(),cursor.getMonth(),day);
      const disabled=(min&&d<min)||(max&&d>max);
      const cls=["fb-date-day",sameDay(d,today)?"today":"",sameDay(d,selected)?"selected":""].filter(Boolean).join(" ");
      html+=`<button type="button" class="${cls}" data-date-day="${day}" ${disabled?"disabled":""} aria-label="${new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"long",year:"numeric"}).format(d)}">${day}</button>`;
    }
    grid.innerHTML=html;
    grid.querySelectorAll("[data-date-day]").forEach(btn=>btn.addEventListener("click",()=>{
      const d=new Date(cursor.getFullYear(),cursor.getMonth(),Number(btn.dataset.dateDay));
      activeSource.value=toISO(d);
      activeSource.dispatchEvent(new Event("input",{bubbles:true}));
      activeSource.dispatchEvent(new Event("change",{bubbles:true}));
      syncDisplay(activeSource);
      closePicker();
    }));
  }

  function openPicker(source){
    activeSource=source;
    const selected=parseISO(source.value)||new Date();
    cursor=new Date(selected.getFullYear(),selected.getMonth(),1);
    const root=ensureOverlay();
    root.hidden=false;
    document.documentElement.classList.add("fb-date-open");
    render();
    requestAnimationFrame(()=>root.querySelector(".fb-date-close")?.focus());
  }

  function closePicker(){
    if(overlay)overlay.hidden=true;
    document.documentElement.classList.remove("fb-date-open");
    activeSource=null;
  }

  function syncDisplay(source){
    const wrapper=source.closest(".fb-date-field");
    const display=wrapper?.querySelector(".fb-date-display");
    if(display)display.value=toDisplay(source.value);
  }

  function enhance(source){
    if(!source||source.dataset.fbDateEnhanced==="1")return;
    source.dataset.fbDateEnhanced="1";
    source.dataset.fbDateRequired=source.required?"1":"0";
    source.required=false;
    source.lang="en-ZA";
    source.classList.add("fb-date-source");

    const wrapper=document.createElement("div");
    wrapper.className="fb-date-field";
    source.parentNode.insertBefore(wrapper,source);
    wrapper.appendChild(source);

    const display=document.createElement("input");
    display.type="text";
    display.className="fb-date-display";
    display.placeholder="dd/mm/yyyy";
    display.readOnly=true;
    display.setAttribute("aria-label",source.getAttribute("aria-label")||"Select date");
    display.value=toDisplay(source.value);

    const button=document.createElement("button");
    button.type="button";
    button.className="fb-date-button";
    button.setAttribute("aria-label","Open date picker");
    button.innerHTML=icon("calendar");

    wrapper.append(display,button);
    const open=e=>{e.preventDefault();e.stopPropagation();openPicker(source)};
    display.addEventListener("click",open);
    button.addEventListener("click",open);
    source.addEventListener("change",()=>syncDisplay(source));

    const form=source.closest("form");
    if(form&&!form.dataset.fbDateValidation){
      form.dataset.fbDateValidation="1";
      form.addEventListener("submit",e=>{
        const missing=[...form.querySelectorAll('input.fb-date-source[data-fb-date-required="1"]')].find(x=>!x.value);
        if(!missing)return;
        e.preventDefault();
        e.stopImmediatePropagation();
        openPicker(missing);
      },true);
    }
  }

  function scan(root=document){
    root.querySelectorAll?.('input[type="date"]:not([data-fb-date-enhanced="1"])').forEach(enhance);
  }

  document.documentElement.lang="en-ZA";
  scan();
  const app=document.getElementById("app");
  if(app)new MutationObserver(mutations=>{
    for(const m of mutations){
      for(const node of m.addedNodes){if(node.nodeType===1)scan(node)}
    }
  }).observe(app,{childList:true,subtree:true});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&overlay&&!overlay.hidden)closePicker()});
})();
