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