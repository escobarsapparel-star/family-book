
const A=document.getElementById("app"),D=window.FB_DATA;
function auth(){
A.innerHTML=`<main class="login-page">
<section class="login-photo"><img class="login-logo auth-logo" src="assets/logo/family-book-logo.png" alt="Family Book"><div class="login-message"><h2 class="script">Family is everything.</h2><p>Our family. Our memories. Our story.</p></div></section>
<section class="login-side"><div class="auth-card"><img class="mobile-logo auth-logo" src="assets/logo/family-book-logo.png" alt="Family Book">
<div class="tabs"><button class="tab active" data-tab="in">Sign in</button><button class="tab" data-tab="up">Create account</button></div>

<form id="signin" class="form">
<div><p class="eyebrow">WELCOME BACK</p><h1>Sign in to Family Book</h1><p class="muted">Your private family space, now protected by Supabase authentication.</p></div>
<button type="button" class="google-auth-btn" data-google-auth><span class="google-mark">G</span>Continue with Google</button>
<div class="auth-divider"><span>or use email</span></div>
<label>Email<input id="email" type="email" placeholder="you@example.com" required></label>
<label>Password<input id="pass" type="password" placeholder="••••••••" minlength="6" required></label>
<div class="backend-auth-message" id="signinMessage" hidden></div>
<button class="primary full" type="submit">Sign in</button>
</form>

<form id="signup" class="form hidden">
<div><p class="eyebrow">CREATE YOUR ACCOUNT</p><h1>Start with Family Book</h1><p class="muted">Create your secure login first. After signing in, you can create a new family or join one with an invitation.</p></div>
<button type="button" class="google-auth-btn" data-google-auth><span class="google-mark">G</span>Continue with Google</button>
<div class="auth-divider"><span>or use email</span></div>
<div class="row"><label>First name<input id="first" required></label><label>Last name<input id="last"></label></div>
<label>Email<input id="regemail" type="email" required></label>
<label>Password<input id="regpass" type="password" minlength="8" required placeholder="At least 8 characters"></label>
<div class="backend-auth-message" id="signupMessage" hidden></div>
<button class="primary full" type="submit">Create account</button>
</form>
</div></section></main>`;

let tabs=[...document.querySelectorAll("[data-tab]")],si=$("#signin"),su=$("#signup");
tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.toggle("active",x===t));si.classList.toggle("hidden",t.dataset.tab!=="in");su.classList.toggle("hidden",t.dataset.tab!=="up")});
const showMessage=(id,text,type="error")=>{const el=$(id);if(!el)return;el.textContent=text;el.dataset.type=type;el.hidden=!text};

si.onsubmit=async e=>{
 e.preventDefault();showMessage("#signinMessage","");
 const btn=si.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="Signing in…";
 try{await FB_AUTH.signInWithPassword($("#email").value,$("#pass").value);await routeAfterBackendAuth()}
 catch(ex){showMessage("#signinMessage",ex.message||"Could not sign in.")}
 finally{btn.disabled=false;btn.textContent="Sign in"}
};

su.onsubmit=async e=>{
 e.preventDefault();showMessage("#signupMessage","");
 const btn=su.querySelector("button[type=submit]");btn.disabled=true;btn.textContent="Creating account…";
 try{
  const result=await FB_AUTH.signUp({first:$("#first").value,last:$("#last").value,email:$("#regemail").value,password:$("#regpass").value});
  if(result.needsConfirmation)showMessage("#signupMessage","Account created. Check your email and confirm your address, then return here and sign in.","success");
  else await routeAfterBackendAuth();
 }catch(ex){showMessage("#signupMessage",ex.message||"Could not create the account.")}
 finally{btn.disabled=false;btn.textContent="Create account"}
};

document.querySelectorAll("[data-google-auth]").forEach(btn=>btn.onclick=async()=>{
 try{btn.disabled=true;btn.innerHTML='<span class="google-mark">G</span>Opening Google…';await FB_AUTH.signInWithGoogle()}
 catch(ex){alert(ex.message||"Could not start Google sign-in.");btn.disabled=false;btn.innerHTML='<span class="google-mark">G</span>Continue with Google'}
});
icons();
}

function icons(){if(window.lucide)lucide.createIcons({attrs:{"stroke-width":1.9}})}
function normalizeFamilyName(v){let raw=String(v||"").trim().replace(/^The\s+/i,"").replace(/(?:\s+Family)+$/i,"").trim();return raw?`${raw} Family`:"Family"}
function familyLabel(){let u=FB_AUTH.get()||{};return normalizeFamilyName(u.family||D.family||"Family")}
function currentMemberId(){let u=FB_AUTH.get()||{};return u.memberId||"owner"}
function currentRole(){return (FB_AUTH.get()||{}).role||"admin"}
function isFamilyAdmin(){return currentRole()==="admin"}
function memberEditMode(member){
 if(!member)return "none";
 if(member.id===currentMemberId())return "full";
 if(!isFamilyAdmin())return "none";
 return member.accountId?"structure":"full";
}
function canEditMember(member){return memberEditMode(member)!=="none"}
function canRemoveMember(member){
 if(!member||!isFamilyAdmin()||member.id===currentMemberId())return false;
 return !member.accountId;
}
function familyTreeAnchorId(G){
 const members=G?.members||[];
 // The shared family tree must not change depending on which relative is signed in.
 // Keep the original family/founder profile as the stable anchor when it exists.
 return members.find(m=>m.id==="owner")?.id||members[0]?.id||"";
}
function currentUserPhoto(){let u=FB_AUTH.get()||{},owner=getMembers().find(m=>m.id===currentMemberId());return owner?.photo||u.photo||""}
function userAvatarHtml(){let p=currentUserPhoto();return p?`<img src="${p}" alt="Profile photo">`:userInitials()}
function userInitials(){let u=FB_AUTH.get()||{},parts=(u.name||"Family User").trim().split(/\s+/).filter(Boolean);return esc((parts[0]?.[0]||"F")+(parts.length>1?(parts.at(-1)?.[0]||""):"")).toUpperCase()}
function shell(){window.FB_INVITES?.ensureCurrentAccount?.();let fam=esc(familyLabel()),initials=userInitials();A.innerHTML=`<div class="app"><header class="topbar"><button class="brand-home" data-r="home" aria-label="Go to Family Book Home"><span class="brand-logo-wrap"><img class="theme-logo theme-logo-light" src="assets/logo/family-book-logo-header.png" alt="Family Book"><img class="theme-logo theme-logo-dark" src="assets/logo/family-book-logo-dark-header.png" alt="Family Book"></span><span class="brand-tagline">OUR FAMILY <b>•</b> OUR MEMORIES <b>•</b> OUR STORY</span></button><div class="actions profile-actions"><button class="notify circle" id="topNotificationButton" aria-label="Notification settings"><i data-lucide="bell"></i></button><button class="circle avatar" id="topProfileButton" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded="false">${userAvatarHtml()}</button>${window.FB_SETTINGS?.menuShell?.()||""}</div></header><main id="screen" class="screen"></main><nav class="bottom" aria-label="Main navigation"><button class="nav active" data-r="home"><i data-lucide="house"></i><small>Home</small></button><button class="nav" data-r="memories"><i data-lucide="images"></i><small>Memories</small></button><button class="nav" data-r="tree"><i data-lucide="git-fork"></i><small>Tree</small></button><button class="nav" data-r="calendar"><i data-lucide="calendar-days"></i><small>Calendar</small></button><button class="nav members-nav" data-r="members"><i data-lucide="users-round"></i><small>Members</small></button><button class="nav" data-r="profile"><i data-lucide="user-round"></i><small>Profile</small></button></nav></div>`;document.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>go(b.dataset.r));icons();window.FB_SETTINGS?.bindMenu?.();document.querySelector("#topNotificationButton")?.addEventListener("click",()=>go("notifications"));window.FB_NOTIFICATIONS?.refreshBadge?.();go("home")}
function go(r){let navRoute=(r==="albums"||r==="new-album"||r.startsWith("album:")||r.startsWith("edit-album:"))?"memories":(r==="add-history"||r.startsWith("edit-history:"))?"tree":r;document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.r===navRoute));$("#screen").innerHTML=r==="home"?home():r==="memories"?FB_MEMORIES.pageShell():r==="albums"?FB_ALBUMS.pageShell():r==="new-album"?FB_ALBUMS.editorShell():r.startsWith("edit-album:")?FB_ALBUMS.editorShell(r.split(":")[1]):r.startsWith("album:")?FB_ALBUMS.detailShell(r.split(":")[1]):r==="calendar"?FB_CALENDAR.pageShell():r==="add-event"?FB_CALENDAR.editorShell():r.startsWith("edit-event:")?FB_CALENDAR.editorShell(r.split(":")[1]):r.startsWith("view-event:")?FB_CALENDAR.detailShell(r.split(":")[1]):r==="add-memory"?FB_MEMORIES.editorShell():r.startsWith("view-memory:")?FB_MEMORIES.detailShell(r.split(":")[1]):r.startsWith("edit-memory:")?FB_MEMORIES.editorShell(r.split(":")[1]):r==="members"?members():r==="add-member"?addMember():r.startsWith("edit-member:")?editMember(r.split(":")[1]):r==="add-history"?historyForm():r.startsWith("edit-history:")?historyForm(r.split(":")[1]):r.startsWith("family-unit:")?familyUnitView(r.split(":")[1]):r.startsWith("view-member:")?viewMember(r.split(":")[1]):r.startsWith("member-wall:")?memberWallPage(r.split(":")[1]):r==="tree-full"?fullFamilyTree():r==="tree"?familyTree():r==="story-cover"?storyCoverPage():r==="story-slideshow"?storySlideshowPage():r==="notifications"?FB_NOTIFICATIONS.pageShell():r==="family-access"?FB_INVITES.pageShell():r==="settings"?FB_SETTINGS.pageShell():r==="profile"?profilePage():page(r);document.querySelectorAll("#screen [data-r]").forEach(b=>b.onclick=()=>go(b.dataset.r));
 document.querySelectorAll("[data-edit-member]").forEach(b=>b.onclick=()=>go("edit-member:"+b.dataset.editMember));
 if(r.startsWith("edit-member:")){
  let f=$("#editMemberForm"),rows=$("#relationshipRows"),add=$("#addRelationship"),id=r.split(":")[1],current=ensureOwner().find(x=>x.id===id),mode=f?.dataset.editMode||"none";
  let bindRemove=()=>document.querySelectorAll(".remove-rel").forEach(b=>{b.style.visibility="visible";b.onclick=()=>{b.closest("[data-rel-row]").remove();refreshIcons()}});
  if(add)add.onclick=()=>{rows.insertAdjacentHTML("beforeend",relationshipRow(Date.now(),ensureOwner().filter(x=>x.id!==id)));bindRemove();refreshIcons()};
  bindRemove();if(mode==="full")bindMemberPhotoPicker(current?.photo||"");
  if(f)f.onsubmit=e=>{e.preventDefault();clearFamilySafetyMessage(f);let list=ensureOwner(),idx=list.findIndex(x=>x.id===id);if(idx<0)return;
   const allowed=memberEditMode(list[idx]);if(allowed==="none"){showFamilySafetyMessage(f,"You no longer have permission to edit this profile.");return}
   const name=`${$("#mfFirst").value.trim()} ${$("#mfLast").value.trim()}`.trim(),birthday=$("#mfBirthday").value,plan=relationshipPlanRows(f);
   const guard=validateRelationshipPlan(id,plan,true);
   if(!guard.ok){showFamilySafetyMessage(f,guard.message);return}
   if(!confirmDuplicatePerson(name,birthday,id))return;
   if(allowed==="structure"){
     list[idx]={...list[idx],name,birthday};
   }else{
     let photo=$("#mfPhotoData")?.value||"";
     list[idx]={...list[idx],name,birthday,email:$("#mfEmail").value.trim(),phone:$("#mfPhone").value.trim(),photo,managedProfile:$("#mfManaged")?!!$("#mfManaged").checked:!!list[idx].managedProfile};
     if(id===currentMemberId()){
       const oldEmail=(FB_AUTH.get()||{}).email||"";
       const newEmail=$("#mfEmail").value.trim();
       FB_AUTH.update({photo,name,email:newEmail});
       window.FB_INVITES?.syncCurrentAccount?.({name,email:newEmail,oldEmail});
     }
   }
   saveMembers(list);
   removeRelationshipsFor(id);
   plan.forEach(({type,to})=>addRelationship(id,type,to));
   go("members")}
 }if(r==="add-member"){
 let f=$("#memberForm"),rows=$("#relationshipRows"),add=$("#addRelationship");
 let bindRemove=()=>document.querySelectorAll(".remove-rel").forEach((b,i)=>{b.style.visibility=document.querySelectorAll("[data-rel-row]").length>1?"visible":"hidden";b.onclick=()=>{if(document.querySelectorAll("[data-rel-row]").length>1){b.closest("[data-rel-row]").remove();bindRemove();refreshIcons()}}});
 if(add)add.onclick=()=>{rows.insertAdjacentHTML("beforeend",relationshipRow(Date.now(),ensureOwner()));bindRemove();refreshIcons()};
 bindRemove();bindMemberPhotoPicker("");
 if(f)f.onsubmit=e=>{e.preventDefault();clearFamilySafetyMessage(f);let first=$("#mfFirst").value.trim(),last=$("#mfLast").value.trim(),photo=$("#mfPhotoData")?.value||"";
  let list=ensureOwner(),id=crypto.randomUUID(),name=`${first} ${last}`.trim(),birthday=$("#mfBirthday").value,plan=relationshipPlanRows(f);
  const guard=validateRelationshipPlan(id,plan,true);
  if(!guard.ok){showFamilySafetyMessage(f,guard.message);return}
  if(!confirmDuplicatePerson(name,birthday,""))return;
  let member={id,name,profileType:"member",relationship:"Family member",birthday,email:$("#mfEmail").value.trim(),phone:$("#mfPhone").value.trim(),photo,managedProfile:!!$("#mfManaged")?.checked};list.push(member);saveMembers(list);
  plan.forEach(({type,to})=>addRelationship(id,type,to));
  go("members")}
 }
 if(r==="add-history"||r.startsWith("edit-history:"))bindHistoryForm(r.startsWith("edit-history:")?r.split(":")[1]:"");
 if(r==="profile"){bindOwnProfilePhoto();window.FB_WALL?.bindProfile?.()}
 if(r.startsWith("view-member:")){
   const id=r.split(":")[1],member=ensureOwner().find(m=>m.id===id);
   if(member?.profileType==="history")bindHistoryProfile(member);
   else if(member)window.FB_WALL?.bindMemberActivity?.(member);
 }
 if(r.startsWith("member-wall:")){
   const id=r.split(":")[1],member=ensureOwner().find(m=>m.id===id);
   if(member)window.FB_WALL?.bindMemberWall?.(member);
 }
 if(r==="tree-full")bindFullTreeViewer();
 if(r==="story-cover")bindStoryCover();
 if(r==="story-slideshow")bindStorySlideshow();
 else stopStorySlideshow();
 if(r==="memories"||r==="add-memory"||r.startsWith("view-memory:")||r.startsWith("edit-memory:"))FB_MEMORIES.bindRoute(r);
 if(r==="albums"||r==="new-album"||r.startsWith("album:")||r.startsWith("edit-album:"))FB_ALBUMS.bindRoute(r);
 if(r==="calendar"||r==="add-event"||r.startsWith("edit-event:")||r.startsWith("view-event:"))FB_CALENDAR.bindRoute(r);
 if(r==="home"){window.FB_WALL?.bindHome?.();bindHomeMemories();window.FB_CALENDAR?.bindHomeUpcoming?.()}
 if(r==="settings")window.FB_SETTINGS?.bindPage?.()
 if(r==="notifications")window.FB_NOTIFICATIONS?.bindPage?.()
 if(r==="family-access")window.FB_INVITES?.bindPage?.()
 $("#logout")?.addEventListener("click",async()=>{await FB_AUTH.logout();auth()});icons();scrollTo(0,0)}
