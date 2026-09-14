
const A=document.getElementById("app"),D=window.FB_DATA;
function auth(){A.innerHTML=`<main class="login-page">
<section class="login-photo"><img class="login-logo" src="assets/logo/family-book-logo.png"><div class="login-message"><h2 class="script">Family is everything.</h2><p>Our family. Our memories. Our story.</p></div></section>
<section class="login-side"><div class="auth-card"><img class="mobile-logo" src="assets/logo/family-book-logo.png">
<div class="tabs"><button class="tab active" data-tab="in">Sign in</button><button class="tab" data-tab="up">Create account</button></div>
<form id="signin" class="form"><div><p class="eyebrow">WELCOME BACK</p><h1>Sign in to Family Book</h1><p class="muted">A private space for your family. Demo mode is safe for testing.</p></div><label>Email<input id="email" type="email" placeholder="you@example.com" required></label><label>Password<input id="pass" type="password" placeholder="••••••••" minlength="4" required></label><button class="primary full">Sign in</button><button type="button" class="demo" id="demo">Use demo family</button></form>
<form id="signup" class="form hidden"><div><p class="eyebrow">JOIN YOUR FAMILY</p><h1>Create your account</h1><p class="muted">Real secure accounts will be connected to Supabase later.</p></div><div class="row"><label>First name<input id="first" required></label><label>Last name<input id="last" required></label></div><label>Email<input id="regemail" type="email" required></label><label>Password<input type="password" minlength="6" required></label><label>Family setup<select id="setup"><option value="create">Create a new family</option><option value="join">Join with an invite code</option></select></label><div id="fname"><label>Family name<input id="family" placeholder="e.g. Willemse Family"></label></div><div id="icode" class="hidden"><label>Invite code<input placeholder="e.g. FB-7K2M"></label></div><button class="primary full">Create account</button></form>
</div></section></main>`;
let tabs=[...document.querySelectorAll("[data-tab]")],si=$("#signin"),su=$("#signup");tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.toggle("active",x===t));si.classList.toggle("hidden",t.dataset.tab!=="in");su.classList.toggle("hidden",t.dataset.tab!=="up")});
$("#setup").onchange=e=>{$("#fname").classList.toggle("hidden",e.target.value==="join");$("#icode").classList.toggle("hidden",e.target.value!=="join")};
si.onsubmit=e=>{e.preventDefault();FB_AUTH.login($("#email").value);shell()};$("#demo").onclick=()=>{FB_AUTH.login("demo@familybook.local");shell()};
su.onsubmit=e=>{e.preventDefault();FB_AUTH.register({first:$("#first").value,last:$("#last").value,email:$("#regemail").value,family:$("#family").value});shell()}}
function icons(){if(window.lucide)lucide.createIcons({attrs:{"stroke-width":1.9}})}
function familyLabel(){let u=FB_AUTH.get()||{},raw=(u.family||D.family||"Family").trim().replace(/^The\s+/i,"");return /\bfamily$/i.test(raw)?raw:`${raw} Family`}
function userInitials(){let u=FB_AUTH.get()||{},parts=(u.name||"Family User").trim().split(/\s+/).filter(Boolean);return esc((parts[0]?.[0]||"F")+(parts.length>1?(parts.at(-1)?.[0]||""):"")).toUpperCase()}
function shell(){let fam=esc(familyLabel()),initials=userInitials();A.innerHTML=`<div class="app"><header class="topbar"><button class="brand-home" data-r="home" aria-label="Go to Family Book Home"><img src="assets/logo/family-book-logo.png" alt="Family Book"><span>${fam} <i data-lucide="chevron-down"></i></span></button><div class="actions"><button class="notify circle" aria-label="Notifications"><i data-lucide="bell"></i><b>3</b></button><button class="circle avatar" data-r="profile" aria-label="Profile">${initials}</button></div></header><main id="screen" class="screen"></main><nav class="bottom" aria-label="Main navigation"><button class="nav active" data-r="home"><i data-lucide="house"></i><small>Home</small></button><button class="nav" data-r="memories"><i data-lucide="images"></i><small>Memories</small></button><button class="nav" data-r="tree"><i data-lucide="git-fork"></i><small>Tree</small></button><button class="nav" data-r="calendar"><i data-lucide="calendar-days"></i><small>Calendar</small></button><button class="nav" data-r="members"><i data-lucide="users"></i><small>Members</small></button><button class="nav" data-r="profile"><i data-lucide="user-round"></i><small>Profile</small></button></nav></div>`;document.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>go(b.dataset.r));icons();go("home")}
function go(r){document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.r===r));$("#screen").innerHTML=r==="home"?home():r==="members"?members():r==="add-member"?addMember():r.startsWith("edit-member:")?editMember(r.split(":")[1]):r.startsWith("family-unit:")?familyUnitView(r.split(":")[1]):r.startsWith("view-member:")?viewMember(r.split(":")[1]):r==="tree"?familyTree():page(r);document.querySelectorAll("#screen [data-r]").forEach(b=>b.onclick=()=>go(b.dataset.r));
 document.querySelectorAll("[data-edit-member]").forEach(b=>b.onclick=()=>go("edit-member:"+b.dataset.editMember));
 if(r.startsWith("edit-member:")){
  let f=$("#editMemberForm"),rows=$("#relationshipRows"),add=$("#addRelationship"),id=r.split(":")[1];
  let bindRemove=()=>document.querySelectorAll(".remove-rel").forEach(b=>{b.style.visibility="visible";b.onclick=()=>{b.closest("[data-rel-row]").remove();refreshIcons()}});
  if(add)add.onclick=()=>{rows.insertAdjacentHTML("beforeend",relationshipRow(Date.now(),ensureOwner().filter(x=>x.id!==id)));bindRemove();refreshIcons()};
  bindRemove();
  if(f)f.onsubmit=e=>{e.preventDefault();let list=ensureOwner(),idx=list.findIndex(x=>x.id===id);if(idx<0)return;
   let file=$("#mfPhoto").files[0],commit=(photo)=>{list[idx]={...list[idx],name:`${$("#mfFirst").value.trim()} ${$("#mfLast").value.trim()}`.trim(),birthday:$("#mfBirthday").value,email:$("#mfEmail").value.trim(),phone:$("#mfPhone").value.trim(),photo:photo===null?list[idx].photo:photo};saveMembers(list);
    removeRelationshipsFor(id);
    document.querySelectorAll("[data-rel-row]").forEach(row=>{let type=row.querySelector(".mfRelType").value,to=row.querySelector(".mfRelPerson").value;if(type&&to)addRelationship(id,type,to)});
    go("members")};
   if(file){let rd=new FileReader();rd.onload=()=>commit(rd.result);rd.readAsDataURL(file)}else commit(null)}
 }if(r==="add-member"){
 let f=$("#memberForm"),rows=$("#relationshipRows"),add=$("#addRelationship");
 let bindRemove=()=>document.querySelectorAll(".remove-rel").forEach((b,i)=>{b.style.visibility=document.querySelectorAll("[data-rel-row]").length>1?"visible":"hidden";b.onclick=()=>{if(document.querySelectorAll("[data-rel-row]").length>1){b.closest("[data-rel-row]").remove();bindRemove();refreshIcons()}}});
 if(add)add.onclick=()=>{rows.insertAdjacentHTML("beforeend",relationshipRow(Date.now(),ensureOwner()));bindRemove();refreshIcons()};
 bindRemove();
 if(f)f.onsubmit=e=>{e.preventDefault();let first=$("#mfFirst").value.trim(),last=$("#mfLast").value.trim(),file=$("#mfPhoto").files[0];
  let commit=(photo="")=>{let list=ensureOwner(),id="m"+Date.now(),member={id,name:`${first} ${last}`.trim(),relationship:"Family member",birthday:$("#mfBirthday").value,email:$("#mfEmail").value.trim(),phone:$("#mfPhone").value.trim(),photo};list.push(member);saveMembers(list);
   document.querySelectorAll("[data-rel-row]").forEach(row=>{let type=row.querySelector(".mfRelType").value,to=row.querySelector(".mfRelPerson").value;if(type&&to)addRelationship(id,type,to)});
   go("members")};
  if(file){let rd=new FileReader();rd.onload=()=>commit(rd.result);rd.readAsDataURL(file)}else commit()}
}$("#logout")?.addEventListener("click",()=>{FB_AUTH.logout();auth()});icons();scrollTo(0,0)}
function home(){
let u=FB_AUTH.get()||{name:"Family"},n=esc(u.name.split(" ")[0]);
let demo=(u.email||"").toLowerCase()==="demo@familybook.local";
let hero=demo
? `<section class="home-hero demo-hero"><div><p class="eyebrow">${esc(familyLabel()).toUpperCase()}</p><h1>Good evening, ${n}.</h1><p>Here's what's happening with your family. Keep the people, memories and important moments together.</p><button class="primary" data-r="memories">Explore memories</button></div></section>`
: `<section class="home-hero empty-hero"><div class="empty-hero-copy"><span class="empty-tree"><i data-lucide="sprout"></i></span><p class="eyebrow">WELCOME TO FAMILY BOOK</p><h1>Your family story starts here.</h1><p>Add your first photo or memory and begin building a private timeline your family can enjoy together.</p><button class="primary" data-r="memories">Add your first memory</button></div></section>`;

let memories=demo
? `<div class="memory-grid">${D.memories.map((x,i)=>`<div class="memory memory-photo-${i+1}"><div><strong>${x[0]}</strong><small>${x[1]}</small></div></div>`).join("")}</div>`
: `<div class="empty-memory-grid">
    <button class="empty-memory" data-r="memories"><span><i data-lucide="image-plus"></i></span><strong>Add a photo</strong><small>Your first family memory</small></button>
    <div class="empty-memory art"><span><i data-lucide="git-fork"></i></span><strong>Albums will appear here</strong><small>Keep special moments together</small></div>
    <div class="empty-memory art"><span><i data-lucide="heart"></i></span><strong>Tag your family</strong><small>Connect memories to people</small></div>
   </div>`;

let upcoming=demo
? D.events.map(x=>`<div class="event"><div class="date">${x[0]}<small>${x[1]}</small></div><div><strong>${x[2]}</strong><small>${x[3]}</small></div></div>`).join("")
: `<div class="empty-events"><span><i data-lucide="calendar-days"></i></span><strong>No family events yet</strong><small>Add birthdays, anniversaries and outings when you're ready.</small><button class="link" data-r="calendar">Open calendar</button></div>`;

return `${hero}
<div class="section-head"><h2>Your family</h2><button class="link" data-r="profile">View family</button></div>
<section class="quick">
<button class="qcard" data-r="memories"><span class="qicon"><i data-lucide="images"></i></span><strong>Memories</strong><small>Photos & albums</small></button>
<button class="qcard" data-r="tree"><span class="qicon"><i data-lucide="git-fork"></i></span><strong>Family Tree</strong><small>Our history</small></button>
<button class="qcard" data-r="calendar"><span class="qicon"><i data-lucide="calendar-days"></i></span><strong>Calendar</strong><small>Events & birthdays</small></button>
<button class="qcard" data-r="profile"><span class="qicon"><i data-lucide="users-round"></i></span><strong>Family</strong><small>Profiles & members</small></button>
</section>
<div class="section-head"><h2>${demo?"What's happening":"Start your Family Book"}</h2></div>
<section class="columns">
<div class="panel"><div class="section-head" style="margin-top:0"><h2>Recent memories</h2>${demo?'<button class="link" data-r="memories">See all</button>':""}</div>${memories}</div>
<div class="panel"><div class="section-head" style="margin-top:0"><h2>Upcoming</h2><button class="link" data-r="calendar">Calendar</button></div><div class="events">${upcoming}</div></div>
</section>`;
}


