(function(){
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];

  const galleryOnly=!!document.querySelector("[data-family-fun-gallery-page]");

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
  let countdownGoTimer=0;
  let countdownResolve=null;
  let countdownToken=0;
  let captureState="idle";
  let pendingAutoSave=false;
  let discardAfterStop=false;
  let recordElapsedMs=0;
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
  let lightEnabled=false;
  let torchActive=false;
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
  const cameraWrap=document.querySelector(".fun-camera-wrap");
  const soundBtn=$("#funSoundBtn");
  const soundInput=$("#funSoundInput");
  const soundLabel=$("#funSoundLabel");
  const filterBtn=$("#funFilterBtn");
  const filterTray=$("#funFilterTray");
  const lightBtn=$("#funLightBtn");
  const lightLabel=$("#funLightLabel");
  const frontFill=$("#funFrontFill");
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
    if(recordStartedAt){
      recordElapsedMs+=Math.max(0,Date.now()-recordStartedAt);
      recordStartedAt=0;
    }
    if(recordTimer){
      recordTimer.classList.remove("recording");
      recordTimer.hidden=reset;
    }
    if(reset){
      recordElapsedMs=0;
      if(recordTimerText)recordTimerText.textContent="00:00";
    }else if(recordTimerText){
      recordTimerText.textContent=formatElapsed(recordElapsedMs);
    }
  }

  function startRecordTimer(resume=false){
    clearInterval(recordTimerInterval);
    recordTimerInterval=0;
    if(!resume)recordElapsedMs=0;
    recordStartedAt=Date.now();
    if(recordTimer){
      recordTimer.hidden=false;
      recordTimer.classList.add("recording");
    }
    const paint=()=>{
      const elapsed=recordElapsedMs+(recordStartedAt?Date.now()-recordStartedAt:0);
      if(recordTimerText)recordTimerText.textContent=formatElapsed(elapsed);
    };
    paint();
    recordTimerInterval=setInterval(paint,250);
  }

  function recordActionLabel(){
    return mode==="bounce"?"Bounce":mode==="pass"?"5s clip":mode==="countdown"?"Countdown":"Record";
  }

  function syncRecordButton(recording=false){
    const isRecording=recording||captureState==="recording";
    const isPaused=captureState==="paused";
    recordBtn?.classList.toggle("recording",isRecording);
    recordBtn?.classList.toggle("paused",isPaused);
    recordBtn?.classList.toggle("counting-down",captureState==="countdown");
    recordBtn?.setAttribute("aria-label",isRecording?(mode==="pass"?"Pause recording":"Stop recording"):isPaused?"Resume recording":captureState==="countdown"?"Countdown in progress":"Start recording");
    if(recordAction){
      recordAction.textContent=isRecording?(mode==="pass"?"Pause":"Stop"):isPaused?"Resume":captureState==="countdown"?"Wait":recordActionLabel();
    }
  }

  function setCaptureState(next){
    captureState=next;
    cameraWrap?.classList.toggle("capture-recording",next==="recording");
    cameraWrap?.classList.toggle("capture-paused",next==="paused");
    cameraWrap?.classList.toggle("capture-countdown",next==="countdown");
    const busy=next!=="idle";
    const counting=next==="countdown";
    recordBtn.disabled=counting||next==="preparing"||next==="processing";
    stopBtn.disabled=next!=="recording";
    if(startBtn)startBtn.disabled=busy||!!stream;
    if(chooseBtn)chooseBtn.disabled=busy;
    if(flipBtn)flipBtn.disabled=busy||!stream;
    syncRecordButton(next==="recording");
  }

  function cancelCountdown(message=""){
    if(captureState!=="countdown"&&!countdownResolve)return false;
    countdownToken++;
    clearInterval(countdownTimer);
    clearTimeout(countdownGoTimer);
    countdownTimer=0;
    countdownGoTimer=0;
    setOverlay();
    const resolve=countdownResolve;
    countdownResolve=null;
    setCaptureState("idle");
    if(message)setStatus(message);
    if(resolve)resolve(false);
    return true;
  }

  function setDecisionActions(show){
    if(discardBtn)discardBtn.hidden=!show;
    if(addGalleryBtn)addGalleryBtn.hidden=!show;
    if(show)window.icons?.();
  }

  function setSaveButtonState(label="Save",disabled=false){
    if(!addGalleryBtn)return;
    addGalleryBtn.disabled=disabled;
    addGalleryBtn.setAttribute("aria-label",label);
    const text=addGalleryBtn.querySelector("small");
    if(text)text.textContent=label;
  }

  function setReviewing(active){
    cameraWrap?.classList.toggle("reviewing",active);
    setDecisionActions(active||captureState==="paused");
  }

  function currentVideoTrack(){
    return stream?.getVideoTracks?.()[0]||null;
  }

  function torchSupported(){
    try{
      return !!currentVideoTrack()?.getCapabilities?.()?.torch;
    }catch(_){
      return false;
    }
  }

  function needsDigitalLight(){
    return lightEnabled&&(facing==="user"||!torchActive);
  }

  function visualFilterCss(){
    const parts=[];
    const base=filterDefs[activeFilter]?.css||"none";
    if(base&&base!=="none")parts.push(base);
    if(needsDigitalLight())parts.push("brightness(1.16) contrast(1.06)");
    return parts.length?parts.join(" "):"none";
  }

  function applyVisualEffects(){
    if(camera){
      camera.style.filter=visualFilterCss();
      camera.dataset.filter=activeFilter;
      camera.dataset.light=lightEnabled?"on":"off";
    }
  }

  async function setTorch(on){
    const track=currentVideoTrack();
    if(!track||!torchSupported()){
      torchActive=false;
      return false;
    }
    try{
      await track.applyConstraints({advanced:[{torch:!!on}]});
      torchActive=!!on;
      return torchActive;
    }catch(err){
      console.warn("Family Fun torch:",err);
      torchActive=false;
      return false;
    }
  }

  async function syncLight(){
    if(!lightEnabled){
      await setTorch(false);
      if(frontFill)frontFill.hidden=true;
      lightBtn?.classList.remove("active");
      if(lightLabel)lightLabel.textContent="Light";
      applyVisualEffects();
      return;
    }

    let label="Bright";
    if(facing==="environment"){
      const torch=await setTorch(true);
      if(torch){
        label="Torch";
        if(frontFill)frontFill.hidden=true;
      }else{
        label="Bright";
        if(frontFill)frontFill.hidden=true;
      }
    }else{
      await setTorch(false);
      label="Fill";
      if(frontFill)frontFill.hidden=false;
    }

    lightBtn?.classList.add("active");
    if(lightLabel)lightLabel.textContent=label;
    applyVisualEffects();
    setStatus(label==="Torch"?"Rear torch on.":label==="Fill"?"Front fill light on.":"Brightness boost on.","success");
  }

  async function toggleLight(){
    if(captureState!=="idle"){
      setStatus("Change the light before recording.","warn");
      return;
    }
    lightEnabled=!lightEnabled;
    await syncLight();
  }

  function applyFilter(name){
    if(!filterDefs[name])name="none";
    activeFilter=name;
    applyVisualEffects();
    document.querySelectorAll("[data-fun-filter]").forEach(btn=>{
      const active=btn.dataset.funFilter===name;
      btn.classList.toggle("active",active);
      btn.setAttribute("aria-pressed",String(active));
    });
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
    const needsCanvas=activeFilter!=="none"||needsDigitalLight();
    if(!needsCanvas||!camera?.videoWidth||!camera?.captureStream&&typeof HTMLCanvasElement==="undefined"){
      return stream?.getVideoTracks?.()[0]||null;
    }
    filterCanvas=filterCanvas||document.createElement("canvas");
    filterContext=filterCanvas.getContext("2d");
    filterCanvas.width=camera.videoWidth||720;
    filterCanvas.height=camera.videoHeight||1280;
    const paint=()=>{
      if(!filterContext||!stream)return;
      filterContext.save();
      filterContext.filter=visualFilterCss();
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
      if(activeFilter==="none"&&!needsDigitalLight())return stream;
      recordingStream=new MediaStream([videoTrack,...(micTrack?[micTrack]:[])].filter(Boolean));
      return recordingStream;
    }
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx){
      setStatus("Sound mixing is not supported on this device. Recording with microphone only.","warn");
      return activeFilter==="none"&&!needsDigitalLight()?stream:new MediaStream([videoTrack,...(micTrack?[micTrack]:[])]);
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
      return activeFilter==="none"&&!needsDigitalLight()?stream:new MediaStream([videoTrack,...(micTrack?[micTrack]:[])]);
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
    resultVideo.onloadedmetadata=null;
    resultVideo.onseeked=null;
    try{resultVideo.load()}catch(_){}
    resultVideo.controls=false;
    resultVideo.muted=false;
    downloadLink.hidden=false;
    setSaveButtonState("Save",false);
    setReviewing(false);
  }

  async function stopStream(){
    if(torchActive){
      try{await setTorch(false)}catch(_){}
    }
    torchActive=false;
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
      try{
        stream=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:{ideal:facing}},
          audio:true
        });
      }catch(firstError){
        console.warn("Family Fun microphone/camera request:",firstError);
        stream=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:{ideal:facing}},
          audio:false
        });
        setStatus("Camera ready. Microphone permission is off, so this clip will record without sound.","warn");
      }
      camera.srcObject=stream;
      camera.dataset.facing=facing;
      camera.muted=true;
      camera.playsInline=true;
      await camera.play().catch(()=>{});
      camera.hidden=false;
      empty.hidden=true;
      flipBtn.disabled=false;
      startBtn.disabled=true;
      applyVisualEffects();
      if(lightEnabled)await syncLight();
      else if(frontFill)frontFill.hidden=true;
      if(stream?.getAudioTracks?.().length)setStatus("Camera ready.");
      return true;
    }catch(err){
      console.warn("Family Fun camera:",err);
      setStatus("Camera permission was not available. You can still use Device camera or Choose video.","warn");
      return false;
    }
  }

  async function flipCamera(){
    facing=facing==="user"?"environment":"user";
    if(camera)camera.dataset.facing=facing;
    await startCamera();
    if(lightEnabled)await syncLight();
  }

  function countdownSeconds(){
    return Number(document.querySelector('input[name="funCountdown"]:checked')?.value||3);
  }

  function runCountdown(seconds){
    cancelCountdown();
    const token=++countdownToken;
    let left=Math.max(1,Number(seconds)||3);
    setCaptureState("countdown");
    setStatus("Recording starts in "+left+" seconds…");
    setOverlay(String(left),"Get ready!");

    return new Promise(resolve=>{
      countdownResolve=resolve;
      countdownTimer=setInterval(()=>{
        if(token!==countdownToken){
          clearInterval(countdownTimer);
          countdownTimer=0;
          return;
        }
        left--;
        if(left<=0){
          clearInterval(countdownTimer);
          countdownTimer=0;
          setOverlay("GO!","");
          countdownGoTimer=setTimeout(()=>{
            countdownGoTimer=0;
            if(token!==countdownToken)return;
            countdownResolve=null;
            captureState="preparing";
            syncRecordButton(false);
            setOverlay();
            resolve(true);
          },350);
        }else{
          setOverlay(String(left),"Get ready!");
        }
      },1000);
    });
  }

  async function beginRecording(){
    if(mode==="pass"&&captureState==="paused"&&recorder?.state==="paused"){
      try{
        recorder.resume();
        try{await camera.play()}catch(_){}
        if(recordingSound){try{await recordingSound.play()}catch(_){}}
        setCaptureState("recording");
        setDecisionActions(false);
        startRecordTimer(true);
        setStatus("Recording next Pass the Phone segment…","recording");
        setOverlay("● REC","5 seconds");
        clearTimeout(autoStopTimer);
        autoStopTimer=setTimeout(stopRecording,5000);
      }catch(err){
        console.error("Pass the Phone resume:",err);
        setStatus("Could not resume this recording.","warn");
      }
      return;
    }
    if(captureState!=="idle")return;
    setCaptureState("preparing");

    try{
      if(!stream){
        const ok=await startCamera();
        if(!ok||!stream){
          setCaptureState("idle");
          return;
        }
      }
      if(!window.MediaRecorder){
        setStatus("Direct recording is not supported here. Use Device camera instead.","warn");
        setCaptureState("idle");
        return;
      }

      if(mode==="countdown"){
        const proceed=await runCountdown(countdownSeconds());
        if(!proceed||!stream)return;
      }
      if(!stream){
        setCaptureState("idle");
        return;
      }

      chunks=[];
      const mime=supportedMime();
      const captureStream=await buildRecordingStream();
      if(captureState!=="preparing"){
        clearRecordingPipeline();
        return;
      }

      try{recorder=mime?new MediaRecorder(captureStream,{mimeType:mime}):new MediaRecorder(captureStream)}
      catch(_){recorder=new MediaRecorder(captureStream)}

      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onstop=handleRecorded;
      recorder.onerror=()=>{
        setStatus("Recording failed. Please try again.","warn");
        finishRecordUi();
      };
      recorder.start(250);
      setCaptureState("recording");
      startRecordTimer();

      filterTray&&(filterTray.hidden=true);
      sourceMenu&&(sourceMenu.hidden=true);
      countdownOptions&&(countdownOptions.hidden=true);

      setStatus(mode==="bounce"?"Recording Bounce…":mode==="pass"?"Recording this person…":"Recording…","recording");
      setOverlay("● REC",mode==="bounce"?"3 seconds":mode==="pass"?"5 seconds":"");

      const limit=mode==="bounce"?3000:mode==="pass"?5000:0;
      if(limit)autoStopTimer=setTimeout(stopRecording,limit);
    }catch(err){
      console.error("Family Fun recording:",err);
      cancelCountdown();
      clearRecordingPipeline();
      recorder=null;
      chunks=[];
      setOverlay();
      setCaptureState("idle");
      setStatus("Recording could not start. Please try again.","warn");
    }
  }

  function stopRecording(){
    if(captureState==="countdown"){
      cancelCountdown("Countdown cancelled.");
      return;
    }
    if(captureState!=="recording"||!recorder||recorder.state==="inactive")return;
    clearTimeout(autoStopTimer);
    autoStopTimer=0;
    stopRecordTimer(false);

    if(mode==="pass"&&recorder.state==="recording"){
      try{
        recorder.pause();
        try{camera.pause()}catch(_){}
        if(recordingSound){try{recordingSound.pause()}catch(_){}}
        setCaptureState("paused");
        syncRecordButton(false);
        setDecisionActions(true);
        setOverlay();
        nextPrompt();
        setStatus("Paused. Pass the phone, then tap Record to continue.");
        return;
      }catch(err){
        console.warn("Pass the Phone pause:",err);
      }
    }

    setCaptureState("processing");
    if(recorder&&recorder.state!=="inactive"){
      try{recorder.stop()}catch(_){
        finishRecordUi();
      }
    }
  }

  function finishRecordUi(){
    stopRecordTimer(true);
    clearRecordingPipeline();
    recorder=null;
    setCaptureState("idle");
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
    chunks=[];
    const shouldDiscard=discardAfterStop;
    const shouldSave=pendingAutoSave;
    discardAfterStop=false;
    pendingAutoSave=false;
    finishRecordUi();

    if(shouldDiscard){
      resetResult();
      setStatus("Clip discarded. Camera ready.");
      return;
    }
    if(!blob.size||blob.size<1024){
      resetResult();
      setStatus("No usable video was captured. Try recording again.","warn");
      return;
    }

    showResult(blob,mode);
    if(shouldSave)setTimeout(()=>addCurrentToGallery(),50);
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
    resultVideo.controls=false;
    resultVideo.muted=true;
    setReviewing(true);

    if(sourceMode==="bounce"){
      resultTitle.textContent="Your Bounce";
      resultMeta.textContent="Ready to save";
    }else if(sourceMode==="pass"){
      resultTitle.textContent="Pass the Phone";
      resultMeta.textContent="Combined clip ready to save";
    }else{
      resultTitle.textContent=fileName||((modes[sourceMode]?.title||"Family Fun")+" clip");
      resultMeta.textContent=sourceMode==="countdown"?"Countdown clip ready":"Ready to save";
    }

    resultVideo.onloadedmetadata=()=>{
      const duration=Number(resultVideo.duration);
      if(Number.isFinite(duration)&&duration>0.12){
        try{resultVideo.currentTime=Math.max(0,duration-0.08)}catch(_){}
      }
    };
    resultVideo.onseeked=()=>{try{resultVideo.pause()}catch(_){}};
    setDownload(blob);
    setSaveButtonState("Save",false);
    setStatus("Preview paused. Save ✓ or discard ✕.");
  }

  function startBouncePreview(video){
    const token=++bounceToken;
    const reverseStep=()=>{
      if(token!==bounceToken)return;
      const next=Math.max(0,video.currentTime-0.045);
      try{video.currentTime=next}catch(_){}
      if(next<=0.02){
        if(token!==bounceToken)return;
        video.play().then(()=>funPlayerDebug("play resolved",{readyState:video.readyState,currentTime:video.currentTime})).catch(err=>funPlayerDebug("play rejected",{name:err?.name,message:err?.message,readyState:video.readyState,networkState:video.networkState,error:video.error?.code||null}));
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
    clearTimeout(autoStopTimer);
    autoStopTimer=0;

    if(captureState==="countdown"){
      cancelCountdown();
      resetResult();
      setStatus("Countdown cancelled.");
      return;
    }

    if((captureState==="recording"||captureState==="paused")&&recorder&&recorder.state!=="inactive"){
      discardAfterStop=true;
      pendingAutoSave=false;
      stopRecordTimer(true);
      setCaptureState("processing");
      setDecisionActions(false);
      try{recorder.stop()}catch(_){
        discardAfterStop=false;
        recorder=null;
        clearRecordingPipeline();
        setCaptureState("idle");
        resetResult();
      }
      setOverlay();
      return;
    }

    resetResult();
    setOverlay();
    setCaptureState("idle");
    setStatus(stream?"Clip discarded. Camera ready.":"Clip discarded. Nothing was saved.");
    syncRecordButton(false);
  }

  async function addCurrentToGallery(){
    if(!currentBlob)return;
    if(currentBlob.size>MAX_VIDEO_BYTES){
      setStatus("This clip is larger than the current 50 MB Family Fun limit.","warn");
      return;
    }

    setSaveButtonState("Saving…",true);

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

      setSaveButtonState("Saved",true);
      setStatus("Saved to your shared Family Fun Gallery.","success");
      await renderGallery();
      await stopStream();
      resetResult();
      const panel=$("#funCameraPanel");
      panel?.classList.remove("fun-camera-fullscreen");
      document.documentElement.classList.remove("fun-camera-open");
      document.body.classList.remove("fun-camera-open");
      document.querySelector('[data-family-fun-feature="camera"]')?.classList.remove("active");
      window.go?.("family-fun-gallery");
    }catch(err){
      console.error("Family Fun upload:",err);
      if(storagePath){
        try{await client?.storage.from(bucket()).remove([storagePath])}catch(_){}
      }
      setSaveButtonState("Save",false);
      setStatus(err?.message||"Could not save this Family Fun video.","warn");
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

  function funPlayerDebug(message,data){
    let box=document.querySelector("#funPlayerDebug");
    if(!box){
      box=document.createElement("div");
      box.id="funPlayerDebug";
      box.style.cssText="position:fixed;left:8px;bottom:8px;z-index:2147483600;background:rgba(0,0,0,.88);color:#fff;padding:6px 8px;border-radius:8px;font:11px/1.3 monospace;width:min(420px,72vw);max-height:110px;overflow:auto;white-space:pre-wrap;pointer-events:none";
      document.body.appendChild(box);
    }
    const details=data?(" "+JSON.stringify(data)):"";
    box.textContent=(new Date().toLocaleTimeString()+" "+message+details+"\n"+box.textContent).slice(0,5000);
  }

  function closeGalleryViewer(){
    const viewer=document.querySelector("#funGalleryViewer");
    if(!viewer)return;

    const player=viewer.querySelector("video[data-fun-promoted-player='1']");
    if(player){
      try{player.pause()}catch(_){}
      player.controls=false;
      player.muted=true;
      player.removeAttribute("data-fun-promoted-player");
      const mediaId=player.dataset.funGalleryMediaId||"";
      const home=mediaId?document.querySelector(`.fun-gallery-media[data-gallery-media-id="${mediaId}"]`):null;
      if(home){
        home.insertBefore(player,home.firstChild);
      }
    }

    viewer.remove();
    document.body.classList.remove("fun-gallery-viewer-open");
  }

  function openGalleryViewer(item,video){
    if(!video)return;

    funPlayerDebug("openGalleryViewer called",{id:item?.id,src:video.currentSrc||video.src,readyState:video.readyState,networkState:video.networkState});
    closeGalleryViewer();

    const viewer=document.createElement("div");
    viewer.id="funGalleryViewer";
    viewer.className="fun-gallery-viewer";
    viewer.setAttribute("role","dialog");
    viewer.setAttribute("aria-modal","true");
    viewer.setAttribute("aria-label",(item.title||"Family Fun video")+" player");
    viewer.innerHTML='<div class="fun-gallery-viewer-shell"><button class="fun-gallery-viewer-close" type="button" aria-label="Close video player"><i data-lucide="x"></i></button><div class="fun-gallery-viewer-stage"></div><div class="fun-gallery-viewer-info"><strong></strong><small class="fun-gallery-viewer-date"></small><p class="fun-gallery-viewer-prompt" hidden></p></div></div>';

    viewer.querySelector(".fun-gallery-viewer-info strong").textContent=item.title||"Family Fun";
    viewer.querySelector(".fun-gallery-viewer-date").textContent=formatDate(item.created_at);
    const prompt=viewer.querySelector(".fun-gallery-viewer-prompt");
    prompt.textContent=item.prompt||"";
    prompt.hidden=!item.prompt;

    const stage=viewer.querySelector(".fun-gallery-viewer-stage");
    video.dataset.funPromotedPlayer="1";
    video.controls=true;
    video.muted=false;
    video.volume=1;
    video.playsInline=true;
    stage.appendChild(video);

    const close=()=>closeGalleryViewer();
    viewer.querySelector(".fun-gallery-viewer-close").onclick=close;
    viewer.addEventListener("click",event=>{if(event.target===viewer)close()});
    viewer.addEventListener("keydown",event=>{if(event.key==="Escape")close()});

    document.body.appendChild(viewer);
    document.body.classList.add("fun-gallery-viewer-open");
    window.icons?.();

    // The same video element that already rendered successfully in the gallery
    // is now the full player. No second fetch or decoder instance is created.
    try{video.currentTime=Math.max(0,video.currentTime||0)}catch(_){}
    video.play().catch(()=>{});
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
        card.innerHTML='<div class="fun-gallery-media"><video muted playsinline preload="metadata"></video><button class="fun-gallery-open" type="button" aria-label="Open video player"></button><span class="fun-gallery-play" aria-hidden="true"><i data-lucide="play"></i></span><span class="fun-gallery-mode"></span></div><div class="fun-gallery-copy"><strong></strong><small class="fun-gallery-date"></small><small class="fun-gallery-prompt"></small></div><button class="fun-gallery-delete" type="button" aria-label="Delete video">×</button>';

        const media=card.querySelector(".fun-gallery-media");
        if(media)media.dataset.galleryMediaId=item.id;
        const video=card.querySelector("video");
        video.dataset.funGalleryMediaId=item.id;
        if(url)video.src=url;
        video.loop=false;
        video.addEventListener("loadedmetadata",()=>funPlayerDebug("thumbnail loadedmetadata",{id:item.id,readyState:video.readyState,duration:video.duration}));
        video.addEventListener("canplay",()=>funPlayerDebug("thumbnail canplay",{id:item.id,readyState:video.readyState}));
        video.addEventListener("error",()=>funPlayerDebug("thumbnail error",{id:item.id,error:video.error?.code||null,networkState:video.networkState,readyState:video.readyState}));

        card.querySelector(".fun-gallery-mode").innerHTML=`<i data-lucide="${modes[item.mode]?.icon||"video"}"></i><span>${modes[item.mode]?.title||"Video"}</span>`;
        card.querySelector(".fun-gallery-copy strong").textContent=item.title||"Family Fun";
        card.querySelector(".fun-gallery-date").textContent=formatDate(item.created_at);
        const promptEl=card.querySelector(".fun-gallery-prompt");
        promptEl.textContent=item.prompt||"";
        promptEl.hidden=!item.prompt;

        const openViewer=()=>{
          if(!url||!video)return;
          $("#funGalleryGrid video").forEach(v=>{if(v!==video){try{v.pause()}catch(_){}}});
          openGalleryViewer(item,video);
        };
        card.querySelector(".fun-gallery-open")?.addEventListener("click",event=>{
          event.preventDefault();
          event.stopPropagation();
          funPlayerDebug("gallery launcher clicked",{id:item.id,src:video.currentSrc||video.src,readyState:video.readyState,networkState:video.networkState,error:video.error?.code||null});
          openViewer();
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

  async function startRealtime(){
    if(!client||!userContext?.familyId)return;
    if(realtimeChannel){
      try{await client.removeChannel(realtimeChannel)}catch(_){}
      realtimeChannel=null;
    }
    const suffix=(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)).replace(/-/g,"").slice(0,12);
    const channel=client
      .channel("family-fun-"+userContext.familyId+"-"+suffix)
      .on("postgres_changes",{
        event:"*",
        schema:"public",
        table:"family_fun_videos",
        filter:"family_id=eq."+userContext.familyId
      },scheduleGalleryRefresh);
    realtimeChannel=channel;
    channel.subscribe();
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
    if(captureState==="countdown")cancelCountdown("Countdown cancelled.");
    if(captureState==="paused"){discardCurrentClip();return}
    if(captureState==="recording")stopRecording();
    if(captureState==="processing"||captureState==="preparing")return;
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
    if(mode==="pass"){
      passPrompt.textContent=prompts[promptIndex];
      setOverlay("PASS THE PHONE",prompts[promptIndex]);
      setTimeout(()=>{if(mode==="pass"&&captureState==="idle")setOverlay()},1800);
    }
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

      try{
        await startRealtime();
      }catch(realtimeError){
        console.warn("Family Fun realtime:",realtimeError);
      }
      await renderGallery();
    }catch(err){
      console.error("Family Fun Supabase setup:",err);
      setStatus(err?.message||"Family Fun could not connect to Family Book.","warn");
      if(addGalleryBtn)addGalleryBtn.disabled=true;
      if(galleryEmpty){
        galleryEmpty.hidden=false;
        galleryEmpty.querySelector("strong").textContent="Family Book sign-in required";
        galleryEmpty.querySelector("p").textContent="Return to Family Book, sign in, then open Family Fun again.";
      }
    }
  }


  function openFamilyFunFeature(name){
    const panel=$("#funCameraPanel");
    if(!panel)return;

    if(name==="gallery"){
      panel.hidden=false;
      panel.removeAttribute("hidden");
      panel.style.display="";
      panel.classList.remove("fun-camera-fullscreen");
      document.documentElement.classList.remove("fun-camera-open");
      document.body.classList.remove("fun-camera-open");
      document.querySelector('[data-family-fun-feature="camera"]')?.classList.remove("active");
      if(stream)stopStream().catch(()=>{});
      switchTab("gallery");
      window.icons?.();
      setTimeout(()=>panel.scrollIntoView({behavior:"smooth",block:"start"}),40);
      return;
    }

    if(name!=="camera")return;
    const card=$('[data-family-fun-feature="camera"]');
    panel.hidden=false;
    panel.classList.add("fun-camera-fullscreen");
    document.documentElement.classList.add("fun-camera-open");
    document.body.classList.add("fun-camera-open");
    card?.classList.add("active");
    switchTab("create");
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

  if(galleryOnly){
    function disposeGalleryOnly(){
      closeGalleryViewer();
      clearTimeout(galleryRefreshTimer);
      if(realtimeChannel&&client){
        try{client.removeChannel(realtimeChannel)}catch(_){}
      }
      realtimeChannel=null;
      if(window.FB_FAMILY_FUN_STUDIO_DISPOSE===disposeGalleryOnly)delete window.FB_FAMILY_FUN_STUDIO_DISPOSE;
    }

    window.FB_FAMILY_FUN_STUDIO_DISPOSE=disposeGalleryOnly;
    window.addEventListener("beforeunload",disposeGalleryOnly,{once:true});
    initBackend();
    return;
  }

  startBtn.addEventListener("click",startCamera);
  flipBtn.addEventListener("click",flipCamera);
  recordBtn.addEventListener("click",()=>{
    if(captureState==="recording"){stopRecording();return}
    if(mode==="pass"&&captureState==="paused"){beginRecording();return}
    if(captureState!=="idle")return;
    beginRecording();
  });
  stopBtn.addEventListener("click",stopRecording);
  soundBtn?.addEventListener("click",()=>soundInput?.click());
  soundInput?.addEventListener("change",()=>setSoundFile(soundInput.files?.[0]||null));
  filterBtn?.addEventListener("click",()=>togglePanel(filterTray,filterBtn));
  lightBtn?.addEventListener("click",toggleLight);
  sourceBtn?.addEventListener("click",()=>togglePanel(sourceMenu,sourceBtn));
  timerToolBtn?.addEventListener("click",()=>{
    setMode("countdown");
    if(filterTray)filterTray.hidden=true;
    if(sourceMenu)sourceMenu.hidden=true;
    countdownOptions.hidden=false;
    timerToolBtn.classList.add("active");
  });
  document.querySelectorAll('input[name="funCountdown"]').forEach(input=>input.addEventListener("change",()=>{
    const seconds=Number(input.value||3);
    if(timerToolLabel)timerToolLabel.textContent=seconds+"s";
    timerToolBtn?.classList.add("active");
    countdownOptions.hidden=true;
    setStatus("Countdown set to "+seconds+" seconds.","success");
  }));
  closeCameraBtn?.addEventListener("click",async()=>{
    if(captureState==="countdown")cancelCountdown();
    if(captureState==="paused"){discardCurrentClip();return}
    if(captureState==="recording"){discardAfterStop=true;stopRecording();}
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
  document.querySelectorAll("[data-fun-filter]").forEach(btn=>btn.addEventListener("click",()=>{applyFilter(btn.dataset.funFilter);setStatus((filterDefs[btn.dataset.funFilter]?.label||"Filter")+" preview");}));
  chooseBtn.addEventListener("click",()=>{if(sourceMenu)sourceMenu.hidden=true;chooseFile()});
  $("#funDeviceCameraBtn").addEventListener("click",()=>{if(sourceMenu)sourceMenu.hidden=true;captureFallback()});
  fallbackInput.addEventListener("change",()=>handleFile(fallbackInput.files?.[0]));
  retakeBtn.addEventListener("click",()=>{resetResult();setStatus(stream?"Camera ready.":"Start the camera when you’re ready.");document.querySelector(".fun-studio-card")?.scrollIntoView({behavior:"smooth",block:"nearest"})});
  discardBtn?.addEventListener("click",discardCurrentClip);
  addGalleryBtn.addEventListener("click",()=>{
    if(mode==="pass"&&captureState==="paused"&&recorder&&recorder.state!=="inactive"){
      pendingAutoSave=true;
      discardAfterStop=false;
      setSaveButtonState("Finishing…",true);
      setDecisionActions(false);
      stopRecordTimer(true);
      setCaptureState("processing");
      try{recorder.stop()}catch(_){
        pendingAutoSave=false;
        finishRecordUi();
        setStatus("Could not finish this Pass the Phone clip.","warn");
      }
      return;
    }
    addCurrentToGallery();
  });
  nextPromptBtn.addEventListener("click",nextPrompt);

  const onVisibilityChange=()=>{
    if(!document.hidden)return;
    if(captureState==="countdown")cancelCountdown();
    if(captureState==="recording")stopRecording();
  };

  function dispose(){
    closeGalleryViewer();
    stopBounce();
    try{stopRecording()}catch(_){}
    try{stopStream()}catch(_){}
    cancelCountdown();
    clearInterval(countdownTimer);
    clearTimeout(countdownGoTimer);
    countdownTimer=0;
    countdownGoTimer=0;
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
  setCaptureState("idle");
  setDecisionActions(false);
  initBackend();
})();