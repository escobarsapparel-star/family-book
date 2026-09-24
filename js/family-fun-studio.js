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

  const DB_NAME="family-book-fun";
  const DB_VERSION=1;
  const STORE="clips";

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
  const urls=new Set();
  const galleryUrls=new Set();

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

  function openDb(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE)){
          const store=db.createObjectStore(STORE,{keyPath:"id"});
          store.createIndex("createdAt","createdAt");
          store.createIndex("mode","mode");
        }
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }

  async function dbAll(){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly");
      const req=tx.objectStore(STORE).getAll();
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=()=>reject(req.error);
      tx.oncomplete=()=>db.close();
    });
  }

  async function dbPut(value){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put(value);
      tx.oncomplete=()=>{db.close();resolve(value)};
      tx.onerror=()=>{db.close();reject(tx.error)};
    });
  }

  async function dbDelete(id){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete=()=>{db.close();resolve()};
      tx.onerror=()=>{db.close();reject(tx.error)};
    });
  }

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
    return String(blob?.type||"").includes("mp4")?"mp4":"webm";
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
      resultTitle.textContent=fileName||modes[sourceMode]?.title+" clip"||"Family Fun clip";
      resultMeta.textContent=sourceMode==="countdown"?"Recorded with Countdown":"Ready to add to your Family Fun Gallery.";
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
    showResult(file,mode,file.name);
    fallbackInput.value="";
  }

  async function addCurrentToGallery(){
    if(!currentBlob)return;
    addGalleryBtn.disabled=true;
    addGalleryBtn.textContent="Saving…";
    try{
      await dbPut({
        id:crypto.randomUUID(),
        mode,
        title:resultTitle.textContent||modes[mode]?.title||"Family Fun",
        prompt:currentPrompt||"",
        createdAt:Date.now(),
        blob:currentBlob
      });
      addGalleryBtn.textContent="Added ✓";
      setStatus("Saved to your Family Fun Gallery.","success");
      await renderGallery();
      setTimeout(()=>switchTab("gallery"),350);
    }catch(err){
      console.error("Family Fun gallery save:",err);
      addGalleryBtn.disabled=false;
      addGalleryBtn.textContent="Add to Gallery";
      setStatus("Could not save this clip to the Gallery on this device.","warn");
    }
  }

  function formatDate(ts){
    try{return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(ts))}
    catch(_){return "Family Fun"}
  }

  function clearGalleryUrls(){
    galleryUrls.forEach(url=>{try{URL.revokeObjectURL(url)}catch(_){}});
    galleryUrls.clear();
  }

  async function renderGallery(){
    clearGalleryUrls();
    let rows=[];
    try{rows=await dbAll()}catch(err){console.error("Family Fun gallery:",err)}
    rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));

    const visible=galleryFilter==="all"?rows:rows.filter(x=>x.mode===galleryFilter);
    galleryCount.textContent=rows.length===1?"1 video":rows.length+" videos";
    galleryEmpty.hidden=visible.length>0;
    galleryGrid.innerHTML="";

    visible.forEach(item=>{
      const url=URL.createObjectURL(item.blob);
      galleryUrls.add(url);
      const card=document.createElement("article");
      card.className="fun-gallery-card";
      card.innerHTML='<div class="fun-gallery-media"><video muted playsinline preload="metadata"></video><span class="fun-gallery-mode"></span></div><div class="fun-gallery-copy"><strong></strong><small class="fun-gallery-date"></small><small class="fun-gallery-prompt"></small></div><button class="fun-gallery-delete" type="button" aria-label="Delete video">×</button>';
      const video=card.querySelector("video");
      video.src=url;
      video.loop=item.mode!=="bounce";
      card.querySelector(".fun-gallery-mode").textContent=(modes[item.mode]?.emoji||"🎬")+" "+(modes[item.mode]?.title||"Video");
      card.querySelector(".fun-gallery-copy strong").textContent=item.title||"Family Fun";
      card.querySelector(".fun-gallery-date").textContent=formatDate(item.createdAt);
      const p=card.querySelector(".fun-gallery-prompt");
      p.textContent=item.prompt||"";
      p.hidden=!item.prompt;

      video.addEventListener("click",()=>{
        if(video.paused){
          $$("#funGalleryGrid video").forEach(v=>{if(v!==video)v.pause()});
          video.play().catch(()=>{});
        }else video.pause();
      });

      card.querySelector(".fun-gallery-delete").onclick=async()=>{
        if(!confirm("Remove this video from Family Fun Gallery?"))return;
        await dbDelete(item.id);
        renderGallery();
      };

      galleryGrid.appendChild(card);
    });
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
    $$("[data-fun-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.funMode===mode));
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

  $$("[data-fun-mode]").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.funMode)));
  $$("[data-fun-tab]").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.funTab)));
  $$("[data-gallery-filter]").forEach(btn=>btn.addEventListener("click",()=>{
    galleryFilter=btn.dataset.galleryFilter;
    $$("[data-gallery-filter]").forEach(x=>x.classList.toggle("active",x===btn));
    renderGallery();
  }));

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

  document.addEventListener("visibilitychange",()=>{if(document.hidden&&recorder?.state==="recording")stopRecording()});
  window.addEventListener("beforeunload",()=>{
    stopBounce();
    stopStream();
    clearInterval(countdownTimer);
    clearTimeout(autoStopTimer);
    clearGalleryUrls();
    urls.forEach(url=>{try{URL.revokeObjectURL(url)}catch(_){}});
  });

  setMode("normal");
  renderGallery();
})();