function memberStoreKey(){let u=FB_AUTH.get()||{};return `fb_members_${(u.family||D.family||"family").toLowerCase().replace(/\s+/g,"_")}`}
function relationshipStoreKey(){let u=FB_AUTH.get()||{};return `fb_relationships_${(u.family||D.family||"family").toLowerCase().replace(/\s+/g,"_")}`}
function getMembers(){try{return JSON.parse(localStorage.getItem(memberStoreKey())||"[]")}catch(e){return []}}
function saveMembers(v){localStorage.setItem(memberStoreKey(),JSON.stringify(v))}
function getRelationships(){try{return JSON.parse(localStorage.getItem(relationshipStoreKey())||"[]")}catch(e){return []}}
function saveRelationships(v){localStorage.setItem(relationshipStoreKey(),JSON.stringify(v))}
function memberInitials(name){let p=(name||"Family Member").trim().split(/\s+/).filter(Boolean);return esc(((p[0]?.[0]||"F")+(p.length>1?(p.at(-1)?.[0]||""):"")).toUpperCase())}
function ensureOwner(){
 let list=getMembers(),u=FB_AUTH.get()||{};
 if(!list.length&&u.name){list.push({id:"owner",name:u.name,relationship:"You",birthday:"",email:u.email||"",photo:""});saveMembers(list)}
 return list
}
const REL={
 parent_of:{label:"Parent of",reverse:"child_of"},
 child_of:{label:"Child of",reverse:"parent_of"},
 spouse_of:{label:"Spouse / Partner of",reverse:"spouse_of"},
 sibling_of:{label:"Sibling of",reverse:"sibling_of"},
 grandparent_of:{label:"Grandparent of",reverse:"grandchild_of"},
 grandchild_of:{label:"Grandchild of",reverse:"grandparent_of"}
};

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
 if(!a||!b||a===b||!REL[type])return;
 let rs=getRelationships(),key=`${a}|${type}|${b}`;
 if(!rs.some(x=>`${x.from}|${x.type}|${x.to}`===key))rs.push({id:"r"+Date.now()+Math.random(),from:a,type,to:b});
 let rev=REL[type].reverse,rkey=`${b}|${rev}|${a}`;
 if(!rs.some(x=>`${x.from}|${x.type}|${x.to}`===rkey))rs.push({id:"r"+Date.now()+Math.random(),from:b,type:rev,to:a});
 saveRelationships(rs)
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
 let list=ensureOwner(),family=esc(familyLabel());
 let cards=list.map(m=>{
 return `<article class="member-card"><button class="member-card-view" data-view-member="${esc(m.id)}" aria-label="View ${esc(m.name)}"><div class="member-avatar">${m.photo?`<img src="${m.photo}" alt="">`:`<span>${memberInitials(m.name)}</span>`}</div><div class="member-info"><h3>${esc(m.name)}</h3>${m.birthday?`<small><i data-lucide="cake-slice"></i>${esc(m.birthday)}</small>`:""}</div></button><div class="member-actions"><button class="member-more member-menu-btn" data-member-menu="${esc(m.id)}" aria-label="Options for ${esc(m.name)}"><i data-lucide="ellipsis-vertical"></i></button><div class="member-menu" data-member-menu-panel="${esc(m.id)}"><button data-view-member="${esc(m.id)}"><i data-lucide="eye"></i>View member</button><button data-edit-member="${esc(m.id)}"><i data-lucide="pencil"></i>Edit member</button><button class="danger" data-remove-member="${esc(m.id)}"><i data-lucide="trash-2"></i>Remove member</button></div></div></article>`}).join("");
 return `<section class="members-page"><div class="members-head"><div><p class="eyebrow">${family.toUpperCase()}</p><h1>Family Members</h1><p>Add people once, then connect them to the family.</p></div><button class="primary member-add" data-r="add-member"><i data-lucide="user-plus"></i>Add member</button></div><div class="members-grid">${cards}</div></section>`;
}
function relationshipRow(i,members){
 let opts=members.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
 let ropts=Object.entries(REL).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("");
 return `<div class="relationship-row" data-rel-row><select class="mfRelType"><option value="">Relationship</option>${ropts}</select><select class="mfRelPerson"><option value="">Connected to</option>${opts}</select><button type="button" class="remove-rel" aria-label="Remove relationship"><i data-lucide="x"></i></button></div>`;
}
function addMember(){
 let family=esc(familyLabel()),members=ensureOwner();
 return `<section class="member-form-page"><button class="back-link" data-r="members"><i data-lucide="arrow-left"></i>Back to members</button><div class="member-form-card"><div class="form-title"><div class="form-icon"><i data-lucide="user-plus"></i></div><div><p class="eyebrow">${family.toUpperCase()}</p><h1>Add Family Member</h1><p>Create their profile and connect them to people already in your family.</p></div></div><form id="memberForm"><div class="field-row"><label>First name<input id="mfFirst" required placeholder="First name"></label><label>Surname<input id="mfLast" required placeholder="Surname"></label></div><div class="field-row"><label>Birthday<input id="mfBirthday" type="date"></label><label>Email <span class="optional">(optional)</span><input id="mfEmail" type="email" placeholder="name@example.com"></label></div><label>Contact number <span class="optional">(optional)</span><input id="mfPhone" type="tel" placeholder="e.g. 082 123 4567" autocomplete="tel"></label><label>Profile photo <span class="optional">(optional)</span><input id="mfPhoto" type="file" accept="image/*"></label><div class="relationship-section"><div class="relationship-title"><div><h3>Family relationships</h3><p>Only relationships you explicitly add will appear in the family tree.</p></div></div><div id="relationshipRows">${relationshipRow(0,members)}</div><button type="button" id="addRelationship" class="add-rel"><i data-lucide="plus"></i>Add relationship</button></div><div class="form-actions"><button type="button" class="secondary" data-r="members">Cancel</button><button type="submit" class="primary"><i data-lucide="user-plus"></i>Save member</button></div></form></div></section>`;
}


