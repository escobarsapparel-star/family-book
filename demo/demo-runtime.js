(()=>{
  window.FB_DEMO_MODE=true;


  const clone=v=>JSON.parse(JSON.stringify(v));
  const now=Date.now();
  const day=24*60*60*1000;

  const user={
    name:"Daniel Williams",
    email:"demo@familybook.local",
    family:"Williams Family",
    familyId:"demo-family",
    memberId:"owner",
    supabaseUserId:"demo-user",
    role:"member",
    needsSetup:false,
    photo:""
  };

  let people=[
    {id:"grandpa",name:"Robert Williams",first:"Robert",last:"Williams",relationship:"Grandfather",birthday:"1951-03-12",sex:"male",phone:"",email:"",photo:"",profileType:"member"},
    {id:"grandma",name:"Grace Williams",first:"Grace",last:"Williams",relationship:"Grandmother",birthday:"1954-08-21",sex:"female",phone:"",email:"",photo:"",profileType:"member"},
    {id:"owner",name:"Daniel Williams",first:"Daniel",last:"Williams",relationship:"Father",birthday:"1984-11-08",sex:"male",phone:"+27 82 555 0142",email:"daniel@example.com",photo:"",profileType:"member",accountId:"demo-user"},
    {id:"sarah",name:"Sarah Williams",first:"Sarah",last:"Williams",relationship:"Mother",birthday:"1986-05-17",sex:"female",phone:"+27 83 555 0186",email:"sarah@example.com",photo:"",profileType:"member"},
    {id:"ethan",name:"Ethan Williams",first:"Ethan",last:"Williams",relationship:"Son",birthday:"2011-10-18",sex:"male",phone:"",email:"",photo:"",profileType:"member"},
    {id:"mia",name:"Mia Williams",first:"Mia",last:"Williams",relationship:"Daughter",birthday:"2014-02-26",sex:"female",phone:"",email:"",photo:"",profileType:"member"},
    {id:"olivia",name:"Olivia Williams",first:"Olivia",last:"Williams",relationship:"Sister",birthday:"1989-06-09",sex:"female",phone:"",email:"",photo:"",profileType:"member"}
  ];

  let relationships=[
    {id:"r1",type:"spouse_of",from:"grandpa",to:"grandma"},
    {id:"r2",type:"spouse_of",from:"grandma",to:"grandpa"},
    {id:"r3",type:"parent_of",from:"grandpa",to:"owner"},
    {id:"r4",type:"parent_of",from:"grandma",to:"owner"},
    {id:"r5",type:"parent_of",from:"grandpa",to:"olivia"},
    {id:"r6",type:"parent_of",from:"grandma",to:"olivia"},
    {id:"r7",type:"spouse_of",from:"owner",to:"sarah"},
    {id:"r8",type:"spouse_of",from:"sarah",to:"owner"},
    {id:"r9",type:"parent_of",from:"owner",to:"ethan"},
    {id:"r10",type:"parent_of",from:"sarah",to:"ethan"},
    {id:"r11",type:"parent_of",from:"owner",to:"mia"},
    {id:"r12",type:"parent_of",from:"sarah",to:"mia"}
  ];

  const memoryIds=[
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
    "44444444-4444-4444-8444-444444444444"
  ];

  let memories=[
    {id:memoryIds[0],caption:"Sunday lunch together",date:"2026-09-20",time:"13:15",tags:["owner","sarah","ethan","mia"],authorId:"sarah",authorName:"Sarah Williams",createdAt:now-7*day,photos:[{kind:"image",image:"assets/images/family-album.jpg",thumb:"assets/images/family-album.jpg"}]},
    {id:memoryIds[1],caption:"Beach day",date:"2026-08-30",time:"11:20",tags:["owner","sarah","ethan","mia"],authorId:"owner",authorName:"Daniel Williams",createdAt:now-28*day,photos:[{kind:"image",image:"assets/images/memory-1.jpg",thumb:"assets/images/memory-1.jpg"}]},
    {id:memoryIds[2],caption:"Found in Grandma's album",date:"1998-12-24",time:"",tags:["grandpa","grandma","owner","olivia"],authorId:"grandma",authorName:"Grace Williams",createdAt:now-50*day,photos:[{kind:"image",image:"assets/images/memory-2.jpg",thumb:"assets/images/memory-2.jpg"}]},
    {id:memoryIds[3],caption:"Family celebration",date:"2026-06-15",time:"18:30",tags:["owner","sarah","ethan","mia","olivia"],authorId:"owner",authorName:"Daniel Williams",createdAt:now-100*day,photos:[{kind:"image",image:"assets/images/memory-3.jpg",thumb:"assets/images/memory-3.jpg"}]}
  ];

  let posts=[
    {id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",authorId:"sarah",authorName:"Sarah Williams",authorPhoto:"",text:"Sunday lunch with everyone together. These are the moments we want to remember. ❤️",activity:"update",createdAt:now-40*60*1000,media:{kind:"image",image:"assets/images/family-album.jpg",thumb:"assets/images/family-album.jpg"}},
    {id:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",authorId:"grandma",authorName:"Grace Williams",authorPhoto:"",text:"Found this in the old family album. So many stories in one photograph.",activity:"update",createdAt:now-26*60*60*1000,media:{kind:"image",image:"assets/images/memory-2.jpg",thumb:"assets/images/memory-2.jpg"}},
    {id:"cccccccc-cccc-4ccc-8ccc-cccccccccccc",authorId:"owner",authorName:"Daniel Williams",authorPhoto:"",text:"Planning our next family braai for the first weekend in October.",activity:"thinking",createdAt:now-3*day}
  ];

  let comments={};
  let reactions={};

  const year=new Date().getFullYear();
  let events=[
    {id:"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",title:"Family Braai",type:"family",date:`${year}-10-04`,startTime:"13:00",endTime:"17:00",location:"Home",notes:"Bring your favourite side dish.",recurringYearly:false,memberIds:["owner","sarah","ethan","mia","olivia"]},
    {id:"ffffffff-ffff-4fff-8fff-ffffffffffff",title:"School concert",type:"school",date:`${year}-10-16`,startTime:"18:00",endTime:"20:00",location:"School Hall",notes:"Mia's school concert.",recurringYearly:false,memberIds:["mia","owner","sarah"]},
    {id:"12121212-1212-4212-8212-121212121212",title:"Family anniversary",type:"anniversary",date:`${year}-11-22`,startTime:"",endTime:"",location:"",notes:"Family anniversary.",recurringYearly:true,memberIds:["grandpa","grandma"]}
  ];

  let albums=[
    {id:"album-1",name:"Family Holidays",description:"Trips and days away together",memoryIds:[memoryIds[1],memoryIds[3]],coverMemoryId:memoryIds[1]},
    {id:"album-2",name:"Old Family Photos",description:"Photos from earlier generations",memoryIds:[memoryIds[2]],coverMemoryId:memoryIds[2]}
  ];

  const story={title:"The Williams Family",subtitle:"Our family. Our memories. Our story.",coverPhoto:"assets/images/family-album.jpg",coverPosition:"50% 50%"};

  function demoNotice(message="This is a read-only guest demo. Changes are kept only for this visit."){
    let n=document.querySelector("#fbDemoNotice");
    if(!n){
      n=document.createElement("div");
      n.id="fbDemoNotice";
      n.className="fb-demo-toast";
      document.body.appendChild(n);
    }
    n.textContent=message;
    n.classList.add("show");
    clearTimeout(n._t);
    n._t=setTimeout(()=>n.classList.remove("show"),2400);
  }

  const oldAuth=window.FB_AUTH||{};
  window.FB_AUTH={
    ...oldAuth,
    init:async()=>user,
    refresh:async()=>user,
    get:()=>user,
    getSession:()=>({user:{id:"demo-user",email:user.email}}),
    isReady:()=>true,
    needsSetup:()=>false,
    isSession:()=>true,
    backend:()=>false,
    familyStorageKey:()=>"demo_williams_family",
    update:patch=>Object.assign(user,patch||{}),
    logout:async()=>user,
    renderSetup:()=>{},
    signInWithPassword:async()=>user,
    signUp:async()=>({needsConfirmation:false}),
    signInWithGoogle:async()=>user
  };

  window.FB_MEDIA={
    ...(window.FB_MEDIA||{}),
    signedUrlMap:async paths=>Object.fromEntries((paths||[]).map(p=>[p,p])),
    getSignedUrl:async path=>path,
    upload:async()=>({path:"demo-only"}),
    remove:async()=>true,
    clearSignedUrlCache:()=>{}
  };

  function fireFamilyUpdate(reason){
    window.dispatchEvent(new CustomEvent("familybook:family-data-updated",{detail:{reason:reason||"demo"}}));
  }

  window.FB_FAMILY_DATA={
    init:async()=>true,load:async()=>true,reload:async()=>true,
    startRealtime:()=>{},stopRealtime:()=>{},
    getPeople:()=>clone(people),
    getRelationships:()=>clone(relationships),
    getStory:()=>clone(story),
    saveStory:async()=>clone(story),
    uploadStoryCover:async()=>clone(story),
    syncMembers:async rows=>{people=clone(rows||[]);fireFamilyUpdate("demo-members");return clone(people)},
    syncRelationships:async rows=>{relationships=clone(rows||[]);fireFamilyUpdate("demo-relationships");return clone(relationships)},
    syncPersonRelationships:async()=>true,
    syncPrivacy:async()=>true,
    isReady:()=>true,
    familyKey:()=>"demo_williams_family"
  };

  window.FB_SOCIAL_DATA={
    init:async()=>true,load:async()=>true,
    getPosts:()=>clone(posts),
    getComments:target=>clone(comments[target]||[]),
    getReactions:target=>clone(reactions[target]||{}),
    getHidden:()=>new Set(),
    savePost:async(post,attachment)=>{
      const row={...post,media:attachment?{kind:attachment.kind||"image"}:null};
      posts.unshift(row);return clone(row);
    },
    deletePost:async id=>{posts=posts.filter(p=>p.id!==id)},
    addComment:async(target,text)=>{
      const row={id:crypto.randomUUID(),authorId:"owner",authorName:user.name,text:String(text||""),createdAt:Date.now()};
      (comments[target]??=[]).push(row);return clone(row);
    },
    deleteComment:async id=>{Object.keys(comments).forEach(k=>comments[k]=comments[k].filter(c=>c.id!==id))},
    setHidden:async()=>true,
    setReaction:async(target,type)=>{
      reactions[target]??={};
      const key="demo-user";
      if(reactions[target][key]?.type===type)delete reactions[target][key];
      else reactions[target][key]={type,name:user.name};
      return type;
    }
  };

  const organizer=window.FB_ORGANIZER_DATA||{};
  window.FB_ORGANIZER_DATA={
    ...organizer,
    init:async()=>true,load:async()=>true,
    getEvents:()=>clone(events),
    getEvent:id=>clone(events.find(e=>String(e.id)===String(id))||null),
    saveEvent:async row=>{
      const i=events.findIndex(e=>e.id===row.id);
      if(i>=0)events[i]=clone(row);else events.push(clone(row));
      demoNotice("Demo event updated for this visit only.");
      return clone(row);
    },
    deleteEvent:async id=>{events=events.filter(e=>e.id!==id);return true},
    getAlbums:()=>clone(albums),
    getAlbum:id=>clone(albums.find(a=>String(a.id)===String(id))||null),
    saveAlbum:async row=>{
      const i=albums.findIndex(a=>a.id===row.id);
      if(i>=0)albums[i]=clone(row);else albums.push(clone(row));
      return clone(row);
    },
    deleteAlbum:async id=>{albums=albums.filter(a=>a.id!==id);return true}
  };

  const historyData=window.FB_HISTORY_DATA||{};
  window.FB_HISTORY_DATA={...historyData,init:async()=>true,load:async()=>true};
  const noteData=window.FB_NOTIFICATION_DATA||{};
  window.FB_NOTIFICATION_DATA={...noteData,init:async()=>true,loadNotifications:async()=>[],getNotifications:()=>[]};

  const memoryApi=window.FB_MEMORIES||{};
  const originalMemoryPageShell=memoryApi.pageShell;
  const originalMemoryDetailShell=memoryApi.detailShell;
  const originalMemoryEditorShell=memoryApi.editorShell;

  function memoryPhoto(memory){
    return memory?.photos?.[0]?.thumb||memory?.photos?.[0]?.image||"";
  }
  function fmtDate(value){
    if(!value)return "Family memory";
    try{return new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value+"T12:00:00"))}catch(_){return value}
  }
  function esc(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

  function bindDemoMemoryLibrary(){
    const el=document.querySelector("#memoryLibrary");
    if(!el)return;
    const search=document.querySelector("#memorySearch");
    const count=document.querySelector("#memoryResultCount");
    const memberMap=Object.fromEntries(people.map(p=>[p.id,p]));
    const render=()=>{
      const q=String(search?.value||"").trim().toLowerCase();
      const rows=memories.filter(m=>{
        const names=(m.tags||[]).map(id=>memberMap[id]?.name||"").join(" ");
        return !q||[m.caption,m.date,names].join(" ").toLowerCase().includes(q);
      });
      if(count)count.textContent=`${rows.length} of ${memories.length} memories`;
      el.className="memory-gallery";
      el.innerHTML=rows.map(m=>{
        const tags=(m.tags||[]).map(id=>memberMap[id]?.name).filter(Boolean);
        const src=memoryPhoto(m);
        return `<button class="memory-card" data-r="view-memory:${esc(m.id)}"><span class="memory-card-photo">${src?`<img src="${esc(src)}" alt="${esc(m.caption)}">`:""} </span><span class="memory-card-copy"><small>${esc(fmtDate(m.date))}</small><strong>${esc(m.caption)}</strong>${tags.length?`<span class="memory-card-tags"><i data-lucide="users-round"></i>${esc(tags.slice(0,3).join(", "))}</span>`:""}</span></button>`;
      }).join("");
      el.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>window.go?.(b.dataset.r));
      window.icons?.();
    };
    search?.addEventListener("input",render);
    document.querySelector("#memoryFilterToggle")?.addEventListener("click",()=>demoNotice("Demo filters are simplified in Guest Demo."));
    document.querySelector("#memoryClearFilters")?.addEventListener("click",()=>{if(search)search.value="";render()});
    render();
  }

  function bindDemoMemoryDetail(id){
    const mount=document.querySelector("#memoryDetailMount");
    const m=memories.find(x=>String(x.id)===String(id));
    if(!mount)return;
    if(!m){
      mount.innerHTML='<div class="memory-error"><h3>Memory not found</h3></div>';
      return;
    }
    const names=(m.tags||[]).map(pid=>people.find(p=>p.id===pid)?.name).filter(Boolean);
    mount.className="memory-editor-card fb-demo-memory-detail";
    mount.innerHTML=`<div class="memory-editor-title"><div><p class="eyebrow">FAMILY MEMORY</p><h1>${esc(m.caption)}</h1><p>${esc(fmtDate(m.date))}${m.time?` · ${esc(m.time)}`:""}</p></div><i data-lucide="heart"></i></div><div class="fb-demo-memory-photo"><img src="${esc(memoryPhoto(m))}" alt="${esc(m.caption)}"></div><div class="fb-demo-memory-meta"><strong>People in this memory</strong><p>${esc(names.join(" · "))}</p><small>Guest Demo uses fictional family information only.</small></div>`;
    window.icons?.();
  }

  function bindDemoMemoryEditor(){
    const mount=document.querySelector("#memoryEditorMount");
    if(!mount)return;
    mount.className="memory-editor-card";
    mount.innerHTML='<div class="memory-editor-title"><div><p class="eyebrow">GUEST DEMO</p><h1>Adding memories is disabled here</h1><p>The real FamilyBook lets family members upload photos and video clips, tag people and preserve the story behind the moment.</p></div><i data-lucide="shield-check"></i></div><button class="primary" type="button" data-r="memories">Back to demo memories</button>';
    mount.querySelector("[data-r]")?.addEventListener("click",e=>window.go?.(e.currentTarget.dataset.r));
    window.icons?.();
  }

  window.FB_MEMORIES={
    ...memoryApi,
    pageShell:originalMemoryPageShell,
    editorShell:originalMemoryEditorShell,
    detailShell:originalMemoryDetailShell,
    getAll:async()=>clone(memories),
    getOne:async id=>clone(memories.find(m=>String(m.id)===String(id))||null),
    getPhotos:m=>clone(m?.photos||[]),
    refresh:async()=>clone(memories),
    removePersonTag:async()=>true,
    bindRoute:route=>{
      if(route==="memories")bindDemoMemoryLibrary();
      else if(route==="add-memory"||route.startsWith("edit-memory:"))bindDemoMemoryEditor();
      else if(route.startsWith("view-memory:"))bindDemoMemoryDetail(route.split(":")[1]);
    }
  };

  const albumApi=window.FB_ALBUMS||{};
  if(albumApi){
    window.FB_ALBUMS={
      ...albumApi,
      getAll:()=>clone(albums),
      getOne:id=>clone(albums.find(a=>String(a.id)===String(id))||null)
    };
  }

  const funApi=window.FB_FAMILY_FUN||{};
  if(funApi){
    window.FB_FAMILY_FUN={
      ...funApi,
      bindRoute:()=>{
        window.icons?.();
        document.querySelector('[data-family-fun-feature="camera"]')?.addEventListener("click",()=>demoNotice("Camera recording is disabled in Guest Demo."));
      },
      bindGalleryRoute:()=>{
        window.icons?.();
        const empty=document.querySelector("#funGalleryEmpty");
        const count=document.querySelector("#funGalleryCount");
        if(count)count.textContent="Demo gallery";
        if(empty){
          empty.innerHTML='<span class="fun-empty-icon"><i data-lucide="film"></i></span><strong>Family Fun Gallery</strong><p>In a real family account, privately saved Family Fun videos appear here.</p>';
          window.icons?.();
        }
      },
      cleanup:()=>{}
    };
  }

  document.addEventListener("click",event=>{
    const signout=event.target.closest("#logout,.profile-popover-signout,[data-fb-menu='signout']");
    if(signout){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      location.href="./";
      return;
    }
  },true);

  function addBadge(){
    if(document.querySelector(".fb-demo-badge"))return;
    const badge=document.createElement("div");
    badge.className="fb-demo-badge";
    badge.innerHTML='<strong>GUEST DEMO</strong><span>Fictional family · nothing is saved</span>';
    document.body.appendChild(badge);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addBadge,{once:true});
  else addBadge();

  window.FB_DEMO={user,people:()=>clone(people),memories:()=>clone(memories),posts:()=>clone(posts),notice:demoNotice};
})();