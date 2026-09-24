(()=>{
  const e=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function familyLabel(){
    try{return window.familyLabel?.()||window.FB_AUTH?.get?.()?.family||"Family"}catch(_){return "Family"}
  }

  function pageShell(){
    return `<section class="calendar-page family-fun-app-page">
      <div class="calendar-title-row family-fun-title-row">
        <div>
          <p class="eyebrow">${e(String(familyLabel()).toUpperCase())}</p>
          <h1>Family Fun</h1>
          <p>Family videos, games and more things we can enjoy together.</p>
        </div>
      </div>

      <section class="fun-hub" id="funHub">
        <div class="fun-section-label"><span>FAMILY FUN</span><h2>Choose something fun</h2></div>
        <div class="fun-feature-grid">
          <button class="fun-feature-card family-camera-feature" type="button" data-family-fun-feature="camera">
            <span class="fun-feature-icon"><i data-lucide="video"></i></span>
            <span class="fun-feature-copy">
              <strong>Family Camera</strong>
              <small>Record, Bounce, Countdown, Pass the Phone and view the shared video gallery.</small>
            </span>
            <span class="fun-feature-arrow"><i data-lucide="chevron-down"></i></span>
          </button>
          <div class="fun-feature-card fun-feature-coming" aria-label="Family Games coming soon">
            <span class="fun-feature-icon"><i data-lucide="gamepad-2"></i></span>
            <span class="fun-feature-copy">
              <strong>Family Games</strong>
              <small>Quizzes, challenges and more family games can live here next.</small>
            </span>
            <span class="fun-coming-badge">COMING SOON</span>
          </div>
        </div>
      </section>

      <section class="fun-camera-inline-panel" id="funCameraPanel" hidden>
      <nav class="fun-main-tabs" aria-label="Family Fun sections">
        <button class="active" type="button" data-fun-tab="create">Create</button>
        <button type="button" data-fun-tab="gallery">Gallery</button>
      </nav>

      <div id="funCreatePanel">
        <div class="fun-section-label"><span>CREATE</span><h2>Choose a video style</h2></div>

        <section class="fun-mode-grid" aria-label="Family Fun video modes">
          <button class="fun-mode-card active" type="button" data-fun-mode="normal"><span class="fun-ui-icon"><i data-lucide="video"></i></span><strong>Normal</strong><small>Record anything</small></button>
          <button class="fun-mode-card" type="button" data-fun-mode="bounce"><span class="fun-ui-icon"><i data-lucide="repeat-2"></i></span><strong>Bounce</strong><small>3-second loop</small></button>
          <button class="fun-mode-card" type="button" data-fun-mode="countdown"><span class="fun-ui-icon"><i data-lucide="timer"></i></span><strong>Countdown</strong><small>Get everyone ready</small></button>
          <button class="fun-mode-card" type="button" data-fun-mode="pass"><span class="fun-ui-icon"><i data-lucide="smartphone"></i></span><strong>Pass the Phone</strong><small>Family prompts</small></button>
        </section>

        <section class="fun-studio-card fun-camera-studio">
          <div class="fun-mode-heading fun-camera-mode-copy">
            <span id="funModeIcon" class="fun-ui-icon"><i data-lucide="video"></i></span>
            <div><h2 id="funModeTitle">Normal</h2><p id="funModeDesc">Record a family moment with the camera, or choose a video from your device.</p></div>
          </div>

          <div class="fun-camera-wrap">
            <video id="funCameraPreview" autoplay muted playsinline hidden></video>
            <div class="fun-camera-empty" id="funCameraEmpty"><span class="fun-empty-icon"><i data-lucide="camera-off"></i></span><strong>Camera is off</strong><small>Tap the camera to begin.</small></div>
            <div class="fun-camera-overlay" id="funCameraOverlay" hidden><strong id="funOverlayMain"></strong><small id="funOverlaySub"></small></div>

            <div class="fun-camera-topbar">
              <button class="fun-camera-icon-btn" type="button" id="funCloseCameraBtn" aria-label="Close camera"><i data-lucide="x"></i></button>
              <button class="fun-sound-btn" type="button" id="funSoundBtn"><i data-lucide="music-2"></i><span id="funSoundLabel">Add sound</span></button>
              <button class="fun-camera-icon-btn" type="button" id="funFlipCameraBtn" aria-label="Flip camera" disabled><i data-lucide="switch-camera"></i></button>
            </div>

            <div class="fun-record-timer" id="funRecordTimer" hidden><span></span><strong id="funRecordTimerText">00:00</strong></div>
            <p class="fun-status fun-camera-status" id="funStatus">Tap the camera to begin.</p>

            <div class="fun-camera-rail" aria-label="Camera tools">
              <button type="button" id="funFilterBtn"><i data-lucide="wand-sparkles"></i><small>Filters</small></button>
              <button type="button" id="funTimerToolBtn"><i data-lucide="timer-reset"></i><small id="funTimerToolLabel">3s</small></button>
              <button type="button" id="funSourceBtn"><i data-lucide="ellipsis"></i><small>More</small></button>
            </div>

            <div class="fun-filter-tray" id="funFilterTray" hidden>
              <button class="active" type="button" data-fun-filter="none"><span class="filter-preview filter-original"></span><small>Original</small></button>
              <button type="button" data-fun-filter="warm"><span class="filter-preview filter-warm"></span><small>Warm</small></button>
              <button type="button" data-fun-filter="vivid"><span class="filter-preview filter-vivid"></span><small>Vivid</small></button>
              <button type="button" data-fun-filter="soft"><span class="filter-preview filter-soft"></span><small>Soft</small></button>
              <button type="button" data-fun-filter="mono"><span class="filter-preview filter-mono"></span><small>B&amp;W</small></button>
            </div>

            <div class="fun-source-menu" id="funSourceMenu" hidden>
              <button type="button" id="funDeviceCameraBtn"><i data-lucide="camera"></i><span>Device camera</span></button>
              <button type="button" id="funChooseBtn"><i data-lucide="upload"></i><span>Choose video</span></button>
            </div>

            <div class="fun-countdown-options fun-timer-tray" id="funCountdownOptions" hidden>
              <strong>Countdown</strong>
              <div class="fun-choice-row">
                <label><input type="radio" name="funCountdown" value="3" checked><span>3 sec</span></label>
                <label><input type="radio" name="funCountdown" value="5"><span>5 sec</span></label>
                <label><input type="radio" name="funCountdown" value="10"><span>10 sec</span></label>
              </div>
            </div>

            <div class="fun-camera-mode-strip" id="funCameraModeStrip" aria-label="Family Fun camera modes">
              <button class="active" type="button" data-fun-mode="normal">Normal</button>
              <button type="button" data-fun-mode="bounce">Bounce</button>
              <button type="button" data-fun-mode="countdown">Countdown</button>
              <button type="button" data-fun-mode="pass">Pass the Phone</button>
            </div>

            <div class="fun-camera-shutter">
              <button class="fun-shutter" type="button" id="funRecordBtn" aria-label="Start recording">
                <span class="fun-shutter-core"></span>
                <small id="funRecordAction">Record</small>
              </button>
              <button class="fun-stop-btn" type="button" id="funStopBtn" hidden disabled>Stop</button>
            </div>

            <button class="fun-start-camera-hit" type="button" id="funStartCameraBtn" aria-label="Start camera"></button>
            <input id="funFallbackInput" type="file" accept="video/*" hidden>
            <input id="funSoundInput" type="file" accept="audio/*" hidden>
          </div>

          <div class="fun-pass-panel" id="funPassPanel" hidden>
            <span class="fun-pass-label">PASS THE PHONE</span>
            <p id="funPassPrompt"></p>
            <button class="secondary" type="button" id="funNextPrompt">New prompt</button>
          </div>
        </section>

        <section class="fun-result-card" id="funResult" hidden>
          <div class="fun-result-heading"><p class="eyebrow">YOUR CLIP</p><h2 id="funResultTitle">Family Fun clip</h2><p id="funResultMeta"></p></div>
          <video id="funResultVideo" controls playsinline preload="metadata"></video>
          <div class="fun-result-actions">
            <button class="primary" type="button" id="funAddGalleryBtn">Add to Gallery</button>
            <a class="secondary" id="funDownloadLink" href="#" download>Download clip</a>
            <button class="secondary" type="button" id="funRetakeBtn"><i data-lucide="rotate-ccw"></i>Record again</button>
            <button class="fun-discard-btn" type="button" id="funDiscardBtn"><i data-lucide="trash-2"></i>Discard clip</button>
          </div>
        </section>
      </div>

      <section id="funGalleryPanel" hidden>
        <div class="fun-gallery-header">
          <div><p class="eyebrow">FAMILY FUN GALLERY</p><h2>Your family videos</h2><p>Videos shared here are visible to signed-in members of your family.</p></div>
          <span id="funGalleryCount">0 videos</span>
        </div>

        <div class="fun-gallery-filters" aria-label="Gallery categories">
          <button class="active" type="button" data-gallery-filter="all">All Videos</button>
          <button type="button" data-gallery-filter="normal"><i data-lucide="video"></i>Normal</button>
          <button type="button" data-gallery-filter="bounce"><i data-lucide="repeat-2"></i>Bounce</button>
          <button type="button" data-gallery-filter="countdown"><i data-lucide="timer"></i>Countdown</button>
          <button type="button" data-gallery-filter="pass"><i data-lucide="smartphone"></i>Pass the Phone</button>
        </div>

        <div class="fun-gallery-empty" id="funGalleryEmpty">
          <span class="fun-empty-icon"><i data-lucide="video"></i></span>
          <strong>No Family Fun videos yet</strong>
          <p>Create a clip and tap <b>Add to Gallery</b>. It will automatically appear under the correct heading.</p>
          <button class="primary" type="button" data-fun-tab="create">Create a video</button>
        </div>

        <div class="fun-gallery-grid" id="funGalleryGrid"></div>
      </section>

      </section>

      <p class="fun-privacy-note">Family Fun videos are stored privately in Family Book cloud storage. Only signed-in members of your family can view them.</p>
    </section>`;
  }

  function cleanup(){
    try{window.FB_FAMILY_FUN_STUDIO_DISPOSE?.()}catch(err){console.warn("Family Fun cleanup:",err)}
    const script=document.querySelector('script[data-family-fun-runtime]');
    script?.remove();
  }

  function bindRoute(){
    cleanup();
    window.icons?.();

    const cameraCard=document.querySelector('[data-family-fun-feature="camera"]');
    const cameraPanel=document.querySelector("#funCameraPanel");

    if(cameraCard&&cameraPanel){
      cameraCard.onclick=()=>{
        cameraPanel.hidden=false;
        cameraPanel.removeAttribute("hidden");
        cameraPanel.style.display="";
        cameraCard.classList.add("active");
        cameraCard.setAttribute("aria-expanded","true");
        window.icons?.();
        requestAnimationFrame(()=>{
          cameraPanel.scrollIntoView({behavior:"smooth",block:"start"});
        });
      };
      cameraCard.setAttribute("aria-expanded","false");
      cameraCard.setAttribute("aria-controls","funCameraPanel");
    }

    const script=document.createElement("script");
    script.src="js/family-fun-studio.js?v=fullscreen-camera-2";
    script.dataset.familyFunRuntime="1";
    script.onload=()=>window.icons?.();
    script.onerror=()=>console.error("Could not load Family Fun.");
    document.body.appendChild(script);
  }

  window.FB_FAMILY_FUN={pageShell,bindRoute,cleanup};
})();