function home(){
let u=FB_AUTH.get()||{name:"Family"},n=esc(u.name.split(" ")[0]);
let demo=(u.email||"").toLowerCase()==="demo@familybook.local";
let hero=demo
? `<section class="home-hero demo-hero"><div><p class="eyebrow">${esc(familyLabel()).toUpperCase()}</p><h1>Good evening, ${n}.</h1><p>Here's what's happening with your family. Keep the people, memories and important moments together.</p><button class="primary" data-r="memories">Explore memories</button></div></section>`
: `<section class="home-hero empty-hero" id="homeHero"><div class="empty-hero-copy"><span class="empty-tree" id="homeHeroIcon"><i data-lucide="sprout"></i></span><p class="eyebrow">WELCOME TO FAMILY BOOK</p><h1 id="homeHeroTitle">Your family story starts here.</h1><p id="homeHeroText">Add your first photo or memory and begin building a private timeline your family can enjoy together.</p><button class="primary" id="homeHeroButton" data-r="memories">Add your first memory</button></div></section>`;

let memories=demo
? `<div class="memory-grid">${D.memories.map((x,i)=>`<div class="memory memory-photo-${i+1}"><div><strong>${x[0]}</strong><small>${x[1]}</small></div></div>`).join("")}</div>`
: `<div id="homeRecentMemories" class="empty-memory-grid">
    <button class="empty-memory" data-r="memories"><span><i data-lucide="image-plus"></i></span><strong>Add a photo</strong><small>Your first family memory</small></button>
    <div class="empty-memory art"><span><i data-lucide="git-fork"></i></span><strong>Albums will appear here</strong><small>Keep special moments together</small></div>
    <div class="empty-memory art"><span><i data-lucide="heart"></i></span><strong>Tag your family</strong><small>Connect memories to people</small></div>
   </div>`;

let upcoming=demo
? D.events.map(x=>`<div class="event"><div class="date">${x[0]}<small>${x[1]}</small></div><div><strong>${x[2]}</strong><small>${x[3]}</small></div></div>`).join("")
: (window.FB_CALENDAR?.homeUpcomingShell?.()||`<div class="empty-events"><span><i data-lucide="calendar-days"></i></span><strong>No family events yet</strong></div>`);

return `${hero}
<div class="section-head"><h2>Your family</h2><button class="link" data-r="members">View family</button></div>
<section class="quick">
<button class="qcard" data-r="memories"><span class="qicon"><i data-lucide="images"></i></span><strong>Memories</strong><small>Photos & albums</small></button>
<button class="qcard" data-r="tree"><span class="qicon"><i data-lucide="git-fork"></i></span><strong>Family Tree</strong><small>Our history</small></button>
<button class="qcard" data-r="calendar"><span class="qicon"><i data-lucide="calendar-days"></i></span><strong>Calendar</strong><small>Events & birthdays</small></button>
<button class="qcard" data-r="members"><span class="qicon"><i data-lucide="users-round"></i></span><strong>Family</strong><small>Profiles & members</small></button>
</section>
${window.FB_WALL?.homeShell?.()||""}
<div class="section-head"><h2 id="homeActivityTitle">${demo?"What's happening":"Start your Family Book"}</h2></div>
<section class="columns">
<div class="panel"><div class="section-head" style="margin-top:0"><h2>Recent memories</h2><span id="homeMemoriesLink">${demo?'<button class="link" data-r="memories">See all</button>':""}</span></div>${memories}</div>
<div class="panel"><div class="section-head" style="margin-top:0"><h2>Upcoming</h2><button class="link" data-r="calendar">Calendar</button></div><div class="events">${upcoming}</div></div>
</section>`;
}


let homeMemoryObjectUrls=[];
let storyObjectUrls=[];
let storySlideTimer=null;

