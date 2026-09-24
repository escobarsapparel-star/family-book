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
          <button class="fun-mode-card active" type="button" data-fun-mode="normal"><span>🎥</span><strong>Normal</strong><small>Record anything</small></button>
          <button class="fun-mode-card" type="button" data-fun-mode="bounce"><span>🔁</span><strong>Bounce</strong><small>3-second loop</small></button>
          <button class="fun-mode-card" type="button" data-fun-mode="countdown"><span>⏱️</span><strong>Countdown</strong><small>Get everyone ready</small></button>
          <button class="fun-mode-card" type="button" data-fun-mode="pass"><span>😂</span><strong>Pass the Phone</strong><small>Family prompts</small></button>
        </section>

        <section class="fun-studio-card">
          <div class="fun-mode-heading">
            <span id="funModeEmoji">🎥</span>
            <div><h2 id="funModeTitle">Normal</h2><p id="funModeDesc">Record a family moment with the camera, or choose a video from your device.</p></div>
          </div>

          <div class="fun-camera-wrap">
            <video id="funCameraPreview" autoplay muted playsinline hidden></video>
            <div class="fun-camera-empty" id="funCameraEmpty"><span>📹</span><strong>Camera is off</strong><small>Start the camera, or use your device camera below.</small></div>
            <div class="fun-camera-overlay" id="funCameraOverlay" hidden><strong id="funOverlayMain"></strong><small id="funOverlaySub"></small></div>
          </div>

          <p class="fun-status" id="funStatus">Start the camera when you’re ready.</p>

          <div class="fun-camera-tools">
            <button class="secondary" type="button" id="funStartCameraBtn">Start camera</button>
            <button class="secondary" type="button" id="funFlipCameraBtn" disabled>Flip camera</button>
            <button class="secondary" type="button" id="funDeviceCameraBtn">Device camera</button>
            <button class="secondary" type="button" id="funChooseBtn">Choose video</button>
          </div>

          <div class="fun-countdown-options" id="funCountdownOptions" hidden>
            <strong>Countdown</strong>
            <div class="fun-choice-row">
              <label><input type="radio" name="funCountdown" value="3" checked><span>3 sec</span></label>
              <label><input type="radio" name="funCountdown" value="5"><span>5 sec</span></label>
              <label><input type="radio" name="funCountdown" value="10"><span>10 sec</span></label>
            </div>
          </div>

          <div class="fun-pass-panel" id="funPassPanel" hidden>
            <span class="fun-pass-label">PASS THE PHONE</span>
            <p id="funPassPrompt"></p>
            <button class="secondary" type="button" id="funNextPrompt">New prompt</button>
          </div>

          <div class="fun-record-controls">
            <button class="primary fun-record-btn" type="button" id="funRecordBtn">Start Recording</button>
            <button class="secondary fun-stop-btn" type="button" id="funStopBtn" disabled>Stop</button>
          </div>
          <input id="funFallbackInput" type="file" accept="video/*" hidden>
        </section>

        <section class="fun-result-card" id="funResult" hidden>
          <div class="fun-result-heading"><p class="eyebrow">YOUR CLIP</p><h2 id="funResultTitle">Family Fun clip</h2><p id="funResultMeta"></p></div>
          <video id="funResultVideo" controls playsinline preload="metadata"></video>
          <div class="fun-result-actions">
            <button class="primary" type="button" id="funAddGalleryBtn">Add to Gallery</button>
            <a class="secondary" id="funDownloadLink" href="#" download>Download clip</a>
            <button class="secondary" type="button" id="funRetakeBtn">Retake</button>
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
          <button type="button" data-gallery-filter="normal">🎥 Normal</button>
          <button type="button" data-gallery-filter="bounce">🔁 Bounce</button>
          <button type="button" data-gallery-filter="countdown">⏱️ Countdown</button>
          <button type="button" data-gallery-filter="pass">😂 Pass the Phone</button>
        </div>

        <div class="fun-gallery-empty" id="funGalleryEmpty">
          <span>📹</span>
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

    const script=document.createElement("script");
    script.src="js/family-fun-studio.js?v=app-route-5";
    script.dataset.familyFunRuntime="1";
    script.onload=()=>window.icons?.();
    script.onerror=()=>console.error("Could not load Family Fun.");
    document.body.appendChild(script);
  }

  window.FB_FAMILY_FUN={pageShell,bindRoute,cleanup};
})();