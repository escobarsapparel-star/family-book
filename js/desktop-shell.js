(()=>{
  const ROUTES=[
    {id:"home",label:"Home",icon:"house"},
    {id:"memories",label:"Memories",icon:"images"},
    {id:"tree",label:"Family tree",icon:"git-fork"},
    {id:"calendar",label:"Calendar",icon:"calendar-days"},
    {id:"members",label:"Members",icon:"users-round"}
  ];

  const LEFT_MORE=[
    {id:"albums",label:"Albums",icon:"folder-heart"},
    {id:"notifications",label:"Notifications",icon:"bell-ring"},
    {id:"family-access",label:"Family access",icon:"user-plus"},
    {id:"settings",label:"Settings",icon:"settings"}
  ];

  const e=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function auth(){return window.FB_AUTH?.get?.()||{}}
  function members(){return window.ensureOwner?.()||window.FB_FAMILY_DATA?.getPeople?.()||[]}
  function initials(name){
    const p=String(name||"Family").trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase();
  }
  function photo(){
    try{return window.currentUserPhoto?.()||auth().photo||""}catch(_){return auth().photo||""}
  }
  function familyName(){
    try{return window.familyLabel?.()||auth().family||"Family"}catch(_){return auth().family||"Family"}
  }
  function go(route){
    try{window.go?.(route)}catch(err){console.error("Desktop route failed",err)}
    markActive(route);
    setTimeout(refreshWidgets,40);
  }

  function profileCard(){
    const u=auth(),p=photo(),name=u.name||"Family member";
    return `<button class="desktop-profile-card" type="button" data-desktop-route="profile">
      <span class="desktop-profile-avatar">${p?`<img src="${e(p)}" alt="">`:`${e(initials(name))}`}</span>
      <span><strong>${e(name)}</strong><small>${e(familyName())}</small></span>
    </button>`;
  }

  function sideLink(item){
    return `<button class="desktop-side-link" type="button" data-desktop-route="${e(item.id)}">
      <span><i data-lucide="${e(item.icon)}"></i></span><span>${e(item.label)}</span>
    </button>`;
  }

  function topNav(){
    return `<nav class="desktop-top-nav" aria-label="Desktop primary navigation">
      ${ROUTES.map((r,i)=>`<button type="button" class="${i===0?"active":""}" data-desktop-route="${e(r.id)}" aria-label="${e(r.label)}"><i data-lucide="${e(r.icon)}"></i></button>`).join("")}
    </nav>`;
  }

  function leftRail(){
    return `<aside class="desktop-left-rail" aria-label="Family Book navigation">
      ${profileCard()}
      <div class="desktop-side-nav">${ROUTES.slice(1).map(sideLink).join("")}</div>
      <div class="desktop-side-divider"></div>
      <div class="desktop-side-caption">Family Book</div>
      <div class="desktop-side-nav">${LEFT_MORE.map(sideLink).join("")}</div>
    </aside>`;
  }

  function formatDate(date){
    try{return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"}).format(date)}catch(_){return ""}
  }

  function nextBirthday(birthday){
    if(!birthday)return null;
    const parts=String(birthday).split("-").map(Number);
    if(parts.length<3||!parts[1]||!parts[2])return null;
    const now=new Date(),year=now.getFullYear();
    let d=new Date(year,parts[1]-1,parts[2],12,0,0);
    const today=new Date(year,now.getMonth(),now.getDate(),0,0,0);
    if(d<today)d=new Date(year+1,parts[1]-1,parts[2],12,0,0);
    return d;
  }

  function nextEventDate(ev){
    if(!ev?.date)return null;
    const parts=String(ev.date).split("-").map(Number);
    if(parts.length<3)return null;
    if(ev.recurringYearly){
      const now=new Date(),year=now.getFullYear();
      let d=new Date(year,parts[1]-1,parts[2],12,0,0);
      const today=new Date(year,now.getMonth(),now.getDate(),0,0,0);
      if(d<today)d=new Date(year+1,parts[1]-1,parts[2],12,0,0);
      return d;
    }
    const d=new Date(`${ev.date}T12:00:00`);
    return Number.isNaN(d.getTime())?null:d;
  }

  function upcomingRows(){
    const nowStart=new Date();nowStart.setHours(0,0,0,0);
    const events=(window.FB_ORGANIZER_DATA?.getEvents?.()||[])
      .map(ev=>({ev,date:nextEventDate(ev)}))
      .filter(x=>x.date&&x.date>=nowStart)
      .sort((a,b)=>a.date-b.date)
      .slice(0,4);
    if(!events.length)return `<p class="desktop-widget-empty">No upcoming family events yet.</p>`;
    return `<div class="desktop-widget-list">${events.map(({ev,date})=>`<div class="desktop-widget-row"><span class="desktop-widget-icon"><i data-lucide="calendar-days"></i></span><div><strong>${e(ev.title||"Family event")}</strong><small>${e(formatDate(date))}${ev.startTime?` · ${e(ev.startTime)}`:""}</small></div></div>`).join("")}</div>`;
  }

  function birthdayRows(){
    const rows=members()
      .filter(m=>m&&m.profileType!=="history"&&m.birthday)
      .map(m=>({m,date:nextBirthday(m.birthday)}))
      .filter(x=>x.date)
      .sort((a,b)=>a.date-b.date)
      .slice(0,4);
    if(!rows.length)return `<p class="desktop-widget-empty">Add birthdays to member profiles and they’ll appear here.</p>`;
    return `<div class="desktop-widget-list">${rows.map(({m,date})=>`<div class="desktop-widget-row"><span class="desktop-widget-icon"><i data-lucide="cake-slice"></i></span><div><strong>${e(m.name||"Family member")}</strong><small>${e(formatDate(date))}</small></div></div>`).join("")}</div>`;
  }

  function rightRail(){
    return `<aside class="desktop-right-rail" aria-label="Family widgets">
      <section class="desktop-widget">
        <div class="desktop-widget-head"><h3>Upcoming</h3><button type="button" data-desktop-route="calendar">View calendar</button></div>
        <div id="desktopUpcomingRows">${upcomingRows()}</div>
      </section>

      <section class="desktop-widget">
        <div class="desktop-widget-head"><h3>Birthdays</h3><button type="button" data-desktop-route="members">Members</button></div>
        <div id="desktopBirthdayRows">${birthdayRows()}</div>
      </section>

      <section class="desktop-widget">
        <div class="desktop-widget-head"><h3>Family at a glance</h3></div>
        <div class="desktop-stat-grid">
          <div class="desktop-stat"><strong id="desktopMemberCount">–</strong><small>Members</small></div>
          <div class="desktop-stat"><strong id="desktopMemoryCount">–</strong><small>Memories</small></div>
          <div class="desktop-stat"><strong id="desktopEventCount">–</strong><small>Events</small></div>
        </div>
      </section>

      <section class="desktop-widget" id="desktopWeatherWidget">
        <div class="desktop-widget-head"><h3>Weather</h3></div>
        <div class="desktop-weather-main">
          <span class="desktop-weather-icon"><i data-lucide="cloud-sun"></i></span>
          <div class="desktop-weather-copy"><strong id="desktopWeatherTemp">Local weather</strong><small id="desktopWeatherText">Uses your browser location only when you ask.</small></div>
        </div>
        <button class="desktop-weather-action" id="desktopWeatherButton" type="button">Show local weather</button>
      </section>
    </aside>`;
  }

  function weatherLabel(code){
    const c=Number(code);
    if(c===0)return "Clear sky";
    if([1,2,3].includes(c))return "Partly cloudy";
    if([45,48].includes(c))return "Foggy";
    if([51,53,55,56,57].includes(c))return "Drizzle";
    if([61,63,65,66,67,80,81,82].includes(c))return "Rain";
    if([71,73,75,77,85,86].includes(c))return "Snow";
    if([95,96,99].includes(c))return "Thunderstorms";
    return "Current conditions";
  }

  async function loadWeather(){
    const btn=document.querySelector("#desktopWeatherButton");
    const temp=document.querySelector("#desktopWeatherTemp");
    const text=document.querySelector("#desktopWeatherText");
    if(!navigator.geolocation){if(text)text.textContent="Location is unavailable in this browser.";return}
    if(btn){btn.disabled=true;btn.textContent="Getting weather…"}
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const lat=pos.coords.latitude,lng=pos.coords.longitude;
        const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&current=temperature_2m,weather_code&timezone=auto`;
        const res=await fetch(url,{headers:{Accept:"application/json"}});
        if(!res.ok)throw new Error("Weather service unavailable");
        const data=await res.json(),cur=data.current||{};
        if(temp)temp.textContent=Number.isFinite(Number(cur.temperature_2m))?`${Math.round(Number(cur.temperature_2m))}°C`:"Weather";
        if(text)text.textContent=weatherLabel(cur.weather_code);
        if(btn)btn.textContent="Refresh weather";
      }catch(err){
        if(text)text.textContent="Could not load weather right now.";
        if(btn)btn.textContent="Try again";
      }finally{if(btn)btn.disabled=false}
    },()=>{
      if(text)text.textContent="Location permission was not granted.";
      if(btn){btn.disabled=false;btn.textContent="Show local weather"}
    },{enableHighAccuracy:false,timeout:9000,maximumAge:10*60*1000});
  }

  async function refreshStats(){
    const ms=members().filter(m=>m&&m.profileType!=="history");
    const events=window.FB_ORGANIZER_DATA?.getEvents?.()||[];
    const mEl=document.querySelector("#desktopMemberCount");
    const eEl=document.querySelector("#desktopEventCount");
    if(mEl)mEl.textContent=String(ms.length);
    if(eEl)eEl.textContent=String(events.length);
    try{
      const memories=await window.FB_MEMORIES?.getAll?.();
      const el=document.querySelector("#desktopMemoryCount");
      if(el)el.textContent=String(Array.isArray(memories)?memories.length:0);
    }catch(_){const el=document.querySelector("#desktopMemoryCount");if(el)el.textContent="–"}
  }

  function refreshWidgets(){
    const u=document.querySelector("#desktopUpcomingRows");
    const b=document.querySelector("#desktopBirthdayRows");
    if(u)u.innerHTML=upcomingRows();
    if(b)b.innerHTML=birthdayRows();
    refreshStats();
    window.icons?.();
  }

  function bind(root=document){
    root.querySelectorAll("[data-desktop-route]").forEach(btn=>{
      if(btn.dataset.desktopBound)return;
      btn.dataset.desktopBound="1";
      btn.addEventListener("click",()=>go(btn.dataset.desktopRoute));
    });
    const weather=root.querySelector("#desktopWeatherButton");
    if(weather&&!weather.dataset.desktopBound){weather.dataset.desktopBound="1";weather.addEventListener("click",loadWeather)}
  }

  function markActive(route){
    document.querySelectorAll(".desktop-top-nav [data-desktop-route]").forEach(btn=>btn.classList.toggle("active",btn.dataset.desktopRoute===route));
  }

  function install(){
    const app=document.querySelector("#app>.app");
    if(!app)return false;
    if(!app.querySelector(".desktop-left-rail")){
      const top=app.querySelector(".topbar"),screen=app.querySelector(".screen");
      if(top&&!top.querySelector(".desktop-top-nav"))top.insertAdjacentHTML("beforeend",topNav());
      if(screen)screen.insertAdjacentHTML("beforebegin",leftRail());
      const bottom=app.querySelector(".bottom");
      if(bottom)bottom.insertAdjacentHTML("beforebegin",rightRail());
      bind(app);
      refreshStats();
      window.icons?.();
    }else{
      refreshWidgets();
      bind(app);
    }
    return true;
  }

  const observer=new MutationObserver(()=>install());
  observer.observe(document.getElementById("app"),{childList:true,subtree:true});
  install();
  window.addEventListener("familybook:family-data-updated",refreshWidgets);
  window.addEventListener("familybook:settings",refreshWidgets);
})();
