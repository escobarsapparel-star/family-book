(()=>{
  if(window.__fbApkNativeEnhancementsReady)return;
  const native=window.FB_NATIVE;
  if(!native?.Capacitor?.isNativePlatform?.())return;
  window.__fbApkNativeEnhancementsReady=true;

  const tabs=['home','memories','tree','calendar','family-fun','members','profile'];
  // Allow page-wide swipe gestures to start on cards, links and buttons. Inputs,
  // editors and true horizontal/interactive surfaces still keep their own gesture.
  const blockedSelector="input,textarea,select,[contenteditable='true'],canvas,.cropper-backdrop,.photo-action-backdrop,.fb-profile-media-viewer,.member-cover-editor,.full-tree-viewport,.memory-strip,.home-composer-modal,[data-fb-no-swipe],.fun-camera-wrap,.fun-result-card,.fun-gallery-filters";
  const DURATION=220;
  const EASE='cubic-bezier(.22,.61,.36,1)';
  const previewCache=new Map();
  let previewCacheTimer=0;

  function currentRoute(){
    return String(window.FB_APP_HISTORY?.current?.()||history.state?.fbRoute||'home');
  }

  function closeOverlay(){
    const visible=el=>el&&getComputedStyle(el).display!=='none'&&!el.hidden;
    const candidates=[
      ['.home-composer-modal:not([hidden])','[data-home-close-composer]'],
      ['.fb-profile-media-viewer','.fb-profile-media-close'],
      ['.cropper-backdrop','.crop-cancel'],
      ['.photo-action-backdrop','.photo-cancel'],
      ['.member-cover-editor','[data-cover-close]'],
      ['.fb-qm-tag-popover','[data-qm-tag-close]']
    ];
    for(const [root,close] of candidates){
      const host=document.querySelector(root);
      if(!visible(host))continue;
      const btn=host.querySelector(close);
      if(btn){btn.click();return true}
      host.remove();return true;
    }
    return false;
  }

  async function bindBackButton(){
    const App=native.App;
    if(!App?.addListener||window.__fbAndroidBackBound)return;
    window.__fbAndroidBackBound=true;
    try{
      await App.addListener('backButton',()=>{
        if(closeOverlay())return;
        if(!document.querySelector('#screen')){
          App.exitApp?.();
          return;
        }
        const route=currentRoute();
        if(route!=='home'){
          try{
            if(history.length>1){history.back();return}
          }catch(_){}
          window.go?.('home',{replaceHistory:true});
          return;
        }
        App.exitApp?.();
      });
    }catch(err){console.warn('Family Book Android back button:',err)}
  }

  function previewPlaceholder(route){
    const labels={home:'Home',memories:'Memories',tree:'Family Tree',calendar:'Calendar','family-fun':'Family Fun',members:'Members',profile:'Profile'};
    const icons={home:'house',memories:'images',tree:'git-fork',calendar:'calendar-days','family-fun':'sparkles',members:'users-round',profile:'user-round'};
    const label=labels[route]||'Family Book';
    const icon=icons[route]||'book-heart';
    return `<section class="fb-apk-swipe-fallback"><span class="fb-apk-swipe-fallback-icon"><i data-lucide="${icon}"></i></span><strong>${label}</strong><small>Family Book</small></section>`;
  }

  function sanitizePreview(root){
    root.querySelectorAll('.fb-apk-swipe-preview,.cropper-backdrop,.photo-action-backdrop,.fb-profile-media-viewer,.member-cover-editor,.home-composer-modal').forEach(el=>el.remove());
    root.querySelectorAll('[id]').forEach(el=>{
      el.dataset.fbPreviewId=el.id;
      el.removeAttribute('id');
    });
    root.querySelectorAll('button,input,textarea,select,a,[contenteditable]').forEach(el=>{
      el.tabIndex=-1;
      el.setAttribute('aria-hidden','true');
    });
    return root;
  }

  function cacheRoute(route=currentRoute(),screen=document.querySelector('#screen')){
    if(!tabs.includes(route)||!screen)return;
    try{
      const clone=sanitizePreview(screen.cloneNode(true));
      previewCache.set(route,clone.innerHTML);
    }catch(err){
      console.warn('Family Book swipe cache:',err);
    }
  }

  function scheduleCache(){
    clearTimeout(previewCacheTimer);
    previewCacheTimer=setTimeout(()=>cacheRoute(),90);
  }

  function bindPreviewCache(){
    const screen=document.querySelector('#screen');
    if(!screen||window.__fbSwipePreviewCacheBound)return;
    window.__fbSwipePreviewCacheBound=true;
    cacheRoute();
    try{
      const observer=new MutationObserver(scheduleCache);
      observer.observe(screen,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','src']});
    }catch(_){}
  }

  function makePreview(route,dir,screen){
    const host=screen?.parentElement;
    if(!host)return null;
    const preview=document.createElement('main');
    preview.className=(screen.className||'screen')+' fb-apk-swipe-preview';
    preview.setAttribute('aria-hidden','true');
    preview.inert=true;
    preview.dataset.route=route;
    preview.innerHTML=previewCache.get(route)||previewPlaceholder(route);

    const width=screen.getBoundingClientRect().width||window.innerWidth;
    preview.style.top=screen.offsetTop+'px';
    preview.style.left=screen.offsetLeft+'px';
    preview.style.width=width+'px';
    preview.style.minHeight=Math.max(screen.scrollHeight,window.innerHeight)+'px';
    preview.style.transform=`translate3d(${dir*width}px,0,0)`;
    host.appendChild(preview);
    try{window.icons?.()}catch(_){}
    return preview;
  }

  function bindSwipe(){
    if(window.__fbMainTabSwipeBound)return;
    window.__fbMainTabSwipeBound=true;
    let g=null,animating=false,preview=null;

    const screen=()=>document.querySelector('#screen');
    const removePreview=()=>{preview?.remove();preview=null};
    const resetScreen=s=>{
      if(!s)return;
      s.style.transition='';
      s.style.transform='';
      s.style.opacity='';
    };
    const cleanup=()=>{
      resetScreen(screen());
      removePreview();
      document.documentElement.classList.remove('fb-apk-swiping');
      g=null;
    };

    function setDirection(data,dir){
      if(data.dir===dir&&preview)return true;
      removePreview();
      data.dir=dir;
      const i=tabs.indexOf(data.route);
      const next=i+dir;
      if(next<0||next>=tabs.length){data.next=-1;return false}
      data.next=next;
      const s=screen();
      preview=makePreview(tabs[next],dir,s);
      return !!preview;
    }

    document.addEventListener('touchstart',ev=>{
      if(animating||ev.touches?.length!==1)return;
      if(document.body.classList.contains('home-composer-open'))return;
      const route=currentRoute();
      if(!tabs.includes(route))return;
      if(ev.target?.closest?.(blockedSelector))return;
      const t=ev.touches[0];
      cacheRoute(route,screen());
      g={x:t.clientX,y:t.clientY,dx:0,dy:0,route,axis:null,dir:0,next:-1,lastX:t.clientX,lastT:performance.now(),velocity:0};
    },{passive:true,capture:true});

    document.addEventListener('touchmove',ev=>{
      if(!g||animating||ev.touches?.length!==1)return;
      const t=ev.touches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;
      g.dx=dx;g.dy=dy;
      const now=performance.now(),dt=Math.max(1,now-g.lastT);
      g.velocity=(t.clientX-g.lastX)/dt;
      g.lastX=t.clientX;g.lastT=now;

      if(!g.axis){
        const ax=Math.abs(dx),ay=Math.abs(dy);
        if(ax<7&&ay<7)return;
        g.axis=ax>ay*1.15?'x':'y';
      }
      if(g.axis!=='x')return;
      ev.preventDefault();

      const s=screen();if(!s)return;
      const width=s.getBoundingClientRect().width||window.innerWidth;
      const dir=dx<0?1:-1;
      const valid=setDirection(g,dir);
      document.documentElement.classList.add('fb-apk-swiping');

      s.style.transition='none';
      if(!valid){
        const resisted=Math.sign(dx)*Math.min(34,Math.abs(dx)*.18);
        s.style.transform=`translate3d(${resisted}px,0,0)`;
        return;
      }

      const drag=Math.max(-width,Math.min(width,dx));
      s.style.transform=`translate3d(${drag}px,0,0)`;
      preview.style.transition='none';
      preview.style.transform=`translate3d(${g.dir*width+drag}px,0,0)`;
    },{passive:false,capture:true});

    document.addEventListener('touchend',()=>{
      if(!g||animating)return;
      const data=g;
      const s=screen();
      if(data.axis!=='x'||data.next<0||!preview){cleanup();return}
      const width=s?.getBoundingClientRect().width||window.innerWidth;
      const threshold=Math.min(105,width*.20);
      const fast=Math.abs(data.velocity)>.42&&Math.abs(data.dx)>30;
      const commit=Math.abs(data.dx)>=threshold||fast;
      animating=true;

      if(s)s.style.transition=`transform ${DURATION}ms ${EASE}`;
      preview.style.transition=`transform ${DURATION}ms ${EASE}`;

      if(commit){
        if(s)s.style.transform=`translate3d(${-data.dir*width}px,0,0)`;
        preview.style.transform='translate3d(0,0,0)';
        try{window.FB_SOUNDS?.swish?.(data.dir)}catch(_){}
        setTimeout(()=>{
          try{
            window.go?.(tabs[data.next]);
          }finally{
            setTimeout(scheduleCache,40);
            requestAnimationFrame(()=>{
              cleanup();
              animating=false;
            });
          }
        },DURATION);
      }else{
        if(s)s.style.transform='translate3d(0,0,0)';
        preview.style.transform=`translate3d(${data.dir*width}px,0,0)`;
        setTimeout(()=>{cleanup();animating=false},DURATION);
      }
    },{passive:true,capture:true});

    document.addEventListener('touchcancel',()=>{
      if(!g||animating)return;
      const data=g,s=screen(),width=s?.getBoundingClientRect().width||window.innerWidth;
      animating=true;
      if(s){s.style.transition=`transform ${DURATION}ms ${EASE}`;s.style.transform='translate3d(0,0,0)'}
      if(preview){preview.style.transition=`transform ${DURATION}ms ${EASE}`;preview.style.transform=`translate3d(${data.dir*width}px,0,0)`}
      setTimeout(()=>{cleanup();animating=false},DURATION);
    },{passive:true,capture:true});
  }


  function bindFamilyCameraEnhancements(){
    const modeStrip=document.querySelector('#funCameraModeStrip');
    if(modeStrip&&modeStrip.dataset.fbNativeAutoMode!=='1'){
      modeStrip.dataset.fbNativeAutoMode='1';
      let frame=0,settle=0;
      const selectNearest=()=>{
        frame=0;
        const wrap=modeStrip.closest('.fun-camera-wrap');
        if(wrap?.classList.contains('capture-recording')||
           wrap?.classList.contains('capture-countdown')||
           wrap?.classList.contains('capture-paused'))return;
        const rect=modeStrip.getBoundingClientRect();
        const center=rect.left+rect.width/2;
        let best=null,bestDistance=Infinity;
        modeStrip.querySelectorAll('[data-fun-mode]').forEach(btn=>{
          const r=btn.getBoundingClientRect();
          const d=Math.abs((r.left+r.width/2)-center);
          if(d<bestDistance){bestDistance=d;best=btn}
        });
        if(best&&!best.classList.contains('active'))best.click();
      };
      modeStrip.addEventListener('scroll',()=>{
        if(frame)cancelAnimationFrame(frame);
        frame=requestAnimationFrame(selectNearest);
        clearTimeout(settle);
        settle=setTimeout(selectNearest,80);
      },{passive:true});
      modeStrip.addEventListener('touchend',()=>{
        clearTimeout(settle);
        settle=setTimeout(selectNearest,30);
      },{passive:true});
    }

    const rail=document.querySelector('.fun-camera-rail');
    const flipBtn=document.querySelector('#funFlipCameraBtn');
    const sourceBtn=document.querySelector('#funSourceBtn');
    if(rail&&flipBtn&&flipBtn.dataset.fbNativeRail!=='1'){
      flipBtn.dataset.fbNativeRail='1';
      const label=document.createElement('small');
      label.textContent='Flip';
      label.dataset.fbNativeFlipLabel='1';
      flipBtn.appendChild(label);
      rail.insertBefore(flipBtn,sourceBtn||null);
    }

    const result=document.querySelector('#funResult');
    const video=document.querySelector('#funResultVideo');
    if(result&&video&&video.dataset.fbNativePreview!=='1'){
      video.dataset.fbNativePreview='1';
      video.controls=false;
      video.disablePictureInPicture=true;
      const primeFrame=()=>{
        video.controls=false;
        if(!video.src||video.readyState<1)return;
        const duration=Number(video.duration);
        if(Number.isFinite(duration)&&duration>0.15){
          try{video.currentTime=Math.min(.18,Math.max(.06,duration*.04))}catch(_){}
        }
      };
      video.addEventListener('loadedmetadata',()=>setTimeout(primeFrame,0));
      video.addEventListener('loadeddata',primeFrame);
      const reviewObserver=new MutationObserver(()=>{
        if(!result.hidden)setTimeout(primeFrame,20);
      });
      reviewObserver.observe(result,{attributes:true,attributeFilter:['hidden','style','class']});
    }
  }

  function bindFamilyGalleryEnhancements(){
    document.querySelectorAll('.fun-gallery-media video').forEach(video=>{
      if(video.dataset.fbNativeGalleryPreview==='1')return;
      video.dataset.fbNativeGalleryPreview='1';
      video.controls=false;
      video.disablePictureInPicture=true;
      video.preload='auto';
      const prime=()=>{
        video.controls=false;
        if(!video.src||video.readyState<1)return;
        const duration=Number(video.duration);
        if(Number.isFinite(duration)&&duration>0.12&&video.paused){
          try{video.currentTime=Math.min(.35,Math.max(.08,duration*.04))}catch(_){}
        }
      };
      video.addEventListener('loadedmetadata',()=>setTimeout(prime,0));
      video.addEventListener('loadeddata',prime);
      video.addEventListener('seeked',()=>video.classList.add('fb-gallery-preview-ready'),{once:true});
      try{video.load()}catch(_){}
    });
  }

  function watchFamilyCamera(){
    bindFamilyCameraEnhancements();
    bindFamilyGalleryEnhancements();
    if(window.__fbNativeFamilyCameraObserver)return;
    window.__fbNativeFamilyCameraObserver=true;
    const observer=new MutationObserver(()=>{bindFamilyCameraEnhancements();bindFamilyGalleryEnhancements()});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function start(){bindBackButton();bindSwipe();watchFamilyCamera()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
