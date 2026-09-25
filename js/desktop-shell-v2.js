(()=>{
  const ROUTES=[
    ["home","Home","house"],["memories","Memories","images"],["tree","Family tree","git-fork"],["calendar","Calendar","calendar-days"],["family-fun","Family Fun","party-popper"],["members","Members","users-round"]
  ];
  const MORE=[
    ["albums","Albums","folder-heart"],["notifications","Notifications","bell-ring"],["family-access","Family access","user-plus"],["settings","Settings","settings"]
  ];
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const familyMembers=()=>window.ensureOwner?.()||window.FB_FAMILY_DATA?.getPeople?.()||[];
  const familyName=()=>{try{return window.familyLabel?.()||auth().family||"Family"}catch(_){return auth().family||"Family"}};
  const isDisplayPhoto=v=>/^data:|^blob:|^https?:/i.test(String(v||""));
  const userPhoto=()=>{
    try{
      const shared=window.FB_PROFILE_PHOTO?.direct?.()||"";
      if(isDisplayPhoto(shared))return shared;
      const live=window.currentUserPhoto?.()||"";
      if(isDisplayPhoto(live))return live;
      const top=document.querySelector("#topProfileButton img")?.src||"";
      if(isDisplayPhoto(top))return top;
      const raw=auth().photo||"";
      return isDisplayPhoto(raw)?raw:"";
    }catch(_){
      const raw=auth().photo||"";
      return isDisplayPhoto(raw)?raw:"";
    }
  };

  async function hydrateDesktopProfilePhoto(){
    const avatar=document.querySelector(".desktop-profile-avatar");
    if(!avatar)return;
    try{
      const src=(await window.FB_PROFILE_PHOTO?.resolve?.())||userPhoto();
      if(!isDisplayPhoto(src))return;
      let img=avatar.querySelector("img");
      if(!img){
        img=document.createElement("img");
        img.alt="";
        img.addEventListener("error",()=>img.remove(),{once:true});
        avatar.appendChild(img);
      }
      if(img.src!==src)img.src=src;
    }catch(_){}
  }
  const initials=name=>{const p=String(name||"Family").trim().split(/\s+/).filter(Boolean);return ((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase()};

  function navigate(route){
    try{window.go?.(route)}catch(err){console.error("Desktop navigation failed",err)}
    document.querySelectorAll(".desktop-top-nav [data-desktop-route]").forEach(b=>b.classList.toggle("active",b.dataset.desktopRoute===route));
    setTimeout(refreshWidgets,50);
  }

  const navButton=([id,label,icon])=>`<button type="button" data-desktop-route="${esc(id)}" aria-label="${esc(label)}"><i data-lucide="${esc(icon)}"></i></button>`;
  const sideButton=([id,label,icon])=>`<button class="desktop-side-link" type="button" data-desktop-route="${esc(id)}"><span><i data-lucide="${esc(icon)}"></i></span><span>${esc(label)}</span></button>`;

  function profileCard(){
    const u=auth(),name=u.name||"Family member",p=userPhoto();
    const fallback=esc(initials(name));
    return `<button class="desktop-profile-card" type="button" data-desktop-route="profile"><span class="desktop-profile-avatar"><span class="desktop-profile-initials">${fallback}</span>${p?`<img src="${esc(p)}" alt="" onerror="this.remove()">`:""}</span><span><strong>${esc(name)}</strong><small>${esc(familyName())}</small></span></button>`;
  }

  function leftRail(){
    return `<aside class="desktop-left-rail" aria-label="Family Book navigation">${profileCard()}<div class="desktop-side-nav">${ROUTES.slice(1).filter(r=>r[0]!=="family-fun").map(sideButton).join("")}</div><div class="desktop-side-divider"></div><div class="desktop-side-caption">Family Book</div><div class="desktop-side-nav">${MORE.map(sideButton).join("")}</div></aside>`;
  }

  function dateLabel(d){try{return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"}).format(d)}catch(_){return ""}}
  function nextBirthday(value){
    const p=String(value||"").split("-").map(Number);if(p.length<3||!p[1]||!p[2])return null;
    const now=new Date(),y=now.getFullYear(),today=new Date(y,now.getMonth(),now.getDate());
    let d=new Date(y,p[1]-1,p[2],12);if(d<today)d=new Date(y+1,p[1]-1,p[2],12);return d;
  }
  function nextEventDate(ev){
    const p=String(ev?.date||"").split("-").map(Number);if(p.length<3)return null;
    if(ev.recurringYearly){const now=new Date(),y=now.getFullYear(),today=new Date(y,now.getMonth(),now.getDate());let d=new Date(y,p[1]-1,p[2],12);if(d<today)d=new Date(y+1,p[1]-1,p[2],12);return d}
    const d=new Date(`${ev.date}T12:00:00`);return Number.isNaN(d.getTime())?null:d;
  }

  function upcomingHtml(){
    const today=new Date();today.setHours(0,0,0,0);
    const rows=(window.FB_ORGANIZER_DATA?.getEvents?.()||[]).map(ev=>({ev,date:nextEventDate(ev)})).filter(x=>x.date&&x.date>=today).sort((a,b)=>a.date-b.date).slice(0,4);
    if(!rows.length)return `<p class="desktop-widget-empty">No upcoming family events yet.</p>`;
    return `<div class="desktop-widget-list">${rows.map(({ev,date})=>`<div class="desktop-widget-row"><span class="desktop-widget-icon"><i data-lucide="calendar-days"></i></span><div><strong>${esc(ev.title||"Family event")}</strong><small>${esc(dateLabel(date))}${ev.startTime?` · ${esc(ev.startTime)}`:""}</small></div></div>`).join("")}</div>`;
  }
  function birthdaysHtml(){
    const rows=familyMembers().filter(m=>m&&m.profileType!=="history"&&m.birthday).map(m=>({m,date:nextBirthday(m.birthday)})).filter(x=>x.date).sort((a,b)=>a.date-b.date).slice(0,4);
    if(!rows.length)return `<p class="desktop-widget-empty">Add birthdays to member profiles and they’ll appear here.</p>`;
    return `<div class="desktop-widget-list">${rows.map(({m,date})=>`<div class="desktop-widget-row"><span class="desktop-widget-icon"><i data-lucide="cake-slice"></i></span><div><strong>${esc(m.name||"Family member")}</strong><small>${esc(dateLabel(date))}</small></div></div>`).join("")}</div>`;
  }

  function rightRail(){
    return `<aside class="desktop-right-rail" aria-label="Family widgets">
      <section class="desktop-widget"><div class="desktop-widget-head"><h3>Upcoming</h3><button type="button" data-desktop-route="calendar">View calendar</button></div><div id="desktopUpcomingRows">${upcomingHtml()}</div></section>
      <section class="desktop-widget"><div class="desktop-widget-head"><h3>Birthdays</h3><button type="button" data-desktop-route="members">Members</button></div><div id="desktopBirthdayRows">${birthdaysHtml()}</div></section>
      <section class="desktop-widget"><div class="desktop-widget-head"><h3>Family at a glance</h3></div><div class="desktop-stat-grid"><div class="desktop-stat"><strong id="desktopMemberCount">–</strong><small>Members</small></div><div class="desktop-stat"><strong id="desktopMemoryCount">–</strong><small>Memories</small></div><div class="desktop-stat"><strong id="desktopEventCount">–</strong><small>Events</small></div></div></section>
      <section class="desktop-widget" id="desktopWeatherWidget"><div class="desktop-widget-head"><h3>Weather</h3></div><div class="desktop-weather-main"><span class="desktop-weather-icon"><i data-lucide="cloud-sun"></i></span><div class="desktop-weather-copy"><strong id="desktopWeatherTemp">Local weather</strong><small id="desktopWeatherText">Uses your browser location only when you ask.</small></div></div><button class="desktop-weather-action" id="desktopWeatherButton" type="button">Show local weather</button></section>
    </aside>`;
  }

  function condition(code){
    const c=Number(code);if(c===0)return "Clear sky";if([1,2,3].includes(c))return "Partly cloudy";if([45,48].includes(c))return "Foggy";if([51,53,55,56,57].includes(c))return "Drizzle";if([61,63,65,66,67,80,81,82].includes(c))return "Rain";if([71,73,75,77,85,86].includes(c))return "Snow";if([95,96,99].includes(c))return "Thunderstorms";return "Current conditions";
  }
  function weather(){
    const btn=document.querySelector("#desktopWeatherButton"),temp=document.querySelector("#desktopWeatherTemp"),text=document.querySelector("#desktopWeatherText");
    if(!navigator.geolocation){if(text)text.textContent="Location is unavailable in this browser.";return}
    if(btn){btn.disabled=true;btn.textContent="Getting weather…"}
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(pos.coords.latitude)}&longitude=${encodeURIComponent(pos.coords.longitude)}&current=temperature_2m,weather_code&timezone=auto`;
        const res=await fetch(url,{headers:{Accept:"application/json"}});if(!res.ok)throw new Error();const cur=(await res.json()).current||{};
        if(temp)temp.textContent=Number.isFinite(Number(cur.temperature_2m))?`${Math.round(Number(cur.temperature_2m))}°C`:"Weather";
        if(text)text.textContent=condition(cur.weather_code);if(btn)btn.textContent="Refresh weather";
      }catch(_){if(text)text.textContent="Could not load weather right now.";if(btn)btn.textContent="Try again"}finally{if(btn)btn.disabled=false}
    },()=>{if(text)text.textContent="Location permission was not granted.";if(btn){btn.disabled=false;btn.textContent="Show local weather"}},{enableHighAccuracy:false,timeout:9000,maximumAge:600000});
  }

  async function refreshStats(){
    const mem=familyMembers().filter(m=>m&&m.profileType!=="history"),events=window.FB_ORGANIZER_DATA?.getEvents?.()||[];
    const a=document.querySelector("#desktopMemberCount"),b=document.querySelector("#desktopEventCount");if(a)a.textContent=String(mem.length);if(b)b.textContent=String(events.length);
    try{const list=await window.FB_MEMORIES?.getAll?.();const el=document.querySelector("#desktopMemoryCount");if(el)el.textContent=String(Array.isArray(list)?list.length:0)}catch(_){const el=document.querySelector("#desktopMemoryCount");if(el)el.textContent="–"}
  }
  function setHtmlIfChanged(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html}
  function refreshWidgets(){
    setHtmlIfChanged(document.querySelector("#desktopUpcomingRows"),upcomingHtml());
    setHtmlIfChanged(document.querySelector("#desktopBirthdayRows"),birthdaysHtml());
    refreshStats();window.icons?.();
  }
  function bind(root){
    root.querySelectorAll("[data-desktop-route]").forEach(b=>{if(!b.dataset.desktopBound){b.dataset.desktopBound="1";b.addEventListener("click",()=>navigate(b.dataset.desktopRoute))}});
    const w=root.querySelector("#desktopWeatherButton");if(w&&!w.dataset.desktopBound){w.dataset.desktopBound="1";w.addEventListener("click",weather)}
  }

  function mount(){
    const app=document.querySelector("#app>.app");if(!app||app.classList.contains("desktop-shell-mounted"))return false;
    const top=app.querySelector(".topbar"),screen=app.querySelector(".screen"),bottom=app.querySelector(".bottom");if(!top||!screen||!bottom)return false;
    app.classList.add("desktop-shell-mounted");
    top.insertAdjacentHTML("beforeend",`<nav class="desktop-top-nav" aria-label="Desktop primary navigation">${ROUTES.map((r,i)=>navButton(r).replace('type="button"',`type="button" class="${i===0?"active":""}"`)).join("")}</nav>`);
    screen.insertAdjacentHTML("beforebegin",leftRail());
    bottom.insertAdjacentHTML("beforebegin",rightRail());
    bind(app);refreshStats();hydrateDesktopProfilePhoto();window.icons?.();return true;
  }

  const root=document.getElementById("app");
  const observer=new MutationObserver(()=>{if(document.querySelector("#app>.app:not(.desktop-shell-mounted)"))mount()});
  if(root)observer.observe(root,{childList:true,subtree:true});
  mount();
  window.addEventListener("familybook:family-data-updated",()=>{refreshWidgets();hydrateDesktopProfilePhoto()});
  window.addEventListener("familybook:settings",refreshWidgets);
  window.addEventListener("familybook:media-provider-changed",hydrateDesktopProfilePhoto);
})();
