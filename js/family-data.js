(function(){
  let loadedFamilyId=null;
  let people=[];
  let relationships=[];
  let storySettings={};
  let peopleSnapshot=new Map();
  let relationshipFingerprint="";
  let queue=Promise.resolve();
  const objectUrls=new Set();

  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const familyKey=()=>window.FB_AUTH?.familyStorageKey?.()||"family";
  const settingsKey=()=>{
    const u=auth(),id=String(u.memberId||u.email||"owner").toLowerCase().replace(/[^a-z0-9]+/g,"_");
    return `fb_settings_v2_${familyKey()}_${id}`;
  };

  function enqueue(fn){
    const run=queue.then(fn);
    queue=run.catch(err=>{
      console.error("Family Book cloud sync:",err);
      window.dispatchEvent(new CustomEvent("familybook:cloud-sync-error",{detail:{message:err?.message||String(err)}}));
    });
    return run;
  }

  function cloneRows(rows){return (rows||[]).map(x=>({...x}))}
  function pad(v){return String(v||"").padStart(2,"0")}
  function nameOf(p){return [p.first_name,p.surname].filter(Boolean).join(" ").trim()}

  function birthdayFrom(p){
    if(!p.birth_month||!p.birth_day)return "";
    const year=p.birth_year||2000;
    return `${String(year).padStart(4,"0")}-${pad(p.birth_month)}-${pad(p.birth_day)}`;
  }

  async function photoUrl(path){
    if(!path)return "";
    if(/^data:|^blob:|^https?:/i.test(path))return path;
    try{
      const {data,error}=await sb().storage.from(window.FB_SUPABASE_CONFIG.mediaBucket).download(path);
      if(error)throw error;
      const url=URL.createObjectURL(data);
      objectUrls.add(url);
      return url;
    }catch(err){
      console.warn("Could not load profile photo",path,err);
      return "";
    }
  }

  async function personFromRow(p){
    return {
      id:p.id,name:nameOf(p),profileType:p.profile_type||"member",
      relationship:p.profile_type==="history"?"Family history":"Family member",
      birthday:birthdayFrom(p),birthdayYearVisible:p.birth_year_visible!==false,
      email:p.email||"",phone:p.phone||"",photo:await photoUrl(p.photo_path),
      photoPath:p.photo_path||"",passedDate:p.passing_date||"",
      inMemory:!!p.in_memory,story:p.biography||"",
      managedProfile:!!p.managed_profile,accountId:p.account_user_id||"",
      canViewEmail:p.can_view_email!==false,canViewPhone:p.can_view_phone!==false
    };
  }

  function relationshipLocal(r){
    return {id:r.id,from:r.from_person_id,to:r.to_person_id,type:r.relationship_type};
  }

  function snapshotPerson(m){
    return JSON.stringify({
      id:m.id,name:m.name||"",profileType:m.profileType||"member",
      birthday:m.birthday||"",passedDate:m.passedDate||"",inMemory:!!m.inMemory,
      story:m.story||"",managedProfile:!!m.managedProfile,email:m.email||"",
      phone:m.phone||"",photoPath:m.photoPath||"",accountId:m.accountId||""
    });
  }

  function relFingerprint(rows){
    return JSON.stringify((rows||[]).map(r=>[r.from,r.type,r.to]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  }

  function writePrivacyToLocal(p){
    if(!p||!Object.keys(p).length)return;
    let base={};
    try{base=JSON.parse(localStorage.getItem(settingsKey())||"{}")||{}}catch(_){}
    base.notifications=base.notifications||{};
    base.appearance=base.appearance||{theme:"system"};
    base.privacy={
      ...(base.privacy||{}),
      phoneVisibility:p.phone_visibility||"family",
      emailVisibility:p.email_visibility||"family",
      showBirthdayYear:p.show_birthday_year!==false,
      showCheckins:p.show_checkins!==false,
      allowLocationPosts:p.allow_location_posts!==false
    };
    localStorage.setItem(settingsKey(),JSON.stringify(base));
  }

  function legacyStoryKey(){return `fb_story_${familyKey()}`}
  function readLegacyStory(){
    try{return JSON.parse(localStorage.getItem(legacyStoryKey())||"{}")||{}}catch(_){return {}}
  }

  async function saveStory(story){
    const next={
      memoryId:story?.memoryId||"",
      photoIndex:Math.max(0,Number(story?.photoIndex)||0),
      x:Math.max(0,Math.min(100,Number(story?.x)||50)),
      y:Math.max(0,Math.min(100,Number(story?.y)||50))
    };
    const {error}=await sb().rpc("save_family_story_settings",{
      p_memory_id:next.memoryId||null,
      p_photo_index:next.photoIndex,
      p_x:next.x,p_y:next.y
    });
    if(error)throw error;
    storySettings=next;
    return {...storySettings};
  }

  async function loadStory(){
    const {data,error}=await sb().rpc("get_family_story_settings");
    if(error)throw error;

    storySettings={
      memoryId:data?.memory_id?String(data.memory_id):"",
      photoIndex:Number(data?.photo_index)||0,
      x:Number.isFinite(Number(data?.x))?Number(data.x):50,
      y:Number.isFinite(Number(data?.y))?Number(data.y):50
    };

    const legacy=readLegacyStory();
    if(!storySettings.memoryId&&legacy?.memoryId){
      try{await saveStory(legacy)}
      catch(err){console.warn("Could not migrate old Family Story cover:",err)}
    }
    localStorage.removeItem(legacyStoryKey());
  }

  async function load(){
    const u=auth();
    if(!u.familyId)return;

    const {data,error}=await sb().rpc("get_family_people_bundle");
    if(error)throw error;

    const nextPeople=[];
    for(const row of (data?.people||[]))nextPeople.push(await personFromRow(row));
    people=nextPeople;
    relationships=(data?.relationships||[]).map(relationshipLocal);

    writePrivacyToLocal(data?.privacy||{});
    peopleSnapshot=new Map(people.map(m=>[m.id,snapshotPerson(m)]));
    relationshipFingerprint=relFingerprint(relationships);

    try{await loadStory()}
    catch(err){console.warn("Family Story settings unavailable:",err)}

    loadedFamilyId=u.familyId;
  }

  async function init(){
    const u=auth();
    if(!u.familyId)return;
    if(loadedFamilyId===u.familyId)return;
    await load();
  }

  function getPeople(){return cloneRows(people)}
  function getRelationships(){return cloneRows(relationships)}
  function getStory(){return {...storySettings}}

  function splitName(v){
    const p=String(v||"").trim().split(/\s+/).filter(Boolean);
    return {first:p.shift()||"",last:p.join(" ")};
  }

  async function removeStorage(paths){
    const unique=[...new Set((paths||[]).filter(Boolean))];
    if(!unique.length)return;
    const {error}=await sb().storage.from(window.FB_SUPABASE_CONFIG.mediaBucket).remove(unique);
    if(error)console.warn("Profile media cleanup:",error.message);
  }

  async function uploadPhoto(member){
    const photo=String(member?.photo||"");
    if(!photo)return "";
    if(!photo.startsWith("data:image/"))return member?.photoPath||"";

    const response=await fetch(photo),blob=await response.blob();
    const ext=blob.type==="image/png"?"png":"jpg",u=auth();
    const path=`${u.familyId}/${u.supabaseUserId}/profiles/${member.id}-${Date.now()}.${ext}`;
    const {error}=await sb().storage.from(window.FB_SUPABASE_CONFIG.mediaBucket).upload(path,blob,{
      contentType:blob.type||"image/jpeg",upsert:false,cacheControl:"3600"
    });
    if(error)throw error;
    return path;
  }

  async function persistPerson(member){
    const names=splitName(member.name);
    const previous=people.find(x=>x.id===member.id);
    const oldPhotoPath=previous?.photoPath||"";
    const photoPath=await uploadPhoto(member);

    const {data,error}=await sb().rpc("upsert_family_person",{
      p_person_id:member.id,p_profile_type:member.profileType||"member",
      p_first_name:names.first,p_surname:names.last||null,
      p_birthday:member.birthday||null,p_passing_date:member.passedDate||null,
      p_in_memory:!!member.inMemory,p_photo_path:photoPath||null,
      p_biography:member.story||null,p_managed_profile:!!member.managedProfile,
      p_email:member.email||null,p_phone:member.phone||null
    });
    if(error)throw error;

    member.photoPath=photoPath||"";
    const live=people.find(x=>x.id===member.id);
    if(live)live.photoPath=member.photoPath;
    if(oldPhotoPath&&oldPhotoPath!==photoPath)await removeStorage([oldPhotoPath]);
    peopleSnapshot.set(member.id,snapshotPerson(member));
    return data;
  }

  function syncMembers(list){
    if(!auth().familyId)return;
    const copy=cloneRows(list),before=cloneRows(people);
    people=copy;

    return enqueue(async()=>{
      const currentIds=new Set(copy.map(m=>m.id));
      for(const old of before){
        if(!currentIds.has(old.id)){
          const {error}=await sb().rpc("delete_family_person",{p_person_id:old.id});
          if(error)throw error;
          peopleSnapshot.delete(old.id);
          if(old.photoPath)await removeStorage([old.photoPath]);
        }
      }

      for(const m of copy){
        const cloudSnapshotChanged=peopleSnapshot.get(m.id)!==snapshotPerson(m);
        const hasNewPhoto=String(m.photo||"").startsWith("data:image/");
        const removedExistingPhoto=!m.photo&&!!m.photoPath;
        if(cloudSnapshotChanged||hasNewPhoto||removedExistingPhoto)await persistPerson(m);
      }
    });
  }

  function syncRelationships(rows){
    if(!auth().familyId||auth().role!=="admin")return;
    const copy=cloneRows(rows);
    relationships=copy;
    const fp=relFingerprint(copy);
    if(fp===relationshipFingerprint)return;

    return enqueue(async()=>{
      const {error}=await sb().rpc("replace_family_relationships",{
        p_relationships:copy.map(r=>({from:r.from,to:r.to,type:r.type}))
      });
      if(error)throw error;
      relationshipFingerprint=fp;
    });
  }

  function syncPrivacy(settings){
    const p=settings?.privacy;
    if(!p||!auth().familyId)return;
    enqueue(async()=>{
      const {error}=await sb().rpc("update_my_privacy_settings",{
        p_phone_visibility:p.phoneVisibility||"family",
        p_email_visibility:p.emailVisibility||"family",
        p_show_birthday_year:p.showBirthdayYear!==false,
        p_show_checkins:p.showCheckins!==false,
        p_allow_location_posts:p.allowLocationPosts!==false
      });
      if(error)throw error;
    });
  }

  async function reload(){loadedFamilyId=null;await init()}

  window.addEventListener("beforeunload",()=>{
    objectUrls.forEach(u=>URL.revokeObjectURL(u));objectUrls.clear();
  });

  window.FB_FAMILY_DATA={
    init,load,reload,getPeople,getRelationships,getStory,saveStory,
    syncMembers,syncRelationships,syncPrivacy,familyKey
  };
})();
