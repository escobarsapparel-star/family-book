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
  // Dedicated in-app gallery screen. Keep the *same* gallery DOM so the
  // stable original Family Fun runtime keeps fetching, filtering and deleting.
  let galleryReturnScroll=0;
  function closeGalleryPage(){
    const page=document.getElementById("fbMobileGalleryPage");
    if(!page)return;
    const panel=document.getElementById("funCameraPanel");
    const gallery=document.getElementById("funGalleryPanel");
    if(panel&&gallery){
      panel.appendChild(gallery);
      gallery.hidden=true;
      panel.querySelector('[data-fun-tab="create"]')?.click();
      panel.hidden=true;
    }
    const oldPage=document.querySelector("#screen > .family-fun-app-page");
    oldPage?.classList.remove("fb-gallery-background-hidden");
    page.remove();
    document.getElementById("screen")?.classList.remove("fb-gallery-route-open");
    try{window.scrollTo(0,galleryReturnScroll)}catch(_){}
  }
  function showGallery(){
    const screen=document.getElementById("screen");
    const panel=document.getElementById("funCameraPanel");
    const gallery=document.getElementById("funGalleryPanel");
    const create=document.getElementById("funCreatePanel");
    if(!screen||!panel||!gallery||!create)return;
    if(document.getElementById("fbMobileGalleryPage"))return;
    galleryReturnScroll=window.scrollY||document.scrollingElement?.scrollTop||0;
    const page=document.createElement("section");
    page.id="fbMobileGalleryPage";
    page.className="family-fun-app-page fb-mobile-gallery-page";
    page.innerHTML='<header class="fb-gallery-page-header"><button type="button" class="fb-gallery-back">← Family Fun</button><h1>Family Video Gallery</h1><p>Watch the videos saved by your family.</p></header>';
    page.querySelector(".fb-gallery-back").addEventListener("click",closeGalleryPage);
    // Make the old gallery visible before moving it: this keeps the original
    // JS references and event handlers intact across camera/gallery switches.
    panel.hidden=false;
    panel.removeAttribute("hidden");
    panel.style.display="";
    panel.classList.remove("fun-camera-fullscreen");
    document.documentElement.classList.remove("fun-camera-open");
    document.body.classList.remove("fun-camera-open");
    document.querySelector('[data-family-fun-feature="camera"]')?.classList.remove("active");
    if(gallery.hidden){
      panel.querySelector('[data-fun-tab="gallery"]')?.click();
      gallery.hidden=false;
    }
    page.appendChild(gallery);
    const oldPage=screen.querySelector(":scope > .family-fun-app-page");
    oldPage?.classList.add("fb-gallery-background-hidden");
    screen.appendChild(page);
    screen.classList.add("fb-gallery-route-open");
    window.scrollTo(0,0);
    screen.scrollTop=0;
  }
  function addGalleryShortcut(){
    const hub=document.querySelector("#funHub .fun-feature-grid");
    if(!hub||hub.querySelector(".fb-mobile-gallery-shortcut"))return;
    const button=make("button","fun-feature-card fb-mobile-gallery-shortcut");
    button.type="button";
    button.innerHTML='<span class="fun-feature-icon" aria-hidden="true">▶</span><span class="fun-feature-copy"><strong>Family Video Gallery</strong><small>Open your saved family clips</small></span><span class="fun-feature-arrow" aria-hidden="true">›</span>';
    button.addEventListener("click",showGallery);
    const camera=hub.querySelector('[data-family-fun-feature="camera"]');
    camera?.after(button);
    if(!camera)hub.prepend(button);
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
    addGalleryShortcut();
    document.querySelectorAll("#funGalleryGrid .fun-gallery-card").forEach(setupGalleryCard);
    const review=document.getElementById("funResultVideo");
    if(review)setupReview(review);
    const panel=document.getElementById("funCameraPanel");
    const gallery=document.getElementById("funGalleryPanel");
    // The original save flow reveals Gallery inside the camera panel. Promote
    // it to the dedicated page instead of scrolling within Family Fun.
    if(gallery&&!gallery.hidden&&!document.getElementById("fbMobileGalleryPage")
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