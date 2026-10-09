/* Family Book OTA v8 — real, non-admin Settings updater for the original APK.
   Binds to FB_MOBILE_OTA (web hotfix loader), not the unrelated FB_NATIVE.updates
   installer API. No APK install or hidden permission change is performed here. */
(()=>{
  "use strict";
  if(window.__fbSettingsOtaV8)return;
  window.__fbSettingsOtaV8=true;
  const CARD_ID="settingsOtaUpdates";
  const STATUS_ID="fbSettingsOtaStatus";
  const BUTTON_ID="fbSettingsOtaCheck";
  let running=false;
  let lastState="idle";
  let lastMessage="";
  let lastTime=0;
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
  const isAndroid=()=>document.documentElement.classList.contains("native-app")||
    Boolean(window.FB_NATIVE?.Capacitor?.isNativePlatform?.());
  const msgs={
    idle:"Ready to check for updates.",
    checking:"Checking the Family Book OTA update feed…",
    downloading:"Update found. Downloading and verifying files…",
    applied:"OTA interface update installed for this session.",
    unchanged:"No OTA update is currently available.",
    blocked:"This update was previously blocked after an error on this phone.",
    rejected:"The update could not be applied. This version has been blocked for safety.",
    unavailable:"Could not reach the OTA feed. Check your internet connection and retry.",
    failed:"Update failed. Your existing app remains available."
  };
  function cardHtml(){
    return '<section class="settings-card fb-native-update-card fb-ota-settings-card" id="'+CARD_ID+'" aria-label="App updates">'+
      '<div class="settings-card-head"><span class="settings-card-icon"><i data-lucide="refresh-cw"></i></span>'+
      '<div><p>APP UPDATES</p><h2>OTA interface updates</h2>'+
      '<span>Check for and apply Family Book interface fixes without reinstalling the APK.</span></div></div>'+
      '<div class="settings-version-row"><span>Update channel</span><strong>Family Book mobile</strong></div>'+
      '<div class="settings-version-row"><span>Bundled interface</span><strong id="fbSettingsOtaBundled">Checking…</strong></div>'+
      '<div class="settings-version-row"><span>Last check</span><strong id="fbSettingsOtaLast">Not checked yet</strong></div>'+
      '<div class="fb-native-update-status fb-ota-settings-status" id="'+STATUS_ID+'" role="status" aria-live="polite" data-state="idle">'+
      '<span>Ready to check for updates.</span></div>'+
      '<button type="button" class="secondary fb-native-update-button fb-ota-action" id="'+BUTTON_ID+'">'+
      '<i data-lucide="download-cloud"></i><span>Check &amp; install OTA update</span></button>'+
      '<p class="settings-note">OTA updates change the app interface only. They are checksum-verified before applying. '+
      'Android system changes and a new APK version require a separately installed, correctly signed APK.</p>'+
      '<p class="settings-note">For offline startup, existing features remain embedded in your installed APK. '+
      'Online OTA fixes are checked separately when you have internet access.</p>'+
      '</section>';
  }
  function applyState(state,message){
    lastState=state||"idle";
    lastMessage=message||msgs[lastState]||msgs.failed;
    const box=document.getElementById(STATUS_ID);
    if(box){
      box.dataset.state=lastState;
      const target=box.querySelector("span");
      if(target)target.textContent=lastMessage;
    }
    const btn=document.getElementById(BUTTON_ID);
    if(btn){
      btn.disabled=running;
      const label=btn.querySelector("span");
      if(label)label.textContent=running?"Checking and installing…":"Check & install OTA update";
    }
    const last=document.getElementById("fbSettingsOtaLast");
    if(last&&lastTime)last.textContent=new Date(lastTime).toLocaleString();
  }
  function setVersions(){
    const target=document.getElementById("fbSettingsOtaBundled");
    if(!target)return;
    const embedded=window.FB_BUNDLED_OTA_VERSION;
    target.textContent=Number.isInteger(embedded)
      ?"Built in • OTA v"+embedded:"APK interface • original";
    const last=document.getElementById("fbSettingsOtaLast");
    if(last&&lastTime)last.textContent=new Date(lastTime).toLocaleString();
  }
  function routeToSettings(){
    if(typeof window.go!=="function")return;
    window.go("settings");
    setTimeout(()=>document.getElementById(CARD_ID)?.scrollIntoView({
      behavior:"smooth",block:"start"
    }),120);
  }
  function addMenuShortcut(root){
    if(!isAndroid()||!root||!root.isConnected)return;
    const list=root.querySelector(".mobile-profile-menu-scroll");
    if(!list||list.querySelector("[data-mobile-ota-settings]"))return;
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="mobile-profile-menu-wide fb-mobile-menu-ota";
    btn.dataset.mobileOtaSettings="1";
    btn.innerHTML='<span><i data-lucide="download-cloud"></i></span><span>'+
      '<strong>App updates</strong><small>Check &amp; install OTA fixes</small></span>'+
      '<i data-lucide="chevron-right"></i>';
    const anchor=list.querySelector("[data-mobile-appearance],[data-mobile-help-about]");
    if(anchor)anchor.before(btn);else list.appendChild(btn);
    btn.addEventListener("click",()=>{
      root.querySelector(".mobile-profile-menu-close")?.click();
      routeToSettings();
    });
    window.lucide?.createIcons?.();
  }
  async function checkInstall(){
    if(running)return;
    const api=window.FB_MOBILE_OTA;
    if(typeof api?.checkNow!=="function"){
      applyState("failed","The OTA installer is missing from this APK. An APK update is required to enable it.");
      return;
    }
    running=true;applyState("checking");
    try{
      // The old APK loader checks, SHA-256 verifies, and applies in one
      // operation. Do not call this "download only" or promise a staged APK.
      const outcome=await api.checkNow();
      lastTime=Date.now();
      const state=String(outcome||api.getStatus?.()||"failed");
      if(["applied","unchanged","blocked","rejected","unavailable"].includes(state))
        applyState(state);
      else applyState("failed","The OTA checker returned an unexpected response.");
    }catch(err){
      applyState("failed",err?.message||msgs.failed);
    }finally{
      running=false;
      applyState(lastState,lastMessage);
    }
  }
  function renderCard(){
    if(!isAndroid())return;
    // Works with both bundled legacy settings.js and newer site settings.js.
    const page=document.querySelector(".settings-page");
    if(!page)return;
    if(!document.getElementById(CARD_ID)){
      const about=page.querySelector(".settings-about-card");
      if(about)about.insertAdjacentHTML("beforebegin",cardHtml());
      else page.insertAdjacentHTML("beforeend",cardHtml());
      window.lucide?.createIcons?.();
    }
    const btn=document.getElementById(BUTTON_ID);
    if(btn&&!btn.dataset.fbOtaBound){
      btn.dataset.fbOtaBound="1";
      btn.addEventListener("click",()=>void checkInstall());
    }
    setVersions();
    applyState(lastState,lastMessage);
  }
  if(window.FB_SETTINGS?.pageShell&&!window.FB_SETTINGS.__fbOtaSettingsWrapped){
    const old=window.FB_SETTINGS.pageShell;
    window.FB_SETTINGS.pageShell=function(){
      const html=old.apply(this,arguments);
      if(!isAndroid()||html.includes('id="'+CARD_ID+'"'))return html;
      const anchor='<section class="settings-card settings-about-card">';
      return html.includes(anchor)?html.replace(anchor,cardHtml()+anchor):html+cardHtml();
    };
    const bind=window.FB_SETTINGS.bindPage;
    if(typeof bind==="function")window.FB_SETTINGS.bindPage=function(){
      const value=bind.apply(this,arguments);
      renderCard();
      return value;
    };
    window.FB_SETTINGS.__fbOtaSettingsWrapped=true;
  }
  window.addEventListener("familybook:ota",event=>{
    const state=event.detail?.status;
    if(state&&(!running||state!=="checking"))applyState(state);
  });
  const initial=window.FB_MOBILE_OTA?.getStatus?.();
  if(initial&&initial!=="idle")applyState(initial);
  if(document.body){
    const ob=new MutationObserver(records=>{
      let sawMenu=false,sawSettings=false;
      for(const record of records){
        for(const node of record.addedNodes){
          if(node.nodeType!==1)continue;
          if(node.matches?.(".mobile-profile-menu")||node.querySelector?.(".mobile-profile-menu"))sawMenu=true;
          if(node.matches?.(".settings-page")||node.querySelector?.(".settings-page"))sawSettings=true;
        }
      }
      if(sawSettings)renderCard();
      if(sawMenu)document.querySelectorAll(".mobile-profile-menu").forEach(addMenuShortcut);
    });
    ob.observe(document.body,{childList:true,subtree:true});
  }
  document.querySelectorAll(".mobile-profile-menu").forEach(addMenuShortcut);
  renderCard();
  window.FB_OTA_SETTINGS={render:renderCard,checkNow:checkInstall};
})();