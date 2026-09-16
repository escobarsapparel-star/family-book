(()=>{
  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

  function routeFor(item){
    if(item.targetType==="memory"&&item.targetId)return `view-memory:${item.targetId}`;
    if(item.targetType==="event"&&item.targetId)return `view-event:${item.targetId}`;
    if(item.targetType==="person"&&item.targetId)return `view-member:${item.targetId}`;
    // Family Wall lives on Home; "wall" is not a real app route.
    if(item.targetType==="post")return "home";
    return "";
  }

  function iconFor(type){
    if(type==="birthday_reminder")return "cake-slice";
    if(type==="event"||type==="event_reminder"||type==="event_change")return "calendar-days";
    if(type==="memory_tag")return "user-round-check";
    if(type==="memory")return "images";
    if(type==="checkin")return "map-pin";
    if(type==="wall_post")return "message-square-heart";
    return "bell";
  }

  function itemHtml(item){
    const read=!!item.readAt;
    return `<button type="button" class="notification-item ${read?"read":"unread"}" data-notification-id="${e(item.id)}" data-notification-route="${e(routeFor(item))}">
      <span class="notification-icon ${e(item.type)}"><i data-lucide="${e(iconFor(item.type))}"></i></span>
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

  function list(){return window.FB_NOTIFICATION_DATA?.getAll?.()||[]}

  function render(filter="all"){
    const mount=document.querySelector("#notificationList");if(!mount)return;
    const rows=list();
    const visible=filter==="unread"?rows.filter(x=>!x.readAt):rows;

    if(!visible.length){
      mount.innerHTML=`<div class="notification-empty"><i data-lucide="${filter==="unread"?"check-circle-2":"bell-off"}"></i><h2>${filter==="unread"?"You're all caught up":"No notifications yet"}</h2><p>${filter==="unread"?"There are no unread family notifications.":"Birthdays, events and new family activity will appear here."}</p></div>`;
      window.icons?.();return;
    }

    mount.innerHTML=visible.map(itemHtml).join("");
    mount.querySelectorAll("[data-notification-id]").forEach(btn=>btn.onclick=async()=>{
      const id=btn.dataset.notificationId,route=btn.dataset.notificationRoute;
      try{await window.FB_NOTIFICATION_DATA?.markRead?.(id)}catch(err){console.warn(err)}
      if(route)window.go?.(route);else render(filter);
    });
    window.icons?.();
  }

  function unreadCount(){return window.FB_NOTIFICATION_DATA?.unreadCount?.()||0}

  function refreshBadge(){
    const btn=document.querySelector("#topNotificationButton");if(!btn)return;
    let badge=btn.querySelector(".notification-badge");
    const count=unreadCount();
    if(count<=0){badge?.remove();btn.classList.remove("has-unread");return}
    if(!badge){badge=document.createElement("span");badge.className="notification-badge";btn.appendChild(badge)}
    badge.textContent=count>99?"99+":String(count);
    btn.classList.add("has-unread");
  }

  function bindPage(){
    let filter="all";
    document.querySelectorAll("[data-notification-filter]").forEach(btn=>btn.onclick=()=>{
      filter=btn.dataset.notificationFilter;
      document.querySelectorAll("[data-notification-filter]").forEach(x=>x.classList.toggle("active",x===btn));
      render(filter);
    });

    document.querySelector("#markAllNotifications")?.addEventListener("click",async()=>{
      try{await window.FB_NOTIFICATION_DATA?.markAllRead?.();render(filter);refreshBadge()}
      catch(err){alert(err.message||"Could not mark notifications as read.")}
    });

    render(filter);refreshBadge();
  }

  window.addEventListener("familybook:notifications-changed",()=>{
    refreshBadge();
    if(document.querySelector("#notificationList"))render(document.querySelector('[data-notification-filter].active')?.dataset.notificationFilter||"all");
  });

  window.FB_NOTIFICATIONS={pageShell,bindPage,refreshBadge,unreadCount};
})();
