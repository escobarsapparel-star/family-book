(()=>{
  const familyData=window.FB_FAMILY_DATA;
  if(!familyData||familyData.__memberRelationshipSyncEnabled)return;
  familyData.__memberRelationshipSyncEnabled=true;

  const original=typeof familyData.syncRelationships==='function'
    ? familyData.syncRelationships.bind(familyData)
    : null;

  familyData.syncRelationships=async function(rows){
    const u=window.FB_AUTH?.get?.()||{};
    if(!u.familyId)return;

    // Family Admins keep the existing full-tree save path.
    if(u.role==='admin')return original?.(rows);

    const client=window.FB_SUPABASE?.client;
    if(!client)throw new Error('Family Book is not connected to the family database yet.');
    if(!u.memberId)throw new Error('Your family profile is not linked to this account yet.');

    // A connected member saves only relationships attached to their own
    // Person profile. The backend adds/replaces the reverse relationship too,
    // so the shared tree stays consistent for everybody in the family.
    const myId=String(u.memberId);
    const copy=(Array.isArray(rows)?rows:[])
      .filter(r=>r&&r.from&&r.to&&r.type&&(String(r.from)===myId||String(r.to)===myId))
      .map(r=>({from:String(r.from),to:String(r.to),type:String(r.type)}));

    const {error}=await client.rpc('replace_my_family_relationships',{
      p_relationships:copy
    });

    if(error){
      console.error('Family member relationship sync failed:',error);
      throw new Error(error.message||'Could not save your family relationship. Please try again.');
    }

    try{await familyData.reload?.()}catch(err){
      console.warn('Relationship saved, but family refresh failed:',err);
    }

    window.dispatchEvent(new CustomEvent('familybook:family-data-updated',{
      detail:{reason:'relationship-saved',familyId:u.familyId}
    }));
  };
})();
