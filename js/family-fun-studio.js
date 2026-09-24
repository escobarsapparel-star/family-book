(function(){
  const $=s=>document.querySelector(s);
  const modes={
    normal:{title:"Normal",desc:"Record a family moment with the camera, or choose a video from your device.",emoji:"🎥"},
    bounce:{title:"Bounce",desc:"Record a quick 3-second clip and Family Fun loops it forward and backward.",emoji:"🔁"},
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

  let mode="normal";
  let stream=null;
  let recorder=null;
  let chunks=[];
  let facing="user";
  let autoStopTimer=0;
  let countdownTimer=0;
  let currentBlob=null;
  let currentUrl="";
  let bounceToken=0;
  let promptIndex=Math.floor(Math.random()*prompts.length);
  const passClips=[];
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
  const saveLink=$("#funSaveLink");
  const retakeBtn=$("#funRetakeBtn");
  const countdownOptions=$("#funCountdownOptions");
  const passPanel=$("#funPassPanel");
  const passPrompt=$("#funPassPrompt");
  const nextPromptBtn=$("#funNextPrompt");
  const clipsPanel=$("#funPassClips");
  const clipsList=$("#funPassClipList");

  function setStatus(message,type=""){
    if(!status)return;
    status.textContent=message;
    status.dataset.type=type;
  }

  function setOverlay(main="",sub=""){
    if(!overlay)return;
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
  }

  function resetResult(){
    revokeCurrent();
    result.hidden=true;
    resultVideo.removeAttribute("src");
    resultVideo.controls=true;
    resultVideo.muted=false;
    saveLink.hidden=false;
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
      setStatus("Live camera is not available in this browser. Use ‘Choose video’ instead.","warn");
      fallbackInput.click();
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
      setStatus("Camera ready.");
      return true;
    }catch(err){
      console.warn("Family Fun camera:",err);
      setStatus("Camera permission was not available. You can still choose or record a video with your device camera.","warn");
      fallbackInput.click();
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
      const tick=()=>{
        if(left<=1){
          clearInterval(countdownTimer);
          countdownTimer=0;
          setOverlay("GO!","");
          setTimeout(()=>{setOverlay();resolve()},350);
          return;
        }
        left--;
        setOverlay(String(left),"Get ready!");
      };
      countdownTimer=setInterval(tick,1000);
    });
  }

  async function beginRecording(){
    if(!stream){
      const ok=await startCamera();
      if(!ok||!stream)return;
    }
    if(!window.MediaRecorder){
      setStatus("Direct recording is not supported here. Opening your device camera instead.","warn");
      fallbackInput.click();
      return;
    }

    if(mode==="countdown")await runCountdown(countdownSeconds());
    if(!stream)return;

    chunks=[];
    const mime=supportedMime();
    try{
      recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
    }catch(_){
      recorder=new MediaRecorder(stream);
    }

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
    const type=blob?.type||"";
    return type.includes("mp4")?"mp4":"webm";
  }

  function setDownload(blob,label="Save clip"){
    saveLink.textContent=label;
    saveLink.href=currentUrl;
    saveLink.download="family-fun-"+Date.now()+"."+fileExt(blob);
    saveLink.hidden=false;
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
    if(mode==="pass"){
      addPassClip(blob,prompts[promptIndex]);
    }
  }

  function showResult(blob,sourceMode=mode,fileName=""){
    resetResult();
    currentBlob=blob;
    currentUrl=URL.createObjectURL(blob);
    urls.add(currentUrl);
    result.hidden=false;
    resultVideo.src=currentUrl;
    resultVideo.playsInline=true;

    if(sourceMode==="bounce"){
      resultTitle.textContent="Your Bounce";
      resultMeta.textContent="Forward ↔ backward loop";
      saveLink.hidden=true;
      resultVideo.controls=false;
      resultVideo.muted=true;
      resultVideo.onloadedmetadata=()=>startBouncePreview(resultVideo);
    }else if(sourceMode==="pass"){
      resultTitle.textContent="Pass the Phone clip";
      resultMeta.textContent="Clip added to this round.";
      resultVideo.controls=true;
      resultVideo.muted=false;
      setDownload(blob,"Save this clip");
    }else{
      resultTitle.textContent=fileName||"Your Family Fun clip";
      resultMeta.textContent=sourceMode==="countdown"?"Recorded with Countdown":"Ready to watch or save.";
      resultVideo.controls=true;
      resultVideo.muted=false;
      setDownload(blob);
    }
    result.scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  function startBouncePreview(video){
    const token=++bounceToken;
    const reverseStep=()=>{
      if(token!==bounceToken||video.paused&&video.currentTime<=0)return;
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
    video.play().catch(()=>{
      resultMeta.textContent="Tap the clip to start the Bounce preview.";
      video.addEventListener("click",()=>video.play().catch(()=>{}),{once:true});
    });
  }

  function addPassClip(blob,prompt){
    const url=URL.createObjectURL(blob);
    urls.add(url);
    const clip={blob,url,prompt};
    passClips.push(clip);
    renderPassClips();
  }

  function renderPassClips(){
    clipsPanel.hidden=!passClips.length;
    clipsList.innerHTML="";
    passClips.forEach((clip,index)=>{
      const card=document.createElement("article");
      card.className="fun-pass-clip";
      card.innerHTML='<video controls playsinline preload="metadata"></video><div><strong>Person '+(index+1)+'</strong><small></small></div><button type="button" aria-label="Remove clip">×</button>';
      card.querySelector("video").src=clip.url;
      card.querySelector("small").textContent=clip.prompt;
      card.querySelector("button").onclick=()=>{
        try{URL.revokeObjectURL(clip.url)}catch(_){}
        urls.delete(clip.url);
        passClips.splice(index,1);
        renderPassClips();
      };
      clipsList.appendChild(card);
    });
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
    if(mode==="bounce"){
      showResult(file,"bounce",file.name);
    }else{
      showResult(file,mode,file.name);
    }
    fallbackInput.value="";
  }

  async function setMode(next){
    if(!modes[next])return;
    if(recorder&&recorder.state!=="inactive")stopRecording();
    mode=next;
    document.querySelectorAll("[data-fun-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.funMode===mode));
    $("#funModeEmoji").textContent=modes[mode].emoji;
    $("#funModeTitle").textContent=modes[mode].title;
    $("#funModeDesc").textContent=modes[mode].desc;
    countdownOptions.hidden=mode!=="countdown";
    passPanel.hidden=mode!=="pass";
    recordBtn.textContent=mode==="bounce"?"Record 3s Bounce":mode==="pass"?"Record 5s Clip":mode==="countdown"?"Start Countdown":"Start Recording";
    if(mode==="pass"){
      passPrompt.textContent=prompts[promptIndex];
    }
    resetResult();
    setOverlay();
    setStatus(stream?"Camera ready.":"Start the camera when you’re ready.");
  }

  document.querySelectorAll("[data-fun-mode]").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.funMode)));
  startBtn.addEventListener("click",startCamera);
  flipBtn.addEventListener("click",flipCamera);
  recordBtn.addEventListener("click",beginRecording);
  stopBtn.addEventListener("click",stopRecording);
  chooseBtn.addEventListener("click",chooseFile);
  $("#funDeviceCameraBtn").addEventListener("click",captureFallback);
  fallbackInput.addEventListener("change",()=>handleFile(fallbackInput.files?.[0]));
  retakeBtn.addEventListener("click",()=>{resetResult();setStatus(stream?"Camera ready.":"Start the camera when you’re ready.")});
  nextPromptBtn.addEventListener("click",nextPrompt);

  document.addEventListener("visibilitychange",()=>{if(document.hidden&&recorder?.state==="recording")stopRecording()});
  window.addEventListener("beforeunload",()=>{
    stopBounce();
    stopStream();
    clearInterval(countdownTimer);
    clearTimeout(autoStopTimer);
    urls.forEach(url=>{try{URL.revokeObjectURL(url)}catch(_){}});
  });

  setMode("normal");
})();