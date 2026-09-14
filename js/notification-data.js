(()=>{
  let loadedFamilyId="";
  let preferences=null;
  let items=[];
  let channel=null;

  const sb=()=>window.FB_SUPABASE?.client;
  const user=()=>window.FB_AUTH?.get?.()||{};

  function settingsKey(){
    const u=user();
    const family=window.FB_AUTH?.familyStorageKey?.()||"family";
    const id=String(u.memberId||u.email||"owner").toLowerCase().replace(/[^a-z0-9]+/g,"_");
    return `fb_settings_v2_${family}_${id}`;
  }

  function mapPrefs(row={}){
    return {
      enabled:row.enabled!==false,
      birthdays:row.birthdays!==false,
      events:row.events!==false,
      taggedMemories:row.tagged_memories!==false,
      wallPosts:row.wall_posts!==false,
      newMemories:row.memories!==false,
      eventChanges:row.event_changes!==false,
      checkins:row.checkins===true,
      quietHours:row.quiet_hours===true,
      quietStart:String(row.quiet_hours_start||"21:00").slice(0,5),
      quietEnd:String(row.quiet_hours_end||"07:00").slice(0,5)
    };
  }

  function syncLocalSettings(){
    if(!preferences)return;
    let current={};
    try{current=JSON.parse(localStorage.getItem(settingsKey())||"{}")||{}}catch(_){}
    current.notifications={...(current.notifications||{}),...preferences};
    current.privacy=current.privacy||{};
    current.appearance=current.appearance||{theme:"system"};
    localStorage.setItem(settingsKey(),JSON.stringify(current));
  }

  async function loadPreferences(){
    const {data,error}=await sb().rpc("get_my_notification_preferences");
    if(error)throw error;
    preferences=mapPrefs(data||{});
    syncLocalSettings();
    return preferences;
  }

  async function loadNotifications(refreshReminders=false){
    if(refreshReminders){
      const reminder=await sb().rpc("refresh_my_reminder_notifications");
      if(reminder.error)console.warn("Reminder refresh:",reminder.error.message);
    }
    const {data,error}=await sb().rpc("get_my_notifications",{p_limit:150});
    if(error)throw error;
    items=(data||[]).map(row=>({
      id:String(row.id),
      type:row.notification_type||"notification",
      title:row.title||"Family Book",
      text:row.body||"",
      targetType:row.target_type||"",
      targetId:row.target_id?String(row.target_id):"",
      readAt:row.read_at?new Date(row.read_at).getTime():null,
      createdAt:row.created_at?new Date(row.created_at).getTime():0
    }));
    window.dispatchEvent(new CustomEvent("familybook:notifications-changed"));
    return items;
  }

  function getAll(){return items.slice()}
  function getPreferences(){return preferences?{...preferences}:null}
  function unreadCount(){return items.filter(x=>!x.readAt).length}

  async function savePreferences(n){
    const next={
      enabled:n.enabled!==false,
      birthdays:n.birthdays!==false,
      events:n.events!==false,
      taggedMemories:n.taggedMemories!==false,
      wallPosts:n.wallPosts!==false,
      newMemories:n.newMemories!==false,
      eventChanges:n.eventChanges!==false,
      checkins:n.checkins===true,
      quietHours:n.quietHours===true,
      quietStart:n.quietStart||"21:00",
      quietEnd:n.quietEnd||"07:00"
    };

    const {error}=await sb().rpc("save_my_notification_preferences",{
      p_enabled:next.enabled,
      p_birthdays:next.birthdays,
      p_events:next.events,
      p_tagged_memories:next.taggedMemories,
      p_wall_posts:next.wallPosts,
      p_memories:next.newMemories,
      p_event_changes:next.eventChanges,
      p_checkins:next.checkins,
      p_quiet_hours:next.quietHours,
      p_quiet_hours_start:next.quietStart,
      p_quiet_hours_end:next.quietEnd
    });
    if(error)throw error;
    preferences=next;
    return true;
  }

  async function markRead(id){
    const {error}=await sb().rpc("mark_notification_read",{p_notification_id:id});
    if(error)throw error;
    const row=items.find(x=>x.id===String(id));
    if(row&&!row.readAt)row.readAt=Date.now();
    window.dispatchEvent(new CustomEvent("familybook:notifications-changed"));
  }

  async function markAllRead(){
    const {error}=await sb().rpc("mark_all_notifications_read");
    if(error)throw error;
    const now=Date.now();
    items.forEach(x=>{if(!x.readAt)x.readAt=now});
    window.dispatchEvent(new CustomEvent("familybook:notifications-changed"));
  }

  function inQuietHours(){
    const p=preferences;
    if(!p?.quietHours)return false;
    const now=new Date(),mins=now.getHours()*60+now.getMinutes();
    const parse=v=>{const [h,m]=String(v||"00:00").split(":").map(Number);return (h||0)*60+(m||0)};
    const start=parse(p.quietStart),end=parse(p.quietEnd);
    return start===end?false:(start<end?mins>=start&&mins<end:mins>=start||mins<end);
  }

  function maybeBrowserNotify(row){
    if(document.visibilityState!=="hidden")return;
    if(!preferences?.enabled||inQuietHours())return;
    if(!("Notification" in window)||Notification.permission!=="granted")return;
    try{new Notification(row.title||"Family Book",{body:row.body||"",tag:`family-book-${row.id}`})}catch(_){}
  }

  function subscribe(){
    const u=user();
    if(!u.membershipId||channel)return;
    channel=sb().channel(`family-notifications-${u.membershipId}`)
      .on("postgres_changes",{
        event:"*",
        schema:"public",
        table:"notifications",
        filter:`recipient_membership_id=eq.${u.membershipId}`
      },async payload=>{
        if(payload.eventType==="INSERT")maybeBrowserNotify(payload.new||{});
        try{await loadNotifications(false)}catch(err){console.warn(err)}
      })
      .subscribe();
  }

  async function init(){
    const u=user();
    if(!u.familyId)return;
    if(loadedFamilyId===u.familyId)return;
    await loadPreferences();
    await loadNotifications(true);
    subscribe();
    loadedFamilyId=u.familyId;
  }

  window.FB_NOTIFICATION_DATA={
    init,loadPreferences,loadNotifications,getAll,getPreferences,
    unreadCount,savePreferences,markRead,markAllRead
  };
})();
