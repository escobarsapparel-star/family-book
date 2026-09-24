(()=>{
  const POST_LIMIT=60;
  const MAX_VIDEO_BYTES=50*1024*1024;
  let objectUrls=[];
  const composerMedia={home:null,profile:null};

  const ACTIVITIES={
    update:{label:"Update",verb:"posted an update",placeholder:"What are you up to?",icon:"message-circle"},
    watching:{label:"Watching",verb:"is watching",placeholder:"What are you watching?",icon:"tv"},
    listening:{label:"Listening to",verb:"is listening to",placeholder:"What are you listening to?",icon:"headphones"},
    thinking:{label:"Thinking of",verb:"is thinking of",placeholder:"What are you thinking of?",icon:"cloud"},
    feeling:{label:"Feeling",verb:"is feeling",placeholder:"How are you feeling?",icon:"smile"},
    reading:{label:"Reading",verb:"is reading",placeholder:"What are you reading?",icon:"book-open"},
    checkin:{label:"Check in",verb:"checked in",placeholder:"Add a note about this place…",icon:"map-pin"}
  };
  const ACTIVITY_ORDER=["update","watching","listening","thinking","feeling","reading","checkin"];

  function e(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function familyKey(){
    if(window.FB_AUTH?.familyStorageKey)return window.FB_AUTH.familyStorageKey();
    const u=window.FB_AUTH?.get?.()||{};
    return String(u.family||"Family").toLowerCase().replace(/[^a-z0-9]+/g,"_");
  }
  function getPosts(){
    return window.FB_SOCIAL_DATA?.getPosts?.()||[];
  }
  function currentIdentity(){
    const u=window.FB_AUTH?.get?.()||{};
    const photo=typeof window.currentUserPhoto==="function"?window.currentUserPhoto():(u.photo||"");
    return {id:u.memberId||"owner",name:u.name||"Family member",photo};
  }
  function initials(name){
    const p=String(name||"Family").trim().split(/\s+/).filter(Boolean);
    return e(((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase());
  }
  function avatarHtml(name,photo){
    return photo?`<img src="${e(photo)}" alt="">`:`<span>${initials(name)}</span>`;
  }

  function currentMemberById(id){
    const wanted=String(id||"");
    if(!wanted)return null;
    try{
      return (window.FB_FAMILY_DATA?.getPeople?.()||[]).find(p=>String(p.id||"")===wanted)||null;
    }catch(_){
      return null;
    }
  }

  function resolvedAuthor(item){
    const member=currentMemberById(item?.authorId);
    return {
      name:member?.name||item?.authorName||"Family member",
      photo:member?.photo||item?.authorPhoto||""
    };
  }
  function timeAgo(ts){return window.FB_TIME?.activity?.(ts)||"Earlier"}
  function cleanupUrls(){objectUrls.forEach(u=>{try{URL.revokeObjectURL(u)}catch(_){}});objectUrls=[]}
  function blobUrl(blob){
    if(!blob)return "";if(typeof blob==="string")return blob;
    try{const u=URL.createObjectURL(blob);objectUrls.push(u);return u}catch(_){return ""}
  }

  async function imageFromFile(file){
    if("createImageBitmap" in window){
      const bmp=await createImageBitmap(file);
      return {source:bmp,width:bmp.width,height:bmp.height,close:()=>bmp.close?.()};
    }
    const url=URL.createObjectURL(file),img=new Image();
    try{
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
      return {source:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>URL.revokeObjectURL(url)};
    }catch(err){URL.revokeObjectURL(url);throw err}
  }
  function mediaCanvasBlob(source,width,height,max,quality=.8,mime="image/webp"){
    const scale=Math.min(1,max/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(source,0,0,w,h);
    return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve({blob:b,width:w,height:h}):reject(new Error("Could not prepare this image.")),mime,quality));
  }
  async function prepareWallImage(file){
    const img=await imageFromFile(file);
    try{
      const main=await mediaCanvasBlob(img.source,img.width,img.height,1800,.80,"image/webp");
      const thumb=await mediaCanvasBlob(img.source,img.width,img.height,540,.72,"image/webp");
      return {kind:"image",blob:main.blob,thumb:thumb.blob,meta:{name:file.name,type:file.type,size:file.size,width:main.width,height:main.height}};
    }finally{img.close?.()}
  }
  async function prepareWallVideo(file){
    if(file.size>MAX_VIDEO_BYTES)throw new Error("That video is larger than 50 MB. Choose a shorter or smaller clip.");
    const url=URL.createObjectURL(file),video=document.createElement("video");
    video.preload="metadata";video.muted=true;video.playsInline=true;video.src=url;
    try{
      await new Promise((resolve,reject)=>{
        const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(new Error("This video could not be opened."))};
        const cleanup=()=>{video.removeEventListener("loadedmetadata",ok);video.removeEventListener("error",bad)};
        video.addEventListener("loadedmetadata",ok,{once:true});video.addEventListener("error",bad,{once:true});
      });
      const width=video.videoWidth||1280,height=video.videoHeight||720,duration=Number(video.duration)||0;
      if(duration>0){
        try{
          video.currentTime=Math.min(Math.max(.1,duration*.08),2);
          await new Promise(resolve=>{const done=()=>resolve();video.addEventListener("seeked",done,{once:true});setTimeout(done,1200)});
        }catch(_){}
      }
      const scale=Math.min(1,850/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
      const c=document.createElement("canvas");c.width=w;c.height=h;const ctx=c.getContext("2d");
      ctx.fillStyle="#20251f";ctx.fillRect(0,0,w,h);try{ctx.drawImage(video,0,0,w,h)}catch(_){}
      const r=Math.max(18,Math.min(w,h)*.09),cx=w/2,cy=h/2;
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle="rgba(0,0,0,.55)";ctx.fill();
      ctx.beginPath();ctx.moveTo(cx-r*.28,cy-r*.42);ctx.lineTo(cx+r*.48,cy);ctx.lineTo(cx-r*.28,cy+r*.42);ctx.closePath();ctx.fillStyle="#fff";ctx.fill();
      const thumb=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error("Could not create a video preview.")),"image/jpeg",.8));
      return {kind:"video",blob:file,thumb,meta:{name:file.name,type:file.type,size:file.size,width,height,duration}};
    }finally{URL.revokeObjectURL(url);video.removeAttribute("src");video.load()}
  }
  async function prepareWallMedia(file){
    if(!file)return null;
    if(file.type.startsWith("image/"))return prepareWallImage(file);
    if(file.type.startsWith("video/"))return prepareWallVideo(file);
    throw new Error("Choose an image or video clip.");
  }
  function attachmentShell(scope){
    return `<div class="wall-attachment-tools">
      <button type="button" class="wall-attach-button" data-wall-attach="${scope}"><i data-lucide="image-plus"></i><span>Add photo / video</span></button>
      <input type="file" data-wall-file="${scope}" accept="image/*,video/*" hidden>
      <div class="wall-attachment-preview" data-wall-preview="${scope}" hidden></div>
    </div>`;
  }
  function renderComposerMedia(scope){
    const mount=document.querySelector(`[data-wall-preview="${scope}"]`),media=composerMedia[scope];if(!mount)return;
    cleanupComposerPreview(scope);
    if(!media){mount.hidden=true;mount.innerHTML="";return}
    const src=blobUrl(media.kind==="video"?(media.thumb||media.blob):media.blob);
    mount.hidden=false;
    mount.innerHTML=`<div class="wall-preview-media ${media.kind==="video"?"video":""}"><img src="${src}" alt="Attachment preview">${media.kind==="video"?`<span><i data-lucide="play"></i></span>`:""}<button type="button" data-wall-remove-attachment="${scope}" aria-label="Remove attachment"><i data-lucide="x"></i></button></div><small>${media.kind==="video"?"Video clip":"Photo"} attached</small>`;
    mount.querySelector(`[data-wall-remove-attachment="${scope}"]`)?.addEventListener("click",()=>{composerMedia[scope]=null;renderComposerMedia(scope)});
    window.icons?.();
  }
  function cleanupComposerPreview(scope){
    // Object URLs are centrally revoked on feed refresh/navigation; no separate state required.
  }
  function bindAttachment(scope){
    const btn=document.querySelector(`[data-wall-attach="${scope}"]`),input=document.querySelector(`[data-wall-file="${scope}"]`);
    if(btn&&input)btn.onclick=()=>input.click();
    if(input)input.onchange=async ev=>{
      const file=ev.target.files?.[0];ev.target.value="";if(!file)return;
      if(btn){btn.disabled=true;btn.innerHTML='<i data-lucide="loader-circle"></i><span>Preparing…</span>';window.icons?.()}
      try{composerMedia[scope]=await prepareWallMedia(file);renderComposerMedia(scope)}
      catch(err){alert(err.message||"Could not prepare that attachment.")}
      finally{if(btn){btn.disabled=false;btn.innerHTML='<i data-lucide="image-plus"></i><span>Add photo / video</span>';window.icons?.()}}
    };
    renderComposerMedia(scope);
  }
  function clearAttachment(scope){composerMedia[scope]=null;renderComposerMedia(scope)}

  function mapsUrl(location="",lat=null,lng=null){
    const q=(lat!=null&&lng!=null)?`${lat},${lng}`:String(location||"").trim();
    return q?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`:"";
  }
  function locationFields(scope){
    if(!canUseLocationPosts())return `<div class="wall-location-disabled"><i data-lucide="map-pin-off"></i>Location sharing is disabled in Privacy settings.</div>`;
    return `<div class="wall-checkin-fields" data-checkin-fields="${scope}" hidden>
      <div class="wall-checkin-row">
        <label><span>Place</span><input data-checkin-place="${scope}" maxlength="120" placeholder="Home, park, restaurant…"></label>
        <button type="button" class="secondary wall-gps-button" data-checkin-gps="${scope}"><i data-lucide="locate-fixed"></i>Use current location</button>
      </div>
      <input type="hidden" data-checkin-lat="${scope}">
      <input type="hidden" data-checkin-lng="${scope}">
      <small data-checkin-note="${scope}">Your location is only used if you choose it.</small>
    </div>`;
  }
  function getCheckin(scope){
    const place=document.querySelector(`[data-checkin-place="${scope}"]`)?.value.trim()||"";
    const latRaw=document.querySelector(`[data-checkin-lat="${scope}"]`)?.value||"";
    const lngRaw=document.querySelector(`[data-checkin-lng="${scope}"]`)?.value||"";
    const lat=latRaw===""?null:Number(latRaw),lng=lngRaw===""?null:Number(lngRaw);
    return {place,lat:Number.isFinite(lat)?lat:null,lng:Number.isFinite(lng)?lng:null};
  }
  function clearCheckin(scope){
    const place=document.querySelector(`[data-checkin-place="${scope}"]`);
    const lat=document.querySelector(`[data-checkin-lat="${scope}"]`);
    const lng=document.querySelector(`[data-checkin-lng="${scope}"]`);
    const note=document.querySelector(`[data-checkin-note="${scope}"]`);
    if(place)place.value="";if(lat)lat.value="";if(lng)lng.value="";
    if(note)note.textContent="Your location is only used if you choose it.";
  }
  function useCurrentLocation(scope){
    const note=document.querySelector(`[data-checkin-note="${scope}"]`);
    const btn=document.querySelector(`[data-checkin-gps="${scope}"]`);
    if(!navigator.geolocation){
      if(note)note.textContent="Location is not supported on this device/browser.";
      return;
    }
    if(btn){btn.disabled=true;btn.innerHTML='<i data-lucide="loader-circle"></i>Locating…';window.icons?.()}
    if(note)note.textContent="Requesting your device location…";
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const lat=pos.coords.latitude,lng=pos.coords.longitude;
        const latEl=document.querySelector(`[data-checkin-lat="${scope}"]`);
        const lngEl=document.querySelector(`[data-checkin-lng="${scope}"]`);
        const place=document.querySelector(`[data-checkin-place="${scope}"]`);
        if(latEl)latEl.value=String(lat);if(lngEl)lngEl.value=String(lng);
        if(place&&!place.value)place.value="Current location";
        if(note)note.innerHTML=`Location captured. <a href="${mapsUrl("",lat,lng)}" target="_blank" rel="noopener">Open in Google Maps</a>`;
        if(btn){btn.disabled=false;btn.innerHTML='<i data-lucide="locate-fixed"></i>Update location';window.icons?.()}
      },
      err=>{
        if(note)note.textContent=err.code===1?"Location permission was not granted.":"Could not get your location. You can type a place instead.";
        if(btn){btn.disabled=false;btn.innerHTML='<i data-lucide="locate-fixed"></i>Use current location';window.icons?.()}
      },
      {enableHighAccuracy:true,timeout:10000,maximumAge:60000}
    );
  }

  function activityOf(value){return ACTIVITIES[value]||ACTIVITIES.update}
  function canUseLocationPosts(){return window.FB_SETTINGS?.canUseLocationPosts?.()??true}
  function availableActivityIds(){return canUseLocationPosts()?ACTIVITY_ORDER:ACTIVITY_ORDER.filter(id=>id!=="checkin")}
  function viewerCanSeeCheckin(authorId){return window.FB_SETTINGS?.canSeeCheckins?.(authorId)??true}
  function activityPills(scope){
    return `<div class="wall-activity-pills" data-activity-scope="${scope}">${availableActivityIds().map((id,i)=>{
      const a=ACTIVITIES[id];
      return `<button type="button" class="wall-activity-pill ${i===0?"active":""}" data-activity="${id}"><i data-lucide="${a.icon}"></i><span>${e(a.label)}</span></button>`;
    }).join("")}</div>`;
  }
  function activitySelect(scope){
    return `<label class="wall-activity-select"><span>Post type</span><select data-activity-select="${scope}">${availableActivityIds().map(id=>`<option value="${id}">${e(ACTIVITIES[id].label)}</option>`).join("")}</select></label>`;
  }

  function homeShell(){
    const me=currentIdentity();
    return `<section class="family-wall-panel">
      <div class="section-head wall-head"><div><h2>Family Wall</h2><p>Share a quick update with the family.</p></div></div>
      <div class="wall-composer">
        <div class="wall-avatar">${avatarHtml(me.name,me.photo)}</div>
        <div class="wall-compose-main">
          ${activityPills("home")}
          ${activitySelect("home")}
          ${locationFields("home")}
          <textarea id="wallHomeText" maxlength="500" rows="2" placeholder="What are you up to?"></textarea>
          ${attachmentShell("home")}
          <div class="wall-compose-actions"><small>Family-only update</small><button type="button" class="primary" id="wallHomePost"><i data-lucide="send"></i>Post</button></div>
        </div>
      </div>
      <div id="familyWallFeed" class="family-wall-feed"><div class="wall-loading">Loading family updates…</div></div>
    </section>`;
  }

  function profileStatusShell(){
    return `<section class="profile-status-card">
      <div class="profile-status-title"><div><span>Current status</span><strong id="profileLatestStatus">No status update yet</strong></div><i data-lucide="message-circle"></i></div>
      <div class="profile-status-compose">
        ${activityPills("profile")}
        ${activitySelect("profile")}
        ${locationFields("profile")}
        <textarea id="profileStatusText" rows="2" maxlength="500" placeholder="What are you up to?"></textarea>
        ${attachmentShell("profile")}
        <button type="button" class="primary" id="profileStatusPost"><i data-lucide="send"></i>Post update</button>
      </div>
    </section>`;
  }

  async function combinedFeed(){
    const manual=getPosts().map(p=>({...p,kind:"status",activity:p.activity||"update"}));
    let memories=[];
    try{
      if(window.FB_MEMORIES?.getAll){
        const list=await window.FB_MEMORIES.getAll();
        const fallback=currentIdentity();
        memories=list.map(m=>{
          const photos=window.FB_MEMORIES.getPhotos?.(m)||[];
          return {
            id:`memory:${m.id}`,kind:"memory",createdAt:Number(m.createdAt)||0,
            authorId:m.authorId||(fallback.id||"owner"),authorName:m.authorName||fallback.name,
            authorPhoto:currentMemberById(m.authorId)?.photo||m.authorPhoto||fallback.photo,caption:m.caption||"Family memory",
            memoryId:m.id,photo:photos[0]?.thumb||photos[0]?.image||m.thumb||m.image||null,
            video:photos[0]?.kind==="video",count:photos.length||1
          };
        });
      }
    }catch(_){}
    return [...manual,...memories].filter(item=>item.kind==="memory"||item.activity!=="checkin"||viewerCanSeeCheckin(item.authorId)).sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)).slice(0,30);
  }


  function normalName(v){return String(v||"").trim().toLowerCase().replace(/\s+/g," ")}
  function itemBelongsToMember(item,member){
    if(!item||!member)return false;
    if(item.authorId && member.id && item.authorId===member.id)return true;
    // Backward-compatible fallback for old local prototype posts/memories.
    if(item.authorName && member.name && normalName(item.authorName)===normalName(member.name))return true;
    return false;
  }

  function memberActivityShell(member){
    return `<section class="member-activity-card">
      <div class="member-activity-head">
        <div><span>Personal wall</span><h2>Recent activity</h2></div>
        <button type="button" class="member-activity-all" data-r="member-wall:${e(member.id)}">View all activity</button>
      </div>
      <div id="memberActivityFeed" class="member-activity-feed" data-member-id="${e(member.id)}">
        <div class="wall-loading">Loading recent activity…</div>
      </div>
    </section>`;
  }

  function memberWallPageShell(member){
    return `<section class="member-wall-page">
      <button class="fu-back" data-r="view-member:${e(member.id)}"><i data-lucide="arrow-left"></i> ${e(member.name)}</button>
      <div class="member-wall-hero">
        <div class="member-wall-avatar">${avatarHtml(member.name,member.photo||"")}</div>
        <div><p class="eyebrow">PERSONAL WALL</p><h1>${e(member.name)}</h1><p>Recent updates, activities and Memories shared by this family member.</p></div>
      </div>
      <div id="memberWallFeed" class="member-wall-feed" data-member-id="${e(member.id)}">
        <div class="wall-loading">Loading activity…</div>
      </div>
    </section>`;
  }

  function feedItemHtml(item,{compact=false}={}){
    const resolved=resolvedAuthor(item),name=resolved.name,photo=resolved.photo;
    if(item.kind==="memory"){
      const src=blobUrl(item.photo);
      return `<article class="wall-post wall-memory-post ${compact?"compact":""}" data-wall-memory="${e(item.memoryId)}">
        <div class="wall-post-head"><div class="wall-avatar small">${avatarHtml(name,photo)}</div><div><strong>${e(name)}</strong><span>shared a memory · ${e(timeAgo(item.createdAt))}</span></div></div>
        <div class="wall-post-body"><p>${e(item.caption||"Family memory")}</p>${src?`<button type="button" class="wall-memory-photo ${item.video?"has-video":""}" data-wall-memory="${e(item.memoryId)}"><img src="${src}" alt="${e(item.caption||"Family memory")}">${item.video?`<b class="wall-video-play"><i data-lucide="play"></i></b>`:""}${item.count>1?`<span><i data-lucide="files"></i>${item.count}</span>`:""}</button>`:""}${window.FB_REACTIONS?.controlsHtml?.(`memory:${item.memoryId}`,{compact})||""}${window.FB_COMMENTS?.threadHtml?.(`memory:${item.memoryId}`,{compact})||""}</div>
      </article>`;
    }
    const own=item.canDelete!==false&&(item.authorId===(window.FB_AUTH?.get?.()?.memberId||"owner")||(window.FB_AUTH?.get?.()?.role==="admin")),act=activityOf(item.activity);
    const map=mapsUrl(item.location||"",item.lat,item.lng);
    const attachment=item.attachment,attachmentSrc=blobUrl(attachment?.blob),attachmentPoster=blobUrl(attachment?.thumb||attachment?.blob);
    return `<article class="wall-post ${compact?"compact":""}">
      <div class="wall-post-head"><div class="wall-avatar small">${avatarHtml(name,photo)}</div><div><strong>${e(name)}</strong><span>${e(act.verb)}${item.activity==="checkin"&&item.location?` at ${e(item.location)}`:""} · ${e(timeAgo(item.createdAt))}</span></div>${own&&!compact?`<button class="wall-delete" type="button" data-wall-delete="${e(item.id)}" aria-label="Delete status"><i data-lucide="trash-2"></i></button>`:""}</div>
      <div class="wall-post-body">${item.text?`<p>${e(item.text)}</p>`:""}${attachmentSrc?(attachment.kind==="video"?`<div class="wall-post-attachment"><video src="${attachmentSrc}" poster="${attachmentPoster}" controls playsinline preload="metadata"></video></div>`:`<div class="wall-post-attachment"><img src="${attachmentSrc}" alt="Post attachment"></div>`):""}${item.activity==="checkin"&&map?`<a class="wall-map-link" href="${map}" target="_blank" rel="noopener"><i data-lucide="map-pin"></i>Open in Google Maps</a>`:""}${window.FB_REACTIONS?.controlsHtml?.(`post:${item.id}`,{compact})||""}${window.FB_COMMENTS?.threadHtml?.(`post:${item.id}`,{compact})||""}</div>
    </article>`;
  }

  async function memberItems(member){
    const items=await combinedFeed();
    return items.filter(item=>itemBelongsToMember(item,member));
  }

  function bindFeedLinks(holder){
    holder?.querySelectorAll("[data-wall-memory]").forEach(b=>b.onclick=()=>window.go?.(`view-memory:${b.dataset.wallMemory}`));
    window.FB_REACTIONS?.bind?.(holder);
    window.FB_COMMENTS?.bind?.(holder);
  }

  async function bindMemberActivity(member){
    const mount=document.querySelector("#memberActivityFeed");if(!mount)return;
    cleanupUrls();
    const items=(await memberItems(member)).slice(0,3);
    if(!items.length){
      mount.innerHTML=`<div class="member-activity-empty"><i data-lucide="messages-square"></i><strong>No recent activity yet</strong><span>When ${e((member.name||"this member").split(" ")[0])} posts or shares a Memory, it will appear here.</span></div>`;
      window.icons?.();return;
    }
    mount.innerHTML=items.map(item=>feedItemHtml(item,{compact:true})).join("");
    bindFeedLinks(mount);
    window.icons?.();
  }

  async function bindMemberWall(member){
    const mount=document.querySelector("#memberWallFeed");if(!mount)return;
    cleanupUrls();
    const items=await memberItems(member);
    if(!items.length){
      mount.innerHTML=`<div class="member-wall-empty"><i data-lucide="messages-square"></i><h2>No activity yet</h2><p>${e((member.name||"This family member").split(" ")[0])} hasn't posted a status or shared a Memory from this account yet.</p><button type="button" class="secondary" data-r="members">Back to members</button></div>`;
      mount.querySelector("[data-r]")?.addEventListener("click",()=>window.go?.("members"));
      window.icons?.();return;
    }
    mount.innerHTML=items.map(item=>feedItemHtml(item)).join("");
    bindFeedLinks(mount);
    window.icons?.();
  }

  async function renderHome(){
    const feed=document.querySelector("#familyWallFeed");if(!feed)return;
    cleanupUrls();
    const items=await combinedFeed();
    if(!items.length){
      feed.innerHTML=`<div class="wall-empty"><i data-lucide="messages-square"></i><strong>No family updates yet</strong><span>Your first status or Memory will appear here.</span></div>`;
      window.icons?.();return;
    }
    feed.innerHTML=items.map(item=>feedItemHtml(item)).join("");

    bindFeedLinks(feed);
    feed.querySelectorAll("[data-wall-delete]").forEach(b=>b.onclick=async()=>{
      const id=b.dataset.wallDelete;
      if(!confirm("Delete this family update?"))return;
      b.disabled=true;
      try{
        await window.FB_SOCIAL_DATA?.deletePost?.(id);
        await renderHome();
        refreshProfileLatest();
      }catch(err){alert(err.message||"Could not delete this update.")}
      finally{b.disabled=false}
    });
    window.icons?.();
  }

  function selectedActivity(scope){
    return document.querySelector(`[data-activity-select="${scope}"]`)?.value||"update";
  }
  function applyActivity(scope,id){
    const requested=ACTIVITIES[id]?id:"update",safe=requested==="checkin"&&!canUseLocationPosts()?"update":requested,a=activityOf(safe);
    const select=document.querySelector(`[data-activity-select="${scope}"]`);
    if(select)select.value=safe;
    document.querySelectorAll(`[data-activity-scope="${scope}"] [data-activity]`).forEach(b=>b.classList.toggle("active",b.dataset.activity===safe));
    const input=document.querySelector(scope==="home"?"#wallHomeText":"#profileStatusText");
    if(input)input.placeholder=a.placeholder;
    const fields=document.querySelector(`[data-checkin-fields="${scope}"]`);
    if(fields)fields.hidden=safe!=="checkin";
  }
  function bindActivityPicker(scope){
    const holder=document.querySelector(`[data-activity-scope="${scope}"]`);
    const select=document.querySelector(`[data-activity-select="${scope}"]`);
    holder?.querySelectorAll("[data-activity]").forEach(b=>b.onclick=()=>applyActivity(scope,b.dataset.activity));
    if(select)select.onchange=()=>applyActivity(scope,select.value);
    const gps=document.querySelector(`[data-checkin-gps="${scope}"]`);
    if(gps)gps.onclick=()=>useCurrentLocation(scope);

    const placeInput=document.querySelector(`[data-checkin-place="${scope}"]`);
    const latInput=document.querySelector(`[data-checkin-lat="${scope}"]`);
    const lngInput=document.querySelector(`[data-checkin-lng="${scope}"]`);
    window.FB_PLACES?.attach?.(placeInput,{
      latInput,lngInput,
      label:"Search address or place",
      onSelect:({address,lat,lng})=>{
        if(address&&placeInput)placeInput.value=address;
        if(latInput)latInput.value=lat==null?"":String(lat);
        if(lngInput)lngInput.value=lng==null?"":String(lng);
        const note=document.querySelector(`[data-checkin-note="${scope}"]`);
        if(note)note.textContent=lat!=null?"Place selected from Google Places.":"Place entered manually.";
      }
    });

    applyActivity(scope,"update");
  }

  async function addStatus(text,activity="update",checkin={},attachment=null){
    const clean=String(text||"").trim(),requested=ACTIVITIES[activity]?activity:"update",safe=requested==="checkin"&&!canUseLocationPosts()?"update":requested;
    const place=String(checkin.place||"").trim();
    if(!clean && !attachment && !(safe==="checkin"&&(place||checkin.lat!=null)))return false;
    const me=currentIdentity(),id=crypto.randomUUID();
    await window.FB_SOCIAL_DATA?.savePost?.({
      id,authorId:me.id,authorName:me.name,authorPhoto:me.photo,
      text:clean,activity:safe,location:place,
      lat:checkin.lat??null,lng:checkin.lng??null,
      createdAt:Date.now()
    },attachment);
    return true;
  }

  function bindHome(){
    bindActivityPicker("home");bindAttachment("home");
    const input=document.querySelector("#wallHomeText"),btn=document.querySelector("#wallHomePost");
    if(btn&&input)btn.onclick=async()=>{
      const activity=selectedActivity("home"),attachment=composerMedia.home;
      btn.disabled=true;
      try{
        if(!await addStatus(input.value,activity,getCheckin("home"),attachment)){input.focus();return}
        input.value="";clearCheckin("home");clearAttachment("home");applyActivity("home","update");await renderHome();refreshProfileLatest();
      }catch(err){alert(err.message||"Could not post this update.")}
      finally{btn.disabled=false}
    };
    if(input)input.addEventListener("keydown",ev=>{
      if((ev.ctrlKey||ev.metaKey)&&ev.key==="Enter"){ev.preventDefault();btn?.click()}
    });
    renderHome();
  }

  function latestStatus(){
    return getPosts().sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0))[0]||null;
  }
  function refreshProfileLatest(){
    const el=document.querySelector("#profileLatestStatus");if(!el)return;
    const p=latestStatus();
    if(!p){el.textContent="No status update yet";return}
    const a=activityOf(p.activity||"update");
    const fallback=p.media?.kind==="video"?"Shared a video":p.media?.kind==="image"?"Shared a photo":"";
    el.textContent=p.activity==="checkin"?`Checked in${p.location?` at ${p.location}`:""}${p.text?`: ${p.text}`:fallback?` · ${fallback}`:""}`:(p.activity&&p.activity!=="update"?`${a.label}: ${p.text||fallback}`:(p.text||fallback));
  }
  function bindProfile(){
    bindActivityPicker("profile");bindAttachment("profile");
    refreshProfileLatest();
    const input=document.querySelector("#profileStatusText"),btn=document.querySelector("#profileStatusPost");
    if(btn&&input)btn.onclick=async()=>{
      const activity=selectedActivity("profile"),attachment=composerMedia.profile;
      btn.disabled=true;
      try{
        if(!await addStatus(input.value,activity,getCheckin("profile"),attachment)){input.focus();return}
        input.value="";clearCheckin("profile");clearAttachment("profile");applyActivity("profile","update");refreshProfileLatest();
      }catch(err){alert(err.message||"Could not post this update.")}
      finally{btn.disabled=false}
    };
  }

  window.FB_WALL={homeShell,profileStatusShell,memberActivityShell,memberWallPageShell,bindHome,bindProfile,bindMemberActivity,bindMemberWall,getPosts};
})();