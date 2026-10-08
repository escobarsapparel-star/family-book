/* Family Book Android OTA v4 — real thumbnails ~2.5 seconds into each clip.
   Runs after v3's playback/gallery controls. Does not modify video files, encoder,
   storage, credentials, native code or functional Play/Save/Discard buttons. */
(()=>{
  "use strict";
  if(window.__fbVideoFrameThumbV4)return;
  window.__fbVideoFrameThumbV4=true;
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
  function candidate(video,cover,kind){
    if(!cover||!video)return;
    const src=currentUrl(video);
    if(!src)return;
    const prev=marked.get(cover);
    if(prev===src)return;
    marked.set(cover,src);
    if(kind==="review")cover.dataset.fbThumbStatus="loading";
    else cover.dataset.fbThumbStatus="loading";
    jobs.push({src,video,cover,kind});
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
          // The existing v3 cover supplies the small play icon and keeps the
          // gallery/player clickable. Only its photographic background changes.
          job.cover.style.backgroundImage='linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.20)),url("'+image+'")';
          job.cover.style.backgroundPosition="center";
          job.cover.style.backgroundSize="cover";
          job.cover.dataset.fbThumbStatus="ready";
        }catch(err){
          // Keep existing playback buttons even if this particular codec or
          // the storage server's CORS settings prohibit canvas extraction.
          job.cover.dataset.fbThumbStatus="unavailable";
          console.warn("Family Book thumbnail at 2.5s unavailable:",err?.message||err);
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