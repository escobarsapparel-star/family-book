(()=>{
  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function user(){return window.FB_AUTH?.get?.()||{}}
  function familyKey(){return window.FB_AUTH?.familyStorageKey?.()||String(user().family||"family").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function accountKey(){return String(user().email||user().name||"owner").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function memberKey(){return String(user().memberId||accountKey()||"owner").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function readKey(){return `fb_notification_read_v2_${familyKey()}_${memberKey()}`}
  function legacyReadKey(){return `fb_notification_read_${familyKey()}_${accountKey()}`}
  function getRead(){
    try{
      const current=JSON.parse(localStorage.getItem(readKey())||"[]");
      const legacy=JSON.parse(localStorage.getItem(legacyReadKey())||"[]");
      const set=new Set([...(Array.isArray(current)?current:[]),...(Array.isArray(legacy)?legacy:[])]);
      if(set.size && (!Array.isArray(current)||current.length!==set.size))localStorage.setItem(readKey(),JSON.stringify([...set]));
      return set;
    }catch(_){return new Set()}
  }
  function saveRead(set){localStorage.setItem(readKey(),JSON.stringify([...set]))}
  function markRead(id){
    const s=getRead();s.add(id);saveRead(s);refreshBadge();
  }
  function markAllRead(ids=[]){
    const s=getRead();ids.forEach(id=>s.add(id));saveRead(s);refreshBadge();
  }
  function daysBetween(dateStr){
    const d=new Date(`${dateStr}T00:00:00`),n=new Date();n.setHours(0,0,0,0);
    return Math.round((d-n)/86400000);
  }
  function relDate(dateStr){
    const d=daysBetween(dateStr);
    if(d===0)return "Today";
    if(d===1)return "Tomorrow";
    if(d>1&&d<7)return `In ${d} days`;
    try{return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"}).format(new Date(`${dateStr}T12:00:00`))}catch(_){return dateStr}
  }
  function settings(){
    try{return window.FB_SETTINGS?.get?.()||{notifications:{enabled:true}}}
    catch(_){return {notifications:{enabled:true}}}
  }
  function enabled(field){
    const n=settings().notifications||{};
    if(n.enabled===false)return false;
    return n[field]!==false;
  }

  async function build(){
    const items=[];

    // Calendar-derived birthday and event notifications.
    if(window.FB_CALENDAR?.getUpcoming){
      const upcoming=window.FB_CALENDAR.getUpcoming(30)||[];
      for(const row of upcoming){
        const d=daysBetween(row.date);
        if(d<0||d>30)continue;

        if(row.kind==="birthday" && enabled("birthdays")){
          const member=window.ensureOwner?.().find?.(m=>m.id===row.memberId);
          const name=member?.name||"A family member";
          items.push({
            id:`birthday:${row.id}`,
            type:"birthday",
            icon:"cake-slice",
            title:d===0?`${name}'s birthday is today`:`${name}'s birthday is ${d===1?"tomorrow":`coming up`}`,
            text:`${relDate(row.date)}${member?.birthday?` • birthday`:""}`,
            createdAt:new Date(`${row.date}T00:00:00`).getTime()-86400000,
            route:`view-event:${row.id}`
          });
        }

        if(row.kind!=="birthday" && enabled("events")){
          items.push({
            id:`event:${row.id}:${row.date}`,
            type:"event",
            icon:"calendar-days",
            title:d===0?`${row.title} is today`:`Upcoming: ${row.title}`,
            text:`${relDate(row.date)}${row.startTime?` • ${row.startTime}`:""}${row.location?` • ${row.location}`:""}`,
            createdAt:new Date(`${row.date}T00:00:00`).getTime()-86400000,
            route:`view-event:${row.id}`
          });
        }
      }
    }

    // Memory-derived notifications.
    if(window.FB_MEMORIES?.getAll){
      try{
        const memories=await window.FB_MEMORIES.getAll();
        const currentId=window.FB_AUTH?.get?.()?.memberId||"owner",owner=window.ensureOwner?.().find?.(m=>m.id===currentId);
        for(const m of memories.slice(0,12)){
          const created=Number(m.createdAt)||Date.now();
          const ageDays=(Date.now()-created)/86400000;
          if(ageDays>45)continue;

          const tagged=(m.tags||[]).includes(currentId) || (owner?.id && (m.tags||[]).includes(owner.id));
          if(tagged && enabled("taggedMemories")){
            items.push({
              id:`memory-tag:${m.id}`,
              type:"tag",
              icon:"user-round-check",
              title:"You were tagged in a Memory",
              text:`${window.FB_TIME?.activity?.(created)||"Just now"} • ${m.caption||"A family Memory"}`,
              createdAt:created+1000,
              route:`view-memory:${m.id}`
            });
          }else if(enabled("newMemories")){
            items.push({
              id:`memory:${m.id}`,
              type:"memory",
              icon:"images",
              title:"Memory added",
              text:`${window.FB_TIME?.activity?.(created)||"Just now"} • ${m.caption||"A new family Memory was saved"}`,
              createdAt:created,
              route:`view-memory:${m.id}`
            });
          }
        }
      }catch(_){}
    }

    // Keep stable order: newest/relevant first.
    return items.sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0));
  }

  function itemHtml(item,read){
    return `<button type="button" class="notification-item ${read?"read":"unread"}" data-notification-id="${e(item.id)}" data-notification-route="${e(item.route||"")}">
      <span class="notification-icon ${e(item.type)}"><i data-lucide="${e(item.icon)}"></i></span>
      <span class="notification-copy"><strong>${e(item.title)}</strong><small>${e(item.text||"")}</small></span>
      ${read?"":'<span class="notification-unread-dot" aria-label="Unread"></span>'}
    </button>`;
  }

  function pageShell(){
    return `<section class="notifications-page">
      <div class="notifications-head">
        <div><p class="eyebrow">${e((window.familyLabel?.()||"Family").toUpperCase())}</p><h1>Notifications</h1><p>Birthdays, events, Memories and family activity in one place.</p></div>
        <button type="button" class="secondary" data-r="settings"><i data-lucide="settings"></i>Notification settings</button>
      </div>
      <div class="notifications-toolbar">
        <div class="notification-tabs">
          <button type="button" class="active" data-notification-filter="all">All</button>
          <button type="button" data-notification-filter="unread">Unread</button>
        </div>
        <button type="button" class="notification-mark-all" id="markAllNotifications"><i data-lucide="check-check"></i>Mark all read</button>
      </div>
      <div id="notificationList" class="notification-list"><div class="notification-loading">Loading family notifications…</div></div>
    </section>`;
  }

  async function render(filter="all"){
    const mount=document.querySelector("#notificationList");if(!mount)return;
    const list=await build(),read=getRead();
    const visible=filter==="unread"?list.filter(x=>!read.has(x.id)):list;

    if(!visible.length){
      mount.innerHTML=`<div class="notification-empty"><i data-lucide="${filter==="unread"?"check-circle-2":"bell-off"}"></i><h2>${filter==="unread"?"You're all caught up":"No notifications yet"}</h2><p>${filter==="unread"?"There are no unread family notifications.":"Birthdays, events and new Memories will appear here."}</p></div>`;
      window.icons?.();return;
    }

    mount.innerHTML=visible.map(item=>itemHtml(item,read.has(item.id))).join("");
    mount.querySelectorAll("[data-notification-id]").forEach(btn=>btn.onclick=()=>{
      const id=btn.dataset.notificationId,route=btn.dataset.notificationRoute;
      markRead(id);
      if(route)window.go?.(route);
      else render(filter);
    });
    window.icons?.();
  }

  async function unreadCount(){
    const list=await build(),read=getRead();
    return list.filter(x=>!read.has(x.id)).length;
  }

  async function refreshBadge(){
    const btn=document.querySelector("#topNotificationButton");if(!btn)return;
    let badge=btn.querySelector(".notification-badge");
    const count=await unreadCount();

    if(count<=0){
      badge?.remove();
      btn.classList.remove("has-unread");
      return;
    }

    if(!badge){
      badge=document.createElement("span");
      badge.className="notification-badge";
      btn.appendChild(badge);
    }
    badge.textContent=count>99?"99+":String(count);
    btn.classList.add("has-unread");
  }

  async function bindPage(){
    let filter="all";
    const all=await build();

    document.querySelectorAll("[data-notification-filter]").forEach(btn=>btn.onclick=()=>{
      filter=btn.dataset.notificationFilter;
      document.querySelectorAll("[data-notification-filter]").forEach(x=>x.classList.toggle("active",x===btn));
      render(filter);
    });

    document.querySelector("#markAllNotifications")?.addEventListener("click",()=>{
      markAllRead(all.map(x=>x.id));
      render(filter);
    });

    render(filter);
    refreshBadge();
  }

  window.FB_NOTIFICATIONS={pageShell,bindPage,build,refreshBadge,unreadCount,markRead,markAllRead};
})();