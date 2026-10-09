/* Family Book OTA v11: same five verified modules, delivered as one script.
   Every module is unchanged from v10; IIFEs execute in original order. */
;
/* video-controls.js */
/* Family Book Mobile OTA v3: review playback + reachable saved videos.
   Targets the original stable Android APK's Family Fun DOM, not the newer website build.
   Does not change capture, encoding, cloud data or native plugins. */
(()=>{
  "use strict";
  if(window.__fbMobileVideoFixV3)return;
  window.__fbMobileVideoFixV3=true;
  const wiredReview=new WeakSet();
  const wiredGallery=new WeakSet();
  let activeViewer=null;

  function info(message){
    const node=document.getElementById("funStatus");
    if(node){node.textContent=message;node.dataset.type="warn";node.dataset.quiet="false"}
  }
  function make(tag,cls,text){
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text)el.textContent=text;
    return el;
  }
  // The stable original APK has NO gallery route. Reuse its already-loaded
  // gallery runtime, but mount the gallery in its own Family Fun page.
  let galleryMount=null;
  let openingGalleryTab=false;
  let galleryReturnScroll=0;
  function closeGalleryPage(){
    const state=galleryMount;
    if(!state)return;
    galleryMount=null;
    try{
      const {page,gallery,panel,parent,originalPage,screen}=state;
      // Restore the gallery under the same original panel before resuming
      // camera mode; the studio's existing event handlers remain attached.
      if(parent?.isConnected)parent.appendChild(gallery);
      else if(panel?.isConnected)panel.appendChild(gallery);
      if(panel?.isConnected){
        const create=panel.querySelector('[data-fun-tab="create"]');
        create?.click();
        gallery.hidden=true;
        panel.hidden=true;
        panel.classList.remove("fun-camera-fullscreen");
      }
      document.documentElement.classList.remove("fun-camera-open");
      document.body.classList.remove("fun-camera-open");
      screen?.classList.remove("fb-gallery-route-open");
      originalPage?.classList.remove("fb-gallery-background-hidden");
      page?.remove();
      if(screen?.isConnected)requestAnimationFrame(()=>window.scrollTo(0,galleryReturnScroll));
    }catch(err){console.warn("Family Book gallery back:",err)}
  }
  function showGallery(){
    if(galleryMount)return true;
    // Future APKs may contain a native standalone gallery route. The current
    // working APK does not; NEVER call a route that it cannot render.
    if(typeof window.FB_FAMILY_FUN?.galleryShell==="function" &&
       typeof window.go==="function"){
      window.go("family-fun-gallery");
      return true;
    }
    const screen=document.getElementById("screen");
    const panel=document.getElementById("funCameraPanel");
    const gallery=document.getElementById("funGalleryPanel");
    const originalPage=screen?.querySelector(":scope > .family-fun-app-page");
    if(!screen||!panel||!gallery||!originalPage)return false;
    galleryReturnScroll=window.scrollY||document.scrollingElement?.scrollTop||0;
    // The original app's tab handler is responsible for fetching the cloud
    // videos and attaching filters. Trigger that renderer exactly once.
    panel.hidden=false;
    panel.removeAttribute("hidden");
    panel.style.display="";
    panel.classList.remove("fun-camera-fullscreen");
    document.documentElement.classList.remove("fun-camera-open");
    document.body.classList.remove("fun-camera-open");
    const tab=panel.querySelector('[data-fun-tab="gallery"]');
    openingGalleryTab=true;
    try{
      if(tab)tab.click();
      else{
        document.getElementById("funCreatePanel")?.setAttribute("hidden","");
        gallery.hidden=false;
      }
    }finally{openingGalleryTab=false}
    gallery.hidden=false;
    const page=document.createElement("section");
    page.id="fbMobileGalleryPage";
    page.className="family-fun-app-page fb-mobile-gallery-page";
    page.setAttribute("aria-label","Family Video Gallery");
    page.innerHTML='<header class="fb-gallery-page-header"><button type="button" class="fb-gallery-back">← Back to Family Fun</button><h1>Family Video Gallery</h1><p>Watch the videos saved by your family.</p></header>';
    const parent=gallery.parentNode;
    page.appendChild(gallery);
    originalPage.classList.add("fb-gallery-background-hidden");
    screen.appendChild(page);
    screen.classList.add("fb-gallery-route-open");
    galleryMount={page,gallery,panel,parent,originalPage,screen};
    page.querySelector(".fb-gallery-back")?.addEventListener("click",closeGalleryPage);
    // Inline gallery scroll is no longer used: this page starts at the top.
    window.scrollTo(0,0);
    screen.scrollTop=0;
    return true;
  }
  document.addEventListener("click",event=>{
    if(openingGalleryTab)return;
    const target=event.target?.closest?.(
      '#funCameraPanel [data-fun-tab="gallery"],#funHub .fb-mobile-gallery-shortcut,#funHub [data-r="family-fun-gallery"]'
    );
    if(!target)return;
    if(!document.getElementById("funGalleryPanel"))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showGallery();
  },true);
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&galleryMount)closeGalleryPage();
  });
  function addGalleryShortcut(){
    const hub=document.querySelector("#funHub .fun-feature-grid");
    if(!hub||hub.querySelector(".fb-mobile-gallery-shortcut"))return;
    // A later APK might already bundle this card. Avoid duplicates there.
    if(hub.querySelector('[data-r="family-fun-gallery"]'))return;
    const button=make("button","fun-feature-card fb-mobile-gallery-shortcut");
    button.type="button";
    button.innerHTML='<span class="fun-feature-icon" aria-hidden="true">▶</span><span class="fun-feature-copy"><strong>Family Video Gallery</strong><small>Open your saved family clips</small></span><span class="fun-feature-arrow" aria-hidden="true">›</span>';
    button.addEventListener("click",showGallery);
    const camera=hub.querySelector('[data-family-fun-feature="camera"]');
    if(camera)camera.after(button);
    else hub.prepend(button);
  }

  function coverFromCamera(cover){
    const camera=document.getElementById("funCameraPreview");
    if(!camera||camera.videoWidth<2||camera.videoHeight<2)return;
    try{
      const max=480,ratio=Math.min(1,max/Math.max(camera.videoWidth,camera.videoHeight));
      const cv=document.createElement("canvas");
      cv.width=Math.max(1,Math.round(camera.videoWidth*ratio));
      cv.height=Math.max(1,Math.round(camera.videoHeight*ratio));
      cv.getContext("2d").drawImage(camera,0,0,cv.width,cv.height);
      cover.style.backgroundImage='linear-gradient(rgba(0,0,0,.22),rgba(0,0,0,.32)),url("'+cv.toDataURL("image/jpeg",.72)+'")';
    }catch(e){console.warn("Camera frame unavailable:",e?.message)}
  }

  function setupReview(video){
    if(wiredReview.has(video))return;
    wiredReview.add(video);
    const parent=document.getElementById("funResult");
    if(!parent)return;
    parent.classList.add("fb-review-enhanced");
    const cover=make("div","fb-review-cover");
    cover.setAttribute("aria-hidden","true");
    const play=make("button","fb-review-play","▶  Play recording");
    play.type="button";
    play.setAttribute("aria-label","Play recording before saving");
    const error=make("div","fb-review-error");
    error.setAttribute("role","status");
    error.hidden=true;
    parent.insertBefore(cover,video.nextSibling);
    parent.appendChild(play);
    parent.appendChild(error);

    function reset(){
      cover.hidden=false;
      cover.style.backgroundImage="";
      play.hidden=false;
      play.textContent="▶  Play recording";
      error.hidden=true;
      error.textContent="";
      parent.dataset.fbReviewPlaying="false";
      // A still of the *live camera* is used only as a fallback cover, not as a
      // claim that video decoding or playback has succeeded.
      setTimeout(()=>coverFromCamera(cover),140);
    }
    new MutationObserver(reset).observe(video,{attributes:true,attributeFilter:["src"]});
    if(video.getAttribute("src"))reset();

    function failed(reason){
      cover.hidden=false;
      parent.dataset.fbReviewPlaying="false";
      play.hidden=false;
      play.textContent="▶  Retry preview";
      error.textContent="Preview could not play on this phone. Your clip is still available to save or download. "+(reason||"");
      error.hidden=false;
      info("This recording could not be previewed. You can still save or download it.");
    }
    play.addEventListener("click",async()=>{
      if(!video.getAttribute("src"))return failed("No clip loaded.");
      error.hidden=true;
      try{
        // The original v1.0 script seeks to the last frame and pauses on
        // metadata. Stop that behavior only when the user requests playback.
        video.onloadedmetadata=null;
        video.onseeked=null;
        video.controls=true;
        video.muted=false;
        video.playsInline=true;
        video.preload="auto";
        if(video.readyState===0)video.load();
        if(video.currentTime>0.15||video.ended){
          try{video.currentTime=0}catch(_){}
        }
        play.textContent="Loading video…";
        await video.play();
        parent.dataset.fbReviewPlaying="true";
        cover.hidden=true;
        play.hidden=true;
      }catch(err){
        console.warn("Family Book preview playback:",err);
        failed(err?.name||"");
      }
    });
    video.addEventListener("playing",()=>{cover.hidden=true;play.hidden=true;parent.dataset.fbReviewPlaying="true"});
    video.addEventListener("ended",()=>{
      parent.dataset.fbReviewPlaying="false";
      play.hidden=false;
      play.textContent="▶  Replay recording";
    });
    video.addEventListener("error",()=>{
      if(video.getAttribute("src"))failed(video.error?.message||"Unsupported video format.");
    });
  }

  function closeViewer(){
    if(!activeViewer)return;
    try{activeViewer.querySelector("video")?.pause()}catch(_){}
    activeViewer.remove();
    activeViewer=null;
    document.body.classList.remove("fb-video-viewer-open");
  }
  function openViewer(original){
    const source=original.currentSrc||original.src||original.getAttribute("src");
    if(!source)return info("This video has no playable URL.");
    closeViewer();
    const overlay=make("div","fb-video-viewer");
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-label","Family video player");
    overlay.innerHTML='<div class="fb-video-viewer-body"><div class="fb-video-viewer-top"><strong>Family video</strong><button type="button" data-fb-close>Close ×</button></div><video controls playsinline preload="metadata"></video><p class="fb-video-viewer-status" role="status">Loading recording…</p><a class="fb-video-viewer-open" target="_blank" rel="noopener">Open video separately</a></div>';
    const player=overlay.querySelector("video");
    const status=overlay.querySelector(".fb-video-viewer-status");
    const outside=overlay.querySelector(".fb-video-viewer-open");
    outside.href=source;
    player.src=source;
    player.controls=true;
    player.playsInline=true;
    player.muted=false;
    overlay.querySelector("[data-fb-close]").onclick=closeViewer;
    overlay.addEventListener("click",event=>{if(event.target===overlay)closeViewer()});
    document.body.appendChild(overlay);
    activeViewer=overlay;
    document.body.classList.add("fb-video-viewer-open");
    player.addEventListener("playing",()=>{status.textContent=""},{once:true});
    player.addEventListener("error",()=>{status.textContent="This clip cannot play in the app. Try Open video separately."});
    // Called as a direct result of the Play button, preserving user activation.
    player.play().catch(err=>{
      console.warn("Family video gallery playback:",err);
      status.textContent="Tap the video controls to play. If that fails, use Open video separately.";
    });
  }
  function setupGalleryCard(card){
    if(wiredGallery.has(card))return;
    const video=card.querySelector(".fun-gallery-media video");
    if(!video)return;
    wiredGallery.add(card);
    const media=video.closest(".fun-gallery-media");
    if(!media)return;
    media.classList.add("fb-gallery-enhanced");
    const cover=make("div","fb-gallery-cover");
    cover.setAttribute("aria-hidden","true");
    cover.innerHTML='<span class="fb-gallery-small-play" aria-hidden="true">▶</span><span class="fb-gallery-prompt">Play video</span>';
    media.appendChild(cover);
    const play=make("button","fb-gallery-open","Play video");
    play.type="button";
    play.setAttribute("aria-label","Play this family video");
    media.appendChild(play);
    play.addEventListener("click",()=>openViewer(video));

    // If WebView can decode a frame later, keep that frame as the thumbnail.
    // If it cannot, never hide the card, the title, or the playback control.
    const recordFrame=()=>{
      if(!video.videoWidth||!video.videoHeight)return;
      try{
        const cv=document.createElement("canvas");
        const ratio=Math.min(1,400/Math.max(video.videoWidth,video.videoHeight));
        cv.width=Math.max(1,Math.round(video.videoWidth*ratio));
        cv.height=Math.max(1,Math.round(video.videoHeight*ratio));
        cv.getContext("2d").drawImage(video,0,0,cv.width,cv.height);
        cover.style.backgroundImage='linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.3)),url("'+cv.toDataURL("image/jpeg",.72)+'")';
      }catch(_){}
    };
    video.addEventListener("loadeddata",recordFrame,{once:true});
  }
  function scan(){
    if(galleryMount&&!galleryMount.page.isConnected)galleryMount=null;
    addGalleryShortcut();
    document.querySelectorAll("#funGalleryGrid .fun-gallery-card").forEach(setupGalleryCard);
    const review=document.getElementById("funResultVideo");
    if(review)setupReview(review);
    const panel=document.getElementById("funCameraPanel");
    const gallery=document.getElementById("funGalleryPanel");
    // The original save flow reveals Gallery inside the camera panel. Promote
    // it to the dedicated page instead of scrolling within Family Fun.
    if(gallery&&!gallery.hidden&&!galleryMount
      &&panel?.isConnected){
      showGallery();
    }
  }
  let scheduled=false;
  const watcher=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;scan()},110);
  });
  watcher.observe(document.getElementById("app")||document.body,{
    childList:true,subtree:true,attributes:true,attributeFilter:["hidden","src"]
  });
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeViewer()});
  scan();
})();
;

