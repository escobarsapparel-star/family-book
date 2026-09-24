(function(){
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  const modes={
    normal:{title:"Normal",desc:"Record a family moment with the camera, or choose a video from your device.",icon:"video"},
    bounce:{title:"Bounce",desc:"Record a quick 3-second clip and Family Fun plays it forward and backward.",icon:"repeat-2"},
    countdown:{title:"Countdown",desc:"Give everyone time to get into frame before recording starts.",icon:"timer"},
    pass:{title:"Pass the Phone",desc:"Family Book gives a fun prompt. Record a short answer, then pass the phone on.",icon:"smartphone"}
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
  let recordTimerInterval=0;
  let recordStartedAt=0;
  let currentBlob=null;
  let currentUrl="";
  let currentPrompt="";
  let bounceToken=0;
  let promptIndex=Math.floor(Math.random()*prompts.length);
  let client=null;
  let userContext=null;
  let realtimeChannel=null;
  let galleryRefreshTimer=0;
  let activeFilter="none";
  let soundUrl="";
  let selectedSoundName="";
  let filterCanvas=null;
  let filterContext=null;
  let filterFrame=0;
  let filterCaptureStream=null;
  let recordingStream=null;
  let recordingSound=null;
  let audioContext=null;
  let audioDestination=null;
  const urls=new Set();

  const filterDefs={
    none:{label:"Original",css:"none"},
    warm:{label:"Warm",css:"sepia(.18) saturate(1.18) contrast(1.04)"},
    vivid:{label:"Vivid",css:"saturate(1.32) contrast(1.08)"},
    soft:{label:"Soft",css:"brightness(1.06) contrast(.92) saturate(.94)"},
    mono:{label:"B&W",css:"grayscale(1) contrast(1.08)"}
  };

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
  const discardBtn=$("#funDiscardBtn");
  const recordTimer=$("#funRecordTimer");
  const recordTimerText=$("#funRecordTimerText");
  const galleryGrid=$("#funGalleryGrid");
  const galleryEmpty=$("#funGalleryEmpty");
  const galleryCount=$("#funGalleryCount");
  const soundBtn=$("#funSoundBtn");
  const soundInput=$("#funSoundInput");
  const soundLabel=$("#funSoundLabel");
  const filterBtn=$("#funFilterBtn");
  const filterTray=$("#funFilterTray");
  const sourceBtn=$("#funSourceBtn");
  const sourceMenu=$("#funSourceMenu");
  const timerToolBtn=$("#funTimerToolBtn");
  const closeCameraBtn=$("#funCloseCameraBtn");
  const timerToolLabel=$("#funTimerToolLabel");
  const recordAction=$("#funRecordAction");

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

  function formatElapsed(ms){
    const total=Math.max(0,Math.floor(ms/1000));
    const minutes=Math.floor(total/60);
    const seconds=total%60;
    return String(minutes).padStart(2,"0")+":"+String(seconds).padStart(2,"0");
  }

  function stopRecordTimer(reset=true){
    clearInterval(recordTimerInterval);
    recordTimerInterval=0;
    recordStartedAt=0;
    if(recordTimer){
      recordTimer.hidden=true;
      recordTimer.classList.remove("recording");
    }
    if(reset&&recordTimerText)recordTimerText.textContent="00:00";
  }

  function startRecordTimer(){
    stopRecordTimer(true);
    recordStartedAt=Date.now();
    if(recordTimer){
      recordTimer.hidden=false;
      recordTimer.classList.add("recording");
    }
    const paint=()=>{if(recordTimerText)recordTimerText.textContent=formatElapsed(Date.now()-recordStartedAt)};
    paint();
    recordTimerInterval=setInterval(paint,250);
  }

  function recordActionLabel(){
    return mode==="bounce"?"Bounce":mode==="pass"?"5s clip":mode==="countdown"?"Countdown":"Record";
  }

  function syncRecordButton(recording=false){
    recordBtn?.classList.toggle("recording",recording);
    recordBtn?.setAttribute("aria-label",recording?"Stop recording":"Start recording");
    if(recordAction)recordAction.textContent=recording?"Stop":recordActionLabel();
  }

  function applyFilter(name){
    if(!filterDefs[name])name="none";
    activeFilter=name;
    if(camera)camera.style.filter=filterDefs[name].css;
    $("[data-fun-filter]").forEach(btn=>btn.classList.toggle("active",btn.dataset.funFilter===name));
    filterBtn?.classList.toggle("active",name!=="none");
  }

  function clearRecordingPipeline(){
    if(filterFrame){cancelAnimationFrame(filterFrame);filterFrame=0}
    if(filterCaptureStream){
      filterCaptureStream.getTracks().forEach(t=>{try{t.stop()}catch(_){}});
      filterCaptureStream=null;
    }
    if(recordingSound){
      try{recordingSound.pause()}catch(_){}
      recordingSound=null;
    }
    if(audioContext){
      try{audioContext.close()}catch(_){}
      audioContext=null;
    }
    audioDestination=null;
    recordingStream=null;
  }

  function filteredVideoTrack(){
    if(activeFilter==="none"||!camera?.videoWidth||!camera?.captureStream&&typeof HTMLCanvasElement==="undefined"){
      return stream?.getVideoTracks?.()[0]||null;
    }
    filterCanvas=filterCanvas||document.createElement("canvas");
    filterContext=filterCanvas.getContext("2d");
    filterCanvas.width=camera.videoWidth||720;
    filterCanvas.height=camera.videoHeight||1280;
    const paint=()=>{
      if(!filterContext||!stream)return;
      filterContext.save();
      filterContext.filter=filterDefs[activeFilter]?.css||"none";
      filterContext.drawImage(camera,0,0,filterCanvas.width,filterCanvas.height);
      filterContext.restore();
      filterFrame=requestAnimationFrame(paint);
    };
    paint();
    filterCaptureStream=filterCanvas.captureStream?.(30)||null;
    return filterCaptureStream?.getVideoTracks?.()[0]||stream?.getVideoTracks?.()[0]||null;
  }

  async function buildRecordingStream(){
    clearRecordingPipeline();
    const videoTrack=filteredVideoTrack();
    const micTrack=stream?.getAudioTracks?.()[0]||null;
    if(!soundUrl){
      if(activeFilter==="none")return stream;
      recordingStream=new MediaStream([videoTrack,...(micTrack?[micTrack]:[])].filter(Boolean));
      return recordingStream;
    }
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx){
      setStatus("Sound mixing is not supported on this device. Recording with microphone only.","warn");
      return activeFilter==="none"?stream:new MediaStream([videoTrack,...(micTrack?[micTrack]:[])]);
    }
    try{
      audioContext=new AudioCtx();
      await audioContext.resume?.();
      audioDestination=audioContext.createMediaStreamDestination();
      if(micTrack){
        const micSource=audioContext.createMediaStreamSource(new MediaStream([micTrack]));
        micSource.connect(audioDestination);
      }
      recordingSound=new Audio(soundUrl);
      recordingSound.preload="auto";
      const soundSource=audioContext.createMediaElementSource(recordingSound);
      soundSource.connect(audioDestination);
      soundSource.connect(audioContext.destination);
      recordingSound.currentTime=0;
      recordingSound.play().catch(()=>{});
      const audioTracks=audioDestination.stream.getAudioTracks();
      recordingStream=new MediaStream([videoTrack,...audioTracks].filter(Boolean));
      return recordingStream;
    }catch(err){
      console.warn("Family Fun sound mix:",err);
      clearRecordingPipeline();
      setStatus("Could not add that sound. Recording with microphone only.","warn");
      return activeFilter==="none"?stream:new MediaStream([videoTrack,...(micTrack?[micTrack]:[])]);
    }
  }

  function setSoundFile(file){
    if(soundUrl){try{URL.revokeObjectURL(soundUrl)}catch(_){}}
    soundUrl="";
    selectedSoundName="";
    if(!file){
      if(soundLabel)soundLabel.textContent="Add sound";
      soundBtn?.classList.remove("active");
      return;
    }
    if(!String(file.type||"").startsWith("audio/")){
      setStatus("Choose an audio file for Add sound.","warn");
      return;
    }
    soundUrl=URL.createObjectURL(file);
    selectedSoundName=file.name||"Selected sound";
    if(soundLabel)soundLabel.textContent=selectedSoundName.length>20?selectedSoundName.slice(0,18)+"…":selectedSoundName;
    soundBtn?.classList.add("active");
    setStatus("Sound ready. It will start when you record.","success");
  }

  function togglePanel(panel,button){
    const willOpen=panel?.hidden!==false;
    if(filterTray&&panel!==filterTray)filterTray.hidden=true;
    if(sourceMenu&&panel!==sourceMenu)sourceMenu.hidden=true;
    if(countdownOptions&&panel!==countdownOptions)countdownOptions.hidden=true;
    if(panel)panel.hidden=!willOpen;
    button?.classList.toggle("active",willOpen);
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
    try{resultVideo.pause()}catch(_){}
    result.hidden=true;
    result.style.display="none";
    resultVideo.removeAttribute("src");
    resultVideo.removeAttribute("poster");
    try{resultVideo.load()}catch(_){}
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
        video:{facingMode:{ideal:facing}},
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
    const captureStream=await buildRecordingStream();
    try{recorder=mime?new MediaRecorder(captureStream,{mimeType:mime}):new MediaRecorder(captureStream)}
    catch(_){recorder=new MediaRecorder(captureStream)}

    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
    recorder.onstop=handleRecorded;
    recorder.start(250);
    startRecordTimer();

    recordBtn.disabled=false;
    stopBtn.disabled=false;
    startBtn.disabled=true;
    chooseBtn.disabled=true;
    flipBtn.disabled=true;
    syncRecordButton(true);
    filterTray&&(filterTray.hidden=true);
    sourceMenu&&(sourceMenu.hidden=true);

    setStatus(mode==="bounce"?"Recording Bounce…":mode==="pass"?"Recording this person…":"Recording…","recording");
    setOverlay("● REC",mode==="bounce"?"3 seconds":mode==="pass"?"5 seconds":"");

    const limit=mode==="bounce"?3000:mode==="pass"?5000:0;
    if(limit)autoStopTimer=setTimeout(stopRecording,limit);
  }

  function stopRecording(){
    clearTimeout(autoStopTimer);
    autoStopTimer=0;
    stopRecordTimer(false);
    syncRecordButton(false);
    if(recorder&&recorder.state!=="inactive"){
      try{recorder.stop()}catch(_){}
    }
  }

  function finishRecordUi(){
    stopRecordTimer(true);
    clearRecordingPipeline();
    recorder=null;
    recordBtn.disabled=false;
    stopBtn.disabled=true;
    startBtn.disabled=!!stream;
    chooseBtn.disabled=false;
    flipBtn.disabled=!stream;
    syncRecordButton(false);
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
    result.style.removeProperty("display");
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

  function discardCurrentClip(){
    resetResult();
    setOverlay();
    setStatus(stream?"Clip discarded. Camera ready.":"Clip discarded. Nothing was saved.");
    syncRecordButton(false);
    const cameraWrap=document.querySelector(".fun-camera-wrap");
    cameraWrap?.scrollIntoView({behavior:"smooth",block:"center"});
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

        card.querySelector(".fun-gallery-mode").innerHTML=`<i data-lucide="${modes[item.mode]?.icon||"video"}"></i><span>${modes[item.mode]?.title||"Video"}</span>`;
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
        window.icons?.();
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
    document.querySelectorAll("[data-fun-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.funMode===mode));
    const activeModeBtn=document.querySelector('#funCameraModeStrip [data-fun-mode="'+mode+'"]');
    activeModeBtn?.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
    const modeIcon=$("#funModeIcon");if(modeIcon){modeIcon.innerHTML=`<i data-lucide="${modes[mode].icon}"></i>`;window.icons?.()}
    $("#funModeTitle").textContent=modes[mode].title;
    $("#funModeDesc").textContent=modes[mode].desc;
    countdownOptions.hidden=mode!=="countdown";
    passPanel.hidden=mode!=="pass";
    syncRecordButton(false);
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
    const panel=$("#funCameraPanel");
    const card=$('[data-family-fun-feature="camera"]');
    if(panel){
      panel.hidden=false;
      panel.classList.add("fun-camera-fullscreen");
    }
    document.documentElement.classList.add("fun-camera-open");
    document.body.classList.add("fun-camera-open");
    card?.classList.add("active");
    window.icons?.();
    if(!stream)setTimeout(()=>startCamera().catch(()=>{}),80);
  }

  document.querySelectorAll("[data-family-fun-feature]").forEach(btn=>btn.addEventListener("click",()=>openFamilyFunFeature(btn.dataset.familyFunFeature)));

  document.querySelectorAll("[data-fun-mode]").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.funMode)));
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
  recordBtn.addEventListener("click",()=>recorder&&recorder.state!=="inactive"?stopRecording():beginRecording());
  stopBtn.addEventListener("click",stopRecording);
  soundBtn?.addEventListener("click",()=>soundInput?.click());
  soundInput?.addEventListener("change",()=>setSoundFile(soundInput.files?.[0]||null));
  filterBtn?.addEventListener("click",()=>togglePanel(filterTray,filterBtn));
  sourceBtn?.addEventListener("click",()=>togglePanel(sourceMenu,sourceBtn));
  timerToolBtn?.addEventListener("click",()=>{
    setMode("countdown");
    togglePanel(countdownOptions,timerToolBtn);
  });
  $('input[name="funCountdown"]').forEach(input=>input.addEventListener("change",()=>{
    const seconds=Number(input.value||3);
    if(timerToolLabel)timerToolLabel.textContent=seconds+"s";
    timerToolBtn?.classList.add("active");
    countdownOptions.hidden=true;
    setStatus("Countdown set to "+seconds+" seconds.","success");
  }));
  closeCameraBtn?.addEventListener("click",async()=>{
    if(recorder&&recorder.state!=="inactive")stopRecording();
    await stopStream();
    resetResult();
    const panel=$("#funCameraPanel");
    if(panel){
      panel.classList.remove("fun-camera-fullscreen");
      panel.hidden=true;
    }
    document.documentElement.classList.remove("fun-camera-open");
    document.body.classList.remove("fun-camera-open");
    document.querySelector('[data-family-fun-feature="camera"]')?.classList.remove("active");
  });
  $("[data-fun-filter]").forEach(btn=>btn.addEventListener("click",()=>{applyFilter(btn.dataset.funFilter);setStatus((filterDefs[btn.dataset.funFilter]?.label||"Filter")+" preview");}));
  chooseBtn.addEventListener("click",()=>{if(sourceMenu)sourceMenu.hidden=true;chooseFile()});
  $("#funDeviceCameraBtn").addEventListener("click",()=>{if(sourceMenu)sourceMenu.hidden=true;captureFallback()});
  fallbackInput.addEventListener("change",()=>handleFile(fallbackInput.files?.[0]));
  retakeBtn.addEventListener("click",()=>{resetResult();setStatus(stream?"Camera ready.":"Start the camera when you’re ready.");document.querySelector(".fun-studio-card")?.scrollIntoView({behavior:"smooth",block:"nearest"})});
  discardBtn?.addEventListener("click",discardCurrentClip);
  addGalleryBtn.addEventListener("click",addCurrentToGallery);
  nextPromptBtn.addEventListener("click",nextPrompt);

  const onVisibilityChange=()=>{if(document.hidden&&recorder?.state==="recording")stopRecording()};

  function dispose(){
    stopBounce();
    try{stopRecording()}catch(_){}
    try{stopStream()}catch(_){}
    clearInterval(countdownTimer);
    stopRecordTimer(true);
    clearRecordingPipeline();
    if(soundUrl){try{URL.revokeObjectURL(soundUrl)}catch(_){};soundUrl=""};
    clearTimeout(autoStopTimer);
    clearTimeout(galleryRefreshTimer);
    document.removeEventListener("visibilitychange",onVisibilityChange);
    if(realtimeChannel&&client){
      try{client.removeChannel(realtimeChannel)}catch(_){}
    }
    realtimeChannel=null;
    urls.forEach(url=>{try{URL.revokeObjectURL(url)}catch(_){}});
    urls.clear();
    document.documentElement.classList.remove("fun-camera-open");
    document.body.classList.remove("fun-camera-open");
    $("#funCameraPanel")?.classList.remove("fun-camera-fullscreen");
    if(window.FB_FAMILY_FUN_STUDIO_DISPOSE===dispose)delete window.FB_FAMILY_FUN_STUDIO_DISPOSE;
  }

  window.FB_FAMILY_FUN_STUDIO_DISPOSE=dispose;
  document.addEventListener("visibilitychange",onVisibilityChange);
  window.addEventListener("beforeunload",dispose,{once:true});

  applyFilter("none");
  setMode("normal");
  syncRecordButton(false);
  initBackend();
})();