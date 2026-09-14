(()=>{
  const DEFAULTS={
    notifications:{
      enabled:true,
      birthdays:true,
      events:true,
      taggedMemories:true,
      wallPosts:true,
      newMemories:true,
      eventChanges:true,
      checkins:false,
      quietHours:false,
      quietStart:"21:00",
      quietEnd:"07:00"
    },
    privacy:{
      phoneVisibility:"family",
      emailVisibility:"family",
      showBirthdayYear:true,
      showCheckins:true,
      allowLocationPosts:true
    },
    appearance:{
      theme:"system"
    }
  };

  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function user(){return window.FB_AUTH?.get?.()||{}}
  function familyKey(){return window.FB_AUTH?.familyStorageKey?.()||String(user().family||"family").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function accountKey(){return String(user().email||user().name||"owner").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function memberKey(id){return String(id||user().memberId||accountKey()||"owner").toLowerCase().replace(/[^a-z0-9]+/g,"_")}
  function keyForMember(id){return `fb_settings_v2_${familyKey()}_${memberKey(id)}`}
  function legacyKey(){return `fb_settings_${familyKey()}_${accountKey()}`}
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function mergeDefaults(value){
    const v=value&&typeof value==="object"?value:{};
    return {
      notifications:{...clone(DEFAULTS.notifications),...(v.notifications||{})},
      privacy:{...clone(DEFAULTS.privacy),...(v.privacy||{})},
      appearance:{...clone(DEFAULTS.appearance),...(v.appearance||{})}
    };
  }
  function getForMember(memberId){
    try{
      const raw=localStorage.getItem(keyForMember(memberId));
      return mergeDefaults(raw?JSON.parse(raw):{});
    }catch(_){return clone(DEFAULTS)}
  }
  function get(){
    const id=user().memberId||"owner";
    try{
      const next=localStorage.getItem(keyForMember(id));
      if(next)return mergeDefaults(JSON.parse(next));
      // Migrate the old email-based settings for the currently signed-in member.
      const legacy=localStorage.getItem(legacyKey());
      if(legacy){
        const merged=mergeDefaults(JSON.parse(legacy));
        localStorage.setItem(keyForMember(id),JSON.stringify(merged));
        return merged;
      }
      return clone(DEFAULTS);
    }catch(_){return clone(DEFAULTS)}
  }
  function viewerIsTarget(memberId){return String(user().memberId||"owner")===String(memberId||"")}
  function canSee(memberId,field){
    if(viewerIsTarget(memberId))return true;
    const privacy=getForMember(memberId).privacy||{},visibility=privacy[field]||"family";
    if(visibility==="family")return true;
    if(visibility==="admins")return (user().role||"member")==="admin";
    return false;
  }
  function canSeeBirthdayYear(memberId){
    if(viewerIsTarget(memberId))return true;
    return getForMember(memberId).privacy.showBirthdayYear!==false;
  }
  function canSeeCheckins(memberId){
    if(viewerIsTarget(memberId))return true;
    return getForMember(memberId).privacy.showCheckins!==false;
  }
  function canUseLocationPosts(){
    return get().privacy.allowLocationPosts!==false;
  }

  const systemTheme=window.matchMedia?.("(prefers-color-scheme: dark)");

  function resolvedTheme(preference){
    const pref=["light","dark","system"].includes(preference)?preference:"system";
    if(pref==="system")return systemTheme?.matches?"dark":"light";
    return pref;
  }
  function applyTheme(preference){
    const pref=["light","dark","system"].includes(preference)?preference:"system";
    const resolved=resolvedTheme(pref);
    document.documentElement.dataset.theme=resolved;
    document.documentElement.dataset.themePreference=pref;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute("content",resolved==="dark"?"#151a16":"#315c43");
  }

  function save(value){
    const merged=mergeDefaults(value);
    localStorage.setItem(keyForMember(user().memberId||"owner"),JSON.stringify(merged));
    applyTheme(merged.appearance.theme);
    window.FB_FAMILY_DATA?.syncPrivacy?.(merged);
    window.FB_NOTIFICATION_DATA?.savePreferences?.(merged.notifications).catch(err=>console.error("Notification preference sync:",err));
    window.dispatchEvent(new CustomEvent("familybook:settings",{detail:merged}));
    return merged;
  }
  function update(section,field,value){
    const s=get();
    s[section][field]=value;
    return save(s);
  }
  function initials(name){
    const p=String(name||"Family User").trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase();
  }
  function avatar(){
    const u=user();
    const photo=typeof window.currentUserPhoto==="function"?window.currentUserPhoto():(u.photo||"");
    return photo?`<img src="${e(photo)}" alt="">`:`<span>${e(initials(u.name))}</span>`;
  }

  function menuShell(){
    const u=user();
    return `<div class="profile-popover" id="profilePopover" hidden>
      <div class="profile-popover-user">
        <div class="profile-popover-avatar">${avatar()}</div>
        <div><strong>${e(u.name||"Family User")}</strong><span>${e(window.familyLabel?.()||u.family||"Family")}</span></div>
      </div>
      <div class="profile-popover-menu">
        <button type="button" data-profile-route="profile"><i data-lucide="user-round"></i><span><strong>My profile</strong><small>Photo, details & status</small></span></button>
        <button type="button" data-profile-route="settings" data-settings-focus="notifications"><i data-lucide="bell-ring"></i><span><strong>Notifications</strong><small>Push & reminder preferences</small></span></button>
        <button type="button" data-profile-route="settings" data-settings-focus="privacy"><i data-lucide="shield-check"></i><span><strong>Privacy</strong><small>Contact & location visibility</small></span></button>
        <button type="button" data-profile-route="settings"><i data-lucide="settings"></i><span><strong>Settings</strong><small>Account preferences</small></span></button>
      </div>
      <button type="button" class="profile-popover-signout" id="profileMenuSignout"><i data-lucide="log-out"></i>Sign out</button>
    </div>`;
  }

  function toggleRow(id,title,desc,checked,section,field){
    return `<label class="settings-toggle-row" for="${id}">
      <span><strong>${e(title)}</strong><small>${e(desc)}</small></span>
      <span class="settings-switch"><input id="${id}" type="checkbox" data-setting-section="${section}" data-setting-field="${field}" ${checked?"checked":""}><i></i></span>
    </label>`;
  }

  function selectRow(id,title,desc,value,section,field){
    return `<label class="settings-select-row" for="${id}">
      <span><strong>${e(title)}</strong><small>${e(desc)}</small></span>
      <select id="${id}" data-setting-section="${section}" data-setting-field="${field}">
        <option value="family" ${value==="family"?"selected":""}>Family members</option>
        <option value="admins" ${value==="admins"?"selected":""}>Family admins only</option>
        <option value="me" ${value==="me"?"selected":""}>Only me</option>
      </select>
    </label>`;
  }


  function appearanceOptions(current){
    const options=[
      {id:"system",icon:"monitor-smartphone",title:"System",desc:"Follow this device"},
      {id:"light",icon:"sun",title:"Light",desc:"Classic Family Book"},
      {id:"dark",icon:"moon",title:"Dark",desc:"Easy on the eyes"}
    ];
    return `<div class="theme-choice-grid">${options.map(o=>`<button type="button" class="theme-choice ${current===o.id?"active":""}" data-theme-choice="${o.id}" aria-pressed="${current===o.id?"true":"false"}"><span><i data-lucide="${o.icon}"></i></span><strong>${e(o.title)}</strong><small>${e(o.desc)}</small><i class="theme-choice-check" data-lucide="check-circle-2"></i></button>`).join("")}</div>`;
  }

  function notificationPermissionText(){
    if(!("Notification" in window))return {state:"unsupported",title:"Browser notifications unavailable",text:"This browser does not support notification permission."};
    if(Notification.permission==="granted")return {state:"granted",title:"Notification permission granted",text:"Family Book is allowed to show notifications on this device."};
    if(Notification.permission==="denied")return {state:"denied",title:"Notifications blocked",text:"Notification permission is blocked in your browser/device settings."};
    return {state:"default",title:"Enable notifications on this device",text:"Allow Family Book to show notifications when browser push is connected."};
  }

  function pageShell(){
    const u=user(),s=get(),perm=notificationPermissionText();
    return `<section class="settings-page">
      <div class="settings-page-head">
        <div><p class="eyebrow">${e((window.familyLabel?.()||"Family").toUpperCase())}</p><h1>Settings</h1><p>Control what Family Book shows, shares and notifies you about.</p></div>
        <button type="button" class="secondary" data-r="profile"><i data-lucide="user-round"></i>View profile</button>
      </div>

      <div class="settings-account-summary">
        <div class="settings-account-avatar">${avatar()}</div>
        <div><strong>${e(u.name||"Family User")}</strong><span>${e(u.email||"Signed-in family member")}</span></div>
      </div>

      <section class="settings-card" id="settingsAppearance">
        <div class="settings-card-head"><span class="settings-card-icon"><i data-lucide="palette"></i></span><div><p>APPEARANCE</p><h2>Theme</h2><span>Choose how Family Book looks on this device.</span></div></div>
        ${appearanceOptions(s.appearance.theme)}
        <p class="settings-note"><i data-lucide="monitor-smartphone"></i>System follows your phone or computer's Light/Dark appearance automatically.</p>
      </section>

      <section class="settings-card" id="settingsNotifications">
        <div class="settings-card-head"><span class="settings-card-icon"><i data-lucide="bell-ring"></i></span><div><p>NOTIFICATIONS</p><h2>Push & reminders</h2><span>Choose the family activity you want to hear about.</span></div></div>

        <div class="notification-permission ${e(perm.state)}">
          <span><i data-lucide="${perm.state==="granted"?"circle-check":perm.state==="denied"?"circle-x":"smartphone"}"></i></span>
          <div><strong>${e(perm.title)}</strong><small>${e(perm.text)}</small></div>
          ${perm.state==="default"?`<button type="button" class="secondary" id="requestNotificationPermission">Enable</button>`:""}
        </div>

        ${toggleRow("setNotifyMaster","Push notifications","Master switch for Family Book notifications.",s.notifications.enabled,"notifications","enabled")}
        <div class="settings-subgroup" id="notificationDetailSettings">
          ${toggleRow("setBirthdays","Birthday reminders","Remind me about upcoming family birthdays.",s.notifications.birthdays,"notifications","birthdays")}
          ${toggleRow("setEvents","Upcoming events","Remind me about family events and outings.",s.notifications.events,"notifications","events")}
          ${toggleRow("setTags","Memory tags","Tell me when I am tagged in a Memory.",s.notifications.taggedMemories,"notifications","taggedMemories")}
          ${toggleRow("setWall","Family Wall posts","Notify me when family members post an update.",s.notifications.wallPosts,"notifications","wallPosts")}
          ${toggleRow("setMemories","New Memories","Notify me when new family photos or Memories are added.",s.notifications.newMemories,"notifications","newMemories")}
          ${toggleRow("setEventChanges","Event changes","Tell me when a family event I am involved in changes.",s.notifications.eventChanges,"notifications","eventChanges")}
          ${toggleRow("setCheckins","Family check-ins","Notify me when a family member shares a check-in.",s.notifications.checkins,"notifications","checkins")}
        </div>

        ${toggleRow("setQuietHours","Quiet hours","Pause non-urgent notifications during selected hours.",s.notifications.quietHours,"notifications","quietHours")}
        <div class="settings-time-row" id="quietHoursTimes">
          <label>From<input id="quietStart" type="time" value="${e(s.notifications.quietStart)}"></label>
          <label>Until<input id="quietEnd" type="time" value="${e(s.notifications.quietEnd)}"></label>
        </div>
        <p class="settings-note"><i data-lucide="info"></i>These preferences are stored now. Real cross-device push delivery will activate when the shared backend/APK notification service is connected.</p>
      </section>

      <section class="settings-card" id="settingsPrivacy">
        <div class="settings-card-head"><span class="settings-card-icon"><i data-lucide="shield-check"></i></span><div><p>PRIVACY</p><h2>Profile & location</h2><span>Decide what other family members can see.</span></div></div>

        ${selectRow("setPhoneVisibility","Phone number","Who can see your saved contact number.",s.privacy.phoneVisibility,"privacy","phoneVisibility")}
        ${selectRow("setEmailVisibility","Email address","Who can see your email address.",s.privacy.emailVisibility,"privacy","emailVisibility")}
        ${toggleRow("setBirthdayYear","Show birthday year","Allow family members to see your birth year.",s.privacy.showBirthdayYear,"privacy","showBirthdayYear")}
        ${toggleRow("setShowCheckins","Show my check-ins","Allow your check-in posts to appear on Family Wall.",s.privacy.showCheckins,"privacy","showCheckins")}
        ${toggleRow("setLocationPosts","Allow location on posts","Allow you to attach a place/GPS location when you explicitly choose it.",s.privacy.allowLocationPosts,"privacy","allowLocationPosts")}
        <p class="settings-note"><i data-lucide="map-pin"></i>Family Book never collects GPS automatically. Location is only requested when you tap a location feature.</p>
      </section>

      <section class="settings-card settings-family-card">
        <div class="settings-card-head"><span class="settings-card-icon"><i data-lucide="users-round"></i></span><div><p>FAMILY</p><h2>Family controls</h2><span>${(u.role||"member")==="admin"?"You are a Family Admin. You can manage family structure while linked adults keep control of their private contact details.":"You are an Adult Member. You can manage your own profile and privacy while viewing the shared family structure."}</span></div></div>
        ${(u.role||"member")==="admin"?`<button type="button" class="settings-nav-row" data-r="family-access"><span><i data-lucide="user-plus"></i><strong>Invite & family access</strong></span><i data-lucide="chevron-right"></i></button>`:""}
        <button type="button" class="settings-nav-row" data-r="members"><span><i data-lucide="users"></i><strong>${(u.role||"member")==="admin"?"Manage":"View"} family members</strong></span><i data-lucide="chevron-right"></i></button>
        <button type="button" class="settings-nav-row" data-r="tree"><span><i data-lucide="git-fork"></i><strong>Family tree</strong></span><i data-lucide="chevron-right"></i></button>
      </section>

      <section class="settings-card settings-about-card">
        <div class="settings-card-head"><span class="settings-card-icon"><i data-lucide="info"></i></span><div><p>APP</p><h2>Family Book</h2><span>Build 5.1.3 • Secure family access</span></div></div>
        <div class="settings-version-row"><span>Current build</span><strong>5.1 — Supabase Auth Foundation</strong></div>
      </section>

      <button type="button" class="settings-signout" id="settingsSignout"><i data-lucide="log-out"></i>Sign out</button>
    </section>`;
  }

  function setFocus(section){
    sessionStorage.setItem("fb_settings_focus",section||"");
  }
  function consumeFocus(){
    const f=sessionStorage.getItem("fb_settings_focus")||"";
    sessionStorage.removeItem("fb_settings_focus");
    return f;
  }

  function syncConditional(){
    const s=get();
    const details=document.querySelector("#notificationDetailSettings");
    if(details)details.classList.toggle("settings-disabled",!s.notifications.enabled);
    const times=document.querySelector("#quietHoursTimes");
    if(times)times.hidden=!s.notifications.quietHours;
  }

  async function requestNotificationPermission(){
    const btn=document.querySelector("#requestNotificationPermission");
    if(!("Notification" in window))return;
    try{
      if(btn){btn.disabled=true;btn.textContent="Requesting…"}
      await Notification.requestPermission();
      window.go?.("settings");
    }catch(_){
      if(btn){btn.disabled=false;btn.textContent="Enable"}
    }
  }

  function bindMenu(){
    const button=document.querySelector("#topProfileButton");
    const pop=document.querySelector("#profilePopover");
    if(!button||!pop)return;

    function close(){pop.hidden=true;button.setAttribute("aria-expanded","false")}
    function open(){pop.hidden=false;button.setAttribute("aria-expanded","true");window.icons?.()}

    button.onclick=ev=>{
      ev.stopPropagation();
      pop.hidden?open():close();
    };
    pop.onclick=ev=>ev.stopPropagation();

    pop.querySelectorAll("[data-profile-route]").forEach(b=>b.onclick=()=>{
      const focus=b.dataset.settingsFocus||"";
      if(focus)setFocus(focus);
      close();
      window.go?.(b.dataset.profileRoute);
    });

    document.querySelector("#profileMenuSignout")?.addEventListener("click",()=>{
      close();window.FB_AUTH?.logout?.();window.location.reload();
    });

    document.addEventListener("click",close,{once:false});
    document.addEventListener("keydown",ev=>{if(ev.key==="Escape")close()});
  }

  function bindPage(){
    document.querySelectorAll("[data-theme-choice]").forEach(btn=>{
      btn.onclick=()=>{
        const theme=btn.dataset.themeChoice;
        update("appearance","theme",theme);
        document.querySelectorAll("[data-theme-choice]").forEach(x=>{
          const active=x.dataset.themeChoice===theme;
          x.classList.toggle("active",active);
          x.setAttribute("aria-pressed",active?"true":"false");
        });
        window.icons?.();
      };
    });

    document.querySelectorAll("[data-setting-section][data-setting-field]").forEach(el=>{
      const section=el.dataset.settingSection,field=el.dataset.settingField;
      el.onchange=()=>{
        const value=el.type==="checkbox"?el.checked:el.value;
        update(section,field,value);
        syncConditional();
      };
    });

    const qs=document.querySelector("#quietStart"),qe=document.querySelector("#quietEnd");
    if(qs)qs.onchange=()=>update("notifications","quietStart",qs.value);
    if(qe)qe.onchange=()=>update("notifications","quietEnd",qe.value);

    document.querySelector("#requestNotificationPermission")?.addEventListener("click",requestNotificationPermission);
    document.querySelector("#settingsSignout")?.addEventListener("click",()=>{
      window.FB_AUTH?.logout?.();window.location.reload();
    });

    syncConditional();

    const focus=consumeFocus();
    if(focus){
      const target=document.querySelector(focus==="privacy"?"#settingsPrivacy":focus==="appearance"?"#settingsAppearance":"#settingsNotifications");
      setTimeout(()=>target?.scrollIntoView({behavior:"smooth",block:"start"}),60);
    }
  }

  applyTheme(get().appearance.theme);
  if(systemTheme){
    const handleSystemTheme=()=>{if(get().appearance.theme==="system")applyTheme("system")};
    try{systemTheme.addEventListener("change",handleSystemTheme)}catch(_){try{systemTheme.addListener(handleSystemTheme)}catch(__){}}
  }

  window.FB_SETTINGS={menuShell,pageShell,bindMenu,bindPage,get,getForMember,save,update,setFocus,applyTheme,canSee,canSeeBirthdayYear,canSeeCheckins,canUseLocationPosts};
})();