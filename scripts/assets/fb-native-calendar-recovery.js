/* Family Book Android calendar binding recovery and event-card routes.
   Reuses the existing organizer, calendar and family membership data. */
(()=>{
  "use strict";
  if(window.__fbCalendarAndroidRepair)return;
  window.__fbCalendarAndroidRepair=true;

  let scheduled=false,loading=null;
  const norm=s=>String(s||"").toLowerCase().replace(/['’]s\b/g,"").replace(/[^a-z0-9]/g,"");
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const key=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");

  function emptyGridFix(grid,label){
    if(!grid||!label)return;
    const today=new Date(),year=today.getFullYear(),month=today.getMonth();
    label.textContent=new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(today);
    const begin=new Date(year,month,1);
    const first=new Date(year,month,1-begin.getDay());
    const rows=[];
    for(let i=0;i<42;i++){
      const date=new Date(first.getFullYear(),first.getMonth(),first.getDate()+i);
      rows.push('<div class="calendar-day '+(date.getMonth()===month?"":"outside")+
        '" data-cal-date="'+key(date)+'"><span class="calendar-day-num">'+date.getDate()+
        '</span><div class="calendar-day-events"></div></div>');
    }
    grid.innerHTML=rows.join("");
    console.warn("Family Book recovered Calendar month after first render failed.");
  }
  function emptyUpcomingFix(mount){
    if(!mount)return;
    let rows=[];
    try{rows=window.FB_CALENDAR?.getUpcoming?.(180)||[]}catch(e){console.warn("Family Book upcoming events:",e)}
    if(!rows.length){
      mount.innerHTML='<div class="cal-empty" data-fb-native-calendar-fallback><strong>No upcoming events loaded</strong><span>Try reopening Calendar to refresh family dates.</span></div>';
      return;
    }
    mount.innerHTML=rows.slice(0,12).map(row=>{
      const date=String(row.date||"");
      return '<button type="button" class="cal-upcoming-item" data-fb-native-event-id="'+esc(row.id)+'">'+
        '<span class="cal-up-date"><strong>'+esc(date.slice(8,10))+'</strong><small>'+esc(date.slice(5,7))+'</small></span>'+
        '<span><strong>'+esc(row.title)+'</strong><small>'+esc(row.kind==="birthday"?"Birthday":row.type||"Family event")+
        '</small></span></button>';
    }).join("");
  }
  function ensure(){
    const grid=document.getElementById("calendarGrid");
    const label=document.getElementById("calMonthLabel");
    const upcoming=document.getElementById("calendarUpcoming");
    if(!grid||!label||!upcoming)return;
    if(grid.querySelector(".calendar-day")&&label.textContent.trim()&&upcoming.children.length)return;
    try{window.FB_CALENDAR?.bindRoute?.("calendar")}catch(err){console.warn("Family Book calendar binding:",err)}
    if(!grid.querySelector(".calendar-day")||!label.textContent.trim())emptyGridFix(grid,label);
    if(!upcoming.children.length)emptyUpcomingFix(upcoming);
    const init=window.FB_ORGANIZER_DATA?.init;
    if(typeof init==="function"&&!loading){
      loading=Promise.resolve().then(()=>init.call(window.FB_ORGANIZER_DATA)).then(()=>{
        if(!grid.isConnected)return;
        try{window.FB_CALENDAR?.bindRoute?.("calendar")}catch(e){console.warn("Calendar after sync:",e)}
        if(!grid.querySelector(".calendar-day")||!label.textContent.trim())emptyGridFix(grid,label);
        if(!upcoming.children.length||upcoming.querySelector("[data-fb-native-calendar-fallback]"))emptyUpcomingFix(upcoming);
      }).catch(e=>console.warn("Calendar event data refresh:",e)).finally(()=>{loading=null});
    }
  }
  function schedule(){
    if(scheduled||!document.getElementById("calendarGrid"))return;
    const grid=document.getElementById("calendarGrid");
    if(grid?.querySelector(".calendar-day")&&document.getElementById("calendarUpcoming")?.children.length)return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;ensure()},90);
  }

  document.addEventListener("click",event=>{
    const btn=event.target?.closest?.("[data-fb-native-event-id]");
    if(btn){
      event.preventDefault();
      event.stopImmediatePropagation?.();
      window.go?.("view-event:"+btn.getAttribute("data-fb-native-event-id"));
      return;
    }
    // The older Home Family Countdown opens Calendar regardless of which
    // event was tapped. Find the precise upcoming event or birthday instead.
    const card=event.target?.closest?.(
      ".family-countdown-hero[data-family-countdown-calendar],.family-countdown-row[data-family-countdown-calendar]"
    );
    if(!card)return;
    const title=norm(card.getAttribute("title"));
    if(!title)return;
    let rows=[];
    try{rows=window.FB_CALENDAR?.getUpcoming?.(400)||[]}catch(_){}
    const row=rows.find(item=>norm(item.title)===title);
    if(!row?.id)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    window.go?.("view-event:"+row.id);
  },true);

  const observer=new MutationObserver(schedule);
  function start(){
    observer.observe(document.body,{subtree:true,childList:true});
    schedule();
  }
  if(document.body)start();
  else document.addEventListener("DOMContentLoaded",start,{once:true});
})();