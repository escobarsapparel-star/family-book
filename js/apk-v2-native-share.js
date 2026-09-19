(()=>{
  if(window.__fbApkV2NativeShareInstalled)return;
  window.__fbApkV2NativeShareInstalled=true;

  const wait=(fn,{tries=100,delay=100}={})=>new Promise((resolve,reject)=>{
    let n=0;
    const tick=()=>{
      try{
        const value=fn();
        if(value)return resolve(value);
      }catch(_){}
      if(++n>=tries)return reject(new Error('Family Book is still loading. Please try again.'));
      setTimeout(tick,delay);
    };
    tick();
  });

  function isNativeAndroid(){
    try{
      return !!window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.()==='android';
    }catch(_){return false}
  }

  // APK Home composer repair: when the responsive layer moves the composer into
  // the modal, bind the Wall controls again so Post remains functional.
  function repairHomeComposer(){
    const holder=document.querySelector('.home-status-composer-shell[data-social-compact="1"]');
    const button=holder?.querySelector('#wallHomePost');
    if(!holder||!button||button.dataset.apkHomePostRepair==='1')return false;
    button.dataset.apkHomePostRepair='1';
    try{window.FB_WALL?.bindHome?.()}catch(err){console.warn('Family Book Home post repair:',err)}
    return true;
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>repairHomeComposer()).observe(app,{childList:true,subtree:true});
  document.addEventListener('click',event=>{
    if(!event.target.closest?.('[data-home-open-composer],[data-home-media-composer],[data-home-activity-composer]'))return;
    setTimeout(()=>{
      try{window.FB_WALL?.bindHome?.()}catch(err){console.warn('Family Book Home composer rebind:',err)}
    },30);
  },true);
  setTimeout(repairHomeComposer,500);

  if(!isNativeAndroid()||!window.Capacitor?.registerPlugin)return;
  const ShareImage=window.Capacitor.registerPlugin('ShareImage');

  async function pendingImage(){
    const data=await ShareImage.getPendingShare();
    if(!data?.hasShare||!data.path)return null;
    const webPath=window.Capacitor.convertFileSrc(data.path);
    const response=await fetch(webPath);
    if(!response.ok)throw new Error('The shared image could not be opened.');
    const blob=await response.blob();
    const type=data.mimeType||blob.type||'image/jpeg';
    if(!String(type).startsWith('image/'))throw new Error('Family Book can currently receive shared images only.');
    return new File([blob],data.name||'shared-image.jpg',{type});
  }

  async function clearPending(){
    try{await ShareImage.clearPendingShare()}catch(_){}
  }

  function closeChooser(){document.querySelector('.fb-android-share-backdrop')?.remove()}

  async function shareToWall(file){
    window.go?.('home');
    const input=await wait(()=>document.querySelector('[data-wall-file="home"]'));
    const opener=await wait(()=>document.querySelector('[data-home-open-composer]'));
    const transfer=new DataTransfer();
    transfer.items.add(file);
    input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    opener.click();
    // Existing Wall code prepares/compresses and uploads the image.
    return true;
  }

  function fileToDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('The shared image could not be read.'));
      reader.onload=()=>resolve(String(reader.result||''));
      reader.readAsDataURL(file);
    });
  }

  async function saveOwnProfilePhoto(data){
    const me=window.FB_AUTH?.get?.()||{};
    const id=String(me.memberId||'');
    const api=window.FB_FAMILY_DATA;
    if(!id||!api?.getPeople||!api?.syncMembers)throw new Error('Your Family Book profile is not ready yet.');
    const list=api.getPeople();
    const index=list.findIndex(m=>String(m.id)===id);
    if(index<0)throw new Error('Your Family Book member profile could not be found.');
    list[index]={...list[index],photo:data};
    await api.syncMembers(list);
    await api.reload?.();
    window.dispatchEvent(new CustomEvent('familybook:family-data-updated',{detail:{reason:'profile-photo-updated',memberId:id}}));
  }

  function openCropper(src){
    document.querySelector('.fb-android-share-crop')?.remove();
    const wrap=document.createElement('div');
    wrap.className='fb-android-share-crop';
    wrap.style.cssText='position:fixed;inset:0;z-index:2147483200;background:rgba(0,0,0,.78);display:flex;align-items:flex-end;justify-content:center;padding:12px';
    wrap.innerHTML=`<section style="width:min(620px,100%);background:white;border-radius:22px 22px 12px 12px;padding:16px;font-family:Inter,system-ui;color:#1d2c23"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px"><button type="button" data-cancel style="border:0;background:#edf1ee;border-radius:10px;padding:10px 13px;font-weight:800">Cancel</button><strong>Crop profile picture</strong><button type="button" data-save style="border:0;background:#315c43;color:white;border-radius:10px;padding:10px 13px;font-weight:800">Save</button></div><div style="position:relative;max-width:520px;margin:auto"><canvas width="512" height="512" style="display:block;width:100%;aspect-ratio:1;background:#eee7dc;border-radius:18px;touch-action:none"></canvas><div style="position:absolute;inset:6%;border:3px solid rgba(255,255,255,.95);border-radius:50%;box-shadow:0 0 0 999px rgba(0,0,0,.18);pointer-events:none"></div></div><div style="display:flex;align-items:center;gap:10px;margin-top:14px"><span>−</span><input type="range" min="1" max="3" value="1" step="0.01" style="width:100%"><span>+</span></div></section>`;
    document.body.appendChild(wrap);

    const canvas=wrap.querySelector('canvas'),ctx=canvas.getContext('2d'),range=wrap.querySelector('input[type="range"]'),img=new Image();
    let zoom=1,ox=0,oy=0,base=1,drag=false,lastX=0,lastY=0;
    const S=512;
    const bounds=()=>{const w=img.naturalWidth*base*zoom,h=img.naturalHeight*base*zoom;return {w,h,mx:Math.max(0,(w-S)/2),my:Math.max(0,(h-S)/2)}};
    const clamp=()=>{const b=bounds();ox=Math.max(-b.mx,Math.min(b.mx,ox));oy=Math.max(-b.my,Math.min(b.my,oy))};
    const draw=()=>{if(!img.naturalWidth)return;clamp();const b=bounds();ctx.clearRect(0,0,S,S);ctx.fillStyle='#eee7dc';ctx.fillRect(0,0,S,S);ctx.drawImage(img,(S-b.w)/2+ox,(S-b.h)/2+oy,b.w,b.h)};
    img.onload=()=>{base=Math.max(S/img.naturalWidth,S/img.naturalHeight);draw()};
    img.src=src;
    range.oninput=()=>{zoom=Number(range.value);draw()};
    canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
    canvas.addEventListener('pointermove',e=>{if(!drag)return;const k=S/canvas.getBoundingClientRect().width;ox+=(e.clientX-lastX)*k;oy+=(e.clientY-lastY)*k;lastX=e.clientX;lastY=e.clientY;draw()});
    canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);
    wrap.querySelector('[data-cancel]').onclick=()=>wrap.remove();
    wrap.querySelector('[data-save]').onclick=async()=>{
      const save=wrap.querySelector('[data-save]');save.disabled=true;save.textContent='Saving…';
      try{draw();await saveOwnProfilePhoto(canvas.toDataURL('image/jpeg',.88));wrap.remove();window.go?.(`view-member:${window.FB_AUTH?.get?.()?.memberId||''}`)}
      catch(err){alert(err?.message||'Could not update your profile picture.');save.disabled=false;save.textContent='Save'}
    };
  }

  async function shareToProfile(file){
    const src=await fileToDataUrl(file);
    openCropper(src);
  }

  function showChooser(file){
    if(document.querySelector('.fb-android-share-backdrop'))return;
    const wrap=document.createElement('div');
    wrap.className='fb-android-share-backdrop';
    wrap.style.cssText='position:fixed;inset:0;z-index:2147483100;background:rgba(9,20,13,.72);display:flex;align-items:flex-end;justify-content:center;padding:12px;font-family:Inter,system-ui';
    wrap.innerHTML=`<section style="width:min(560px,100%);background:white;border-radius:22px 22px 12px 12px;padding:18px;color:#1d2c23"><div style="width:44px;height:5px;border-radius:99px;background:#d6ded8;margin:0 auto 14px"></div><h2 style="font-size:21px;margin:0 0 6px">Share to Family Book</h2><p style="font-size:13px;color:#6b776f;margin:0 0 16px">What would you like to do with this image?</p><button type="button" data-wall style="width:100%;border:0;border-radius:13px;padding:14px;background:#315c43;color:white;font-weight:800;margin-bottom:9px">Create a new Wall post</button><button type="button" data-profile style="width:100%;border:1px solid #dce6df;border-radius:13px;padding:14px;background:#f6faf7;color:#315c43;font-weight:800;margin-bottom:9px">Use as my profile picture</button><button type="button" data-cancel style="width:100%;border:0;border-radius:13px;padding:12px;background:#edf1ee;color:#546159;font-weight:800">Cancel</button></section>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-cancel]').onclick=async()=>{closeChooser();await clearPending()};
    wrap.querySelector('[data-wall]').onclick=async()=>{
      const btn=wrap.querySelector('[data-wall]');btn.disabled=true;btn.textContent='Opening Wall…';
      try{await shareToWall(file);closeChooser();await clearPending()}catch(err){alert(err?.message||'Could not share this image to the Wall.');btn.disabled=false;btn.textContent='Create a new Wall post'}
    };
    wrap.querySelector('[data-profile]').onclick=async()=>{
      const btn=wrap.querySelector('[data-profile]');btn.disabled=true;btn.textContent='Opening cropper…';
      try{await shareToProfile(file);closeChooser();await clearPending()}catch(err){alert(err?.message||'Could not use this image as your profile picture.');btn.disabled=false;btn.textContent='Use as my profile picture'}
    };
  }

  let handling=false;
  async function checkShare(){
    if(handling)return;
    handling=true;
    try{
      const me=window.FB_AUTH?.get?.()||{};
      if(!me.familyId)return;
      const file=await pendingImage();
      if(file)showChooser(file);
    }catch(err){console.warn('Family Book Android share:',err)}
    finally{handling=false}
  }

  window.addEventListener('familybook:android-share',()=>setTimeout(checkShare,100));
  window.addEventListener('familybook:auth-ready',()=>setTimeout(checkShare,500));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(checkShare,250)});
  window.addEventListener('load',()=>setTimeout(checkShare,800));
  setTimeout(checkShare,1200);
})();
