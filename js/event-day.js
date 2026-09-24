(()=>{
  const SEEN_PREFIX="fb_event_day_seen_v2:";
  const CAPTURE_KEY="fb_event_day_capture_v1";
  let lastRoute="";

  function pad(n){return String(n).padStart(2,"0")}
  function ymd(d=new Date()){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
  function esc(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function familyKey(){
    const u=window.FB_AUTH?.get?.()||{};
    return String(u.familyId||u.family||"family").replace(/[^a-z0-9-]+/gi,"_");
  }
  function eventKey(row){return `${SEEN_PREFIX}${familyKey()}:${row.id}:${row.date}`}
  function isSeen(row){try{return localStorage.getItem(eventKey(row))==="1"}catch(_){return false}}
  function markSeen(row){try{localStorage.setItem(eventKey(row),"1")}catch(_){}}
  function todayRows(){
    const today=ymd();
    return (window.FB_CALENDAR?.getUpcoming?.(2)||[]).filter(row=>row?.date===today);
  }
  function isBirthday(row){
    return row?.kind==="birthday"||String(row?.id||"").startsWith("birthday:");
  }
  function isTravel(row){
    if(isBirthday(row))return false;
    const hay=`${row?.title||""} ${row?.location||""} ${row?.type||""}`.toLowerCase();
    return String(row?.type||"").toLowerCase()==="holiday"||
      /\b(trip|travel|vacation|holiday|holidaying|flight|airport|resort|cruise|getaway|road\s*trip|weekend\s*away)\b/.test(hay);
  }
  function eventTheme(row){
    if(isBirthday(row))return "birthday";
    if(isTravel(row))return "travel";
    return "family";
  }
  function memberForBirthday(row){
    const id=String(row?.memberId||String(row?.id||"").split(":")[1]||"");
    try{return (window.ensureOwner?.()||[]).find(m=>String(m.id)===id)||null}catch(_){return null}
  }
  function captureContextFor(row){
    const birthday=String(row.id||"").startsWith("birthday:");
    return {
      eventId:String(row.id||""),
      title:String(row.title||"Family event"),
      date:String(row.date||ymd()),
      location:String(row.location||""),
      memberIds:Array.isArray(row.memberIds)?row.memberIds.map(String):[],
      type:birthday?"birthday":String(row.type||"family"),
      frameTheme:eventTheme(row),
      caption:String(row.title||"Family event")
    };
  }
  function setCaptureContext(row){
    const ctx=captureContextFor(row);
    try{sessionStorage.setItem(CAPTURE_KEY,JSON.stringify(ctx))}catch(_){}
    return ctx;
  }
  function getCaptureContext(){
    try{return JSON.parse(sessionStorage.getItem(CAPTURE_KEY)||"null")}catch(_){return null}
  }
  function clearCaptureContext(){try{sessionStorage.removeItem(CAPTURE_KEY)}catch(_){}}

  function eventSubtitle(row){
    const bits=[];
    if(row.startTime)bits.push(row.startTime);
    if(row.location)bits.push(row.location);
    return bits.join(" · ")||"Today";
  }

  function closeOverlay(row){
    markSeen(row);
    document.querySelector(".fb-event-day-overlay")?.remove();
    enhanceCurrentRoute(lastRoute);
  }

  function openCapture(row){
    markSeen(row);
    setCaptureContext(row);
    document.querySelector(".fb-event-day-overlay")?.remove();
    window.go?.("add-memory");
  }

  function openEvent(row){
    markSeen(row);
    document.querySelector(".fb-event-day-overlay")?.remove();
    window.go?.(`view-event:${row.id}`);
  }

  function welcomeMarkup(row){
    const theme=eventTheme(row);
    const travel=theme==="travel",birthday=theme==="birthday";
    const person=birthday?memberForBirthday(row):null;
    const destination=row.location||"Today's adventure";
    const birthdayName=person?.name||String(row.title||"Birthday").replace(/['’]s birthday$/i,"");
    const motion=birthday
      ? `<div class="fb-event-party-layer" aria-hidden="true"><span class="fb-balloon b1">●</span><span class="fb-balloon b2">●</span><span class="fb-balloon b3">●</span><span class="fb-confetti k1"></span><span class="fb-confetti k2"></span><span class="fb-confetti k3"></span><span class="fb-confetti k4"></span><span class="fb-confetti k5"></span><span class="fb-confetti k6"></span></div>`
      : travel
        ? `<div class="fb-event-flight-layer" aria-hidden="true"><span class="fb-event-flight-trail"></span><span class="fb-event-plane">✈</span><span class="fb-event-cloud c1"></span><span class="fb-event-cloud c2"></span><span class="fb-event-cloud c3"></span></div>`
        : "";
    const art=birthday
      ? `<div class="fb-event-day-art fb-birthday-art"><span class="fb-birthday-glow"></span><span class="fb-birthday-cake">🎂</span>${person?.photo?`<span class="fb-birthday-person"><img src="${esc(person.photo)}" alt=""></span>`:""}<span class="fb-birthday-stars">✦ ✧ ✦</span></div>`
      : travel
        ? `<div class="fb-event-day-art fb-travel-art"><span class="fb-event-sun"></span><span class="fb-event-island island-a"></span><span class="fb-event-island island-b"></span><span class="fb-event-water"></span><span class="fb-event-palm palm-a">🌴</span><span class="fb-event-palm palm-b">🌴</span><span class="fb-event-suitcase">🧳</span><span class="fb-event-pin"><i data-lucide="map-pin"></i>${esc(destination)}</span></div>`
        : `<div class="fb-event-day-art fb-family-art"><span class="fb-family-event-orbit"></span><span class="fb-family-event-icon"><i data-lucide="heart-handshake"></i></span><span class="fb-family-event-spark s1">✦</span><span class="fb-family-event-spark s2">✧</span><span class="fb-family-event-spark s3">✦</span></div>`;
    const kicker=birthday?"TODAY WE CELEBRATE":"TODAY'S FAMILY EVENT";
    const title=birthday?`${birthdayName}'s Birthday`:(row.title||"Family event");
    const ribbon=birthday?"Happy Birthday!":travel?"Bon Voyage!":"Make today a memory!";
    const message=birthday
      ? `Make ${birthdayName}'s special day part of the family story.`
      : travel?"Wishing them a safe and beautiful journey.":"A special family moment is happening today.";
    const viewLabel=birthday?"View birthday":"View event";
    const captureLabel=birthday?"Capture Birthday":"Capture the Day";
    return `<div class="fb-event-day-overlay" role="dialog" aria-modal="true" aria-label="${birthday?"Today's birthday":"Today's family event"}">
      ${motion}
      <section class="fb-event-day-card is-${theme}">
        <button type="button" class="fb-event-day-close" aria-label="Close"><i data-lucide="x"></i></button>
        ${art}
        <div class="fb-event-day-copy">
          <p class="fb-event-kicker"><i data-lucide="${birthday?"cake-slice":travel?"plane":"sparkles"}"></i> ${kicker}</p>
          <h2>${esc(title)}</h2>
          <p class="fb-event-meta">${birthday?"Today":esc(eventSubtitle(row))}</p>
          <strong class="fb-event-bonvoyage">${ribbon}</strong>
          <p>${esc(message)}</p>
          <div class="fb-event-day-actions">
            <button type="button" class="primary fb-event-view"><i data-lucide="${birthday?"cake-slice":"calendar-heart"}"></i><span>${viewLabel}</span></button>
            <button type="button" class="secondary fb-event-capture"><i data-lucide="camera"></i><span>${captureLabel}</span></button>
          </div>
        </div>
      </section>
    </div>`;
  }

  function showWelcome(row){
    if(!row||isSeen(row)||document.querySelector(".fb-event-day-overlay"))return false;
    document.body.insertAdjacentHTML("beforeend",welcomeMarkup(row));
    const overlay=document.querySelector(".fb-event-day-overlay");
    overlay.querySelector(".fb-event-day-close")?.addEventListener("click",()=>closeOverlay(row));
    overlay.querySelector(".fb-event-view")?.addEventListener("click",()=>openEvent(row));
    overlay.querySelector(".fb-event-capture")?.addEventListener("click",()=>openCapture(row));
    overlay.addEventListener("click",ev=>{if(ev.target===overlay)closeOverlay(row)});
    window.icons?.();
    return true;
  }

  function addCaptureToCalendar(){
    const rows=todayRows().filter(isSeen);
    if(!rows.length)return;
    const today=ymd();
    const cell=document.querySelector(`[data-cal-date="${today}"]`);
    if(!cell)return;
    cell.classList.add("fb-event-day-today");
    if(cell.querySelector(".fb-calendar-capture"))return;
    const row=rows[0];
    const host=cell.querySelector(".calendar-day-events")||cell;
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="fb-calendar-capture";
    btn.innerHTML='<i data-lucide="camera"></i><span>Capture day</span>';
    btn.addEventListener("click",ev=>{ev.stopPropagation();openCapture(row)});
    host.appendChild(btn);
    window.icons?.();
  }

  function addCaptureToEventDetail(route){
    if(!String(route).startsWith("view-event:"))return;
    const id=String(route).slice("view-event:".length);
    const row=todayRows().find(x=>String(x.id)===id&&isSeen(x));
    if(!row)return;
    const actions=document.querySelector(".calendar-detail-card .cal-detail-actions");
    if(!actions||actions.querySelector(".fb-detail-capture"))return;
    const btn=document.createElement("button");
    btn.type="button";btn.className="secondary fb-detail-capture";
    btn.innerHTML='<i data-lucide="camera"></i><span>Capture the Day</span>';
    btn.addEventListener("click",()=>openCapture(row));
    actions.prepend(btn);window.icons?.();
  }

  function enhanceCurrentRoute(route){
    if(route==="calendar")addCaptureToCalendar();
    if(String(route).startsWith("view-event:"))addCaptureToEventDetail(route);
  }

  async function bindRoute(route){
    lastRoute=String(route||"");
    if(route!=="add-memory"&&getCaptureContext())clearCaptureContext();
    try{await window.FB_ORGANIZER_DATA?.init?.()}catch(_){}
    const rows=todayRows();
    if(!rows.length)return;

    enhanceCurrentRoute(route);
    const unseen=rows.find(row=>!isSeen(row));
    if(unseen && !["add-memory","add-event"].includes(route) && !String(route).startsWith("edit-")){
      setTimeout(()=>showWelcome(unseen),120);
    }
  }

  window.FB_EVENT_DAY={
    bindRoute,isSeen,markSeen,getCaptureContext,clearCaptureContext,setCaptureContext,
    capture:openCapture,todayRows,showWelcome
  };
})();