;
/* video-thumbnails.js */
/* Family Book Android OTA v4 — real thumbnails ~2.5 seconds into each clip.
   Runs after v3's playback/gallery controls. Does not modify video files, encoder,
   storage, credentials, native code or functional Play/Save/Discard buttons. */
(()=>{
  "use strict";
  if(window.__fbVideoFrameThumbV5)return;
  window.__fbVideoFrameThumbV5=true;
  const marked=new WeakMap();
  const jobs=[];
  let processing=false;
  const TARGET_SECOND=2.5;
  const timed=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

  function currentUrl(video){
    return video?.currentSrc||video?.src||video?.getAttribute("src")||"";
  }
  function waitFor(video,events,ready,timeout=10000){
    return new Promise((resolve,reject)=>{
      if(ready())return resolve();
      let finished=false;
      let timer;
      const cleanup=()=>{
        clearTimeout(timer);
        for(const type of events)video.removeEventListener(type,check);
        video.removeEventListener("error",error);
      };
      const complete=(err)=>{
        if(finished)return;
        finished=true;cleanup();err?reject(err):resolve();
      };
      const check=()=>{if(ready())complete()};
      const error=()=>complete(new Error("Video cannot be decoded"));
      for(const type of events)video.addEventListener(type,check);
      video.addEventListener("error",error,{once:true});
      timer=setTimeout(()=>complete(new Error("Timed out waiting for video frame")),timeout);
      check();
    });
  }
  function seekTime(duration){
    if(!Number.isFinite(duration)||duration<=0)return TARGET_SECOND;
    // For short clips, take a frame close to the end, but avoid the last 0.2s.
    if(duration<=.55)return Math.max(.02,duration*.45);
    return Math.min(TARGET_SECOND,Math.max(.12,duration-.22));
  }
  async function seekFrame(probe,target){
    const ready=()=>{
      if(probe.seeking||probe.readyState<2)return false;
      return Math.abs(probe.currentTime-target)<.24;
    };
    const waiting=waitFor(probe,["seeked","loadeddata","canplay","timeupdate"],ready,9500);
    try{probe.currentTime=target}
    catch(err){waiting.catch(()=>{});throw err}
    await waiting;
    // Some Android WebViews render the preceding frame immediately after seek.
    // Wait briefly for the decoded frame to become drawable.
    await timed(100);
  }
  async function captureFrame(src){
    const probe=document.createElement("video");
    probe.muted=true;
    probe.defaultMuted=true;
    probe.playsInline=true;
    probe.setAttribute("playsinline","");
    probe.setAttribute("muted","");
    probe.preload="auto";
    // This permits drawing signed Supabase media to canvas when CORS allows it.
    // Never read or transmit the underlying file other than its normal video URL.
    probe.crossOrigin="anonymous";
    probe.style.cssText="position:fixed;left:-8px;top:-8px;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(probe);
    try{
      const metadata=waitFor(probe,["loadedmetadata","loadeddata"],()=>probe.readyState>=1,9500);
      probe.src=src;
      probe.load();
      await metadata;
      if(probe.videoWidth<2||probe.videoHeight<2)throw Error("No video dimensions");
      let target=seekTime(probe.duration);
      try{
        await seekFrame(probe,target);
      }catch(firstError){
        // Seek may fail on very short or partially indexed phone recordings.
        target=.08;
        await seekFrame(probe,target);
      }
      const ratio=Math.min(1,480/Math.max(probe.videoWidth,probe.videoHeight));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(probe.videoWidth*ratio));
      canvas.height=Math.max(1,Math.round(probe.videoHeight*ratio));
      const context=canvas.getContext("2d",{alpha:false});
      if(!context)throw Error("Canvas not supported");
      context.drawImage(probe,0,0,canvas.width,canvas.height);
      return canvas.toDataURL("image/jpeg",.79);
    }finally{
      try{probe.pause();probe.removeAttribute("src");probe.load()}catch(_){}
      probe.remove();
    }
  }
  // Persistent, device-local cache indexed by the *storage object path*.
  // Signed media URLs rotate tokens; never include their transient query string
  // in the cache key, or every gallery visit would redownload thumbnails.
  const memoryCache=new Map();
  const CACHE_DB="familybook-private-video-thumbnail-cache";
  const CACHE_STORE="frames";
  let cacheDbPromise=null;
  function stableKey(src,kind){
    if(kind!=="gallery"||!/^https?:/i.test(src))return "";
    try{
      const url=new URL(src,location.href);
      return "frame2.5:"+url.origin+decodeURIComponent(url.pathname);
    }catch(_){return ""}
  }
  function openCache(){
    if(cacheDbPromise)return cacheDbPromise;
    cacheDbPromise=new Promise(resolve=>{
      if(!window.indexedDB)return resolve(null);
      try{
        const req=indexedDB.open(CACHE_DB,1);
        req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(CACHE_STORE)){
          req.result.createObjectStore(CACHE_STORE,{keyPath:"key"});
        }};
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>resolve(null);
        req.onblocked=()=>resolve(null);
      }catch(_){resolve(null)}
    });
    return cacheDbPromise;
  }
  async function cacheGet(key){
    if(!key)return null;
    if(memoryCache.has(key))return memoryCache.get(key);
    const db=await openCache();
    if(!db)return null;
    return new Promise(resolve=>{
      try{
        const tx=db.transaction(CACHE_STORE,"readonly");
        const req=tx.objectStore(CACHE_STORE).get(key);
        req.onsuccess=()=>{
          const result=req.result;
          if(!result||!result.image||Date.now()-result.updated>90*86400000)return resolve(null);
          memoryCache.set(key,result.image);
          resolve(result.image);
        };
        req.onerror=()=>resolve(null);
      }catch(_){resolve(null)}
    });
  }
  async function cachePut(key,image){
    if(!key||!image)return;
    memoryCache.set(key,image);
    if(memoryCache.size>50)memoryCache.delete(memoryCache.keys().next().value);
    const db=await openCache();
    if(!db)return;
    await new Promise(resolve=>{
      try{
        const tx=db.transaction(CACHE_STORE,"readwrite");
        tx.objectStore(CACHE_STORE).put({key,image,updated:Date.now()});
        tx.oncomplete=resolve;
        tx.onerror=resolve;
        tx.onabort=resolve;
      }catch(_){resolve()}
    });
  }
  function paint(cover,image,source){
    if(!cover.isConnected)return;
    cover.style.backgroundImage='linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.20)),url("'+image+'")';
    cover.style.backgroundPosition="center";
    cover.style.backgroundSize="cover";
    cover.dataset.fbThumbStatus="ready";
    cover.dataset.fbThumbSource=source;
  }

  async function candidate(video,cover,kind){
    if(!cover||!video)return;
    const src=currentUrl(video);
    if(!src)return;
    const key=stableKey(src,kind);
    if(marked.get(cover)===src)return;
    marked.set(cover,src);
    cover.dataset.fbThumbStatus="loading";
    // Load from persistent IndexedDB first. Old clips with fresh signed URLs
    // can reuse the same cached frame immediately, without decoding a video.
    const cached=await cacheGet(key);
    if(!cover.isConnected||currentUrl(video)!==src)return;
    if(cached){paint(cover,cached,"cache");return}
    jobs.push({src,video,cover,kind,key});
    if(!processing)void pump();
  }
  async function pump(){
    processing=true;
    try{
      while(jobs.length){
        const job=jobs.shift();
        if(!job.cover.isConnected||currentUrl(job.video)!==job.src)continue;
        try{
          const image=await captureFrame(job.src);
          if(!job.cover.isConnected||currentUrl(job.video)!==job.src)continue;
          paint(job.cover,image,"generated");
          await cachePut(job.key,image);
        }catch(err){
          job.cover.dataset.fbThumbStatus="unavailable";
          console.warn("Family Book 2.5s thumbnail unavailable:",err?.message||err);
        }
        await timed(35);
      }
    }finally{processing=false}
  }

  // Only decode gallery thumbnails as they approach the screen. This avoids
  // loading every family video at once on lower-memory Android phones.
  const observedCards=new WeakSet();
  const visibleCards=typeof IntersectionObserver==="function"
    ?new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        visibleCards.unobserve(entry.target);
        const card=entry.target;
        candidate(card.querySelector(".fun-gallery-media video"),
                  card.querySelector(".fb-gallery-cover"),"gallery");
      }
    },{rootMargin:"180px"}):null;
  function scan(){
    for(const card of document.querySelectorAll("#funGalleryGrid .fun-gallery-card")){
      const video=card.querySelector(".fun-gallery-media video");
      const cover=card.querySelector(".fb-gallery-cover");
      if(!video||!cover||observedCards.has(card))continue;
      observedCards.add(card);
      if(visibleCards)visibleCards.observe(card);
      else candidate(video,cover,"gallery");
    }
    const review=document.getElementById("funResultVideo");
    const reviewCover=document.querySelector("#funResult.fb-review-enhanced .fb-review-cover");
    if(review&&reviewCover&&review.getAttribute("src"))candidate(review,reviewCover,"review");
  }
  let pending=false;
  const observer=new MutationObserver(()=>{
    if(pending)return;
    pending=true;
    setTimeout(()=>{pending=false;scan()},210);
  });
  observer.observe(document.getElementById("app")||document.body,{
    childList:true,subtree:true,attributes:true,attributeFilter:["src"]
  });
  scan();
})();
;

