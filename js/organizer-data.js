(()=>{
  let loadedFamilyId="";
  let albums=[];
  let events=[];
  let queue=Promise.resolve();

  const sb=()=>window.FB_SUPABASE?.client;
  const user=()=>window.FB_AUTH?.get?.()||{};

  function enqueue(fn){
    queue=queue.then(fn).catch(err=>{
      console.error("Family Book organizer sync:",err);
      throw err;
    });
    return queue;
  }

  function albumFrom(row){
    return {
      id:String(row.id),
      name:row.name||"Untitled album",
      description:row.description||"",
      memoryIds:(row.memory_ids||[]).map(String),
      createdByUserId:row.created_by_user_id?String(row.created_by_user_id):"",
      createdAt:row.created_at?new Date(row.created_at).getTime():0,
      updatedAt:row.updated_at?new Date(row.updated_at).getTime():0
    };
  }

  function eventFrom(row){
    return {
      id:String(row.id),
      title:row.title||"",
      type:row.event_type||"family",
      date:row.event_date||"",
      startTime:row.start_time?String(row.start_time).slice(0,5):"",
      endTime:row.end_time?String(row.end_time).slice(0,5):"",
      location:row.location_name||"",
      lat:row.latitude==null?null:Number(row.latitude),
      lng:row.longitude==null?null:Number(row.longitude),
      notes:row.notes||"",
      recurringYearly:!!row.repeats_yearly,
      memberIds:(row.member_ids||[]).map(String),
      createdByUserId:row.created_by_user_id?String(row.created_by_user_id):"",
      createdAt:row.created_at?new Date(row.created_at).getTime():0,
      updatedAt:row.updated_at?new Date(row.updated_at).getTime():0
    };
  }

  async function load(){
    const u=user();
    if(!u.familyId)return;
    const {data,error}=await sb().rpc("get_family_organizer_bundle");
    if(error)throw error;

    albums=(data?.albums||[]).map(albumFrom)
      .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    events=(data?.events||[]).map(eventFrom);

    loadedFamilyId=u.familyId;
  }

  async function init(){
    const u=user();
    if(!u.familyId)return;
    if(loadedFamilyId===u.familyId)return;
    await load();
  }

  function getAlbums(){return albums.slice()}
  function getAlbum(id){return albums.find(a=>a.id===String(id))||null}
  function getEvents(){return events.slice()}
  function getEvent(id){return events.find(ev=>ev.id===String(id))||null}

  async function saveAlbum(album){
    const id=String(album.id||crypto.randomUUID());
    const {error}=await sb().rpc("save_family_album",{
      p_album_id:id,
      p_name:String(album.name||"").trim(),
      p_description:String(album.description||"").trim()||null,
      p_memory_ids:[...new Set((album.memoryIds||[]).filter(Boolean))]
    });
    if(error)throw error;
    await load();
    return getAlbum(id);
  }

  async function deleteAlbum(id){
    const {error}=await sb().rpc("delete_family_album",{p_album_id:id});
    if(error)throw error;
    await load();
  }

  async function saveEvent(event){
    const id=String(event.id||crypto.randomUUID());
    const {error}=await sb().rpc("save_family_event",{
      p_event_id:id,
      p_title:String(event.title||"").trim(),
      p_event_type:event.type||"family",
      p_event_date:event.date||null,
      p_start_time:event.startTime||null,
      p_end_time:event.endTime||null,
      p_location_name:String(event.location||"").trim()||null,
      p_latitude:event.lat??null,
      p_longitude:event.lng??null,
      p_notes:String(event.notes||"").trim()||null,
      p_repeats_yearly:!!event.recurringYearly,
      p_member_ids:[...new Set((event.memberIds||[]).filter(Boolean))]
    });
    if(error)throw error;
    await load();
    return getEvent(id);
  }

  async function deleteEvent(id){
    const {error}=await sb().rpc("delete_family_event",{p_event_id:id});
    if(error)throw error;
    await load();
  }

  window.FB_ORGANIZER_DATA={
    init,load,
    getAlbums,getAlbum,saveAlbum,deleteAlbum,
    getEvents,getEvent,saveEvent,deleteEvent
  };
})();
