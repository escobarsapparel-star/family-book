(()=>{
  let loadedFamilyId="";
  let notesByPerson={};

  const sb=()=>window.FB_SUPABASE?.client;
  const user=()=>window.FB_AUTH?.get?.()||{};

  function members(){return window.FB_FAMILY_DATA?.getPeople?.()||[]}

  function mapPeople(){return Object.fromEntries(members().map(m=>[m.id,m]))}

  async function load(){
    const u=user();
    if(!u.familyId)return;
    const {data,error}=await sb().rpc("get_family_history_notes");
    if(error)throw error;

    const people=mapPeople();
    notesByPerson={};
    (data||[]).forEach(row=>{
      const author=people[String(row.author_person_id)]||{};
      const note={
        id:String(row.id),
        personId:String(row.person_id),
        type:row.note_type||"story",
        text:row.text||"",
        authorId:String(row.author_person_id||""),
        authorUserId:String(row.author_user_id||""),
        authorName:author.name||"Family member",
        authorPhoto:author.photo||"",
        canDelete:row.can_delete!==false,
        createdAt:row.created_at?new Date(row.created_at).getTime():0,
        updatedAt:row.updated_at?new Date(row.updated_at).getTime():0
      };
      (notesByPerson[note.personId]??=[]).push(note);
    });

    Object.values(notesByPerson).forEach(rows=>rows.sort((a,b)=>b.createdAt-a.createdAt));
    loadedFamilyId=u.familyId;
  }

  async function init(){
    const u=user();
    if(!u.familyId)return;
    if(loadedFamilyId===u.familyId)return;
    await load();
  }

  function get(personId){return (notesByPerson[String(personId)]||[]).slice()}

  async function add(personId,type,text){
    const clean=String(text||"").trim();
    if(!clean)return false;
    const {error}=await sb().rpc("add_family_history_note",{
      p_person_id:personId,
      p_note_type:["story","memory","note"].includes(type)?type:"story",
      p_text:clean.slice(0,1600)
    });
    if(error)throw error;
    await load();
    return true;
  }

  async function remove(noteId){
    const {error}=await sb().rpc("delete_family_history_note",{p_note_id:noteId});
    if(error)throw error;
    await load();
    return true;
  }

  window.FB_HISTORY_DATA={init,load,get,add,remove};
})();