;
/* social-reactions.js */
/* OTA v7: repair legacy APK's missing global photo resolver and install
   the already-shipped website reaction viewer, without changing its backend. */
if(typeof window.currentPersonPhoto!=="function"){
  window.currentPersonPhoto=function(people,personId,fallback=""){
    const id=String(personId||""), person=people?.[id]||{};
    let photo=person.photo||fallback||"";
    const u=window.FB_AUTH?.get?.()||{};
    if(id&&id===String(u.memberId||"")){
      try{photo=window.currentUserPhoto?.()||photo}catch(_){}
      photo=photo||u.photo||"";
    }
    return photo;
  };
}
(()=>{
  const TYPES={
    love:{label:"Love",icon:"heart"},
    like:{label:"Like",icon:"thumbs-up"},
    celebrate:{label:"Celebrate",icon:"party-popper"}
  };
  let viewerKeyHandler=null;

  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function user(){return window.FB_AUTH?.get?.()||{}}
  function targetRows(target){return window.FB_SOCIAL_DATA?.getReactions?.(target)||{}}
  function currentPersonById(id){
    const key=String(id||"");
    if(!key)return null;
    try{return (window.FB_FAMILY_DATA?.getPeople?.()||[]).find(p=>String(p.id)===key)||null}catch(_){return null}
  }
  function resolvedReaction(row){
    const live=currentPersonById(row?.personId);
    return {
      ...row,
      name:live?.name||row?.name||"Family member",
      photo:live?.photo||row?.photo||""
    };
  }
  function initials(name){
    const parts=String(name||"Family member").trim().split(/\s+/).filter(Boolean);
    return e(((parts[0]?.[0]||"F")+(parts.length>1?(parts.at(-1)?.[0]||""):"")).toUpperCase());
  }
  function reactionRows(target,type=""){
    return Object.entries(targetRows(target))
      .map(([userId,row])=>({userId,...row}))
      .filter(row=>row&&TYPES[row.type]&&(!type||row.type===type))
      .sort((a,b)=>(Number(b.at)||0)-(Number(a.at)||0)||String(a.name||"").localeCompare(String(b.name||"")));
  }

  function summary(target){
    const rows=targetRows(target),u=user();
    const counts={love:0,like:0,celebrate:0};
    let mine="";
    Object.values(rows).forEach(r=>{if(r&&TYPES[r.type])counts[r.type]++});
    if(rows[u.supabaseUserId]?.type)mine=rows[u.supabaseUserId].type;
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    return {counts,mine,total,rows};
  }

  async function toggle(target,type){
    if(!target||!TYPES[type])return summary(target);
    await window.FB_SOCIAL_DATA?.setReaction?.(target,type);
    window.dispatchEvent(new CustomEvent("familybook:reaction",{detail:{target,type}}));
    return summary(target);
  }

  function controlsHtml(target,{compact=false}={}){
    const s=summary(target);
    return `<div class="reaction-bar ${compact?"compact":""}" data-reaction-target="${e(target)}">
      ${Object.entries(TYPES).map(([id,t])=>`<button type="button" class="reaction-button ${s.mine===id?"active":""}" data-reaction-type="${id}" aria-label="${e(t.label)}"><i data-lucide="${t.icon}"></i><span>${e(t.label)}</span><b data-reaction-count="${id}">${s.counts[id]||""}</b></button>`).join("")}
      <button type="button" class="reaction-total" data-reaction-total aria-label="View who reacted" ${s.total?"":"hidden"}>${s.total?`${s.total} reaction${s.total===1?"":"s"}`:""}</button>
    </div>`;
  }

  function refreshBar(bar){
    if(!bar)return;
    const target=bar.dataset.reactionTarget,s=summary(target);
    bar.querySelectorAll("[data-reaction-type]").forEach(btn=>{
      const type=btn.dataset.reactionType;
      btn.classList.toggle("active",s.mine===type);
      const count=btn.querySelector(`[data-reaction-count="${type}"]`);
      if(count)count.textContent=s.counts[type]||"";
    });
    const total=bar.querySelector("[data-reaction-total]");
    if(total){
      total.textContent=s.total?`${s.total} reaction${s.total===1?"":"s"}`:"";
      total.hidden=!s.total;
    }
  }

  function closeViewer(){
    const overlay=document.querySelector(".reaction-viewer-overlay");
    if(overlay)overlay.remove();
    if(viewerKeyHandler){
      document.removeEventListener("keydown",viewerKeyHandler);
      viewerKeyHandler=null;
    }
    document.body.classList.remove("reaction-viewer-open");
  }

  function viewerRowsHtml(target,filter=""){
    const rows=reactionRows(target,filter);
    if(!rows.length)return '<div class="reaction-viewer-empty"><i data-lucide="users-round"></i><strong>No reactions here yet</strong></div>';
    return rows.map(rawRow=>{
      const row=resolvedReaction(rawRow);
      const t=TYPES[row.type];
      const avatar=row.photo?'<img src="'+e(row.photo)+'" alt="">':'<span>'+initials(row.name)+'</span>';
      const attrs=row.personId?' data-reaction-person="'+e(row.personId)+'" role="button" tabindex="0"':"";
      return '<div class="reaction-viewer-person"'+attrs+'>'+
        '<span class="reaction-viewer-avatar">'+avatar+'</span>'+
        '<span class="reaction-viewer-name"><strong>'+e(row.name||"Family member")+'</strong><small>'+e(t.label)+'</small></span>'+
        '<span class="reaction-viewer-badge is-'+e(row.type)+'" aria-label="'+e(t.label)+'"><i data-lucide="'+e(t.icon)+'"></i></span>'+
      '</div>';
    }).join("");
  }

  function bindViewerPeople(root){
    root?.querySelectorAll?.("[data-reaction-person]").forEach(row=>{
      const open=()=>{
        const id=row.dataset.reactionPerson;
        closeViewer();
        if(id)window.go?.("view-member:"+id);
      };
      row.addEventListener("click",open);
      row.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}});
    });
  }

  function openViewer(target,initialFilter=""){
    const sum=summary(target);
    if(!sum.total)return;
    closeViewer();
    const filters=[["","All",sum.total],...Object.entries(TYPES).map(([id,t])=>[id,t.label,sum.counts[id]||0])];
    const overlay=document.createElement("div");
    overlay.className="reaction-viewer-overlay";
    const tabs=filters.map(([id,label,count])=>'<button type="button" data-reaction-filter="'+e(id)+'" class="'+(id===initialFilter?"active":"")+'" '+(count?"":"disabled")+' >'+e(label)+(count?' <b>'+count+'</b>':"")+'</button>').join("");
    overlay.innerHTML='<section class="reaction-viewer" role="dialog" aria-modal="true" aria-label="Reactions">'+
      '<div class="reaction-viewer-head"><div><p>FAMILY REACTIONS</p><h2>Who reacted</h2></div><button type="button" class="reaction-viewer-close" aria-label="Close"><i data-lucide="x"></i></button></div>'+
      '<div class="reaction-viewer-tabs">'+tabs+'</div>'+
      '<div class="reaction-viewer-list">'+viewerRowsHtml(target,initialFilter)+'</div></section>';
    document.body.appendChild(overlay);
    document.body.classList.add("reaction-viewer-open");
    const list=overlay.querySelector(".reaction-viewer-list");
    overlay.querySelector(".reaction-viewer-close")?.addEventListener("click",closeViewer);
    overlay.addEventListener("click",ev=>{if(ev.target===overlay)closeViewer()});
    viewerKeyHandler=ev=>{if(ev.key==="Escape")closeViewer()};
    document.addEventListener("keydown",viewerKeyHandler);
    overlay.querySelectorAll("[data-reaction-filter]").forEach(btn=>btn.addEventListener("click",()=>{
      if(btn.disabled)return;
      overlay.querySelectorAll("[data-reaction-filter]").forEach(x=>x.classList.toggle("active",x===btn));
      list.innerHTML=viewerRowsHtml(target,btn.dataset.reactionFilter||"");
      bindViewerPeople(list);
      window.icons?.();
    }));
    bindViewerPeople(list);
    window.icons?.();
  }

  function bind(holder=document){
    holder.querySelectorAll?.(".reaction-bar[data-reaction-target]").forEach(bar=>{
      if(bar.dataset.reactionBound==="1")return;
      bar.dataset.reactionBound="1";
      bar.querySelector("[data-reaction-total]")?.addEventListener("click",ev=>{
        ev.preventDefault();ev.stopPropagation();openViewer(bar.dataset.reactionTarget);
      });
      bar.querySelectorAll("[data-reaction-type]").forEach(btn=>btn.onclick=async ev=>{
        ev.preventDefault();ev.stopPropagation();
        btn.disabled=true;
        try{
          await toggle(bar.dataset.reactionTarget,btn.dataset.reactionType);
          refreshBar(bar);
          window.icons?.();
        }catch(err){alert(err.message||"Could not save this reaction.")}
        finally{btn.disabled=false}
      });
    });
  }

  window.FB_REACTIONS={controlsHtml,bind,summary,toggle,refreshBar,openViewer,closeViewer};
})();


