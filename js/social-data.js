(()=>{
  let loadedFamilyId="";
  let posts=[];
  let commentsByTarget={};
  let reactionsByTarget={};
  let hiddenComments=new Set();
  let queue=Promise.resolve();

  const sb=()=>window.FB_SUPABASE?.client;
  const user=()=>window.FB_AUTH?.get?.()||{};
  const bucket=()=>window.FB_SUPABASE_CONFIG?.mediaBucket||"family-media";

  function members(){
    try{
      const k=window.FB_AUTH?.familyStorageKey?.()||"family";
      return JSON.parse(localStorage.getItem(`fb_members_${k}`)||"[]")||[];
    }catch(_){return []}
  }
  function memberMap(){return Object.fromEntries(members().map(m=>[m.id,m]))}
  function targetKey(type,id){return `${type}:${id}`}
  function parseTarget(target){
    const m=String(target||"").match(/^(post|memory):([0-9a-f-]{36})$/i);
    return m?{type:m[1].toLowerCase(),id:m[2]}:null;
  }
  function enqueue(fn){
    queue=queue.then(fn).catch(err=>{
      console.error("Family Book social sync:",err);
      alert(err?.message||"Family Wall could not sync this change.");
    });
    return queue;
  }

  async function signedUrlMap(paths){
    const list=[...new Set((paths||[]).filter(Boolean))];
    const map=new Map();
    if(!list.length)return map;
    const {data,error}=await sb().storage.from(bucket()).createSignedUrls(list,60*60*2);
    if(error)throw error;
    (data||[]).forEach((x,i)=>map.set(x.path||list[i],x.signedUrl||""));
    return map;
  }

  async function load(){
    const u=user();
    if(!u.familyId)return;
    const {data,error}=await sb().rpc("get_family_social_bundle");
    if(error)throw error;

    const people=memberMap();
    const rows=Array.isArray(data?.posts)?data.posts:[];
    const paths=[];
    rows.forEach(p=>{
      if(p.attachment_path)paths.push(p.attachment_path);
      if(p.attachment_thumbnail_path)paths.push(p.attachment_thumbnail_path);
    });
    const urls=await signedUrlMap(paths);

    posts=rows.map(p=>{
      const author=people[String(p.author_person_id)]||{};
      const attachment=p.attachment_path?{
        kind:p.attachment_type==="video"?"video":"image",
        blob:urls.get(p.attachment_path)||"",
        thumb:urls.get(p.attachment_thumbnail_path)||urls.get(p.attachment_path)||"",
        meta:{
          storagePath:p.attachment_path||"",
          thumbnailPath:p.attachment_thumbnail_path||""
        }
      }:null;
      return {
        id:String(p.id),
        authorId:String(p.author_person_id||""),
        authorName:author.name||"Family member",
        authorPhoto:author.photo||"",
        text:p.text||"",
        activity:p.activity_type||"update",
        location:p.location_name||"",
        lat:p.latitude==null?null:Number(p.latitude),
        lng:p.longitude==null?null:Number(p.longitude),
        media:attachment?{kind:attachment.kind}:null,
        attachment,
        canDelete:p.can_delete!==false,
        createdAt:p.created_at?new Date(p.created_at).getTime():0,
        updatedAt:p.updated_at?new Date(p.updated_at).getTime():0
      };
    }).sort((a,b)=>b.createdAt-a.createdAt);

    commentsByTarget={};
    (data?.comments||[]).forEach(c=>{
      const author=people[String(c.author_person_id)]||{};
      const key=targetKey(c.target_type,String(c.target_id));
      (commentsByTarget[key]??=[]).push({
        id:String(c.id),
        target:key,
        authorId:String(c.author_person_id||""),
        authorName:author.name||"Family member",
        authorPhoto:author.photo||"",
        text:c.text||"",
        createdAt:c.created_at?new Date(c.created_at).getTime():0,
        canDelete:c.can_delete!==false
      });
    });

    reactionsByTarget={};
    (data?.reactions||[]).forEach(r=>{
      const key=targetKey(r.target_type,String(r.target_id));
      const person=people[String(r.person_id)]||{};
      reactionsByTarget[key]??={};
      reactionsByTarget[key][String(r.user_id)]={
        type:r.reaction_type,
        personId:String(r.person_id||""),
        name:person.name||"Family member",
        photo:person.photo||"",
        at:r.created_at?new Date(r.created_at).getTime():0
      };
    });

    hiddenComments=new Set((data?.hidden_comments||[]).map(x=>String(x.comment_id)));
    loadedFamilyId=u.familyId;
  }

  async function init(){
    const u=user();
    if(!u.familyId)return;
    if(loadedFamilyId===u.familyId)return;
    await load();
  }

  function getPosts(){return posts.slice()}
  function getComments(target){return (commentsByTarget[target]||[]).slice()}
  function getReactions(target){return {...(reactionsByTarget[target]||{})}}
  function getHidden(){return new Set(hiddenComments)}

  function ext(type,kind){
    const t=String(type||"").toLowerCase();
    if(t==="image/webp")return "webp";
    if(t==="image/png")return "png";
    if(t==="image/jpeg")return "jpg";
    if(t==="video/webm")return "webm";
    if(t==="video/quicktime")return "mov";
    if(t==="video/mp4")return "mp4";
    return kind==="video"?"mp4":"jpg";
  }

  async function upload(path,blob){
    const {error}=await sb().storage.from(bucket()).upload(path,blob,{
      contentType:blob.type||"application/octet-stream",
      upsert:false,
      cacheControl:"3600"
    });
    if(error)throw error;
    return path;
  }
  async function removeFiles(paths){
    const unique=[...new Set((paths||[]).filter(Boolean))];
    if(!unique.length)return;
    const {error}=await sb().storage.from(bucket()).remove(unique);
    if(error)console.warn("Wall media cleanup:",error.message);
  }

  async function savePost(post,attachment){
    const u=user();
    const id=String(post.id||crypto.randomUUID());
    let attachmentType=null,attachmentPath=null,thumbPath=null;
    const uploaded=[];

    try{
      if(attachment){
        const token=crypto.randomUUID();
        attachmentType=attachment.kind==="video"?"video":"image";
        attachmentPath=`${u.familyId}/${u.supabaseUserId}/wall/${id}/${token}.${ext(attachment.blob?.type||attachment.meta?.type,attachmentType)}`;
        await upload(attachmentPath,attachment.blob);
        uploaded.push(attachmentPath);

        if(attachment.thumb instanceof Blob){
          thumbPath=`${u.familyId}/${u.supabaseUserId}/thumbnails/${id}/${token}.${ext(attachment.thumb.type,"image")}`;
          await upload(thumbPath,attachment.thumb);
          uploaded.push(thumbPath);
        }
      }

      const {error}=await sb().rpc("save_wall_post",{
        p_post_id:id,
        p_text:post.text||null,
        p_activity_type:post.activity||"update",
        p_location_name:post.location||null,
        p_latitude:post.lat??null,
        p_longitude:post.lng??null,
        p_attachment_type:attachmentType,
        p_attachment_path:attachmentPath,
        p_attachment_thumbnail_path:thumbPath
      });
      if(error)throw error;

      await load();
      return posts.find(p=>p.id===id)||null;
    }catch(err){
      await removeFiles(uploaded);
      throw err;
    }
  }

  async function deletePost(id){
    const {data,error}=await sb().rpc("delete_wall_post",{p_post_id:id});
    if(error)throw error;
    await removeFiles([data?.attachment_path,data?.thumbnail_path]);
    await load();
  }

  async function addComment(target,text){
    const parsed=parseTarget(target);
    if(!parsed)throw new Error("Invalid comment target.");
    const clean=String(text||"").trim();
    if(!clean)return null;

    const {data,error}=await sb().rpc("add_family_comment",{
      p_target_type:parsed.type,
      p_target_id:parsed.id,
      p_text:clean.slice(0,500)
    });
    if(error)throw error;
    await load();
    return getComments(target).find(c=>c.id===String(data))||null;
  }

  async function deleteComment(id){
    const {error}=await sb().rpc("delete_family_comment",{p_comment_id:id});
    if(error)throw error;
    await load();
  }

  async function setHidden(id,hidden){
    const {error}=await sb().rpc("set_family_comment_hidden",{p_comment_id:id,p_hidden:!!hidden});
    if(error)throw error;
    if(hidden)hiddenComments.add(String(id));else hiddenComments.delete(String(id));
  }

  async function setReaction(target,type){
    const parsed=parseTarget(target);
    if(!parsed)throw new Error("Invalid reaction target.");
    const current=getReactions(target);
    const uid=user().supabaseUserId||"";
    const next=current[uid]?.type===type?null:type;

    const {error}=await sb().rpc("set_family_reaction",{
      p_target_type:parsed.type,
      p_target_id:parsed.id,
      p_reaction_type:next
    });
    if(error)throw error;
    await load();
    return next;
  }

  window.FB_SOCIAL_DATA={
    init,load,getPosts,getComments,getReactions,getHidden,
    savePost,deletePost,addComment,deleteComment,setHidden,setReaction
  };
})();
