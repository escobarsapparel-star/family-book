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

    // Keep the existing Family Admin path exactly as-is.
    if(u.role==='admin')return original?.(rows);

    // Connected family members must also be able to save relationships
    // from their own editable profile. The profile form already limits
    // non-admin members to their own profile; the backend remains the
    // authority for family membership and relationship permissions.
    const client=window.FB_SUPABASE?.client;
    if(!client)throw new Error('Family Book is not connected to the family database yet.');

    const copy=(Array.isArray(rows)?rows:[])
      .filter(r=>r&&r.from&&r.to&&r.type)
      .map(r=>({from:String(r.from),to:String(r.to),type:String(r.type)}));

    const {error}=await client.rpc('replace_family_relationships',{
      p_relationships:copy
    });

    if(error){
      console.error('Family member relationship sync failed:',error);
      throw new Error(error.message||'Could not save your family relationship. Please try again.');
    }

    // Pull the shared tree back from Supabase so the member immediately
    // sees the same relationship state as the rest of the family.
    try{await familyData.reload?.()}catch(err){
      console.warn('Relationship saved, but family refresh failed:',err);
    }

    window.dispatchEvent(new CustomEvent('familybook:family-data-updated',{
      detail:{reason:'relationship-saved',familyId:u.familyId}
    }));
  };
})();
