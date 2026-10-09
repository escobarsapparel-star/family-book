/* OTA v7: restore Home memories horizontal swipe and missing APK mobile-menu
   account options. Attach ONLY in WebView; desktop site keeps its own handlers. */
(()=>{
 if(window.__fbOtaMobileRestore7)return;
 window.__fbOtaMobileRestore7=true;

 // Capture touchmove before the legacy Android swipe-to-change-page handler
 // at document capture. Let the WebView perform its native horizontal scroll.
 let railStart=null;
 window.addEventListener("touchstart",ev=>{
   railStart=null;
   if(ev.touches?.length!==1)return;
   const track=ev.target?.closest?.("#homeMemoryStripTrack,.home-memory-strip-track");
   if(!track||track.scrollWidth<=track.clientWidth+2)return;
   const touch=ev.touches[0];
   railStart={id:touch.identifier,x:touch.clientX,y:touch.clientY,track,axis:null};
 },{capture:true,passive:true});
 window.addEventListener("touchmove",ev=>{
   if(!railStart||ev.touches?.length!==1||!railStart.track.isConnected)return;
   const touch=ev.touches[0];
   if(touch.identifier!==railStart.id)return;
   const dx=touch.clientX-railStart.x,dy=touch.clientY-railStart.y;
   if(!railStart.axis&&Math.max(Math.abs(dx),Math.abs(dy))>=7)
      railStart.axis=Math.abs(dx)>Math.abs(dy)*1.12?"x":"y";
   if(railStart.axis==="x")ev.stopPropagation();
 },{capture:true,passive:true});
 const reset=()=>{railStart=null};
 window.addEventListener("touchend",reset,{capture:true,passive:true});
 window.addEventListener("touchcancel",reset,{capture:true,passive:true});

 function updateMobileMenu(){
  const menu=document.querySelector(".mobile-profile-menu");
  const inner=menu?.querySelector(".mobile-profile-menu-scroll");
  if(!inner||menu.dataset.fbOtaAccountOptions==="7")return;
  menu.dataset.fbOtaAccountOptions="7";
  if(!inner.querySelector("[data-mobile-appearance]")){
    const btn=document.createElement("button");
    btn.type="button";btn.className="mobile-profile-menu-wide fb-mobile-menu-appearance";
    btn.dataset.mobileAppearance="1";
    btn.innerHTML='<span><i data-lucide="monitor-cog"></i></span><span><strong>Display & accessibility</strong><small>Light, Dark or System theme</small></span><i data-lucide="chevron-right"></i>';
    btn.addEventListener("click",()=>{
      const close=menu.querySelector(".mobile-profile-menu-close");
      close?.click();
      window.go?.("settings");
      setTimeout(()=>document.querySelector("#settingsAppearance")?.scrollIntoView({block:"start",behavior:"smooth"}),150);
    });
    const help=inner.querySelector("[data-mobile-help-about]");
    if(help)help.before(btn);else inner.appendChild(btn);
  }
  if(!inner.querySelector("[data-mobile-signout]")){
    const btn=document.createElement("button");
    btn.type="button";btn.className="mobile-profile-menu-wide fb-mobile-menu-signout";
    btn.dataset.mobileSignout="1";
    btn.innerHTML='<span><i data-lucide="log-out"></i></span><span><strong>Sign out</strong><small>Leave this account securely</small></span><i data-lucide="chevron-right"></i>';
    btn.addEventListener("click",async()=>{
      if(!window.confirm("Sign out of Family Book?"))return;
      btn.disabled=true;
      try{await window.FB_AUTH?.logout?.();window.location.reload()}
      catch(err){btn.disabled=false;alert(err?.message||"Could not sign out. Please try again.")}
    });
    inner.appendChild(btn);
  }
  window.icons?.();
 }
 const app=document.getElementById("app");
 // The mobile menu is mounted directly under body, not inside #app.
 let scheduled=false;
 const schedule=()=>{
   if(scheduled)return;
   scheduled=true;
   requestAnimationFrame(()=>{scheduled=false;updateMobileMenu()});
 };
 if(document.body)new MutationObserver(records=>{
   if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&
     (n.matches?.(".mobile-profile-menu")||n.querySelector?.(".mobile-profile-menu")))))schedule();
 }).observe(document.body,{childList:true,subtree:true});
 updateMobileMenu();
})();
