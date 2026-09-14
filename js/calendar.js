(()=>{
  const TYPES={
    family:{label:"Family event",icon:"users-round"},
    outing:{label:"Family outing",icon:"map-pinned"},
    anniversary:{label:"Anniversary",icon:"heart"},
    school:{label:"School",icon:"graduation-cap"},
    holiday:{label:"Holiday",icon:"sun"},
    appointment:{label:"Appointment",icon:"clock-3"}
  };
  let monthCursor=new Date();
  monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth(),1);

  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function familyKey(){
    if(window.FB_AUTH?.familyStorageKey)return window.FB_AUTH.familyStorageKey();
    const u=window.FB_AUTH?.get?.()||{};
    return String(u.family||"Family").toLowerCase().replace(/[^a-z0-9]+/g,"_");
  }
  function members(){try{return (window.ensureOwner?.()||[]).filter(m=>m.profileType!=="history")}catch(_){return []}}
  function memberById(id){return members().find(m=>m.id===id)}
  function readEvents(){return window.FB_ORGANIZER_DATA?.getEvents?.()||[]}
  function getEvent(id){return window.FB_ORGANIZER_DATA?.getEvent?.(id)||null}
  async function saveEvent(row){return window.FB_ORGANIZER_DATA?.saveEvent?.(row)}
  async function removeEvent(id){return window.FB_ORGANIZER_DATA?.deleteEvent?.(id)}
  function pad(n){return String(n).padStart(2,"0")}
  function ymd(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
  function parseDate(s){
    const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null;
  }
  function fmtDate(s,opts={weekday:"long",day:"numeric",month:"long",year:"numeric"}){
    const d=parseDate(s);if(!d)return s||"";
    try{return new Intl.DateTimeFormat(undefined,opts).format(d)}catch(_){return s}
  }
  function fmtShort(s){
    return fmtDate(s,{day:"numeric",month:"short"});
  }
  function timeLabel(row){
    if(!row.startTime)return "All day";
    return row.endTime?`${row.startTime} – ${row.endTime}`:row.startTime;
  }
  function typeMeta(type){return TYPES[type]||TYPES.family}

  function mapsUrl(location="",lat=null,lng=null){
    const q=(lat!=null&&lng!=null)?`${lat},${lng}`:String(location||"").trim();
    return q?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`:"";
  }

  function dayKey(d){return ymd(d)}
  function dateInRange(d,start,end){return d>=start&&d<=end}

  function birthdayInstances(start,end){
    const out=[];
    for(const m of members()){
      if(!m.birthday)continue;
      const bd=parseDate(m.birthday);if(!bd)continue;
      for(let y=start.getFullYear();y<=end.getFullYear();y++){
        const d=new Date(y,bd.getMonth(),bd.getDate());
        if(dateInRange(d,start,end)){
          out.push({
            id:`birthday:${m.id}:${y}`,kind:"birthday",memberId:m.id,
            title:`${m.name}'s birthday`,date:ymd(d),startTime:"",endTime:"",
            type:"birthday",location:"",notes:"",memberIds:[m.id],recurringYearly:true
          });
        }
      }
    }
    return out;
  }

  function eventInstances(start,end){
    const out=[];
    for(const row of readEvents()){
      const base=parseDate(row.date);if(!base)continue;
      if(row.recurringYearly){
        for(let y=start.getFullYear();y<=end.getFullYear();y++){
          const d=new Date(y,base.getMonth(),base.getDate());
          if(dateInRange(d,start,end))out.push({...row,instanceDate:ymd(d),date:ymd(d),sourceDate:row.date});
        }
      }else if(dateInRange(base,start,end))out.push({...row,instanceDate:row.date});
    }
    return out;
  }

  function instancesBetween(start,end){
    return [...birthdayInstances(start,end),...eventInstances(start,end)]
      .sort((a,b)=>`${a.date} ${a.startTime||"00:00"}`.localeCompare(`${b.date} ${b.startTime||"00:00"}`));
  }

  function nextUpcoming(days=120){
    const start=new Date();start.setHours(0,0,0,0);
    const end=new Date(start);end.setDate(end.getDate()+days);
    return instancesBetween(start,end);
  }

  function memberChecks(selected=[]){
    const set=new Set(selected||[]);
    const list=members();
    if(!list.length)return `<p class="cal-no-members">No family members added yet.</p>`;
    return `<div class="cal-member-checks">${list.map(m=>`<label class="cal-member-check"><input type="checkbox" value="${e(m.id)}" ${set.has(m.id)?"checked":""}><span class="cal-member-dot">${m.photo?`<img src="${e(m.photo)}" alt="">`:e((m.name||"F").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase())}</span><span>${e(m.name)}</span></label>`).join("")}</div>`;
  }

  function pageShell(){
    return `<section class="calendar-page">
      <div class="calendar-title-row">
        <div><p class="eyebrow">${e((window.familyLabel?.()||"Family").toUpperCase())}</p><h1>Family Calendar</h1><p>Birthdays are added automatically from family profiles. Add outings, anniversaries and important family dates here.</p></div>
        <button class="primary cal-add" type="button" data-r="add-event"><i data-lucide="plus"></i>Add event</button>
      </div>

      <div class="calendar-layout">
        <section class="calendar-card">
          <div class="calendar-toolbar">
            <button type="button" id="calPrev" aria-label="Previous month"><i data-lucide="chevron-left"></i></button>
            <div><strong id="calMonthLabel"></strong><button type="button" class="cal-today" id="calToday">Today</button></div>
            <button type="button" id="calNext" aria-label="Next month"><i data-lucide="chevron-right"></i></button>
          </div>
          <div class="calendar-weekdays">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<span>${x}</span>`).join("")}</div>
          <div id="calendarGrid" class="calendar-grid"></div>
        </section>

        <aside class="calendar-upcoming-card">
          <div class="cal-side-head"><div><span>COMING UP</span><h2>Upcoming</h2></div><button type="button" data-r="add-event"><i data-lucide="plus"></i></button></div>
          <div id="calendarUpcoming" class="calendar-upcoming"></div>
        </aside>
      </div>
    </section>`;
  }

  function editorShell(id=""){
    const row=id?getEvent(id):null;
    const selected=row?.memberIds||[];
    return `<section class="calendar-editor-page">
      <button class="fu-back" data-r="calendar"><i data-lucide="arrow-left"></i> Calendar</button>
      <div class="calendar-editor-card">
        <div class="calendar-editor-head"><p class="eyebrow">${row?"EDIT EVENT":"NEW FAMILY EVENT"}</p><h1>${row?"Update event":"Add family event"}</h1><p>Keep important family dates in one place.</p></div>
        <form id="calendarEventForm" data-event-id="${e(id)}">
          <div class="cal-form-grid">
            <label class="cal-span-2">Event title<input id="calTitle" required maxlength="90" value="${e(row?.title||"")}" placeholder="e.g. Family braai"></label>
            <label>Type<select id="calType">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${row?.type===k?"selected":""}>${e(v.label)}</option>`).join("")}</select></label>
            <label>Date<input id="calDate" type="date" required value="${e(row?.sourceDate||row?.date||ymd(new Date()))}"></label>
            <label>Start time <span>(optional)</span><input id="calStart" type="time" value="${e(row?.startTime||"")}"></label>
            <label>End time <span>(optional)</span><input id="calEnd" type="time" value="${e(row?.endTime||"")}"></label>
            <div class="cal-location-field cal-span-2">
              <label>Location <span>(optional)</span><input id="calLocation" value="${e(row?.location||"")}" maxlength="120" placeholder="Home, school, venue…"></label>
              <div class="cal-location-actions">
                <button type="button" class="secondary" id="calUseLocation"><i data-lucide="locate-fixed"></i>Use current location</button>
                <a id="calOpenMap" class="cal-map-button ${row?.location||row?.lat!=null?"":"hidden"}" href="${mapsUrl(row?.location||"",row?.lat,row?.lng)}" target="_blank" rel="noopener"><i data-lucide="map"></i>Open map</a>
              </div>
              <input type="hidden" id="calLat" value="${e(row?.lat??"")}"><input type="hidden" id="calLng" value="${e(row?.lng??"")}">
              <small id="calLocationNote">Type a place, or explicitly use your device location.</small>
            </div>
            <label class="cal-span-2">Notes <span>(optional)</span><textarea id="calNotes" rows="3" maxlength="500" placeholder="Anything the family should remember">${e(row?.notes||"")}</textarea></label>
            <label class="cal-repeat cal-span-2"><input id="calRepeat" type="checkbox" ${row?.recurringYearly?"checked":""}><span><strong>Repeat every year</strong><small>Useful for anniversaries and annual family traditions.</small></span></label>
          </div>
          <fieldset class="cal-family-field"><legend>Family members involved <span>(optional)</span></legend>${memberChecks(selected)}</fieldset>
          <div class="cal-editor-actions">${row?`<button type="button" class="danger-outline" id="calDelete"><i data-lucide="trash-2"></i>Delete</button>`:"<span></span>"}<div><button type="button" class="secondary" data-r="calendar">Cancel</button><button type="submit" class="primary"><i data-lucide="check"></i>${row?"Save changes":"Add event"}</button></div></div>
        </form>
      </div>
    </section>`;
  }

  function detailShell(id){
    if(String(id).startsWith("birthday:")){
      const parts=String(id).split(":"),m=memberById(parts[1]);
      if(!m)return pageShell();
      return `<section class="calendar-detail-page"><button class="fu-back" data-r="calendar"><i data-lucide="arrow-left"></i> Calendar</button><div class="calendar-detail-card birthday-detail"><div class="cal-detail-icon"><i data-lucide="cake-slice"></i></div><p class="eyebrow">BIRTHDAY</p><h1>${e(m.name)}</h1><p class="cal-detail-date">${e(fmtDate(`${parts[2]}-${m.birthday.slice(5)}`))}</p><p>This birthday comes automatically from ${e(m.name)}'s family profile.</p><div class="cal-detail-actions"><button class="secondary" data-r="view-member:${e(m.id)}"><i data-lucide="user-round"></i>View member</button></div></div></section>`;
    }
    const row=getEvent(id);
    if(!row)return pageShell();
    const meta=typeMeta(row.type);
    const people=(row.memberIds||[]).map(memberById).filter(Boolean);
    return `<section class="calendar-detail-page">
      <button class="fu-back" data-r="calendar"><i data-lucide="arrow-left"></i> Calendar</button>
      <div class="calendar-detail-card">
        <div class="cal-detail-icon"><i data-lucide="${meta.icon}"></i></div>
        <p class="eyebrow">${e(meta.label.toUpperCase())}</p>
        <h1>${e(row.title)}</h1>
        <p class="cal-detail-date">${e(fmtDate(row.date))}${row.recurringYearly?' <span>• repeats yearly</span>':""}</p>
        <div class="cal-detail-list">
          <div><i data-lucide="clock-3"></i><span><small>Time</small><strong>${e(timeLabel(row))}</strong></span></div>
          ${(row.location||row.lat!=null)?`<div><i data-lucide="map-pin"></i><span><small>Location</small><strong>${e(row.location||"Saved GPS location")}</strong><a class="cal-detail-map-link" href="${mapsUrl(row.location||"",row.lat,row.lng)}" target="_blank" rel="noopener">Open in Google Maps</a></span></div>`:""}
          ${people.length?`<div><i data-lucide="users-round"></i><span><small>Family members</small><strong>${e(people.map(x=>x.name).join(", "))}</strong></span></div>`:""}
          ${row.notes?`<div><i data-lucide="notebook-text"></i><span><small>Notes</small><strong>${e(row.notes)}</strong></span></div>`:""}
        </div>
        <div class="cal-detail-actions"><button class="primary" data-r="edit-event:${e(row.id)}"><i data-lucide="pencil"></i>Edit event</button></div>
      </div>
    </section>`;
  }

  function renderMonth(){
    const grid=document.querySelector("#calendarGrid"),label=document.querySelector("#calMonthLabel");
    if(!grid||!label)return;
    label.textContent=new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(monthCursor);

    const y=monthCursor.getFullYear(),m=monthCursor.getMonth();
    const first=new Date(y,m,1),last=new Date(y,m+1,0);
    const start=new Date(y,m,1-first.getDay());
    const end=new Date(y,m,last.getDate()+(6-last.getDay()));
    const instances=instancesBetween(start,end);
    const byDay={};
    instances.forEach(x=>(byDay[x.date]||(byDay[x.date]=[])).push(x));
    const today=ymd(new Date());

    let html="";
    for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
      const k=ymd(d),rows=byDay[k]||[],outside=d.getMonth()!==m;
      const visible=rows.slice(0,2);
      html+=`<div class="calendar-day ${outside?"outside":""} ${k===today?"today":""}" data-cal-date="${k}">
        <span class="calendar-day-num">${d.getDate()}</span>
        <div class="calendar-day-events">
          ${visible.map(row=>{
            if(row.kind==="birthday")return `<button type="button" class="calendar-chip birthday" data-cal-item="${e(row.id)}"><i data-lucide="cake-slice"></i><span>${e(memberById(row.memberId)?.name||"Birthday")}</span></button>`;
            const meta=typeMeta(row.type);
            return `<button type="button" class="calendar-chip ${e(row.type)}" data-cal-item="${e(row.id)}"><i data-lucide="${meta.icon}"></i><span>${e(row.title)}</span></button>`;
          }).join("")}
          ${rows.length>2?`<button type="button" class="calendar-more" data-cal-date-more="${k}">+${rows.length-2} more</button>`:""}
        </div>
        ${rows.length?`<span class="cal-mobile-dot">${rows.length}</span>`:""}
      </div>`;
    }
    grid.innerHTML=html;
    grid.querySelectorAll("[data-cal-item]").forEach(b=>b.onclick=()=>window.go?.(`view-event:${b.dataset.calItem}`));
    grid.querySelectorAll("[data-cal-date]").forEach(cell=>{
      cell.ondblclick=()=>{window.FB_CALENDAR.prefillDate=cell.dataset.calDate;window.go?.("add-event")};
    });
    window.icons?.();
  }

  function upcomingItem(row){
    if(row.kind==="birthday"){
      const m=memberById(row.memberId);
      return `<button type="button" class="cal-upcoming-item birthday" data-cal-item="${e(row.id)}"><span class="cal-up-date"><strong>${e(fmtDate(row.date,{day:"numeric"}))}</strong><small>${e(fmtDate(row.date,{month:"short"}))}</small></span><span class="cal-up-icon"><i data-lucide="cake-slice"></i></span><span><strong>${e(m?.name||"Family member")}</strong><small>Birthday</small></span></button>`;
    }
    const meta=typeMeta(row.type);
    return `<button type="button" class="cal-upcoming-item" data-cal-item="${e(row.id)}"><span class="cal-up-date"><strong>${e(fmtDate(row.date,{day:"numeric"}))}</strong><small>${e(fmtDate(row.date,{month:"short"}))}</small></span><span class="cal-up-icon"><i data-lucide="${meta.icon}"></i></span><span><strong>${e(row.title)}</strong><small>${e(timeLabel(row))}${row.location?` • ${e(row.location)}`:""}</small></span></button>`;
  }

  function renderUpcoming(){
    const mount=document.querySelector("#calendarUpcoming");if(!mount)return;
    const rows=nextUpcoming(180).slice(0,12);
    mount.innerHTML=rows.length?rows.map(upcomingItem).join(""):`<div class="cal-empty"><i data-lucide="calendar-plus"></i><strong>No upcoming events</strong><span>Add your first family event.</span><button class="primary" data-r="add-event">Add event</button></div>`;
    mount.querySelectorAll("[data-cal-item]").forEach(b=>b.onclick=()=>window.go?.(`view-event:${b.dataset.calItem}`));
    mount.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>window.go?.(b.dataset.r));
    window.icons?.();
  }

  function bindCalendar(){
    renderMonth();renderUpcoming();
    document.querySelector("#calPrev")?.addEventListener("click",()=>{monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()-1,1);renderMonth()});
    document.querySelector("#calNext")?.addEventListener("click",()=>{monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()+1,1);renderMonth()});
    document.querySelector("#calToday")?.addEventListener("click",()=>{const n=new Date();monthCursor=new Date(n.getFullYear(),n.getMonth(),1);renderMonth()});
  }

  function bindEditor(id=""){
    const form=document.querySelector("#calendarEventForm");if(!form)return;
    if(!id && window.FB_CALENDAR.prefillDate){
      const el=document.querySelector("#calDate");if(el)el.value=window.FB_CALENDAR.prefillDate;
      window.FB_CALENDAR.prefillDate="";
    }

    const locInput=document.querySelector("#calLocation");
    const latInput=document.querySelector("#calLat");
    const lngInput=document.querySelector("#calLng");
    const locNote=document.querySelector("#calLocationNote");
    const mapLink=document.querySelector("#calOpenMap");
    const gpsButton=document.querySelector("#calUseLocation");

    function refreshMapLink(){
      const location=locInput?.value.trim()||"";
      const lat=latInput?.value===""?null:Number(latInput.value);
      const lng=lngInput?.value===""?null:Number(lngInput.value);
      const url=mapsUrl(location,Number.isFinite(lat)?lat:null,Number.isFinite(lng)?lng:null);
      if(mapLink){
        mapLink.href=url||"#";
        mapLink.classList.toggle("hidden",!url);
      }
    }
    locInput?.addEventListener("input",()=>{if(locInput.value.trim()!=="Current location"){if(latInput)latInput.value="";if(lngInput)lngInput.value=""}refreshMapLink()});
    gpsButton?.addEventListener("click",()=>{
      if(!navigator.geolocation){
        if(locNote)locNote.textContent="Location is not supported on this device/browser.";
        return;
      }
      gpsButton.disabled=true;gpsButton.innerHTML='<i data-lucide="loader-circle"></i>Locating…';window.icons?.();
      if(locNote)locNote.textContent="Requesting your device location…";
      navigator.geolocation.getCurrentPosition(
        pos=>{
          if(latInput)latInput.value=String(pos.coords.latitude);
          if(lngInput)lngInput.value=String(pos.coords.longitude);
          if(locInput&&!locInput.value.trim())locInput.value="Current location";
          if(locNote)locNote.textContent="GPS location captured. You can rename the place if you want.";
          gpsButton.disabled=false;gpsButton.innerHTML='<i data-lucide="locate-fixed"></i>Update location';
          refreshMapLink();window.icons?.();
        },
        err=>{
          if(locNote)locNote.textContent=err.code===1?"Location permission was not granted.":"Could not get your location. You can type the place manually.";
          gpsButton.disabled=false;gpsButton.innerHTML='<i data-lucide="locate-fixed"></i>Use current location';window.icons?.();
        },
        {enableHighAccuracy:true,timeout:10000,maximumAge:60000}
      );
    });
    refreshMapLink();

    window.FB_PLACES?.attach?.(locInput,{
      latInput,lngInput,
      label:"Search address or place",
      onSelect:({address,lat,lng})=>{
        if(address&&locInput)locInput.value=address;
        if(latInput)latInput.value=lat==null?"":String(lat);
        if(lngInput)lngInput.value=lng==null?"":String(lng);
        if(locNote)locNote.textContent=lat!=null?"Address selected from Google Places.":"Address entered manually.";
        refreshMapLink();
      }
    });

    form.onsubmit=async ev=>{
      ev.preventDefault();
      const selected=[...form.querySelectorAll(".cal-member-check input:checked")].map(x=>x.value);
      const row={
        id:id||crypto.randomUUID(),
        title:document.querySelector("#calTitle").value.trim(),
        type:document.querySelector("#calType").value,
        date:document.querySelector("#calDate").value,
        startTime:document.querySelector("#calStart").value,
        endTime:document.querySelector("#calEnd").value,
        location:document.querySelector("#calLocation").value.trim(),
        lat:document.querySelector("#calLat").value===""?null:Number(document.querySelector("#calLat").value),
        lng:document.querySelector("#calLng").value===""?null:Number(document.querySelector("#calLng").value),
        notes:document.querySelector("#calNotes").value.trim(),
        recurringYearly:document.querySelector("#calRepeat").checked,
        memberIds:selected
      };
      const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
      try{await saveEvent(row);window.go?.("calendar")}
      catch(err){alert(err.message||"Could not save this family event.")}
      finally{if(submit)submit.disabled=false}
    };
    const del=document.querySelector("#calDelete");
    if(del)del.onclick=async()=>{
      if(!confirm("Delete this family event?"))return;
      del.disabled=true;
      try{await removeEvent(id);window.go?.("calendar")}
      catch(err){alert(err.message||"Could not delete this family event.");del.disabled=false}
    };
  }

  function homeUpcomingShell(){
    return `<div id="homeUpcomingCalendar" class="home-calendar-loading"><span>Loading family dates…</span></div>`;
  }
  function bindHomeUpcoming(){
    const mount=document.querySelector("#homeUpcomingCalendar");if(!mount)return;
    const rows=nextUpcoming(90).slice(0,4);
    mount.className="events home-calendar-events";
    mount.innerHTML=rows.length?rows.map(row=>{
      if(row.kind==="birthday"){
        const m=memberById(row.memberId);
        return `<button type="button" class="event home-event" data-cal-item="${e(row.id)}"><div class="date">${e(fmtDate(row.date,{day:"numeric"}))}<small>${e(fmtDate(row.date,{month:"short"}))}</small></div><div><strong>${e(m?.name||"Family member")}</strong><small>Birthday</small></div><i data-lucide="cake-slice"></i></button>`;
      }
      const meta=typeMeta(row.type);
      return `<button type="button" class="event home-event" data-cal-item="${e(row.id)}"><div class="date">${e(fmtDate(row.date,{day:"numeric"}))}<small>${e(fmtDate(row.date,{month:"short"}))}</small></div><div><strong>${e(row.title)}</strong><small>${e(timeLabel(row))}${row.location?` • ${e(row.location)}`:""}</small></div><i data-lucide="${meta.icon}"></i></button>`;
    }).join(""):`<div class="empty-events"><span><i data-lucide="calendar-days"></i></span><strong>No family events yet</strong><small>Birthdays from member profiles and new events will appear here.</small><button class="link" data-r="add-event">Add event</button></div>`;
    mount.querySelectorAll("[data-cal-item]").forEach(b=>b.onclick=()=>window.go?.(`view-event:${b.dataset.calItem}`));
    mount.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>window.go?.(b.dataset.r));
    window.icons?.();
  }

  function bindRoute(route){
    if(route==="calendar")bindCalendar();
    else if(route==="add-event")bindEditor("");
    else if(route.startsWith("edit-event:"))bindEditor(route.split(":")[1]);
  }

  window.FB_CALENDAR={
    pageShell,editorShell,detailShell,bindRoute,homeUpcomingShell,bindHomeUpcoming,
    getEvents:readEvents,getUpcoming:nextUpcoming,prefillDate:""
  };
})();