function editMember(id){
 let list=ensureOwner(),m=list.find(x=>x.id===id);if(!m)return members();
 let parts=(m.name||"").trim().split(/\s+/),first=parts.shift()||"",last=parts.join(" ");
 let family=esc(familyLabel()),others=list.filter(x=>x.id!==id),existing=migrateRelationships().filter(r=>r.from===id);
 let validExisting=existing.filter(r=>REL[r.type]&&others.some(x=>x.id===r.to));
 let rows=validExisting.length?validExisting.map((r,i)=>{
   let opts=others.map(x=>`<option value="${esc(x.id)}" ${x.id===r.to?"selected":""}>${esc(x.name)}</option>`).join("");
   let ropts=Object.entries(REL).map(([k,v])=>`<option value="${k}" ${k===r.type?"selected":""}>${v.label}</option>`).join("");
   return `<div class="relationship-row" data-rel-row><select class="mfRelType"><option value="">Relationship</option>${ropts}</select><select class="mfRelPerson"><option value="">Connected to</option>${opts}</select><button type="button" class="remove-rel" aria-label="Remove relationship"><i data-lucide="x"></i></button></div>`
 }).join(""):relationshipRow(0,others);
 return `<section class="member-form-page"><button class="back-link" data-r="members"><i data-lucide="arrow-left"></i>Back to members</button><div class="member-form-card"><div class="form-title"><div class="form-icon"><i data-lucide="user-round-pen"></i></div><div><p class="eyebrow">${family.toUpperCase()}</p><h1>Edit Family Member</h1><p>Update this profile or change their family connections.</p></div></div>
 <form id="editMemberForm" data-member-id="${esc(id)}"><div class="field-row"><label>First name<input id="mfFirst" required value="${esc(first)}"></label><label>Surname<input id="mfLast" required value="${esc(last)}"></label></div><div class="field-row"><label>Birthday<input id="mfBirthday" type="date" value="${esc(m.birthday||"")}"></label><label>Email <span class="optional">(optional)</span><input id="mfEmail" type="email" value="${esc(m.email||"")}"></label></div><label>Contact number <span class="optional">(optional)</span><input id="mfPhone" type="tel" placeholder="e.g. 082 123 4567" autocomplete="tel" value="${esc(m.phone||"")}"></label><label>Profile photo <span class="optional">(leave blank to keep current)</span><input id="mfPhoto" type="file" accept="image/*"></label>
 <div class="relationship-section"><div class="relationship-title"><div><h3>Family relationships</h3><p>Add or remove explicit relationships. Spouse connections do not create parent links.</p></div></div><div id="relationshipRows">${rows}</div><button type="button" id="addRelationship" class="add-rel"><i data-lucide="plus"></i>Add relationship</button></div>
 <div class="form-actions"><button type="button" class="secondary" data-r="members">Cancel</button><button type="submit" class="primary"><i data-lucide="save"></i>Save changes</button></div></form></div></section>`;
}
function removeRelationshipsFor(id){
 let rs=migrateRelationships(),related=rs.filter(r=>r.from===id);
 let removeKeys=new Set();
 related.forEach(r=>{removeKeys.add(r.id);let rev=REL[r.type]?.reverse;rs.filter(x=>x.from===r.to&&x.to===id&&x.type===rev).forEach(x=>removeKeys.add(x.id))});
 saveRelationships(rs.filter(r=>!removeKeys.has(r.id)))
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
function treePersonHtml(m){
 const photo=m.photo?`<img src="${m.photo}" alt="">`:memberInitials(m.name);
 return `<button class="ct-person" data-view-member="${esc(m.id)}" aria-label="View ${esc(m.name)}"><span class="ct-avatar">${photo}</span><strong>${esc(m.name)}</strong></button>`;
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
function familyTree(){
 const G=familyGraph(),{members,byId,parents,spouse}=G;
 const owner=members.find(m=>m.id==="owner")||members[0];
 let rootId=owner?.id;
 if(owner && (parents[owner.id]||[]).length) rootId=parents[owner.id][0];
 // If the selected root is the spouse who merely joined the family, prefer the partner
 // with a known parent/child role in this Family Book.
 if(rootId && spouse[rootId] && !byId[rootId]) rootId=owner.id;
 const drawing=buildCoordinateTree(rootId,false);
 return `<section class="tree-page coordinate-tree-page">
   <div class="tree-head"><div><p class="eyebrow">${esc(familyLabel()).toUpperCase()}</p><h1>Family Tree</h1><p>Select a couple block to open their branch. Select a person's name to view their card.</p></div><button class="secondary tree-manage" data-r="members"><i data-lucide="users"></i>Manage members</button></div>
   <div class="ct-board">${drawing.html}</div>
 </section>`;
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
 const isSignedInMember=member.id==="owner" || (signedInEmail && memberEmail && signedInEmail===memberEmail);

 if(isSignedInMember){
   alert("You cannot remove the profile linked to the currently signed-in account.");
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
 const phone=m.phone?`<div class="profile-detail"><i data-lucide="phone"></i><div><span>Contact number</span><strong>${esc(m.phone)}</strong></div></div>`:"";
 const email=m.email?`<div class="profile-detail"><i data-lucide="mail"></i><div><span>Email</span><strong>${esc(m.email)}</strong></div></div>`:"";
 const birthday=m.birthday?`<div class="profile-detail"><i data-lucide="cake-slice"></i><div><span>Birthday</span><strong>${esc(m.birthday)}</strong></div></div>`:"";
 return `<section class="member-profile-view">
   <button class="fu-back" data-r="members"><i data-lucide="arrow-left"></i> Members</button>
   <div class="profile-view-card">
    <div class="profile-view-avatar">${m.photo?`<img src="${m.photo}" alt="">`:`<span>${memberInitials(m.name)}</span>`}</div>
    <h1>${esc(m.name)}</h1>
    <div class="profile-details">${birthday}${phone}${email}</div>
    <button class="secondary" data-edit-member="${esc(m.id)}"><i data-lucide="pencil"></i>Edit member</button>
   </div>
 </section>`;
}

function page(r){let m={memories:["Memories","Your private family photo library."],tree:["Family Tree","See generations and relationships."],calendar:["Family Calendar","Birthdays, anniversaries and family events."],profile:["Family","Profiles, members and account settings."]}[r];return `<div class="page-title"><p class="eyebrow">FAMILY BOOK V1.6</p><h1>${m[0]}</h1><p class="muted">${m[1]}</p></div><section class="placeholder"><h2>${r==="profile"?esc(familyLabel()):m[0]+" — coming in Build 2"}</h2><p class="muted">Navigation is working. This area is intentionally reserved for the next feature build.</p>${r==="profile"?`<div class="people">${D.people.map(p=>`<span class="person">${p}</span>`).join("")}</div><button class="logout" id="logout">Sign out of demo</button>`:`<button class="primary" data-r="home">Back home</button>`}</section>`}
function $(s){return document.querySelector(s)}function esc(v=""){return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
FB_AUTH.get()?shell():auth();

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
