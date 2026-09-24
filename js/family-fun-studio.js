(function(){
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  const modes={
    normal:{title:"Normal",desc:"Record a family moment with the camera, or choose a video from your device.",emoji:"🎥"},
    bounce:{title:"Bounce",desc:"Record a quick 3-second clip and Family Fun plays it forward and backward.",emoji:"🔁"},
    countdown:{title:"Countdown",desc:"Give everyone time to get into frame before recording starts.",emoji:"⏱️"},
    pass:{title:"Pass the Phone",desc:"Family Book gives a fun prompt. Record a short answer, then pass the phone on.",emoji:"😂"}
  };

  const prompts=[
    "Pass the phone to the person who laughs the loudest.",
    "Pass the phone to the person who is always hungry.",
    "Pass the phone to the best cook in the family.",
    "Pass the phone to the person who takes the most photos.",
    "Pass the phone to the person who is always late.",
    "Pass the phone to the biggest joker in the family.",
    "Pass the phone to the person most likely to start dancing.",
    "Pass the phone to the person who gives the best hugs.",
    "Pass the phone to the person who knows everyone’s business.",
    "Pass the phone to the person who would survive the longest on a family road trip.",
    "Pass the phone to the person with the funniest laugh.",
    "Pass the phone to the person most likely to fall asleep first."
  ];

  const MAX_VIDEO_BYTES=50*1024*1024;
  const SIGNED_URL_SECONDS=60*60;

  let mode="normal";
  let galleryFilter="all";
  let stream=null;
  let recorder=null;
  let chunks=[];
  let facing="user";
  let autoStopTimer=0;
  let countdownTimer=0;
  let currentBlob=null;
  let currentUrl="";
  let currentPrompt="";
  let bounceToken=0;
  let promptIndex=Math.floor(Math.random()*prompts.length);
  let client=null;
  let userContext=null;
  let realtimeChannel=null;
  let galleryRefreshTimer=0;
  const urls=new Set();

  const camera=$("#funCameraPreview");
  const empty=$("#funCameraEmpty");
  const overlay=$("#funCameraOverlay");
  const overlayMain=$("#funOverlayMain");
  const overlaySub=$("#funOverlaySub");
  const status=$("#funStatus");
  const recordBtn=$("#funRecordBtn");
  const stopBtn=$("#funStopBtn");
  const startBtn=$("#funStartCameraBtn");
  const flipBtn=$("#funFlipCameraBtn");
  const fallbackInput=$("#funFallbackInput");
  const chooseBtn=$("#funChooseBtn");
  const result=$("#funResult");
  const resultVideo=$("#funResultVideo");
  const resultTitle=$("#funResultTitle");
  const resultMeta=$("#funResultMeta");
  const downloadLink=$("#funDownloadLink");
  const addGalleryBtn=$("#funAddGalleryBtn");
  const retakeBtn=$("#funRetakeBtn");
  const countdownOptions=$("#funCountdownOptions");
  const passPanel=$("#funPassPanel");
  const passPrompt=$("#funPassPrompt");
  const nextPromptBtn=$("#funNextPrompt");
  const galleryGrid=$("#funGalleryGrid");
  const galleryEmpty=$("#funGalleryEmpty");
  const galleryCount=$("#funGalleryCount");

  const bucket=()=>window.FB_SUPABASE_CONFIG?.mediaBucket||"family-media";

  function setStatus(message,type=""){
    if(!status)return;
    status.textContent=message;
    status.dataset.type=type;
  }

  function setOverlay(main="",sub=""){
    overlayMain.textContent=main;
    overlaySub.textContent=sub;
    overlay.hidden=!main&&!sub;
  }

  function supportedMime(){
    if(!window.MediaRecorder)return "";
    const types=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"];
    return types.find(t=>MediaRecorder.isTypeSupported?.(t))||"";
  }

  function stopBounce(){
    bounceToken++;
    try{resultVideo.pause()}catch(_){}
  }

  function revokeCurrent(){
    stopBounce();
    if(currentUrl){
      try{URL.revokeObjectURL(currentUrl)}catch(_){}
      urls.delete(currentUrl);
      currentUrl="";
    }
    currentBlob=null;
    currentPrompt="";
  }

  function resetResult(){
    revokeCurrent();
    result.hidden=true;
    resultVideo.removeAttribute("src");
    resultVideo.controls=true;
    resultVideo.muted=false;
    downloadLink.hidden=false;
    addGalleryBtn.disabled=false;
    addGalleryBtn.textContent="Add to Gallery";
  }

  async function stopStream(){
    if(stream){
      stream.getTracks().forEach(t=>t.stop());
      stream=null;
    }
    camera.srcObject=null;
    camera.hidden=true;
    empty.hidden=false;
    flipBtn.disabled=true;
    startBtn.disabled=false;
  }

  async function startCamera(){
    if(!navigator.mediaDevices?.getUserMedia){
      setStatus("Live camera is not available in this browser. Use Device camera or Choose video instead.","warn");
      return false;
    }
    try{
      await stopStream();
      setStatus("Opening camera…");
      stream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:{ideal:facing},width:{ideal:1080},height:{ideal:1920}},
        audio:true
      });
      camera.srcObject=stream;
      camera.muted=true;
      camera.playsInline=true;
      await camera.play().catch(()=>{});
      camera.hidden=false;
      empty.hidden=true;
      flipBtn.disabled=false;
      startBtn.disabled=true;
      setStatus("Camera ready.");
      return true;
    }catch(err){
      console.warn("Family Fun camera:",err);
      setStatus("Camera permission was not available. You can still use Device camera or Choose video.","warn");
      return false;
    }
  }

  async function flipCamera(){
    facing=facing==="user"?"environment":"user";
    await startCamera();
  }

  function countdownSeconds(){
    return Number(document.querySelector('input[name="funCountdown"]:checked')?.value||3);
  }

  function runCountdown(seconds){
    return new Promise(resolve=>{
      let left=seconds;
      setOverlay(String(left),"Get ready!");
      countdownTimer=setInterval(()=>{
        left--;
        if(left<=0){
          clearInterval(countdownTimer);
          countdownTimer=0;
          setOverlay("GO!","");
          setTimeout(()=>{setOverlay();resolve()},350);
        }else{
          setOverlay(String(left),"Get ready!");
        }
      },1000);
    });
  }

  async function beginRecording(){
    if(!stream){
      const ok=await startCamera();
      if(!ok||!stream)return;
    }
    if(!window.MediaRecorder){
      setStatus("Direct recording is not supported here. Use Device camera instead.","warn");
      return;
    }

    if(mode==="countdown")await runCountdown(countdownSeconds());
    if(!stream)return;

    chunks=[];
    const mime=supportedMime();
    try{recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream)}
    catch(_){recorder=new MediaRecorder(stream)}

    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
    recorder.onstop=handleRecorded;
    recorder.start(250);

    recordBtn.disabled=true;
    stopBtn.disabled=false;
    startBtn.disabled=true;
    chooseBtn.disabled=true;
    flipBtn.disabled=true;

    setStatus(mode==="bounce"?"Recording Bounce…":mode==="pass"?"Recording this person…":"Recording…","recording");
    setOverlay("● REC",mode==="bounce"?"3 seconds":mode==="pass"?"5 seconds":"");

    const limit=mode==="bounce"?3000:mode==="pass"?5000:0;
    if(limit)autoStopTimer=setTimeout(stopRecording,limit);
  }

  function stopRecording(){
    clearTimeout(autoStopTimer);
    autoStopTimer=0;
    if(recorder&&recorder.state!=="inactive"){
      try{recorder.stop()}catch(_){}
    }
  }

  function finishRecordUi(){
    recorder=null;
    recordBtn.disabled=false;
    stopBtn.disabled=true;
    startBtn.disabled=!!stream;
    chooseBtn.disabled=false;
    flipBtn.disabled=!stream;
    setOverlay();
    setStatus(stream?"Camera ready.":"Clip ready.");
  }

  function fileExt(blob){
    const type=String(blob?.type||"").toLowerCase();
    if(type.includes("quicktime"))return "mov";
    if(type.includes("mp4"))return "mp4";
    return "webm";
  }

  function setDownload(blob,label="Download clip"){
    downloadLink.textContent=label;
    downloadLink.href=currentUrl;
    downloadLink.download="family-fun-"+Date.now()+"."+fileExt(blob);
    downloadLink.hidden=false;
  }

  async function handleRecorded(){
    const mime=recorder?.mimeType||chunks[0]?.type||"video/webm";
    const blob=new Blob(chunks,{type:mime});
    finishRecordUi();
    if(!blob.size){
      setStatus("No video was captured. Try recording again.","warn");
      return;
    }
    showResult(blob,mode);
  }

  function showResult(blob,sourceMode=mode,fileName=""){
    resetResult();
    currentBlob=blob;
    currentPrompt=sourceMode==="pass"?prompts[promptIndex]:"";
    currentUrl=URL.createObjectURL(blob);
    urls.add(currentUrl);
    result.hidden=false;
    resultVideo.src=currentUrl;
    resultVideo.playsInline=true;

    if(sourceMode==="bounce"){
      resultTitle.textContent="Your Bounce";
      resultMeta.textContent="Forward ↔ backward preview";
      resultVideo.controls=false;
      resultVideo.muted=true;
      resultVideo.onloadedmetadata=()=>startBouncePreview(resultVideo);
    }else if(sourceMode==="pass"){
      resultTitle.textContent="Pass the Phone clip";
      resultMeta.textContent=currentPrompt;
      resultVideo.controls=true;
      resultVideo.muted=false;
    }else{
      resultTitle.textContent=fileName||((modes[sourceMode]?.title||"Family Fun")+" clip");
      resultMeta.textContent=sourceMode==="countdown"?"Recorded with Countdown":"Ready to add to the shared Family Fun Gallery.";
      resultVideo.controls=true;
      resultVideo.muted=false;
    }
    setDownload(blob);
    result.scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  function startBouncePreview(video){
    const token=++bounceToken;
    const reverseStep=()=>{
      if(token!==bounceToken)return;
      const next=Math.max(0,video.currentTime-0.045);
      try{video.currentTime=next}catch(_){}
      if(next<=0.02){
        if(token!==bounceToken)return;
        video.play().catch(()=>{});
        return;
      }
      setTimeout(reverseStep,45);
    };
    video.onended=()=>{
      if(token!==bounceToken)return;
      video.pause();
      reverseStep();
    };
    try{video.currentTime=0}catch(_){}
    video.play().catch(()=>{});
  }

  function nextPrompt(){
    if(prompts.length>1){
      let next=promptIndex;
      while(next===promptIndex)next=Math.floor(Math.random()*prompts.length);
      promptIndex=next;
    }
    passPrompt.textContent=prompts[promptIndex];
    setOverlay("PASS THE PHONE",prompts[promptIndex]);
    setTimeout(()=>{if(mode==="pass")setOverlay()},1800);
  }

  function chooseFile(){
    fallbackInput.removeAttribute("capture");
    fallbackInput.click();
  }

  function captureFallback(){
    fallbackInput.setAttribute("capture",facing);
    fallbackInput.click();
  }

  function handleFile(file){
    if(!file)return;
    if(!String(file.type||"").startsWith("video/")){
      setStatus("Please choose a video file.","warn");
      return;
    }
    if(file.size>MAX_VIDEO_BYTES){
      setStatus("That video is larger than the current 50 MB Family Fun limit.","warn");
      fallbackInput.value="";
      return;
    }
    showResult(file,mode,file.name);
    fallbackInput.value="";
  }

  function requireFamilyContext(){
    if(!client||!userContext?.familyId||!userContext?.supabaseUserId){
      throw new Error("Open Family Fun from your signed-in Family Book account.");
    }
    return userContext;
  }

  async function addCurrentToGallery(){
    if(!currentBlob)return;
    if(currentBlob.size>MAX_VIDEO_BYTES){
      setStatus("This clip is larger than the current 50 MB Family Fun limit.","warn");
      return;
    }

    addGalleryBtn.disabled=true;
    addGalleryBtn.textContent="Uploading…";

    let storagePath="";
    try{
      const u=requireFamilyContext();
      const id=crypto.randomUUID();
      const ext=fileExt(currentBlob);
      storagePath=`${u.familyId}/${u.supabaseUserId}/family-fun/${id}.${ext}`;

      const upload=await client.storage.from(bucket()).upload(storagePath,currentBlob,{
        contentType:currentBlob.type||"video/webm",
        cacheControl:"3600",
        upsert:false
      });
      if(upload.error)throw upload.error;

      const duration=Number(resultVideo.duration);
      const row={
        id,
        family_id:u.familyId,
        created_by_user_id:u.supabaseUserId,
        created_by_person_id:u.memberId||null,
        mode,
        title:resultTitle.textContent||modes[mode]?.title||"Family Fun",
        prompt:currentPrompt||null,
        storage_path:storagePath,
        mime_type:currentBlob.type||null,
        file_size_bytes:currentBlob.size||null,
        duration_seconds:Number.isFinite(duration)&&duration>0?duration:null
      };

      const saved=await client.from("family_fun_videos").insert(row);
      if(saved.error)throw saved.error;

      addGalleryBtn.textContent="Added ✓";
      setStatus("Uploaded to your shared Family Fun Gallery.","success");
      await renderGallery();
      setTimeout(()=>switchTab("gallery"),250);
    }catch(err){
      console.error("Family Fun upload:",err);
      if(storagePath){
        try{await client?.storage.from(bucket()).remove([storagePath])}catch(_){}
      }
      addGalleryBtn.disabled=false;
      addGalleryBtn.textContent="Add to Gallery";
      setStatus(err?.message||"Could not upload this Family Fun video.","warn");
    }
  }

  function formatDate(ts){
    try{return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(ts))}
    catch(_){return "Family Fun"}
  }

  async function signedUrlMap(rows){
    const paths=rows.map(x=>x.storage_path).filter(Boolean);
    const map=new Map();
    if(!paths.length)return map;
    const signed=await client.storage.from(bucket()).createSignedUrls(paths,SIGNED_URL_SECONDS);
    if(signed.error)throw signed.error;
    (signed.data||[]).forEach((item,index)=>{
      const path=item.path||paths[index];
      if(path&&item.signedUrl)map.set(path,item.signedUrl);
    });
    return map;
  }

  async function renderGallery(){
    if(!client||!userContext?.familyId)return;

    galleryGrid.setAttribute("aria-busy","true");
    try{
      const response=await client
        .from("family_fun_videos")
        .select("id,family_id,created_by_user_id,created_by_person_id,mode,title,prompt,storage_path,mime_type,file_size_bytes,duration_seconds,created_at")
        .eq("family_id",userContext.familyId)
        .order("created_at",{ascending:false});

      if(response.error)throw response.error;

      const rows=response.data||[];
      const visible=galleryFilter==="all"?rows:rows.filter(x=>x.mode===galleryFilter);
      const urlsByPath=await signedUrlMap(visible);

      galleryCount.textContent=rows.length===1?"1 video":rows.length+" videos";
      galleryEmpty.hidden=visible.length>0;
      galleryGrid.innerHTML="";

      visible.forEach(item=>{
        const url=urlsByPath.get(item.storage_path)||"";
        const canDelete=item.created_by_user_id===userContext.supabaseUserId||userContext.role==="admin";
        const card=document.createElement("article");
        card.className="fun-gallery-card";
        card.innerHTML='<div class="fun-gallery-media"><video muted playsinline preload="metadata"></video><span class="fun-gallery-mode"></span></div><div class="fun-gallery-copy"><strong></strong><small class="fun-gallery-date"></small><small class="fun-gallery-prompt"></small></div><button class="fun-gallery-delete" type="button" aria-label="Delete video">×</button>';

        const video=card.querySelector("video");
        if(url)video.src=url;
        video.loop=item.mode!=="bounce";

        card.querySelector(".fun-gallery-mode").textContent=(modes[item.mode]?.emoji||"🎬")+" "+(modes[item.mode]?.title||"Video");
        card.querySelector(".fun-gallery-copy strong").textContent=item.title||"Family Fun";
        card.querySelector(".fun-gallery-date").textContent=formatDate(item.created_at);
        const promptEl=card.querySelector(".fun-gallery-prompt");
        promptEl.textContent=item.prompt||"";
        promptEl.hidden=!item.prompt;

        video.addEventListener("click",()=>{
          if(!url)return;
          if(video.paused){
            $$("#funGalleryGrid video").forEach(v=>{if(v!==video)v.pause()});
            video.play().catch(()=>{});
          }else{
            video.pause();
          }
        });

        const del=card.querySelector(".fun-gallery-delete");
        del.hidden=!canDelete;
        if(canDelete){
          del.onclick=async()=>{
            if(!confirm("Remove this video from the shared Family Fun Gallery?"))return;
            del.disabled=true;
            const removed=await client.from("family_fun_videos").delete().eq("id",item.id);
            if(removed.error){
              console.error(removed.error);
              setStatus(removed.error.message||"Could not remove this video.","warn");
              del.disabled=false;
              return;
            }
            const storageRemoved=await client.storage.from(bucket()).remove([item.storage_path]);
            if(storageRemoved.error)console.warn("Family Fun storage cleanup:",storageRemoved.error);
            await renderGallery();
          };
        }

        galleryGrid.appendChild(card);
      });
    }catch(err){
      console.error("Family Fun gallery:",err);
      galleryEmpty.hidden=false;
      galleryGrid.innerHTML="";
      galleryEmpty.querySelector("strong").textContent="Could not load Family Fun videos";
      galleryEmpty.querySelector("p").textContent=err?.message||"Please return to Family Book and try again.";
    }finally{
      galleryGrid.removeAttribute("aria-busy");
    }
  }

  function scheduleGalleryRefresh(){
    clearTimeout(galleryRefreshTimer);
    galleryRefreshTimer=setTimeout(()=>renderGallery(),250);
  }

  function startRealtime(){
    if(!client||!userContext?.familyId)return;
    if(realtimeChannel){
      try{client.removeChannel(realtimeChannel)}catch(_){}
    }
    realtimeChannel=client
      .channel("family-fun-"+userContext.familyId)
      .on("postgres_changes",{
        event:"*",
        schema:"public",
        table:"family_fun_videos",
        filter:"family_id=eq."+userContext.familyId
      },scheduleGalleryRefresh)
      .subscribe();
  }

  function switchTab(name){
    const create=name!=="gallery";
    $("#funCreatePanel").hidden=!create;
    $("#funGalleryPanel").hidden=create;
    $$("[data-fun-tab]").forEach(btn=>btn.classList.toggle("active",btn.dataset.funTab===name));
    if(name==="gallery")renderGallery();
  }

  function setMode(next){
    if(!modes[next])return;
    if(recorder&&recorder.state!=="inactive")stopRecording();
    mode=next;
    $("[data-fun-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.funMode===mode));
    $("#funModeEmoji").textContent=modes[mode].emoji;
    $("#funModeTitle").textContent=modes[mode].title;
    $("#funModeDesc").textContent=modes[mode].desc;
    countdownOptions.hidden=mode!=="countdown";
    passPanel.hidden=mode!=="pass";
    recordBtn.textContent=mode==="bounce"?"Record 3s Bounce":mode==="pass"?"Record 5s Clip":mode==="countdown"?"Start Countdown":"Start Recording";
    if(mode==="pass")passPrompt.textContent=prompts[promptIndex];
    resetResult();
    setOverlay();
    setStatus(stream?"Camera ready.":"Start the camera when you’re ready.");
  }

  async function initBackend(){
    try{
      if(!window.FB_SUPABASE?.client||!window.FB_AUTH)throw new Error("Family Book cloud services are not ready.");
      client=window.FB_SUPABASE.client;
      await window.FB_AUTH.init();
      userContext=window.FB_AUTH.get();
      const themePreference=window.FB_SETTINGS?.get?.()?.appearance?.theme||localStorage.getItem("fb_theme_preference")||"system";
      window.FB_SETTINGS?.applyTheme?.(themePreference);
      try{localStorage.setItem("fb_theme_preference",themePreference)}catch(_){}

      if(!userContext?.familyId||!userContext?.supabaseUserId){
        throw new Error("Sign in to Family Book and join a family before using the shared Family Fun Gallery.");
      }

      startRealtime();
      await renderGallery();
    }catch(err){
      console.error("Family Fun Supabase setup:",err);
      setStatus(err?.message||"Family Fun could not connect to Family Book.","warn");
      addGalleryBtn.disabled=true;
      galleryEmpty.hidden=false;
      galleryEmpty.querySelector("strong").textContent="Family Book sign-in required";
      galleryEmpty.querySelector("p").textContent="Return to Family Book, sign in, then open Family Fun again.";
    }
  }

  function openFamilyFunFeature(name){
    if(name!=="camera")return;
    $("#funHub").hidden=true;
    $("#funCameraFeature").hidden=false;
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function closeFamilyFunFeature(){
    stopRecording();
    stopStream();
    resetResult();
    $("#funCameraFeature").hidden=true;
    $("#funHub").hidden=false;
    window.scrollTo({top:0,behavior:"smooth"});
  }

  $$("[data-family-fun-feature]").forEach(btn=>btn.addEventListener("click",()=>openFamilyFunFeature(btn.dataset.familyFunFeature)));
  $$("[data-family-fun-back]").forEach(btn=>btn.addEventListener("click",closeFamilyFunFeature));

  $$("[data-fun-mode]").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.funMode)));
  $$("[data-fun-tab]").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.funTab)));
  $$("[data-gallery-filter]").forEach(btn=>btn.addEventListener("click",()=>{
    galleryFilter=btn.dataset.galleryFilter;
    $$("[data-gallery-filter]").forEach(x=>x.classList.toggle("active",x===btn));
    renderGallery();
  }));

  const backLink=$("#familyFunBackLink");
  backLink?.addEventListener("click",event=>{
    try{
      const ref=document.referrer?new URL(document.referrer):null;
      if(ref&&ref.origin===location.origin&&history.length>1){
        event.preventDefault();
        history.back();
      }
    }catch(_){}
  });

  startBtn.addEventListener("click",startCamera);
  flipBtn.addEventListener("click",flipCamera);
  recordBtn.addEventListener("click",beginRecording);
  stopBtn.addEventListener("click",stopRecording);
  chooseBtn.addEventListener("click",chooseFile);
  $("#funDeviceCameraBtn").addEventListener("click",captureFallback);
  fallbackInput.addEventListener("change",()=>handleFile(fallbackInput.files?.[0]));
  retakeBtn.addEventListener("click",()=>{resetResult();setStatus(stream?"Camera ready.":"Start the camera when you’re ready.")});
  addGalleryBtn.addEventListener("click",addCurrentToGallery);
  nextPromptBtn.addEventListener("click",nextPrompt);

  const onVisibilityChange=()=>{if(document.hidden&&recorder?.state==="recording")stopRecording()};

  function dispose(){
    stopBounce();
    try{stopRecording()}catch(_){}
    try{stopStream()}catch(_){}
    clearInterval(countdownTimer);
    clearTimeout(autoStopTimer);
    clearTimeout(galleryRefreshTimer);
    document.removeEventListener("visibilitychange",onVisibilityChange);
    if(realtimeChannel&&client){
      try{client.removeChannel(realtimeChannel)}catch(_){}
    }
    realtimeChannel=null;
    urls.forEach(url=>{try{URL.revokeObjectURL(url)}catch(_){}});
    urls.clear();
    if(window.FB_FAMILY_FUN_STUDIO_DISPOSE===dispose)delete window.FB_FAMILY_FUN_STUDIO_DISPOSE;
  }

  window.FB_FAMILY_FUN_STUDIO_DISPOSE=dispose;
  document.addEventListener("visibilitychange",onVisibilityChange);
  window.addEventListener("beforeunload",dispose,{once:true});

  setMode("normal");
  initBackend();
})();