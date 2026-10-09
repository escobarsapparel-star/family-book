/* Bundled Family Book platform-owner dashboard for Android.
   The RPCs validate auth.uid() on the server. This client also hides access
   from ordinary accounts and family admins. These are LAST sign-ins, not
   proof of a presently online session. */
(()=>{
  "use strict";
  if(window.__fbBundledOwnerActivity)return;
  window.__fbBundledOwnerActivity=true;
  const OWNER="8d8bc782-cbf4-42ad-8f39-034d8a08b893";
  const isOwner=()=>String(window.FB_AUTH?.get?.()?.supabaseUserId||"")===OWNER;
  const esc=value=>String(value??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const format=value=>{
    if(!value)return "Never";
    const date=new Date(value);
    return Number.isNaN(date.getTime())?"Unknown":date.toLocaleString();
  };
  let fetching=false;
  function section(){
    if(!isOwner())return "";
    return '<section class="settings-card fb-owner-activity-shortcut" id="settingsPlatformAdmin">'+
      '<div class="settings-card-head"><span class="settings-card-icon"><i data-lucide="activity"></i></span><div>'+
      '<p>PLATFORM OWNER ONLY</p><h2>Admin Activity</h2><span>Registered accounts and latest sign-ins.</span></div></div>'+
      '<button type="button" class="secondary fb-owner-activity-open" data-fb-owner-activity>'+
      '<i data-lucide="shield-check"></i> View Admin Activity</button></section>';
  }
  function page(){
    return '<section class="fb-owner-activity-page">'+
      '<button type="button" class="secondary fb-owner-activity-back" data-fb-owner-back>'+
      '← Back to Settings</button>'+
      '<header><p class="eyebrow">FAMILY BOOK PLATFORM OWNER</p><h1>Admin Activity</h1>'+
      '<p>Account registrations and recorded sign-ins. A recent sign-in does not necessarily mean a user is online now.</p></header>'+
      '<div class="fb-owner-activity-panel"><div class="fb-owner-activity-row">'+
      '<h2>Platform overview</h2><button type="button" class="secondary" data-fb-owner-refresh>Refresh</button></div>'+
      '<div id="fbOwnerActivityStats" class="fb-owner-activity-stats" aria-live="polite">Loading…</div>'+
      '<h2>Registered users</h2><p>Account signup date and last recorded sign-in.</p>'+
      '<div id="fbOwnerActivityUsers" class="fb-owner-activity-users" aria-live="polite">Loading…</div>'+
      '<h2>Recent signup & sign-in events</h2>'+
      '<div id="fbOwnerActivityEvents" class="fb-owner-activity-users" aria-live="polite">Loading…</div>'+
      '</div></section>';
  }
  async function load(){
    if(fetching||!isOwner())return;
    fetching=true;
    const stats=document.getElementById("fbOwnerActivityStats");
    const users=document.getElementById("fbOwnerActivityUsers");
    const events=document.getElementById("fbOwnerActivityEvents");
    const refresh=document.querySelector("[data-fb-owner-refresh]");
    if(refresh)refresh.disabled=true;
    try{
      const db=window.FB_SUPABASE?.client;
      if(!db?.rpc)throw Error("Unable to connect to Family Book database.");
      const [summary,activity,accounts]=await Promise.all([
        db.rpc("get_platform_user_summary"),
        db.rpc("get_platform_auth_activity",{p_limit:100}),
        db.rpc("get_platform_users",{p_limit:250})
      ]);
      if(summary.error)throw summary.error;
      if(activity.error)throw activity.error;
      if(accounts.error)throw accounts.error;
      if(!isOwner())throw Error("This feature is restricted to the platform owner.");
      const x=summary.data||{};
      if(stats)stats.innerHTML=[
        ["Registered users",x.total_users],
        ["New today",x.signups_today],
        ["New in 7 days",x.signups_7d],
        ["Signed in within 24h",x.active_24h]
      ].map(([label,num])=>'<div><strong>'+Number(num||0)+'</strong><span>'+esc(label)+'</span></div>').join("");
      if(users)users.innerHTML=(accounts.data||[]).map(row=>
        '<article class="fb-owner-activity-person"><div><strong>'+esc(row.display_name||"Family Book user")+'</strong>'+
        '<small>'+esc(row.email||"No email")+'</small></div>'+
        '<div class="fb-owner-activity-date"><span>Registered: '+esc(format(row.signed_up_at))+'</span>'+
        '<span>Last sign-in: '+esc(format(row.last_sign_in_at))+'</span></div></article>'
      ).join("")||'<div class="fb-owner-empty">No registered users found.</div>';
      if(events)events.innerHTML=(activity.data||[]).map(row=>
        '<article class="fb-owner-activity-person"><div><strong>'+esc(row.display_name||row.email||"Family Book user")+'</strong>'+
        '<small>'+esc(row.event_type==="signup"?"Registered":"Signed in")+' • '+
        esc(row.source==="android"?"Android app":"Website")+'</small></div>'+
        '<div class="fb-owner-activity-date">'+esc(format(row.occurred_at))+'</div></article>'
      ).join("")||'<div class="fb-owner-empty">No recent events recorded.</div>';
    }catch(err){
      const text='Unable to load Admin Activity: '+esc(err?.message||"Try again.");
      if(stats)stats.textContent=text;
      if(users)users.textContent=text.replace(/&amp;/g,"&");
      if(events)events.textContent="No activity loaded.";
    }finally{fetching=false;if(refresh)refresh.disabled=false}
  }
  function open(){
    if(!isOwner())return;
    const host=document.getElementById("screen");
    if(!host)return;
    host.innerHTML=page();
    document.querySelectorAll(".nav").forEach(b=>b.classList.remove("active"));
    window.scrollTo(0,0);
    void load();
    window.lucide?.createIcons?.();
  }
  const previousGo=window.go;
  if(typeof previousGo==="function"){
    window.go=function(route,...args){
      if(route==="admin-activity"){
        if(!isOwner())return previousGo.call(this,"settings");
        return open();
      }
      return previousGo.call(this,route,...args);
    };
  }
  if(window.FB_SETTINGS?.pageShell){
    const previousPage=window.FB_SETTINGS.pageShell;
    window.FB_SETTINGS.pageShell=function(...args){
      const markup=previousPage.apply(this,args);
      if(!isOwner()||markup.includes('id="settingsPlatformAdmin"'))return markup;
      const anchor='<section class="settings-card" id="settingsAppearance">';
      if(markup.includes(anchor))return markup.replace(anchor,section()+anchor);
      return markup.replace('<section class="settings-page">','<section class="settings-page">'+section());
    };
  }
  document.addEventListener("click",event=>{
    if(event.target?.closest?.("[data-fb-owner-activity]")){
      event.preventDefault();event.stopImmediatePropagation();open();
    }else if(event.target?.closest?.("[data-fb-owner-back]")){
      event.preventDefault();window.go?.("settings");
    }else if(event.target?.closest?.("[data-fb-owner-refresh]")){
      event.preventDefault();void load();
    }
  },true);
  // The bundled profile menu has owner-only markup added during APK patching.
})();