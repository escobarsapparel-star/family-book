(()=>{
  let loadedFamilyId="";
  let albums=[];
  let events=[];
  let queue=Promise.resolve();

  const sb=()=>window.FB_SUPABASE?.client;
  const user=()=>window.FB_AUTH?.get?.()||{};

  function enqueue(fn){
    const run=queue.then(fn);
    queue=run.catch(err=>console.error("Family Book organizer sync:",err));
    return run;
  }

  async function signedUrlMap(paths){
    return window.FB_MEDIA.signedUrlMap(paths,60*60*2);
  }

  function albumFrom(row,urls){
    return {
      id:String(row.id),
      name:row.name||"Untitled album",
      description:row.description||"",
      memoryIds:(row.memory_ids||[]).map(String),
      media:(row.media||[]).map(m=>({
        id:String(m.id),
        storagePath:m.storage_path||"",
        thumbnailPath:m.thumbnail_path||"",
        image:urls.get(m.storage_path)||"",
        thumb:urls.get(m.thumbnail_path)||urls.get(m.storage_path)||"",
        name:m.original_filename||"Album photo",
        type:m.mime_type||"image/webp",
        width:m.width==null?null:Number(m.width),
        height:m.height==null?null:Number(m.height),
        sortOrder:Number(m.display_order)||0,
        uploadedByUserId:m.uploaded_by_user_id?String(m.uploaded_by_user_id):"",
        createdAt:m.created_at?new Date(m.created_at).getTime():0
      })),
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

    const paths=[];
    (data?.albums||[]).forEach(a=>(a.media||[]).forEach(m=>{
      if(m.storage_path)paths.push(m.storage_path);
      if(m.thumbnail_path)paths.push(m.thumbnail_path);
    }));
    const urls=await signedUrlMap(paths);

    albums=(data?.albums||[]).map(row=>albumFrom(row,urls))
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

  async function uploadObject(path,blob){
    await window.FB_MEDIA.upload(path,blob,{
      contentType:blob.type||"application/octet-stream",
      upsert:false,
      cacheControl:"3600"
    });
  }

  async function removeStorage(paths){
    await window.FB_MEDIA.remove(paths,{silent:true});
  }

  async function uploadAlbumPhotos(albumId,prepared){
    const u=user();
    if(!u.familyId||!u.supabaseUserId)throw new Error("Your Family Book session is not ready.");
    const album=getAlbum(albumId);
    if(!album)throw new Error("Save the Album before adding photos.");

    const metadata=[],uploaded=[];
    try{
      for(const p of (prepared||[])){
        const id=crypto.randomUUID();
        const base=`${u.familyId}/${u.supabaseUserId}/albums/${albumId}/${id}`;
        const main=`${base}.webp`,thumb=`${base}-thumb.webp`;
        await uploadObject(main,p.image);
        uploaded.push(main);
        await uploadObject(thumb,p.thumb);
        uploaded.push(thumb);
        metadata.push({
          id,
          storage_path:main,
          thumbnail_path:thumb,
          original_filename:p.name||"album-photo",
          mime_type:"image/webp",
          width:p.width||null,
          height:p.height||null
        });
      }

      const {error}=await sb().rpc("add_family_album_media",{
        p_album_id:albumId,
        p_items:metadata
      });
      if(error)throw error;

      await load();
      return getAlbum(albumId);
    }catch(err){
      await removeStorage(uploaded);
      throw err;
    }
  }

  async function deleteAlbumMedia(mediaId){
    const {data,error}=await sb().rpc("delete_family_album_media",{p_media_id:mediaId});
    if(error)throw error;
    await removeStorage([data?.storage_path,data?.thumbnail_path]);
    await load();
  }

  async function deleteAlbum(id){
    const album=getAlbum(id);
    const paths=(album?.media||[]).flatMap(m=>[m.storagePath,m.thumbnailPath]).filter(Boolean);
    const {error}=await sb().rpc("delete_family_album",{p_album_id:id});
    if(error)throw error;
    await removeStorage(paths);
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
    getAlbums,getAlbum,saveAlbum,deleteAlbum,uploadAlbumPhotos,deleteAlbumMedia,
    getEvents,getEvent,saveEvent,deleteEvent
  };
})();
