/* Family Book Mobile OTA 2: actual video-frame previews for review and gallery.
   This never edits/saves recordings or changes the encoder or native WebView. */
(()=>{
  "use strict";
  if(window.__fbVideoPreviewOta2)return;
  window.__fbVideoPreviewOta2=true;

  const attached=new WeakSet();
  const queue=[];
  let busy=false;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function waitEvent(video,success,limit=7000){
    return new Promise((resolve,reject)=>{
      if(video.error)return reject(new Error("Video decode error"));
      let done=false;
      const finish=(error)=>{
        if(done)return;
        done=true;
        clearTimeout(timeout);
        video.removeEventListener(success,ok);
        video.removeEventListener("error",bad);
        error?reject(error):resolve();
      };
      const ok=()=>finish();
      const bad=()=>finish(new Error("Video decode error"));
      const timeout=setTimeout(()=>finish(new Error("Video frame timeout")),limit);
      video.addEventListener(success,ok,{once:true});
      video.addEventListener("error",bad,{once:true});
    });
  }

  async function realFrame(video){
    if(!video.currentSrc&&!video.src)throw new Error("No video source");
    video.preload="auto";
    video.playsInline=true;
    video.setAttribute("playsinline","");
    if(video.readyState<1)await waitEvent(video,"loadedmetadata",7500);
    if(video.videoWidth<2||video.videoHeight<2)throw new Error("Video dimensions unavailable");
    const duration=video.duration;
    const position=Number.isFinite(duration)&&duration>0
      ?Math.min(0.6,Math.max(0,duration*0.18))
      :0.15;
    if(video.paused&&!video.seeking&&position>0.02&&Math.abs(video.currentTime-position)>0.06){
      const seeking=waitEvent(video,"seeked",4500);
      try{video.currentTime=position;await seeking}catch(_){}
    }
    if(video.readyState<2)await waitEvent(video,"loadeddata",5500);
    if(!video.paused)throw new Error("Video is playing");
    await sleep(65);
    const maxSide=420;
    const scale=Math.min(1,maxSide/Math.max(video.videoWidth,video.videoHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
    canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
    const ctx=canvas.getContext("2d",{alpha:false,willReadFrequently:false});
    if(!ctx)throw new Error("Canvas not available");
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/jpeg",0.73);
  }

  function applyThumbnail(video,data,kind){
    if(kind==="gallery"){
      const host=video.closest(".fun-gallery-media");
      if(!host)return;
      let img=host.querySelector(".fb-video-thumb");
      if(!img){
        img=document.createElement("img");
        img.className="fb-video-thumb";
        img.alt="";
        img.decoding="async";
        host.insertBefore(img,video.nextSibling);
      }
      img.src=data;
      host.dataset.fbPreview="ready";
    }else{
      const host=video.closest(".fun-result-preview");
      if(!host)return;
      let img=host.querySelector(".fb-review-thumb");
      if(!img){
        img=document.createElement("img");
        img.className="fb-review-thumb";
        img.alt="";
        host.insertBefore(img,video.nextSibling);
      }
      img.src=data;
      video.poster=data;
      host.dataset.fbPreview="ready";
      host.dataset.fbVideoPlaying=video.paused?"false":"true";
    }
  }

  async function process(video,kind){
    if(!video.isConnected||!video.getAttribute("src"))return;
    if(kind==="gallery"&&!video.closest(".fun-gallery-media"))return;
    if(kind==="review"&&video.closest(".fun-capture-review")?.hidden)return;
    try{
      const poster=await realFrame(video);
      if(video.isConnected)applyThumbnail(video,poster,kind);
    }catch(error){
      const host=video.closest(kind==="gallery"?".fun-gallery-media":".fun-result-preview");
      if(host&&host.dataset.fbPreview!=="ready")host.dataset.fbPreview="unavailable";
      console.warn("Family Book video preview frame:",error.message||error);
    }
  }

  function enqueue(video,kind){
    if(video.dataset.fbPosterQueued==="1")return;
    video.dataset.fbPosterQueued="1";
    queue.push({video,kind});
    if(busy)return;
    busy=true;
    (async()=>{
      while(queue.length){
        const job=queue.shift();
        await process(job.video,job.kind);
      }
      busy=false;
    })();
  }

  const visible=typeof IntersectionObserver!=="undefined"
    ?new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        visible.unobserve(entry.target);
        enqueue(entry.target,"gallery");
      }
    },{rootMargin:"120px"}):null;

  function setupReview(video){
    const host=video.closest(".fun-result-preview");
    if(!host)return;
    if(!attached.has(video)){
      attached.add(video);
      video.addEventListener("play",()=>host.dataset.fbVideoPlaying="true");
      video.addEventListener("playing",()=>host.dataset.fbVideoPlaying="true");
      video.addEventListener("pause",()=>host.dataset.fbVideoPlaying="false");
      video.addEventListener("ended",()=>host.dataset.fbVideoPlaying="false");
      new MutationObserver(()=>{
        host.dataset.fbPreview="waiting";
        host.querySelector(".fb-review-thumb")?.remove();
        video.dataset.fbPosterQueued="";
        if(video.getAttribute("src"))enqueue(video,"review");
      }).observe(video,{attributes:true,attributeFilter:["src"]});
    }
    if(video.getAttribute("src"))enqueue(video,"review");
  }

  function scan(){
    document.querySelectorAll(".fun-gallery-media video").forEach(video=>{
      if(attached.has(video))return;
      attached.add(video);
      const media=video.closest(".fun-gallery-media");
      if(media)media.dataset.fbPreview="waiting";
      if(visible)visible.observe(video);else enqueue(video,"gallery");
    });
    const review=document.getElementById("funResultVideo");
    if(review)setupReview(review);
  }
  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;scan()},130);
  });
  observer.observe(document.getElementById("app")||document.body,{childList:true,subtree:true});
  scan();
})();