(()=>{
  if(window.__fbLocalDatePicker)return;
  window.__fbLocalDatePicker=true;

  const pad=n=>String(n).padStart(2,"0");
  const parseISO=value=>{
    const m=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
    const date=new Date(y,mo-1,d);
    return date.getFullYear()===y&&date.getMonth()===mo-1&&date.getDate()===d?date:null;
  };
  const parseDisplay=value=>{
    const raw=String(value||"").trim();
    if(!raw)return null;
    let m=raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if(!m&&/^\d{8}$/.test(raw))m=[raw,raw.slice(0,2),raw.slice(2,4),raw.slice(4,8)];
    if(!m)return null;
    const d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]);
    const date=new Date(y,mo-1,d);
    return date.getFullYear()===y&&date.getMonth()===mo-1&&date.getDate()===d?date:null;
  };
  const toISO=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const toDisplay=value=>{
    const d=parseISO(value);
    return d?`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`:"";
  };
  const sameDay=(a,b)=>a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const months=Array.from({length:12},(_,i)=>new Intl.DateTimeFormat("en-ZA",{month:"long"}).format(new Date(2026,i,1)));

  let activeSource=null;
  let cursor=null;
  let overlay=null;
  let jumpOpen=false;

  function icon(name){
    const paths={
      calendar:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
      x:'<path d="M18 6 6 18M6 6l12 12"/>',
      left:'<path d="m15 18-6-6 6-6"/>',
      right:'<path d="m9 18 6-6-6-6"/>',
      down:'<path d="m6 9 6 6 6-6"/>'
    };
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||""}</svg>`;
  }

  function setSourceValue(source,date){
    source.value=date?toISO(date):"";
    source.dispatchEvent(new Event("input",{bubbles:true}));
    source.dispatchEvent(new Event("change",{bubbles:true}));
    syncDisplay(source);
  }

  function ensureOverlay(){
    if(overlay&&document.body.contains(overlay))return overlay;
    overlay=document.createElement("div");
    overlay.className="fb-date-overlay";
    overlay.hidden=true;
    overlay.style.display="none";
    overlay.innerHTML=`<section class="fb-date-dialog" role="dialog" aria-modal="true" aria-labelledby="fbDateTitle">
      <div class="fb-date-dialog-head">
        <div><p>Family Book</p><h2 id="fbDateTitle">Select date</h2></div>
        <button type="button" class="fb-date-close" aria-label="Close">${icon("x")}</button>
      </div>
      <div class="fb-date-nav">
        <button type="button" data-date-prev aria-label="Previous month">${icon("left")}</button>
        <button type="button" class="fb-date-month" data-date-jump-toggle aria-expanded="false"><span data-date-month-label></span>${icon("down")}</button>
        <button type="button" data-date-next aria-label="Next month">${icon("right")}</button>
      </div>
      <div class="fb-date-jump" hidden>
        <label><span>Month</span><select data-date-jump-month>${months.map((name,i)=>`<option value="${i}">${name}</option>`).join("")}</select></label>
        <label><span>Year</span><input type="number" inputmode="numeric" min="1000" max="9999" step="1" data-date-jump-year></label>
        <button type="button" class="fb-date-jump-apply" data-date-jump-apply>View month</button>
      </div>
      <div class="fb-date-calendar">
        <div class="fb-date-weekdays">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<span>${x}</span>`).join("")}</div>
        <div class="fb-date-grid"></div>
      </div>
      <div class="fb-date-dialog-foot"><small>You can also type DD/MM/YYYY directly.</small><button type="button" class="fb-date-clear">Clear date</button></div>
    </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click",e=>{if(e.target===overlay)closePicker()});
    overlay.querySelector(".fb-date-close").addEventListener("click",closePicker);
    overlay.querySelector("[data-date-prev]").addEventListener("click",()=>{jumpOpen=false;cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);render()});
    overlay.querySelector("[data-date-next]").addEventListener("click",()=>{jumpOpen=false;cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);render()});
    overlay.querySelector("[data-date-jump-toggle]").addEventListener("click",()=>{
      jumpOpen=!jumpOpen;
      render();
      if(jumpOpen)requestAnimationFrame(()=>overlay.querySelector("[data-date-jump-year]")?.select());
    });
    overlay.querySelector("[data-date-jump-apply]").addEventListener("click",()=>{
      const mo=Number(overlay.querySelector("[data-date-jump-month]").value);
      const year=Number(overlay.querySelector("[data-date-jump-year]").value);
      if(!Number.isInteger(year)||year<1000||year>9999)return;
      cursor=new Date(year,mo,1);
      jumpOpen=false;
      render();
    });
    overlay.querySelector("[data-date-jump-year]").addEventListener("keydown",e=>{
      if(e.key==="Enter"){
        e.preventDefault();
        overlay.querySelector("[data-date-jump-apply]").click();
      }
    });
    overlay.querySelector(".fb-date-clear").addEventListener("click",()=>{
      if(!activeSource)return;
      setSourceValue(activeSource,null);
      closePicker();
    });
    return overlay;
  }

  function render(){
    if(!activeSource||!cursor)return;
    const root=ensureOverlay();
    const monthLabel=root.querySelector("[data-date-month-label]");
    const monthButton=root.querySelector("[data-date-jump-toggle]");
    const jump=root.querySelector(".fb-date-jump");
    const calendar=root.querySelector(".fb-date-calendar");
    const grid=root.querySelector(".fb-date-grid");
    const clear=root.querySelector(".fb-date-clear");
    monthLabel.textContent=new Intl.DateTimeFormat("en-ZA",{month:"long",year:"numeric"}).format(cursor);
    monthButton.setAttribute("aria-expanded",jumpOpen?"true":"false");
    jump.hidden=!jumpOpen;
    calendar.hidden=jumpOpen;
    clear.hidden=activeSource.dataset.fbDateRequired==="1";

    const jumpMonth=root.querySelector("[data-date-jump-month]");
    const jumpYear=root.querySelector("[data-date-jump-year]");
    if(jumpMonth)jumpMonth.value=String(cursor.getMonth());
    if(jumpYear)jumpYear.value=String(cursor.getFullYear());
    if(jumpOpen)return;

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
      setSourceValue(activeSource,d);
      closePicker();
    }));
  }

  function openPicker(source){
    activeSource=source;
    const selected=parseISO(source.value)||new Date();
    cursor=new Date(selected.getFullYear(),selected.getMonth(),1);
    jumpOpen=false;
    const root=ensureOverlay();
    root.style.display="";
    root.hidden=false;
    document.documentElement.classList.add("fb-date-open");
    render();
    requestAnimationFrame(()=>root.querySelector(".fb-date-close")?.focus());
  }

  function closePicker(){
    if(overlay){
      overlay.hidden=true;
      overlay.style.display="none";
    }
    document.documentElement.classList.remove("fb-date-open");
    activeSource=null;
    jumpOpen=false;
  }

  function syncDisplay(source){
    const wrapper=source.closest(".fb-date-field");
    const display=wrapper?.querySelector(".fb-date-display");
    if(display){
      display.value=toDisplay(source.value);
      display.classList.remove("fb-date-invalid");
      display.removeAttribute("aria-invalid");
      display.setCustomValidity("");
    }
  }

  function formatTypedDate(value){
    const digits=String(value||"").replace(/\D/g,"").slice(0,8);
    if(digits.length<=2)return digits;
    if(digits.length<=4)return `${digits.slice(0,2)}/${digits.slice(2)}`;
    return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
  }

  function commitTypedDate(display,source,{allowEmpty=true}={}){
    const raw=display.value.trim();
    if(!raw&&allowEmpty){
      if(source.value)setSourceValue(source,null);
      display.classList.remove("fb-date-invalid");
      display.removeAttribute("aria-invalid");
      display.setCustomValidity("");
      return true;
    }
    const date=parseDisplay(raw);
    const min=parseISO(source.min);
    const max=parseISO(source.max);
    const valid=date&&(!min||date>=min)&&(!max||date<=max);
    if(!valid){
      display.classList.add("fb-date-invalid");
      display.setAttribute("aria-invalid","true");
      display.setCustomValidity("Enter a valid date as DD/MM/YYYY.");
      return false;
    }
    setSourceValue(source,date);
    return true;
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
    display.inputMode="numeric";
    display.maxLength=10;
    display.autocomplete="off";
    display.setAttribute("aria-label",source.getAttribute("aria-label")||"Date in DD/MM/YYYY format");
    display.value=toDisplay(source.value);

    const button=document.createElement("button");
    button.type="button";
    button.className="fb-date-button";
    button.setAttribute("aria-label","Open date picker");
    button.innerHTML=icon("calendar");

    wrapper.append(display,button);
    button.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openPicker(source)});
    display.addEventListener("input",()=>{
      display.value=formatTypedDate(display.value);
      display.classList.remove("fb-date-invalid");
      display.removeAttribute("aria-invalid");
      display.setCustomValidity("");
    });
    display.addEventListener("blur",()=>commitTypedDate(display,source,{allowEmpty:source.dataset.fbDateRequired!=="1"}));
    display.addEventListener("keydown",e=>{
      if(e.key==="Enter"){
        if(commitTypedDate(display,source,{allowEmpty:source.dataset.fbDateRequired!=="1"}))display.blur();
      }
      if((e.key==="ArrowDown"||e.key==="F4")&&!e.altKey){
        e.preventDefault();
        openPicker(source);
      }
    });
    source.addEventListener("change",()=>syncDisplay(source));

    const form=source.closest("form");
    if(form&&!form.dataset.fbDateValidation){
      form.dataset.fbDateValidation="1";
      form.addEventListener("submit",e=>{
        const displays=[...form.querySelectorAll('.fb-date-display')];
        const invalidDisplay=displays.find(d=>{
          const s=d.closest('.fb-date-field')?.querySelector('.fb-date-source');
          if(!s)return false;
          return !commitTypedDate(d,s,{allowEmpty:s.dataset.fbDateRequired!=="1"});
        });
        if(invalidDisplay){
          e.preventDefault();
          e.stopImmediatePropagation();
          invalidDisplay.focus();
          return;
        }
        const missing=[...form.querySelectorAll('input.fb-date-source[data-fb-date-required="1"]')].find(x=>!x.value);
        if(!missing)return;
        e.preventDefault();
        e.stopImmediatePropagation();
        missing.closest('.fb-date-field')?.querySelector('.fb-date-display')?.focus();
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
  window.addEventListener("popstate",()=>{if(overlay&&!overlay.hidden)closePicker()});
})();