function clearHomeMemoryUrls(){
 homeMemoryObjectUrls.forEach(u=>{try{URL.revokeObjectURL(u)}catch(_){}});homeMemoryObjectUrls=[];
}
function clearStoryUrls(){
 storyObjectUrls.forEach(u=>{try{URL.revokeObjectURL(u)}catch(_){}});storyObjectUrls=[];
}
function stopStorySlideshow(){
 if(storySlideTimer){clearInterval(storySlideTimer);storySlideTimer=null}
}
function homeMemoryPhoto(m){
 if(Array.isArray(m?.photos)&&m.photos.length){let p=m.photos.find(x=>x&&(x.thumb||x.image));if(p)return p.thumb||p.image}
 return m?.thumb||m?.image||null;
}
function homeMemoryKind(m){
 const p=Array.isArray(m?.photos)?m.photos.find(x=>x&&(x.thumb||x.image)):null;
 return p?.kind||(String(p?.meta?.type||"").startsWith("video/")?"video":"image");
}
function homeMemoryUrl(blob){
 if(!blob)return "";if(typeof blob==="string")return blob;
 try{let u=URL.createObjectURL(blob);homeMemoryObjectUrls.push(u);return u}catch(_){return ""}
}
function storyBlobUrl(blob){
 if(!blob)return "";if(typeof blob==="string")return blob;
 try{let u=URL.createObjectURL(blob);storyObjectUrls.push(u);return u}catch(_){return ""}
}
function homeMemoryDate(m){
 if(!m?.date)return "Family memory";
 try{return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${m.date}T12:00:00`))}catch(_){return m.date}
}
function getFamilyStory(){
 return window.FB_FAMILY_DATA?.getStory?.()||{};
}
async function saveFamilyStory(v){
 return window.FB_FAMILY_DATA?.saveStory?.(v);
}
function storyPhotoList(memories,{imagesOnly=false}={}){
 let rows=[];
 [...memories].reverse().forEach(m=>{
  let photos=window.FB_MEMORIES?.getPhotos?.(m)||[];
  photos.forEach((p,i)=>{if(!imagesOnly||p.kind!=="video")rows.push({memory:m,photo:p,index:i})});
 });
 return rows;
}

async function bindHomeMemories(){
 const mount=$("#homeRecentMemories");if(!mount||!window.FB_MEMORIES?.getAll)return;
 try{
  const list=await FB_MEMORIES.getAll();
  const current=$("#homeRecentMemories");if(!current)return;
  if(!list.length)return;

  clearHomeMemoryUrls();
  const latest=list.slice(0,3);
  current.className="home-recent-memory-grid";
  current.innerHTML=latest.map(m=>{
    const src=homeMemoryUrl(homeMemoryPhoto(m));
    const count=Array.isArray(m.photos)&&m.photos.length?m.photos.length:(m.image?1:0);
    return `<button class="home-recent-memory" data-home-memory="${esc(m.id)}">${src?`<img src="${src}" alt="${esc(m.caption||"Family memory")}">`:`<span class="home-memory-no-photo"><i data-lucide="image"></i></span>`}${homeMemoryKind(m)==="video"?`<span class="home-memory-play"><i data-lucide="play"></i></span>`:""}<span class="home-memory-shade"></span>${count>1?`<span class="home-memory-count"><i data-lucide="files"></i>${count}</span>`:""}<span class="home-memory-copy"><strong>${esc(m.caption||"Family memory")}</strong><small>${esc(homeMemoryDate(m))}</small></span></button>`;
  }).join("");
  current.querySelectorAll("[data-home-memory]").forEach(b=>b.onclick=()=>go(`view-memory:${b.dataset.homeMemory}`));

  const link=$("#homeMemoriesLink");
  if(link){
    link.innerHTML='<button class="link" type="button">See all</button>';
    link.querySelector("button").onclick=()=>go("memories");
  }
  const activity=$("#homeActivityTitle");
  if(activity)activity.textContent="Your Family Book";

  const hero=$("#homeHero");
  if(hero){
    const story=getFamilyStory();
    let coverRow=null;

    if(story.memoryId){
      const memory=list.find(m=>m.id===story.memoryId);
      const photos=memory?FB_MEMORIES.getPhotos(memory):[];
      const photo=photos[Number(story.photoIndex)||0];
      if(memory&&photo)coverRow={memory,photo};
    }

    clearStoryUrls();

    if(coverRow){
      const src=storyBlobUrl(coverRow.photo.image||coverRow.photo.thumb);
      const sx=Number(story.x),sy=Number(story.y);
      const x=Math.max(0,Math.min(100,Number.isFinite(sx)?sx:50));
      const y=Math.max(0,Math.min(100,Number.isFinite(sy)?sy:50));
      hero.className="home-hero story-cover-hero";
      hero.innerHTML=`${src?`<img class="story-cover-image" src="${src}" alt="Family story cover" style="object-position:${x}% ${y}%">`:""}<span class="story-cover-shade"></span><div class="story-hero-copy"><p class="eyebrow">${esc(familyLabel()).toUpperCase()}</p><h1>Our family story.</h1><p>${list.length} ${list.length===1?"memory":"memories"} saved so far. Relive the moments together.</p><div class="story-hero-actions"><button class="primary story-play" type="button"><i data-lucide="play"></i>Play memories</button><button class="story-glass-button story-change-cover" type="button"><i data-lucide="image"></i>Change cover</button></div></div>`;
      hero.querySelector(".story-play").onclick=()=>go("story-slideshow");
      hero.querySelector(".story-change-cover").onclick=()=>go("story-cover");
    }else{
      hero.className="home-hero empty-hero story-ready-hero";
      hero.innerHTML=`<div class="empty-hero-copy"><span class="empty-tree"><i data-lucide="images"></i></span><p class="eyebrow">${esc(familyLabel()).toUpperCase()}</p><h1>Your family story has begun.</h1><p>${list.length} ${list.length===1?"memory":"memories"} saved. Choose one of your photos as the Family Book cover, or play your memories as a slideshow.</p><div class="story-hero-actions"><button class="primary story-create-cover" type="button"><i data-lucide="image-plus"></i>Create family cover</button><button class="secondary story-play" type="button"><i data-lucide="play"></i>Play memories</button></div></div>`;
      hero.querySelector(".story-create-cover").onclick=()=>go("story-cover");
      hero.querySelector(".story-play").onclick=()=>go("story-slideshow");
    }
  }
  icons();
 }catch(err){console.warn("Could not load recent memories on Home:",err)}
}

function storyCoverPage(){
 return `<section class="story-cover-page"><button class="back-link" data-r="home"><i data-lucide="arrow-left"></i>Back to Home</button><div class="story-page-head"><p class="eyebrow">${esc(familyLabel()).toUpperCase()}</p><h1>Create Family Cover</h1><p>Choose a photo already saved in Memories, then position it inside the wide Family Book cover.</p></div><div id="storyCoverMount" class="story-loading"><span class="memory-spinner"></span><p>Opening your family photos…</p></div></section>`;
}

async function bindStoryCover(){
 const mount=$("#storyCoverMount");if(!mount||!FB_MEMORIES?.getAll)return;
 clearStoryUrls();
 try{
  const memories=await FB_MEMORIES.getAll(),rows=storyPhotoList(memories,{imagesOnly:true});
  if(!rows.length){
    mount.className="story-empty";
    mount.innerHTML=`<i data-lucide="images"></i><h2>No photos yet</h2><p>Add a Memory first, then you can choose a Family Cover.</p><button class="primary" data-r="add-memory">Add memory</button>`;
    mount.querySelector("[data-r]")?.addEventListener("click",()=>go("add-memory"));
    icons();return;
  }

  const saved=getFamilyStory();
  let selected=rows.findIndex(r=>r.memory.id===saved.memoryId&&r.index===(Number(saved.photoIndex)||0));
  if(selected<0)selected=0;

  let x=Number.isFinite(Number(saved.x))?Number(saved.x):50;
  let y=Number.isFinite(Number(saved.y))?Number(saved.y):50;
  const urls=rows.map(r=>storyBlobUrl(r.photo.thumb||r.photo.image));
  const fullUrls=rows.map(r=>storyBlobUrl(r.photo.image||r.photo.thumb));

  mount.className="story-cover-builder";
  mount.innerHTML=`<div class="story-cover-editor"><div class="story-cover-preview"><img id="storyCoverPreview" alt="Family cover preview"><span class="story-cover-preview-shade"></span><div><small>${esc(familyLabel())}</small><strong>Our family story.</strong></div></div><div class="story-position-controls"><label>Move left / right<input id="storyPosX" type="range" min="0" max="100" value="${x}"></label><label>Move up / down<input id="storyPosY" type="range" min="0" max="100" value="${y}"></label></div><div class="story-cover-actions"><button class="secondary" type="button" id="storyCoverReset"><i data-lucide="rotate-ccw"></i>Center</button><button class="primary" type="button" id="storyCoverSave"><i data-lucide="check"></i>Save cover</button></div></div><div><div class="story-photo-grid">${rows.map((r,i)=>`<button type="button" class="story-photo-choice ${i===selected?"active":""}" data-story-photo="${i}"><img src="${urls[i]}" alt="${esc(r.memory.caption||`Family photo ${i+1}`)}">${r.memory.caption?`<span>${esc(r.memory.caption)}</span>`:""}</button>`).join("")}</div></div>`;

  const preview=$("#storyCoverPreview"),rx=$("#storyPosX"),ry=$("#storyPosY");
  function render(){
    preview.src=fullUrls[selected];
    preview.style.objectPosition=`${x}% ${y}%`;
    rx.value=x;ry.value=y;
    mount.querySelectorAll("[data-story-photo]").forEach(b=>b.classList.toggle("active",Number(b.dataset.storyPhoto)===selected));
  }
  mount.querySelectorAll("[data-story-photo]").forEach(b=>b.onclick=()=>{selected=Number(b.dataset.storyPhoto)||0;render()});
  rx.oninput=()=>{x=Number(rx.value);render()};
  ry.oninput=()=>{y=Number(ry.value);render()};
  $("#storyCoverReset").onclick=()=>{x=50;y=50;render()};
  $("#storyCoverSave").onclick=async()=>{
    const row=rows[selected],btn=$("#storyCoverSave");
    btn.disabled=true;
    try{
      await saveFamilyStory({memoryId:row.memory.id,photoIndex:row.index,x,y});
      go("home");
    }catch(err){
      alert(err.message||"Could not save the Family Story cover.");
      btn.disabled=false;
    }
  };
  render();icons();
 }catch(err){
  mount.className="story-empty";
  mount.innerHTML=`<i data-lucide="circle-alert"></i><h2>Could not open your photos</h2><p>${esc(err.message||"Something went wrong.")}</p>`;
  icons();
 }
}

function storySlideshowPage(){
 return `<section class="story-slideshow" id="storySlideshow"><div class="story-slide-top"><button class="story-slide-close" type="button" data-r="home"><i data-lucide="x"></i><span>Close</span></button><div><small>${esc(familyLabel())}</small><strong>Family Memories</strong></div><span id="storySlideCounter"></span></div><div id="storySlideStage" class="story-slide-stage"><span class="memory-spinner"></span></div><div class="story-slide-bottom"><div id="storySlideCaption"></div><div class="story-slide-controls"><button type="button" id="storyPrev" aria-label="Previous photo"><i data-lucide="chevron-left"></i></button><button type="button" class="story-slide-play" id="storyPlayPause" aria-label="Pause slideshow"><i data-lucide="pause"></i></button><button type="button" id="storyNext" aria-label="Next photo"><i data-lucide="chevron-right"></i></button></div></div></section>`;
}

async function bindStorySlideshow(){
 const stage=$("#storySlideStage");if(!stage||!FB_MEMORIES?.getAll)return;
 clearStoryUrls();stopStorySlideshow();
 try{
  const list=await FB_MEMORIES.getAll(),rows=storyPhotoList(list);
  if(!rows.length){
    stage.innerHTML=`<div class="story-slide-empty"><i data-lucide="images"></i><h2>No memories yet</h2><button class="primary" data-r="add-memory">Add memory</button></div>`;
    stage.querySelector("[data-r]")?.addEventListener("click",()=>go("add-memory"));
    icons();return;
  }

  const urls=rows.map(r=>storyBlobUrl(r.photo.image||r.photo.thumb)),posters=rows.map(r=>storyBlobUrl(r.photo.thumb||r.photo.image));
  let index=0,playing=true;
  const counter=$("#storySlideCounter"),caption=$("#storySlideCaption"),play=$("#storyPlayPause");

  function render(){
    const row=rows[index],isVideo=row.photo.kind==="video";
    stopStorySlideshow();
    stage.innerHTML=isVideo
      ? `<video class="story-slide-video" src="${urls[index]}" poster="${posters[index]}" controls playsinline ${playing?"autoplay":""}></video>`
      : `<img class="story-slide-image" src="${urls[index]}" alt="${esc(row.memory.caption||"Family memory")}">`;
    counter.textContent=`${index+1} / ${rows.length}`;
    caption.innerHTML=`<strong>${esc(row.memory.caption||"Family memory")}</strong><small>${esc(homeMemoryDate(row.memory))}${isVideo?" · Video":""}</small>`;
    play.innerHTML=`<i data-lucide="${playing?"pause":"play"}"></i>`;
    play.setAttribute("aria-label",playing?"Pause slideshow":"Play slideshow");
    const video=stage.querySelector("video");
    if(video){
      video.onended=()=>{if(playing){move(1);start()}};
      if(playing)video.play().catch(()=>{});
    }
    icons();
  }
  function move(delta){stage.querySelector("video")?.pause();index=(index+delta+rows.length)%rows.length;render()}
  function start(){
    stopStorySlideshow();
    if(playing&&rows[index]?.photo?.kind!=="video")storySlideTimer=setInterval(()=>move(1),4200);
  }

  $("#storyPrev").onclick=()=>{move(-1);start()};
  $("#storyNext").onclick=()=>{move(1);start()};
  play.onclick=()=>{
    playing=!playing;
    const video=stage.querySelector("video");
    if(video){playing?video.play().catch(()=>{}):video.pause();play.innerHTML=`<i data-lucide="${playing?"pause":"play"}"></i>`;icons()}
    else{render();start()}
  };

  render();start();
 }catch(err){
  stage.innerHTML=`<div class="story-slide-empty"><i data-lucide="circle-alert"></i><h2>Could not play memories</h2><p>${esc(err.message||"Something went wrong.")}</p></div>`;
  icons();
 }
}

function getMembers(){return window.FB_FAMILY_DATA?.getPeople?.()||[]}
function saveMembers(v){window.FB_FAMILY_DATA?.syncMembers?.(v)}
function getRelationships(){return window.FB_FAMILY_DATA?.getRelationships?.()||[]}
function saveRelationships(v){window.FB_FAMILY_DATA?.syncRelationships?.(v)}
function memberInitials(name){let p=(name||"Family Member").trim().split(/\s+/).filter(Boolean);return esc(((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase())}
function memberPhotoPickerHtml(photo="",name="Family member"){
 let image=photo?`<img src="${photo}" alt="${esc(name)}">`:`<i data-lucide="user-round"></i>`;
 return `<button type="button" class="member-photo-picker" id="memberPhotoPicker" aria-label="Add or change profile photo"><span class="member-photo-frame">${image}</span><span class="photo-camera-badge"><i data-lucide="camera"></i></span><small>${photo?"Change photo":"Tap to add photo"}</small></button><input id="mfPhotoData" type="hidden">`;
}
function updateMemberPhotoPicker(photo){
 let b=$("#memberPhotoPicker"),h=$("#mfPhotoData");if(!b||!h)return;h.value=photo||"";
 let frame=b.querySelector(".member-photo-frame"),small=b.querySelector("small");
 frame.innerHTML=photo?`<img src="${photo}" alt="Profile photo">`:`<i data-lucide="user-round"></i>`;small.textContent=photo?"Change photo":"Tap to add photo";icons();
}
function bindMemberPhotoPicker(startPhoto=""){
 let b=$("#memberPhotoPicker"),h=$("#mfPhotoData");if(!b||!h)return;h.value=startPhoto||"";
 b.onclick=()=>openPhotoMenu(h.value,photo=>updateMemberPhotoPicker(photo));
}
function choosePhotoFile(mode,onFile){
 let input=document.createElement("input");input.type="file";input.accept="image/*";if(mode==="camera")input.setAttribute("capture","environment");
 input.onchange=()=>{let file=input.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){alert("Please choose an image.");return}let r=new FileReader();r.onload=()=>openImageCropper(r.result,onFile);r.readAsDataURL(file)};
 input.click();
}
function openPhotoMenu(currentPhoto,onDone){
 document.querySelector(".photo-action-backdrop")?.remove();
 let d=document.createElement("div");d.className="photo-action-backdrop";
 d.innerHTML=`<div class="photo-action-sheet" role="dialog" aria-modal="true"><div class="photo-sheet-handle"></div><h3>Profile photo</h3><button data-photo-action="camera"><i data-lucide="camera"></i><span>Take photo</span></button><button data-photo-action="gallery"><i data-lucide="image"></i><span>Choose from gallery</span></button>${currentPhoto?`<button data-photo-action="crop"><i data-lucide="crop"></i><span>Re-crop photo</span></button><button class="photo-remove" data-photo-action="remove"><i data-lucide="trash-2"></i><span>Remove photo</span></button>`:""}<button class="photo-cancel" data-photo-action="cancel">Cancel</button></div>`;
 document.body.appendChild(d);icons();
 let close=()=>d.remove();
 d.addEventListener("click",e=>{if(e.target===d)close()});
 d.querySelectorAll("[data-photo-action]").forEach(b=>b.onclick=()=>{let a=b.dataset.photoAction;if(a==="cancel"){close();return}if(a==="remove"){close();onDone("");return}if(a==="crop"){close();openImageCropper(currentPhoto,onDone);return}if(a==="camera"||a==="gallery"){close();choosePhotoFile(a,onDone)}});
}
function openImageCropper(src,onDone){
 document.querySelector(".cropper-backdrop")?.remove();
 let d=document.createElement("div");d.className="cropper-backdrop";
 d.innerHTML=`<div class="cropper-card" role="dialog" aria-modal="true"><div class="cropper-head"><button type="button" class="crop-cancel"><i data-lucide="x"></i></button><div><h3>Crop profile photo</h3><p>Move and zoom the photo inside the frame.</p></div><button type="button" class="crop-save">Save</button></div><div class="crop-canvas-wrap"><canvas id="profileCropCanvas" width="512" height="512"></canvas><div class="crop-ring"></div></div><div class="crop-zoom"><i data-lucide="minus"></i><input id="cropZoom" type="range" min="1" max="3" value="1" step="0.01" aria-label="Zoom"><i data-lucide="plus"></i></div></div>`;
 document.body.appendChild(d);icons();
 let canvas=d.querySelector("canvas"),ctx=canvas.getContext("2d"),range=d.querySelector("#cropZoom"),img=new Image(),zoom=1,ox=0,oy=0,base=1,drag=false,lastX=0,lastY=0;
 const S=512;
 function bounds(){let w=img.naturalWidth*base*zoom,h=img.naturalHeight*base*zoom;return {w,h,mx:Math.max(0,(w-S)/2),my:Math.max(0,(h-S)/2)}}
 function clamp(){let b=bounds();ox=Math.max(-b.mx,Math.min(b.mx,ox));oy=Math.max(-b.my,Math.min(b.my,oy))}
 function draw(){if(!img.naturalWidth)return;clamp();let b=bounds();ctx.clearRect(0,0,S,S);ctx.fillStyle="#eee7dc";ctx.fillRect(0,0,S,S);ctx.drawImage(img,(S-b.w)/2+ox,(S-b.h)/2+oy,b.w,b.h)}
 img.onload=()=>{base=Math.max(S/img.naturalWidth,S/img.naturalHeight);draw()};img.src=src;
 range.oninput=()=>{zoom=Number(range.value);draw()};
 canvas.addEventListener("pointerdown",e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener("pointermove",e=>{if(!drag)return;let k=S/canvas.getBoundingClientRect().width;ox+=(e.clientX-lastX)*k;oy+=(e.clientY-lastY)*k;lastX=e.clientX;lastY=e.clientY;draw()});
 canvas.addEventListener("pointerup",()=>drag=false);canvas.addEventListener("pointercancel",()=>drag=false);
 d.querySelector(".crop-cancel").onclick=()=>d.remove();
 d.querySelector(".crop-save").onclick=()=>{draw();let data=canvas.toDataURL("image/jpeg",.88);d.remove();onDone(data)};
}
function memberPrivacy(memberId){return window.FB_SETTINGS?.getForMember?.(memberId)?.privacy||{}}
function canSeeMemberField(memberId,field){return window.FB_SETTINGS?.canSee?.(memberId,field)??true}
function memberBirthdayText(m){
 if(!m?.birthday)return "";
 const parts=String(m.birthday).split("-").map(Number),date=new Date(parts[0],(parts[1]||1)-1,parts[2]||1);
 const localPrivacy=window.FB_SETTINGS?.canSeeBirthdayYear?.(m.id)??true;
 const showYear=m.birthdayYearVisible===false?false:localPrivacy;
 try{return new Intl.DateTimeFormat(undefined,showYear?{day:"numeric",month:"long",year:"numeric"}:{day:"numeric",month:"long"}).format(date)}catch(_){return showYear?m.birthday:String(m.birthday).slice(5)}
}
function normalizePhone(phone){
 let original=String(phone||"").trim(),digits=original.replace(/\D/g,"");if(!digits)return null;
 if(digits.startsWith("00"))digits=digits.slice(2);if(digits.startsWith("0"))digits="27"+digits.slice(1);
 let tel=original.startsWith("+")?`+${digits}`:(digits.startsWith("27")?`+${digits}`:original.replace(/[^\d+]/g,""));
 return {tel,wa:digits};
}
function memberContactActions(m,compact=false){
 if(!canSeeMemberField(m.id,"phoneVisibility"))return "";
 let p=normalizePhone(m.phone);if(!p)return "";
 return `<div class="member-contact-actions ${compact?"compact":""}"><a href="tel:${p.tel}" aria-label="Call ${esc(m.name)}"><i data-lucide="phone"></i><span>Call</span></a><a href="https://wa.me/${p.wa}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(m.name)}"><i data-lucide="message-circle"></i><span>WhatsApp</span></a></div>`;
}
function ensureOwner(){
 let list=getMembers(),u=FB_AUTH.get()||{},id=u.memberId||"owner";
 if(!list.length&&u.name){list.push({id,name:u.name,relationship:"You",birthday:"",email:u.email||"",phone:"",photo:u.photo||"",profileType:"member",accountId:u.supabaseUserId||u.email||""});saveMembers(list)}
 return list
}
function isHistoryPerson(m){return !!m&&m.profileType==="history"}
function activeMembers(){return ensureOwner().filter(m=>!isHistoryPerson(m))}
function familyPersons(){return ensureOwner()}
function personLifeYears(m){
 const born=String(m?.birthday||"").slice(0,4),passed=String(m?.passedDate||"").slice(0,4);
 if(born&&passed)return `${born} – ${passed}`;
 if(born)return `Born ${born}`;
 if(passed)return `Passed ${passed}`;
 return m?.inMemory?"In memory":"Family history";
}
function formatFamilyDate(v){
 if(!v)return "";
 const parts=String(v).split("-").map(Number),d=new Date(parts[0],(parts[1]||1)-1,parts[2]||1);
 try{return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"long",year:"numeric"}).format(d)}catch(_){return v}
}
const REL={
 parent_of:{label:"Parent of",reverse:"child_of"},
 child_of:{label:"Child of",reverse:"parent_of"},
 spouse_of:{label:"Spouse / Partner of",reverse:"spouse_of"},
 sibling_of:{label:"Sibling of",reverse:"sibling_of"},
 grandparent_of:{label:"Grandparent of",reverse:"grandchild_of"},
 grandchild_of:{label:"Grandchild of",reverse:"grandparent_of"}
};


function normalizePersonName(v){
 return String(v||"").trim().toLowerCase().replace(/\s+/g," ");
}
function possibleDuplicatePerson(name,birthday="",excludeId=""){
 const wanted=normalizePersonName(name),date=String(birthday||"");
 if(!wanted)return null;
 const same=ensureOwner().filter(m=>m.id!==excludeId&&normalizePersonName(m.name)===wanted);
 const exact=same.find(m=>date&&String(m.birthday||"")===date);
 if(exact)return {kind:"exact",person:exact};
 const uncertain=same.find(m=>!date||!m.birthday);
 return uncertain?{kind:"name",person:uncertain}:null;
}
function confirmDuplicatePerson(name,birthday="",excludeId=""){
 const hit=possibleDuplicatePerson(name,birthday,excludeId);
 if(!hit)return true;
 const when=hit.person.birthday?` (${hit.person.birthday})`:"";
 const msg=hit.kind==="exact"
   ? `Possible duplicate profile:\n\n${hit.person.name}${when} already exists with the same birth date.\n\nSave another profile anyway?`
   : `A profile named ${hit.person.name}${when} already exists.\n\nSave another person with the same name anyway?`;
 return confirm(msg);
}
function ancestryEdge(from,type,to){
 if(type==="parent_of"||type==="grandparent_of")return [from,to];
 if(type==="child_of"||type==="grandchild_of")return [to,from];
 return null;
}
function ancestryGraphFromRelationships(rs){
 const graph={};
 const add=(a,b)=>{if(!a||!b||a===b)return;(graph[a]??=new Set()).add(b)};
 (rs||[]).forEach(r=>{const edge=ancestryEdge(r.from,r.type,r.to);if(edge)add(edge[0],edge[1])});
 return graph;
}
function graphHasPath(graph,start,target,seen=new Set()){
 if(start===target)return true;
 if(seen.has(start))return false;
 seen.add(start);
 for(const next of graph[start]||[]){
   if(next===target||graphHasPath(graph,next,target,seen))return true;
 }
 return false;
}
function relationshipPlanRows(scope=document){
 return [...scope.querySelectorAll("[data-rel-row]")].map(row=>({
   type:row.querySelector(".mfRelType")?.value||"",
   to:row.querySelector(".mfRelPerson")?.value||""
 })).filter(r=>r.type&&r.to);
}
function validateRelationshipPlan(personId,plan,replaceExisting=true){
 const people=Object.fromEntries(ensureOwner().map(m=>[m.id,m]));
 let base=migrateRelationships();
 if(replaceExisting)base=base.filter(r=>r.from!==personId&&r.to!==personId);

 const pairSeen=new Set(),graph=ancestryGraphFromRelationships(base);
 for(const row of plan){
   if(!REL[row.type])return {ok:false,message:"Please choose a valid relationship."};
   if(!row.to||row.to===personId)return {ok:false,message:"A person cannot be related to themselves."};

   const pairKey=`${row.type}|${row.to}`;
   if(pairSeen.has(pairKey))return {ok:false,message:`That ${relLabel(row.type).toLowerCase()} relationship has been added twice.`};
   pairSeen.add(pairKey);

   const edge=ancestryEdge(personId,row.type,row.to);
   if(!edge)continue;
   const [ancestor,descendant]=edge;

   // If descendant already leads back to ancestor, adding this edge closes a loop.
   if(graphHasPath(graph,descendant,ancestor)){
     const a=people[ancestor]?.name||"this person";
     const d=people[descendant]?.name||"this person";
     return {
       ok:false,
       message:`This would create a family-tree loop: ${a} would become both an ancestor and descendant of ${d}. Check the Parent / Child / Grandparent relationship.`
     };
   }
   (graph[ancestor]??=new Set()).add(descendant);
 }
 return {ok:true};
}
function validateRelationshipAddition(a,type,b,rs){
 const edge=ancestryEdge(a,type,b);
 if(!edge)return {ok:true};
 const graph=ancestryGraphFromRelationships(rs||migrateRelationships());
 if(graphHasPath(graph,edge[1],edge[0])){
   return {ok:false,message:"Blocked because this relationship would create an ancestry loop."};
 }
 return {ok:true};
}
function clearFamilySafetyMessage(form){
 form?.querySelector(".family-safety-message")?.remove();
}
function showFamilySafetyMessage(form,message,kind="error"){
 if(!form)return;
 clearFamilySafetyMessage(form);
 const box=document.createElement("div");
 box.className=`family-safety-message ${kind}`;
 box.innerHTML=`<i data-lucide="${kind==="warning"?"triangle-alert":"shield-alert"}"></i><div><strong>${kind==="warning"?"Check this profile":"Relationship blocked"}</strong><span>${esc(message)}</span></div>`;
 const rel=form.querySelector(".relationship-section");
 (rel||form).insertAdjacentElement("beforebegin",box);
 icons();
 box.scrollIntoView({behavior:"smooth",block:"center"});
}

const LEGACY_REL_MAP={
 father_of:"parent_of",mother_of:"parent_of",son_of:"child_of",daughter_of:"child_of",
 husband_of:"spouse_of",wife_of:"spouse_of",partner_of:"spouse_of",
 brother_of:"sibling_of",sister_of:"sibling_of",
 grandfather_of:"grandparent_of",grandmother_of:"grandparent_of",
 grandson_of:"grandchild_of",granddaughter_of:"grandchild_of"
};
function migrateRelationships(){
 let rs=getRelationships(),changed=false;
 rs=rs.map(r=>{let t=LEGACY_REL_MAP[r.type]||r.type;if(t!==r.type)changed=true;return {...r,type:t}});
 // remove obsolete/invalid relationship records and exact duplicates
 rs=rs.filter(r=>REL[r.type]&&r.from&&r.to&&r.from!==r.to);
 let seen=new Set();rs=rs.filter(r=>{let k=`${r.from}|${r.type}|${r.to}`;if(seen.has(k)){changed=true;return false}seen.add(k);return true});
 if(changed)saveRelationships(rs);
 return rs
}

function relLabel(k){return REL[k]?.label||k.replaceAll("_"," ")}
function addRelationship(a,type,b){
 if(!a||!b||a===b||!REL[type])return false;
 let rs=migrateRelationships(),guard=validateRelationshipAddition(a,type,b,rs);
 if(!guard.ok){console.warn("Family Book relationship blocked:",guard.message);return false}
 let key=`${a}|${type}|${b}`;
 if(!rs.some(x=>`${x.from}|${x.type}|${x.to}`===key))rs.push({id:"r"+Date.now()+Math.random(),from:a,type,to:b});
 let rev=REL[type].reverse,rkey=`${b}|${rev}|${a}`;
 if(!rs.some(x=>`${x.from}|${x.type}|${x.to}`===rkey))rs.push({id:"r"+Date.now()+Math.random(),from:b,type:rev,to:a});
 saveRelationships(rs);return true
}

/* Relationship Engine v2
   Core stored facts remain explicit. Sibling/grandparent facts below are
   calculated from explicit parent-child links and are NOT written back as
   additional manual records. Spouse/partner never creates parenthood. */
function derivedRelationships(){
 const members=getMembers(), byId=Object.fromEntries(members.map(m=>[m.id,m]));
 const stored=migrateRelationships();
 const parentEdges=stored.filter(r=>r.type==="parent_of"&&byId[r.from]&&byId[r.to]);
 const parentsOf={};
 parentEdges.forEach(r=>(parentsOf[r.to]??=[]).push(r.from));
 const out=[], seen=new Set();
 const add=(from,type,to,reason)=>{
   if(!from||!to||from===to||!byId[from]||!byId[to])return;
   const key=`${from}|${type}|${to}`;
   if(seen.has(key))return;
   seen.add(key);out.push({id:`derived:${key}`,from,type,to,derived:true,reason});
 };

 // Shared explicit parent => siblings.
 Object.entries(parentsOf).forEach(([child,parents])=>{
   parents.forEach(parent=>{
     const siblings=parentEdges.filter(r=>r.from===parent).map(r=>r.to).filter(x=>x!==child);
     siblings.forEach(sib=>add(child,"sibling_of",sib,"Shared parent"));
   });
 });

 // Parent of a parent => grandparent / grandchild.
 parentEdges.forEach(gp=>{
   parentEdges.filter(pc=>pc.from===gp.to).forEach(pc=>{
     add(gp.from,"grandparent_of",pc.to,"Parent of parent");
     add(pc.to,"grandchild_of",gp.from,"Child of child");
   });
 });
 return out;
}
function effectiveRelationships(){
 const stored=migrateRelationships(), derived=derivedRelationships(), seen=new Set(), out=[];
 [...stored,...derived].forEach(r=>{
   const key=`${r.from}|${r.type}|${r.to}`;
   if(seen.has(key))return;
   seen.add(key);out.push(r);
 });
 return out;
}

function relationshipsFor(id){
 let ms=ensureOwner(),map=Object.fromEntries(ms.map(m=>[m.id,m]));
 return effectiveRelationships().filter(r=>r.from===id).map(r=>({
   label:relLabel(r.type),
   person:map[r.to]?.name||"Family member",
   derived:!!r.derived
 }));
}
function members(){
 let list=activeMembers(),family=esc(familyLabel());
 let cards=list.map(m=>{
 const mode=memberEditMode(m),remove=canRemoveMember(m);
 return `<article class="member-card ${m.phone&&canSeeMemberField(m.id,"phoneVisibility")?"has-contact":""}"><button class="member-card-view" data-view-member="${esc(m.id)}" aria-label="View ${esc(m.name)}"><div class="member-avatar">${m.photo?`<img src="${m.photo}" alt="">`:`<span>${memberInitials(m.name)}</span>`}</div><div class="member-info"><h3>${esc(m.name)}</h3>${m.birthday?`<small><i data-lucide="cake-slice"></i>${esc(memberBirthdayText(m))}</small>`:""}${m.accountId?`<small class="member-linked-account"><i data-lucide="badge-check"></i>Account linked</small>`:""}${m.managedProfile?`<small class="member-managed-profile"><i data-lucide="shield-user"></i>Managed profile</small>`:""}</div></button>${memberContactActions(m,true)}<div class="member-actions"><button class="member-more member-menu-btn" data-member-menu="${esc(m.id)}" aria-label="Options for ${esc(m.name)}"><i data-lucide="ellipsis-vertical"></i></button><div class="member-menu" data-member-menu-panel="${esc(m.id)}"><button data-view-member="${esc(m.id)}"><i data-lucide="eye"></i>View member</button>${mode!=="none"?`<button data-edit-member="${esc(m.id)}"><i data-lucide="pencil"></i>${mode==="structure"?"Edit family details":"Edit member"}</button>`:""}${remove?`<button class="danger" data-remove-member="${esc(m.id)}"><i data-lucide="trash-2"></i>Remove member</button>`:""}</div></div></article>`}).join("");
 return `<section class="members-page"><div class="members-head"><div><p class="eyebrow">${family.toUpperCase()}</p><h1>Family Members</h1><p>Members are current family profiles with contact or account features. Each adult controls their own personal details.</p></div>${isFamilyAdmin()?`<button class="primary member-add" data-r="add-member"><i data-lucide="user-plus"></i>Add member</button>`:""}</div>${cards?`<div class="members-grid">${cards}</div>`:`<div class="members-empty"><div class="empty-icon"><i data-lucide="users-round"></i></div><h2>No members yet</h2><p>Add a current family member here, or add older generations from the Family Tree.</p></div>`}</section>`;
}
function relationshipRow(i,members,selectedType="",selectedPerson=""){
 let opts=members.map(m=>`<option value="${esc(m.id)}" ${m.id===selectedPerson?"selected":""}>${esc(m.name)}</option>`).join("");
 let ropts=Object.entries(REL).map(([k,v])=>`<option value="${k}" ${k===selectedType?"selected":""}>${v.label}</option>`).join("");
 return `<div class="relationship-row" data-rel-row><label class="relationship-field"><span>Relationship</span><select class="mfRelType"><option value="">Select relationship</option>${ropts}</select></label><label class="relationship-field"><span>Connected to</span><select class="mfRelPerson"><option value="">Select family person</option>${opts}</select></label><button type="button" class="remove-rel" aria-label="Remove relationship"><i data-lucide="x"></i></button></div>`;
}
function addMember(){
 if(!isFamilyAdmin())return permissionDeniedPage("Only a Family Admin can add another Member profile.");
 let family=esc(familyLabel()),members=ensureOwner();
 return `<section class="member-form-page"><button class="back-link" data-r="members"><i data-lucide="arrow-left"></i>Back to members</button><div class="member-form-card"><div class="form-title">${memberPhotoPickerHtml("","New family member")}<div><p class="eyebrow">${family.toUpperCase()}</p><h1>Add Family Member</h1><p>Create their profile and connect them to people already in your family.</p></div></div><form id="memberForm"><div class="field-row"><label>First name<input id="mfFirst" required placeholder="First name"></label><label>Surname<input id="mfLast" required placeholder="Surname"></label></div><div class="field-row"><label>Birthday<input id="mfBirthday" type="date"></label><label>Email <span class="optional">(optional)</span><input id="mfEmail" type="email" placeholder="name@example.com"></label></div><label>Contact number <span class="optional">(optional)</span><input id="mfPhone" type="tel" placeholder="e.g. 082 123 4567" autocomplete="tel"></label><label class="managed-profile-check"><input id="mfManaged" type="checkbox"><span><strong>Managed profile</strong><small>For a child or relative without their own Family Book account. Family Admins manage this profile.</small></span></label><div class="relationship-section"><div class="relationship-title"><div><h3>Family relationships</h3><p>Only relationships you explicitly add will appear in the family tree.</p></div></div><div id="relationshipRows">${relationshipRow(0,members)}</div><button type="button" id="addRelationship" class="add-rel"><i data-lucide="plus"></i>Add relationship</button></div><div class="form-actions"><button type="button" class="secondary" data-r="members">Cancel</button><button type="submit" class="primary"><i data-lucide="user-plus"></i>Save member</button></div></form></div></section>`;
}


function editMember(id){
 let list=ensureOwner(),m=list.find(x=>x.id===id);if(!m)return members();if(isHistoryPerson(m))return historyForm(id);
 const mode=memberEditMode(m);
 if(mode==="none")return permissionDeniedPage("You can view this family member, but only they or a Family Admin can change their profile.");
 let parts=(m.name||"").trim().split(/\s+/),first=parts.shift()||"",last=parts.join(" ");
 let family=esc(familyLabel()),others=list.filter(x=>x.id!==id),existing=migrateRelationships().filter(r=>r.from===id);
 let validExisting=existing.filter(r=>REL[r.type]&&others.some(x=>x.id===r.to));
 let rows=validExisting.length?validExisting.map((r,i)=>relationshipRow(i,others,r.type,r.to)).join(""):relationshipRow(0,others);
 const structureOnly=mode==="structure";
 return `<section class="member-form-page"><button class="back-link" data-r="members"><i data-lucide="arrow-left"></i>Back to members</button><div class="member-form-card"><div class="form-title">${structureOnly?`<div class="member-static-avatar">${m.photo?`<img src="${m.photo}" alt="">`:`<span>${memberInitials(m.name)}</span>`}</div>`:memberPhotoPickerHtml(m.photo||"",m.name)}<div><p class="eyebrow">${family.toUpperCase()}</p><h1>${structureOnly?"Edit Family Details":"Edit Family Member"}</h1><p>${structureOnly?"This adult has a linked account. You can manage family-structure details, while their photo, email and contact number remain under their control.":"Update your profile or family connections."}</p></div></div>
 <form id="editMemberForm" data-member-id="${esc(id)}" data-edit-mode="${mode}"><div class="field-row"><label>First name<input id="mfFirst" required value="${esc(first)}"></label><label>Surname<input id="mfLast" required value="${esc(last)}"></label></div><div class="field-row"><label>Birthday<input id="mfBirthday" type="date" value="${esc(m.birthday||"")}"></label>${structureOnly?`<div class="locked-member-field"><span>Email</span><strong>${esc(m.email||"Not added")}</strong><small><i data-lucide="lock"></i>Managed by this member</small></div>`:`<label>Email <span class="optional">(optional)</span><input id="mfEmail" type="email" value="${esc(m.email||"")}"></label>`}</div>${structureOnly?`<div class="locked-member-field"><span>Contact number</span><strong>${esc(m.phone||"Not added")}</strong><small><i data-lucide="lock"></i>Managed by this member</small></div>`:`<label>Contact number <span class="optional">(optional)</span><input id="mfPhone" type="tel" placeholder="e.g. 082 123 4567" autocomplete="tel" value="${esc(m.phone||"")}"></label>`}
 ${!m.accountId&&isFamilyAdmin()?`<label class="managed-profile-check"><input id="mfManaged" type="checkbox" ${m.managedProfile?"checked":""}><span><strong>Managed profile</strong><small>Keep this profile under Family Admin control and exclude it from account claiming.</small></span></label>`:""}<div class="relationship-section"><div class="relationship-title"><div><h3>Family relationships</h3><p>Add or remove explicit relationships. Spouse connections do not create parent links.</p></div></div><div id="relationshipRows">${rows}</div><button type="button" id="addRelationship" class="add-rel"><i data-lucide="plus"></i>Add relationship</button></div>
 <div class="form-actions"><button type="button" class="secondary" data-r="members">Cancel</button><button type="submit" class="primary"><i data-lucide="save"></i>Save changes</button></div></form></div></section>`;
}
function removeRelationshipsFor(id){
 let rs=migrateRelationships(),related=rs.filter(r=>r.from===id);
 let removeKeys=new Set();
 related.forEach(r=>{removeKeys.add(r.id);let rev=REL[r.type]?.reverse;rs.filter(x=>x.from===r.to&&x.to===id&&x.type===rev).forEach(x=>removeKeys.add(x.id))});
 saveRelationships(rs.filter(r=>!removeKeys.has(r.id)))
}



function historyForm(id=""){
 if(!isFamilyAdmin())return permissionDeniedPage("Only a Family Admin can add or edit Family History profiles.");
 const list=ensureOwner(),existing=id?list.find(x=>x.id===id):null;
 if(id&&!existing)return familyTree();
 const parts=(existing?.name||"").trim().split(/\s+/),first=parts.shift()||"",last=parts.join(" ");
 const others=list.filter(x=>x.id!==id);
 const rels=id?migrateRelationships().filter(r=>r.from===id&&REL[r.type]&&others.some(x=>x.id===r.to)):[];
 const rows=rels.length?rels.map((r,i)=>relationshipRow(i,others,r.type,r.to)).join(""):relationshipRow(0,others);
 return `<section class="member-form-page history-form-page">
   <button class="back-link" data-r="${id?`view-member:${esc(id)}`:"tree"}"><i data-lucide="arrow-left"></i>${id?"Back to profile":"Back to Family Tree"}</button>
   <div class="member-form-card history-form-card">
    <div class="form-title">${memberPhotoPickerHtml(existing?.photo||"",existing?.name||"Family history profile")}<div><p class="eyebrow">FAMILY HISTORY</p><h1>${id?"Edit History Profile":"Add to Family History"}</h1><p>Tree-only profiles appear in the Family Tree and can be tagged in old Memories. They do not appear in Members, contact cards or notifications.</p></div></div>
    <form id="historyProfileForm" data-history-id="${esc(id)}">
      <div class="history-info-note"><i data-lucide="book-heart"></i><div><strong>Family Tree profile</strong><span>Use this for grandparents, great-grandparents and other relatives who do not need an app account or contact card.</span></div></div>
      <div class="field-row"><label>First name<input id="hfFirst" required value="${esc(first)}" placeholder="First name"></label><label>Surname<input id="hfLast" required value="${esc(last)}" placeholder="Surname"></label></div>
      <div class="field-row"><label>Birth date <span class="optional">(optional)</span><input id="hfBorn" type="date" value="${esc(existing?.birthday||"")}"></label><label>Passed away <span class="optional">(optional)</span><input id="hfPassed" type="date" value="${esc(existing?.passedDate||"")}"></label></div>
      <label class="history-memory-check"><input id="hfInMemory" type="checkbox" ${existing?existing.inMemory!==false?"checked":"":"checked"}><span><strong>In memory</strong><small>Show this person as part of the family's remembered history.</small></span></label>
      <label>Family story or notes <span class="optional">(optional)</span><textarea id="hfStory" rows="5" maxlength="1200" placeholder="A short story, where they lived, what the family remembers…">${esc(existing?.story||"")}</textarea></label>
      <div class="relationship-section"><div class="relationship-title"><div><h3>Family relationships</h3><p>Connect this person to parents, children, spouse/partner or other known family relationships.</p></div></div><div id="relationshipRows">${rows}</div><button type="button" id="addRelationship" class="add-rel"><i data-lucide="plus"></i>Add relationship</button></div>
      <div class="form-actions"><button type="button" class="secondary" data-r="${id?`view-member:${esc(id)}`:"tree"}">Cancel</button><button type="submit" class="primary"><i data-lucide="book-heart"></i>${id?"Save changes":"Add to tree"}</button></div>
    </form>
   </div>
 </section>`;
}
function bindHistoryForm(id=""){
 const f=$("#historyProfileForm"),rows=$("#relationshipRows"),add=$("#addRelationship");if(!f)return;
 const current=id?ensureOwner().find(x=>x.id===id):null;
 const candidates=()=>ensureOwner().filter(x=>x.id!==id);
 const bindRemove=()=>document.querySelectorAll(".remove-rel").forEach((b)=>{
   b.style.visibility=document.querySelectorAll("[data-rel-row]").length>1?"visible":"hidden";
   b.onclick=()=>{if(document.querySelectorAll("[data-rel-row]").length>1){b.closest("[data-rel-row]").remove();bindRemove();icons()}}
 });
 if(add)add.onclick=()=>{rows.insertAdjacentHTML("beforeend",relationshipRow(Date.now(),candidates()));bindRemove();icons()};
 bindRemove();bindMemberPhotoPicker(current?.photo||"");
 f.onsubmit=e=>{
   e.preventDefault();clearFamilySafetyMessage(f);
   const first=$("#hfFirst").value.trim(),last=$("#hfLast").value.trim(),photo=$("#mfPhotoData")?.value||"";
   const list=ensureOwner(),personId=id||crypto.randomUUID(),idx=list.findIndex(x=>x.id===personId);
   const name=`${first} ${last}`.trim(),birthday=$("#hfBorn").value||"",plan=relationshipPlanRows(f);
   const guard=validateRelationshipPlan(personId,plan,true);
   if(!guard.ok){showFamilySafetyMessage(f,guard.message);return}
   if(!confirmDuplicatePerson(name,birthday,id))return;
   const person={
     ...(idx>=0?list[idx]:{}),
     id:personId,profileType:"history",relationship:"Family history",
     name,birthday,passedDate:$("#hfPassed").value||"",
     inMemory:!!$("#hfInMemory").checked,story:$("#hfStory").value.trim(),photo,
     email:"",phone:""
   };
   if(idx>=0)list[idx]=person;else list.push(person);
   saveMembers(list);
   removeRelationshipsFor(personId);
   plan.forEach(({type,to})=>addRelationship(personId,type,to));
   go(`view-member:${personId}`);
 };
}
function historyRelationshipsHtml(id){
 const rels=relationshipsFor(id);
 if(!rels.length)return "";
 return `<section class="history-relations"><span>Family connections</span><div>${rels.map(r=>`<span class="history-rel-chip"><strong>${esc(r.label)}</strong>${esc(r.person)}</span>`).join("")}</div></section>`;
}

function getHistoryNotes(personId){
 return window.FB_HISTORY_DATA?.get?.(personId)||[];
}
function currentHistoryNoteAuthor(){
 const u=FB_AUTH.get()||{};
 return {id:u.memberId||"owner",name:u.name||"Family member",photo:currentUserPhoto()};
}
async function addHistoryNote(personId,type,text){
 const clean=String(text||"").trim();if(!clean)return false;
 return window.FB_HISTORY_DATA?.add?.(personId,type,clean);
}
async function deleteHistoryNote(personId,noteId){
 return window.FB_HISTORY_DATA?.remove?.(noteId);
}
function historyNoteTypeLabel(type){return type==="memory"?"Memory":type==="note"?"Note":"Story"}
function historyNoteAvatar(n){
 return n.authorPhoto?`<img src="${n.authorPhoto}" alt="">`:`<span>${memberInitials(n.authorName||"Family")}</span>`;
}
function historyNotesHtml(m){
 return `<section class="history-notes-section">
   <div class="history-notes-head"><div><span>FAMILY VOICES</span><h2>Stories & notes about ${esc(m.name)}</h2><p>Family members can add remembered stories, details and personal memories to this biography.</p></div><strong id="historyNotesCount">0</strong></div>
   <form id="historyNoteForm" class="history-note-composer">
     <textarea id="historyNoteText" rows="3" maxlength="1600" placeholder="Share a story, memory or detail about ${esc(m.name)}…"></textarea>
     <div class="history-note-composer-actions"><label><span>Type</span><select id="historyNoteType"><option value="story">Story</option><option value="memory">Memory</option><option value="note">Note</option></select></label><button type="submit" class="primary"><i data-lucide="pen-line"></i>Add to biography</button></div>
   </form>
   <div id="historyNotesList" class="history-notes-list"></div>
 </section>`;
}
function renderHistoryNotes(m){
 const mount=$("#historyNotesList"),count=$("#historyNotesCount");if(!mount)return;
 const rows=getHistoryNotes(m.id),me=currentHistoryNoteAuthor();
 if(count)count.textContent=String(rows.length);
 if(!rows.length){
   mount.innerHTML=`<div class="history-notes-empty"><i data-lucide="notebook-pen"></i><strong>No family stories added yet</strong><span>Be the first to add something the family remembers about ${esc(m.name)}.</span></div>`;
 }else{
   mount.innerHTML=rows.map(n=>`<article class="history-note-card">
     <span class="history-note-avatar">${historyNoteAvatar(n)}</span>
     <div class="history-note-body"><div class="history-note-meta"><strong>${esc(n.authorName||"Family member")}</strong><span class="history-note-type ${esc(n.type)}">${historyNoteTypeLabel(n.type)}</span><time title="${esc(window.FB_TIME?.exact?.(n.createdAt)||"")}">${esc(window.FB_TIME?.activity?.(n.createdAt)||"Earlier")}</time></div><p>${esc(n.text||"")}</p></div>
     ${n.authorId===me.id?`<button type="button" class="history-note-delete" data-history-note-delete="${esc(n.id)}" aria-label="Delete this note"><i data-lucide="trash-2"></i></button>`:""}
   </article>`).join("");
 }
 mount.querySelectorAll("[data-history-note-delete]").forEach(btn=>btn.onclick=async()=>{
   if(!confirm("Delete this story or note from the biography?"))return;
   btn.disabled=true;
   try{await deleteHistoryNote(m.id,btn.dataset.historyNoteDelete);renderHistoryNotes(m);icons()}
   catch(err){alert(err.message||"Could not delete this Family Voices note.");btn.disabled=false}
 });
 icons();
}
function bindHistoryNotes(m){
 const form=$("#historyNoteForm"),text=$("#historyNoteText"),type=$("#historyNoteType");
 if(form)form.onsubmit=async e=>{
   e.preventDefault();
   const clean=text?.value||"";
   if(!String(clean).trim()){text?.focus();return}
   const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
   try{
     await addHistoryNote(m.id,type?.value||"story",clean);
     if(text)text.value="";
     renderHistoryNotes(m);
   }catch(err){alert(err.message||"Could not add this Family Voices note.")}
   finally{if(submit)submit.disabled=false}
 };
 renderHistoryNotes(m);
}

function viewHistoryPerson(m){
 const born=m.birthday?`<div class="profile-detail"><i data-lucide="sprout"></i><div><span>Born</span><strong>${esc(formatFamilyDate(m.birthday))}</strong></div></div>`:"";
 const passed=m.passedDate?`<div class="profile-detail"><i data-lucide="leaf"></i><div><span>Remembered</span><strong>${esc(formatFamilyDate(m.passedDate))}</strong></div></div>`:"";
 return `<section class="member-profile-view history-profile-view">
   <button class="fu-back" data-r="tree"><i data-lucide="arrow-left"></i> Family Tree</button>
   <div class="profile-view-card history-profile-card">
    <div class="history-profile-kicker"><i data-lucide="book-heart"></i>Family history</div>
    <div class="profile-view-avatar history-avatar">${m.photo?`<img src="${m.photo}" alt="">`:`<span>${memberInitials(m.name)}</span>`}</div>
    <h1>${esc(m.name)}</h1>
    ${m.inMemory?`<span class="in-memory-badge"><i data-lucide="leaf"></i>In memory</span>`:""}
    <p class="history-life-years">${esc(personLifeYears(m))}</p>
    ${m.story?`<blockquote class="history-story">${esc(m.story)}</blockquote>`:""}
    <div class="profile-details history-profile-details">${born}${passed}</div>
    ${historyRelationshipsHtml(m.id)}
    <section class="history-memories-section"><div class="history-memories-head"><div><span>MEMORIES</span><h2>Memories featuring ${esc(m.name)}</h2></div><strong id="historyMemoryCount">…</strong></div><div id="historyMemoryList" class="history-memory-loading"><span class="memory-spinner small"></span>Looking through family Memories…</div></section>
    ${historyNotesHtml(m)}
    <div class="history-profile-actions"><button class="secondary" data-r="edit-history:${esc(m.id)}"><i data-lucide="pencil"></i>Edit history profile</button><button class="history-remove" id="removeHistoryProfile"><i data-lucide="trash-2"></i>Remove from tree</button></div>
   </div>
 </section>`;
}
async function bindHistoryProfile(m){
 const mount=$("#historyMemoryList"),count=$("#historyMemoryCount");
 $("#removeHistoryProfile")?.addEventListener("click",()=>removeHistoryPerson(m.id));
 bindHistoryNotes(m);
 if(!mount)return;
 try{
   const list=(await window.FB_MEMORIES?.getAll?.()||[]).filter(x=>(x.tags||[]).includes(m.id));
   if(count)count.textContent=String(list.length);
   if(!list.length){
     mount.className="history-memory-empty";
     mount.innerHTML=`<i data-lucide="images"></i><strong>No tagged Memories yet</strong><span>When you add an old photo, tag ${esc(m.name)} and it will appear here.</span><button type="button" class="secondary" data-r="add-memory"><i data-lucide="image-plus"></i>Add a Memory</button>`;
   }else{
     mount.className="history-memory-grid";
     mount.innerHTML=list.slice(0,12).map(memory=>{
       const photo=window.FB_MEMORIES?.getPhotos?.(memory)?.[0],blob=photo?.thumb||photo?.image;
       const src=blob instanceof Blob?URL.createObjectURL(blob):(typeof blob==="string"?blob:"");
       return `<button type="button" class="history-memory-card" data-r="view-memory:${esc(memory.id)}">${src?`<img src="${src}" alt="">`:`<span><i data-lucide="image"></i></span>`}<strong>${esc(memory.caption||"Family Memory")}</strong><small>${esc(memory.date||"Date unknown")}</small></button>`;
     }).join("");
   }
   mount.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>go(b.dataset.r));
   icons();
 }catch(err){
   if(count)count.textContent="0";
   mount.className="history-memory-empty";
   mount.innerHTML=`<i data-lucide="circle-alert"></i><strong>Could not load tagged Memories</strong><span>${esc(err.message||"Try again in a moment.")}</span>`;
   icons();
 }
}
async function removeHistoryPerson(id){
 const list=getMembers(),person=list.find(x=>x.id===id);if(!person||!isHistoryPerson(person))return;
 if(!confirm(`Remove ${person.name} from the Family Tree? Their profile and tree connections will be removed. The photos themselves will stay in Memories.`))return;
 saveMembers(list.filter(x=>x.id!==id));
 saveRelationships(migrateRelationships().filter(r=>r.from!==id&&r.to!==id));
 saveHistoryNotes(id,[]);
 try{await window.FB_MEMORIES?.removePersonTag?.(id)}catch(_){}
 go("tree");
}

function familyGraph(){
 const members=ensureOwner(), byId=Object.fromEntries(members.map(m=>[m.id,m])), rel=migrateRelationships();
 const parents={},children={},spouse={};
 rel.filter(r=>r.type==="parent_of"&&byId[r.from]&&byId[r.to]).forEach(r=>{
   (parents[r.to]??=[]).push(r.from);(children[r.from]??=[]).push(r.to)
 });
 rel.filter(r=>r.type==="spouse_of"&&byId[r.from]&&byId[r.to]).forEach(r=>spouse[r.from]=r.to);
 return {members,byId,parents,children,spouse};
}

function findTreeRoot(startId,G=familyGraph()){
 const {byId,parents}=G;
 if(!startId||!byId[startId])return startId;
 let bestId=startId,bestDepth=0;
 function walk(id,depth,path){
   if(!id||!byId[id]||path.has(id))return;
   if(depth>bestDepth){bestDepth=depth;bestId=id}
   const next=new Set(path);next.add(id);
   (parents[id]||[]).filter(pid=>byId[pid]).forEach(pid=>walk(pid,depth+1,next));
 }
 walk(startId,0,new Set());
 return bestId;
}

function treePersonHtml(m){
 const photo=m.photo?`<img src="${m.photo}" alt="">`:memberInitials(m.name),history=isHistoryPerson(m);
 return `<button class="ct-person ${history?"history-person":""}" data-view-member="${esc(m.id)}" aria-label="View ${esc(m.name)}"><span class="ct-avatar">${photo}</span><span class="ct-person-copy"><strong>${esc(m.name)}</strong>${history?`<small><i data-lucide="leaf"></i>${esc(personLifeYears(m))}</small>`:""}</span></button>`;
}
function treeCoupleHtml(a,b,branchId,backToTree=false){
 return `<div class="ct-couple" ${backToTree?`data-r="tree"`:`data-family-unit="${esc(branchId)}"`} role="button" tabindex="0">
   ${treePersonHtml(a)}
   <span class="ct-heart"><i data-lucide="heart"></i></span>
   ${treePersonHtml(b)}
 </div>`;
}
function buildCoordinateTree(rootId, focused=false){
 const G=familyGraph(),{byId,children,spouse}=G;
 const root=byId[rootId];
 if(!root)return {html:"",height:260,width:900};

 const NODE_SINGLE=176, NODE_COUPLE=372, GAP=34, LEVEL=154, TOP=24, PAD=36;
 const seen=new Set();

 function makeUnit(id,depth=0){
   if(!byId[id] || depth>7)return null;
   const partnerId=spouse[id]&&byId[spouse[id]]?spouse[id]:null;
   const key=[id,partnerId||""].sort().join("|");
   if(seen.has(key))return null;
   seen.add(key);

   const parentIds=[id,...(partnerId?[partnerId]:[])];
   const childIds=[];
   parentIds.forEach(pid=>(children[pid]||[]).forEach(cid=>{
     if(cid!==partnerId && !childIds.includes(cid))childIds.push(cid);
   }));

   const kids=childIds.map(cid=>makeUnit(cid,depth+1)).filter(Boolean);
   const nodeW=partnerId?NODE_COUPLE:NODE_SINGLE;
   const kidsW=kids.length ? kids.reduce((n,k)=>n+k.width,0)+GAP*(kids.length-1) : 0;
   const width=Math.max(nodeW,kidsW);
   return {id,partnerId,kids,nodeW,width,depth};
 }

 const tree=makeUnit(rootId);
 if(!tree)return {html:"",height:260,width:900};

 let maxDepth=0,nodes=[],lines=[];
 function place(unit,left,depth){
   maxDepth=Math.max(maxDepth,depth);
   const cx=left+unit.width/2;
   const y=TOP+depth*LEVEL;
   nodes.push({...unit,cx,y});

   if(unit.kids.length){
     let total=unit.kids.reduce((n,k)=>n+k.width,0)+GAP*(unit.kids.length-1);
     let childLeft=left+(unit.width-total)/2;
     let childCenters=[];
     unit.kids.forEach(k=>{
       const cc=childLeft+k.width/2;
       childCenters.push(cc);
       place(k,childLeft,depth+1);
       childLeft+=k.width+GAP;
     });

     const parentBottom=y+70;
     const railY=y+102;
     const childTop=TOP+(depth+1)*LEVEL;
     lines.push(`<path d="M ${cx} ${parentBottom} V ${railY}" />`);
     if(childCenters.length>1){
       lines.push(`<path d="M ${childCenters[0]} ${railY} H ${childCenters[childCenters.length-1]}" />`);
     }
     childCenters.forEach(cc=>lines.push(`<path d="M ${cc} ${railY} V ${childTop}" />`));
   }
 }
 place(tree,PAD,0);

 const canvasW=Math.max(900,tree.width+PAD*2);
 const canvasH=TOP+(maxDepth+1)*LEVEL+92;

 const nodeHtml=nodes.map(n=>{
   const m=byId[n.id],p=n.partnerId?byId[n.partnerId]:null;
   const left=n.cx-n.nodeW/2;
   const content=p
     ? treeCoupleHtml(m,p,n.id,focused && n.depth===0)
     : treePersonHtml(m);
   return `<div class="ct-node" style="left:${left}px;top:${n.y}px;width:${n.nodeW}px">${content}</div>`;
 }).join("");

 return {
   width:canvasW,height:canvasH,
   html:`<div class="ct-canvas" style="width:${canvasW}px;height:${canvasH}px">
     <svg class="ct-lines" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" aria-hidden="true">${lines.join("")}</svg>
     ${nodeHtml}
   </div>`
 };
}

function familyHistoryDirectoryHtml(){
 const people=familyPersons().filter(isHistoryPerson);
 if(!people.length)return `<section class="tree-history-directory empty"><div class="tree-history-directory-head"><div><p class="eyebrow">FAMILY HISTORY</p><h2>Family biographies</h2><p>Grandparents and earlier generations you add will be collected here, even before the tree has enough parent/child links to position them.</p></div><button class="secondary" data-r="add-history"><i data-lucide="book-heart"></i>Add first profile</button></div></section>`;
 const cards=people.map(m=>{
   const rels=relationshipsFor(m.id);
   const summary=rels.slice(0,2).map(r=>`${r.label} ${r.person}`).join(" • ");
   return `<button type="button" class="tree-history-card" data-view-member="${esc(m.id)}">
     <span class="tree-history-card-avatar">${m.photo?`<img src="${m.photo}" alt="">`:`${memberInitials(m.name)}`}</span>
     <span class="tree-history-card-copy"><span class="tree-history-card-top"><strong>${esc(m.name)}</strong>${m.inMemory?`<small><i data-lucide="leaf"></i>In memory</small>`:""}</span><b>${esc(personLifeYears(m))}</b><em>${esc(summary||"Family history profile")}</em></span>
     <span class="tree-history-open"><i data-lucide="book-open"></i><small>Biography</small></span>
   </button>`;
 }).join("");
 return `<section class="tree-history-directory">
   <div class="tree-history-directory-head"><div><p class="eyebrow">FAMILY HISTORY</p><h2>Family biographies</h2><p>Every tree-only profile stays here as a clickable biography. If an older generation cannot yet be positioned in the tree, add the missing parent/child link later.</p></div><span class="tree-history-count">${people.length}</span></div>
   <div class="tree-history-grid">${cards}</div>
 </section>`;
}

function familyTree(){
 const G=familyGraph();
 const rootId=findTreeRoot(familyTreeAnchorId(G),G);
 const drawing=buildCoordinateTree(rootId,false);
 return `<section class="tree-page coordinate-tree-page">
   <div class="tree-head"><div><p class="eyebrow">${esc(familyLabel()).toUpperCase()}</p><h1>Family Tree</h1><p>Build current family and older generations together. The tree is shared by everyone in the family, regardless of who is signed in.</p></div><div class="tree-head-actions">${isFamilyAdmin()?`<button class="primary tree-history-add" data-r="add-history"><i data-lucide="book-heart"></i><span>Add family history</span></button>`:""}<button class="secondary tree-full-btn" data-r="tree-full"><i data-lucide="maximize-2"></i><span>View full tree</span></button><button class="secondary tree-manage" data-r="members"><i data-lucide="users-round"></i><span>${isFamilyAdmin()?"Manage":"View"} members</span></button></div></div>
   <div class="ct-board">${drawing.html}</div>
   ${familyHistoryDirectoryHtml()}
 </section>`;
}
function fullFamilyTree(){
 const G=familyGraph();
 const rootId=findTreeRoot(familyTreeAnchorId(G),G);
 const drawing=buildCoordinateTree(rootId,false);
 return `<section class="full-tree-page"><div class="full-tree-top"><button class="fu-back" data-r="tree"><i data-lucide="arrow-left"></i> Family Tree</button><div><p class="eyebrow">${esc(familyLabel()).toUpperCase()}</p><h1>Full Family Tree</h1></div><div class="full-tree-controls"><button id="treeZoomOut" class="secondary" aria-label="Zoom out"><i data-lucide="minus"></i></button><button id="treeFit" class="secondary"><i data-lucide="scan"></i><span>Fit tree</span></button><button id="treeZoomIn" class="secondary" aria-label="Zoom in"><i data-lucide="plus"></i></button><button id="treeExport" class="primary"><i data-lucide="download"></i><span>Export PNG</span></button></div></div><div id="fullTreeViewport" class="full-tree-viewport"><div id="fullTreeStage" class="full-tree-stage" data-width="${drawing.width}" data-height="${drawing.height}" style="width:${drawing.width}px;height:${drawing.height}px">${drawing.html}</div></div><p class="full-tree-hint">Drag/scroll to move around. Use Fit Tree to see the complete family at once.</p></section>`;
}
function bindFullTreeViewer(){
 let vp=$("#fullTreeViewport"),stage=$("#fullTreeStage"),canvas=stage?.querySelector(".ct-canvas");if(!vp||!stage||!canvas)return;
 let baseW=Number(stage.dataset.width),baseH=Number(stage.dataset.height),scale=1;
 canvas.style.margin="0";canvas.style.transformOrigin="top left";
 function apply(v){scale=Math.max(.2,Math.min(2.25,v));canvas.style.transform=`scale(${scale})`;stage.style.width=`${baseW*scale}px`;stage.style.height=`${baseH*scale}px`}
 function fit(){let sx=(vp.clientWidth-24)/baseW,sy=(vp.clientHeight-24)/baseH;apply(Math.min(1,sx,sy));vp.scrollTo({left:0,top:0})}
 $("#treeZoomOut").onclick=()=>apply(scale-.15);$("#treeZoomIn").onclick=()=>apply(scale+.15);$("#treeFit").onclick=fit;
 $("#treeExport").onclick=async()=>{let btn=$("#treeExport"),old=btn.innerHTML;btn.disabled=true;btn.textContent="Creating image…";let oldTransform=canvas.style.transform;canvas.style.transform="none";
   try{if(!window.html2canvas)throw new Error("Image export library is still loading. Try again in a moment.");let out=await html2canvas(canvas,{backgroundColor:"#f9f5ed",scale:2,useCORS:true,logging:false,width:baseW,height:baseH});let a=document.createElement("a");a.download=`${familyLabel().replace(/\s+/g,"-").toLowerCase()}-tree.png`;a.href=out.toDataURL("image/png");a.click()}catch(err){alert(err.message||"Could not export the tree image.")}finally{canvas.style.transform=oldTransform;btn.disabled=false;btn.innerHTML=old;icons()}};
 setTimeout(fit,40);window.addEventListener("resize",fit,{once:true});
}
function familyUnitView(id){
 const G=familyGraph(),{byId}=G,m=byId[id];
 if(!m)return familyTree();
 const drawing=buildCoordinateTree(id,true);
 const partner=G.spouse[id]&&byId[G.spouse[id]];
 return `<section class="tree-page coordinate-tree-page">
   <div class="tree-head"><div><button class="fu-back" data-r="tree"><i data-lucide="arrow-left"></i> Family Tree</button><h1>${esc(m.name)}${partner?` & ${esc(partner.name)}`:""}</h1><p>This branch follows the explicit parent-child connections saved for this family.</p></div></div>
   <div class="ct-board focus">${drawing.html}</div>
 </section>`;
}
function removeMember(id){
 const list=getMembers(), member=list.find(x=>x.id===id);
 if(!member)return;

 // Member deletion must never alter the login/session record.
 const session=FB_AUTH.get()||{};
 const signedInEmail=(session.email||"").trim().toLowerCase();
 const memberEmail=(member.email||"").trim().toLowerCase();
 const isSignedInMember=member.id===currentMemberId() || (signedInEmail && memberEmail && signedInEmail===memberEmail);

 if(isSignedInMember){
   alert("You cannot remove the profile linked to the currently signed-in account.");
   return;
 }
 if(!isFamilyAdmin()){
   alert("Only a Family Admin can remove a Member profile.");
   return;
 }
 if(member.accountId){
   alert("This member has a linked account. Their account must be disconnected before the Member profile can be removed.");
   return;
 }
 if(!confirm(`Remove ${member.name} from this family? Their family-tree connections will also be removed.`))return;

 // Update family data only. Do NOT call FB_AUTH.clear(), logout(), auth(), or recreate the session.
 saveMembers(list.filter(x=>x.id!==id));
 const remaining=migrateRelationships().filter(r=>r.from!==id && r.to!==id);
 saveRelationships(remaining);
 go("members");
}
function viewMember(id){
 const list=ensureOwner(),m=list.find(x=>x.id===id);
 if(!m)return members();
 if(isHistoryPerson(m))return viewHistoryPerson(m);
 const phone=m.phone&&canSeeMemberField(m.id,"phoneVisibility")?`<div class="profile-detail"><i data-lucide="phone"></i><div><span>Contact number</span><strong>${esc(m.phone)}</strong></div></div>`:"";
 const email=m.email&&canSeeMemberField(m.id,"emailVisibility")?`<div class="profile-detail"><i data-lucide="mail"></i><div><span>Email</span><strong>${esc(m.email)}</strong></div></div>`:"";
 const birthday=m.birthday?`<div class="profile-detail"><i data-lucide="cake-slice"></i><div><span>Birthday</span><strong>${esc(memberBirthdayText(m))}</strong></div></div>`:"";
 return `<section class="member-profile-view">
   <button class="fu-back" data-r="members"><i data-lucide="arrow-left"></i> Members</button>
   <div class="profile-view-card">
    <div class="profile-view-avatar">${m.photo?`<img src="${m.photo}" alt="">`:`<span>${memberInitials(m.name)}</span>`}</div>
    <h1>${esc(m.name)}</h1>
    ${memberContactActions(m,false)}
    <div class="profile-details">${birthday}${phone}${email}</div>
    ${window.FB_WALL?.memberActivityShell?.(m)||""}
    ${memberEditMode(m)!=="none"?`<button class="secondary" data-edit-member="${esc(m.id)}"><i data-lucide="pencil"></i>${memberEditMode(m)==="structure"?"Edit family details":"Edit member"}</button>`:""}
   </div>
 </section>`;
}


function memberWallPage(id){
 const m=ensureOwner().find(x=>x.id===id);
 if(!m)return members();
 return window.FB_WALL?.memberWallPageShell?.(m)||viewMember(id);
}

function profilePage(){
 let u=FB_AUTH.get()||{},owner=ensureOwner().find(m=>m.id===currentMemberId())||{},photo=owner.photo||u.photo||"";
 return `<section class="member-profile-view account-profile-view"><div class="profile-view-card"><button type="button" id="accountPhotoPicker" class="profile-photo-button" aria-label="Change your profile photo"><span class="profile-view-avatar">${photo?`<img src="${photo}" alt="Profile photo">`:`<span>${memberInitials(u.name||"Family User")}</span>`}</span><span class="profile-photo-camera"><i data-lucide="camera"></i></span><small>${photo?"Change photo":"Add profile photo"}</small></button><h1>${esc(u.name||"Family User")}</h1>${window.FB_WALL?.profileStatusShell?.()||""}<div class="profile-details"><div class="profile-detail"><i data-lucide="users-round"></i><div><span>Family</span><strong>${esc(familyLabel())}</strong></div></div>${u.email?`<div class="profile-detail"><i data-lucide="mail"></i><div><span>Email</span><strong>${esc(u.email)}</strong></div></div>`:""}</div><div class="account-profile-actions"><button class="secondary" data-r="edit-member:${esc(currentMemberId())}"><i data-lucide="pencil"></i>Edit my profile</button><button class="logout" id="logout">Sign out</button></div></div></section>`;
}
function bindOwnProfilePhoto(){
 let b=$("#accountPhotoPicker");if(!b)return;let owner=ensureOwner().find(m=>m.id===currentMemberId()),u=FB_AUTH.get()||{},current=owner?.photo||u.photo||"";
 b.onclick=()=>openPhotoMenu(current,photo=>{let list=ensureOwner(),idx=list.findIndex(m=>m.id===currentMemberId());if(idx>=0){list[idx]={...list[idx],photo};saveMembers(list)}FB_AUTH.update({photo});let top=document.querySelector(".topbar .avatar");if(top)top.innerHTML=photo?`<img src="${photo}" alt="Profile photo">`:userInitials();go("profile")});
}
function permissionDeniedPage(message){
 return `<section class="permission-page"><div class="permission-card"><span><i data-lucide="shield-alert"></i></span><p class="eyebrow">FAMILY ACCESS</p><h1>View only</h1><p>${esc(message||"You do not have permission to change this profile.")}</p><div><button class="primary" data-r="members"><i data-lucide="users-round"></i>Back to Members</button><button class="secondary" data-r="profile"><i data-lucide="user-round"></i>My Profile</button></div></div></section>`;
}
function page(r){let m={memories:["Memories","Your private family photo library."],tree:["Family Tree","See generations and relationships."],calendar:["Family Calendar","Birthdays, anniversaries and family events."],profile:["Family","Profiles, members and account settings."]}[r];return `<div class="page-title"><p class="eyebrow">FAMILY BOOK V1.6</p><h1>${m[0]}</h1><p class="muted">${m[1]}</p></div><section class="placeholder"><h2>${r==="profile"?esc(familyLabel()):m[0]+" — coming in Build 2"}</h2><p class="muted">Navigation is working. This area is intentionally reserved for the next feature build.</p>${r==="profile"?`<div class="people">${D.people.map(p=>`<span class="person">${p}</span>`).join("")}</div><button class="logout" id="logout">Sign out of demo</button>`:`<button class="primary" data-r="home">Back home</button>`}</section>`}
function $(s){return document.querySelector(s)}function esc(v=""){return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
async function routeAfterBackendAuth(){
 const u=FB_AUTH.get();
 if(!u){auth();return}
 if(FB_AUTH.needsSetup?.()){FB_AUTH.renderSetup(A,()=>routeAfterBackendAuth(),()=>auth());return}

 // Core family/member data is required before Family Book opens.
 await window.FB_FAMILY_DATA?.init?.();

 // Feature modules must never block sign-in if a newly deployed RPC
 // is temporarily missing from PostgREST's schema cache.
 const optionalInitializers=[
   ["Family Wall",()=>window.FB_SOCIAL_DATA?.init?.()],
   ["Albums & Calendar",()=>window.FB_ORGANIZER_DATA?.init?.()],
   ["Family Voices",()=>window.FB_HISTORY_DATA?.init?.()],
   ["Notifications",()=>window.FB_NOTIFICATION_DATA?.init?.()]
 ];
 const results=await Promise.allSettled(optionalInitializers.map(([,fn])=>Promise.resolve().then(fn)));
 results.forEach((result,i)=>{
   if(result.status==="rejected"){
     console.warn(`${optionalInitializers[i][0]} did not initialize:`,result.reason);
   }
 });

 cleanupLegacyBrowserData();
 shell();
}
function cleanupLegacyBrowserData(){
 const prefixes=["fb_members_","fb_relationships_","fb_story_","fb_wall_","fb_calendar_","fb_albums_","fb_history_notes_"];
 for(let i=localStorage.length-1;i>=0;i--){
   const key=localStorage.key(i)||"";
   if(prefixes.some(prefix=>key.startsWith(prefix)))localStorage.removeItem(key);
 }
}
let lastCloudRefreshAt=Date.now();
async function refreshCloudCaches(){
 const tasks=[
   ()=>window.FB_FAMILY_DATA?.reload?.(),
   ()=>window.FB_MEMORIES?.refresh?.(),
   ()=>window.FB_SOCIAL_DATA?.load?.(),
   ()=>window.FB_ORGANIZER_DATA?.load?.(),
   ()=>window.FB_HISTORY_DATA?.load?.(),
   ()=>window.FB_NOTIFICATION_DATA?.loadNotifications?.(false)
 ];
 await Promise.allSettled(tasks.map(fn=>Promise.resolve().then(fn)));
 lastCloudRefreshAt=Date.now();
}
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState!=="visible")return;
 if(Date.now()-lastCloudRefreshAt<60000)return;
 refreshCloudCaches().catch(err=>console.warn("Background cloud refresh:",err));
});

window.FB_APP_AUTH_CHANGED=event=>{
 if(event==="SIGNED_OUT"){auth();return}
 // Returning to a browser tab refreshes cloud caches without changing route.
};
window.FB_APP_AUTH_ERROR=err=>{console.error(err);alert(err.message||"Family Book authentication could not be loaded.")};
(async()=>{try{await FB_AUTH.init();await routeAfterBackendAuth()}catch(err){console.error(err);auth();setTimeout(()=>alert(err.message||"Could not connect Family Book to Supabase."),50)}})();

if(!window.__familyUnitBound){
 window.__familyUnitBound=true;
 document.addEventListener("click",e=>{
   if(e.target.closest("[data-view-member]"))return;
   let u=e.target.closest("[data-family-unit]");
   if(u){e.preventDefault();e.stopPropagation();go("family-unit:"+u.dataset.familyUnit)}
 });
}

if(!window.__memberMenuBound){
 window.__memberMenuBound=true;
 document.addEventListener("click",e=>{
   let menuBtn=e.target.closest("[data-member-menu]");
   if(menuBtn){
     e.preventDefault();e.stopPropagation();
     let id=menuBtn.dataset.memberMenu;
     document.querySelectorAll(".member-menu.open").forEach(x=>{if(x.dataset.memberMenuPanel!==id)x.classList.remove("open")});
     document.querySelector(`[data-member-menu-panel="${CSS.escape(id)}"]`)?.classList.toggle("open");
     return;
   }
   let remove=e.target.closest("[data-remove-member]");
   if(remove){e.preventDefault();e.stopPropagation();removeMember(remove.dataset.removeMember);return}
   if(!e.target.closest(".member-menu"))document.querySelectorAll(".member-menu.open").forEach(x=>x.classList.remove("open"));
 });
}

if(!window.__memberViewBound){
 window.__memberViewBound=true;
 document.addEventListener("click",e=>{
   let v=e.target.closest("[data-view-member]");
   if(v){e.preventDefault();e.stopPropagation();go("view-member:"+v.dataset.viewMember)}
 });
}