/* Upgrade any reaction bars already rendered by the bundled older social.js.
   Later SPA navigations use the replaced FB_REACTIONS.controlsHtml directly. */
(()=>{
 let refreshTimer=0,lastAttempt=0,loading=false;
 function bindVisible(refresh=false){
  document.querySelectorAll(".reaction-bar[data-reaction-target]").forEach(bar=>{
    let total=bar.querySelector("[data-reaction-total]");
    if(total&&total.tagName!=="BUTTON"){
      const button=document.createElement("button");
      button.type="button";
      button.className="reaction-total";
      button.setAttribute("data-reaction-total","");
      button.setAttribute("aria-label","View who reacted");
      total.replaceWith(button);
      bar.dataset.reactionBound="";
    }
    if(bar.dataset.reactionBound!=="1")window.FB_REACTIONS?.bind?.(bar.parentElement||document);
    if(refresh)window.FB_REACTIONS?.refreshBar?.(bar);
  });
 }
 function schedule(){
  if(refreshTimer)return;
  refreshTimer=setTimeout(()=>{refreshTimer=0;bindVisible()},100);
 }
 async function sync(){
  if(loading||Date.now()-lastAttempt<3000||!window.FB_AUTH?.get?.()?.familyId)return;
  lastAttempt=Date.now();loading=true;
  try{
    await window.FB_SOCIAL_DATA?.load?.();
    bindVisible(true);
  }catch(err){console.warn("Family Book OTA social refresh:",err?.message||err)}
  finally{loading=false}
 }
 const app=document.getElementById("app");
 if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
 window.addEventListener("familybook:reaction",schedule);
 window.addEventListener("familybook:family-data-ready",()=>{void sync()});
 window.addEventListener("focus",()=>{if(Date.now()-lastAttempt>60000)void sync()});
 bindVisible();void sync();
})();

;

;
/* mobile-ui-restoration.js */
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

;

;
/* ota-settings.js */
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
;