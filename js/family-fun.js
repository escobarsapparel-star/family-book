(function(){
  let previewUrl="";

  function familyFunShell(){
    return `<section class="family-fun-page">
      <div class="family-fun-title-row">
        <button class="family-fun-back" type="button" data-r="home" aria-label="Back to home"><i data-lucide="arrow-left"></i></button>
        <div>
          <p class="eyebrow">FAMILY FUN</p>
          <h1>Family Fun Videos</h1>
          <p class="family-fun-subtitle">Keep the funny, noisy and unforgettable family moments together.</p>
        </div>
      </div>

      <div class="family-fun-construction" role="note" aria-label="Under construction">
        <span class="family-fun-construction-icon"><i data-lucide="construction"></i></span>
        <div>
          <strong>UNDER CONSTRUCTION</strong>
          <p>This is an early Family Fun test. Videos selected here are previewed on this device only and are not saved to Family Book yet.</p>
        </div>
      </div>

      <section class="family-fun-upload-card">
        <div class="family-fun-upload-icon"><i data-lucide="clapperboard"></i></div>
        <div class="family-fun-upload-copy">
          <h2>Try a family video</h2>
          <p>Choose an existing video or record a quick test clip. You can preview it here before we connect permanent storage.</p>
        </div>

        <div class="family-fun-actions">
          <button class="primary" type="button" id="familyFunChooseVideo"><i data-lucide="folder-open"></i>Choose video</button>
          <button class="secondary" type="button" id="familyFunRecordVideo"><i data-lucide="video"></i>Record video</button>
        </div>

        <input id="familyFunVideoInput" type="file" accept="video/*" hidden>
        <input id="familyFunCameraInput" type="file" accept="video/*" capture="environment" hidden>

        <div class="family-fun-preview empty" id="familyFunPreview">
          <span><i data-lucide="play-circle"></i></span>
          <strong>No video selected</strong>
          <small>Your test video preview will appear here.</small>
        </div>
      </section>

      <section class="family-fun-next-card">
        <div><i data-lucide="sparkles"></i></div>
        <div>
          <strong>Coming next</strong>
          <p>Saved uploads, captions, family tagging, reactions and a private family video feed.</p>
        </div>
      </section>
    </section>`;
  }

  function refreshIcons(){
    try{ if(window.lucide) window.lucide.createIcons({attrs:{"stroke-width":1.9}}); }catch(_){ }
  }

  function injectHomeCard(){
    const quick=document.querySelector("#screen .quick");
    if(!quick || quick.querySelector("[data-family-fun-card]")) return;
    const button=document.createElement("button");
    button.type="button";
    button.className="qcard family-fun-home-card";
    button.setAttribute("data-family-fun-card","");
    button.innerHTML=`<span class="qicon"><i data-lucide="clapperboard"></i></span><strong>Family Fun</strong><small>Videos & moments</small><span class="family-fun-mini-badge">TEST</span>`;
    button.addEventListener("click",()=>window.go?.("family-fun"));
    quick.appendChild(button);
    refreshIcons();
  }

  function revokePreview(){
    if(!previewUrl) return;
    try{ URL.revokeObjectURL(previewUrl); }catch(_){ }
    previewUrl="";
  }

  function formatBytes(bytes){
    const value=Number(bytes)||0;
    if(value<1024) return `${value} B`;
    if(value<1024*1024) return `${(value/1024).toFixed(1)} KB`;
    return `${(value/(1024*1024)).toFixed(1)} MB`;
  }

  function showVideo(file){
    const preview=document.getElementById("familyFunPreview");
    if(!preview || !file) return;
    if(!String(file.type||"").startsWith("video/")){
      preview.className="family-fun-preview empty";
      preview.innerHTML=`<span><i data-lucide="triangle-alert"></i></span><strong>That file is not a video</strong><small>Please choose a video file.</small>`;
      refreshIcons();
      return;
    }

    revokePreview();
    previewUrl=URL.createObjectURL(file);
    preview.className="family-fun-preview has-video";
    preview.innerHTML=`
      <video controls playsinline preload="metadata" src="${previewUrl}"></video>
      <div class="family-fun-video-meta">
        <div><strong>${escapeHtml(file.name||"Family video")}</strong><small>${formatBytes(file.size)}</small></div>
        <button type="button" class="family-fun-remove" id="familyFunRemoveVideo"><i data-lucide="x"></i>Remove</button>
      </div>`;
    document.getElementById("familyFunRemoveVideo")?.addEventListener("click",clearVideo);
    refreshIcons();
  }

  function escapeHtml(value){
    return String(value??"").replace(/[&<>'\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  }

  function clearVideo(){
    revokePreview();
    const preview=document.getElementById("familyFunPreview");
    if(preview){
      preview.className="family-fun-preview empty";
      preview.innerHTML=`<span><i data-lucide="play-circle"></i></span><strong>No video selected</strong><small>Your test video preview will appear here.</small>`;
    }
    const picker=document.getElementById("familyFunVideoInput");
    const camera=document.getElementById("familyFunCameraInput");
    if(picker) picker.value="";
    if(camera) camera.value="";
    refreshIcons();
  }

  function bindFamilyFun(){
    const picker=document.getElementById("familyFunVideoInput");
    const camera=document.getElementById("familyFunCameraInput");
    const choose=document.getElementById("familyFunChooseVideo");
    const record=document.getElementById("familyFunRecordVideo");
    if(!picker || !camera || !choose || !record) return;

    choose.onclick=()=>picker.click();
    record.onclick=()=>camera.click();
    picker.onchange=()=>showVideo(picker.files?.[0]);
    camera.onchange=()=>showVideo(camera.files?.[0]);
    refreshIcons();
  }

  const previousPage=window.page;
  if(typeof previousPage==="function"){
    window.page=function(route){
      if(route==="family-fun") return familyFunShell();
      return previousPage.apply(this,arguments);
    };
  }

  const previousGo=window.go;
  if(typeof previousGo==="function"){
    window.go=function(route,options){
      const result=previousGo.apply(this,arguments);
      if(route==="home") queueMicrotask(injectHomeCard);
      if(route==="family-fun") queueMicrotask(bindFamilyFun);
      return result;
    };
  }

  injectHomeCard();
  window.addEventListener("beforeunload",revokePreview);
})();
