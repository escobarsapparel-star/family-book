(()=>{
  const familyData=window.FB_FAMILY_DATA;
  if(!familyData||familyData.__memberRelationshipSyncEnabled)return;
  familyData.__memberRelationshipSyncEnabled=true;

  const originalSync=typeof familyData.syncRelationships==='function'
    ? familyData.syncRelationships.bind(familyData)
    : null;
  const originalGet=typeof familyData.getRelationships==='function'
    ? familyData.getRelationships.bind(familyData)
    : null;

  let stagedRows=null;
  let generation=0;
  let flushPromise=null;

  const cloneRows=rows=>(Array.isArray(rows)?rows:[]).map(r=>({...r}));
  const currentUser=()=>window.FB_AUTH?.get?.()||{};

  // The member editor performs several synchronous local relationship mutations
  // (remove old links, add the remaining links, then final save). For non-admin
  // members we must expose that staged state immediately; otherwise each helper
  // reads the old cloud snapshot and can accidentally re-add a deleted relation.
  familyData.getRelationships=function(){
    const u=currentUser();
    if(u.role!=='admin'&&stagedRows)return cloneRows(stagedRows);
    return originalGet?cloneRows(originalGet()):[];
  };

  function memberPayload(rows,myId){
    return cloneRows(rows)
      .filter(r=>r&&r.from&&r.to&&r.type&&(String(r.from)===myId||String(r.to)===myId))
      .map(r=>({from:String(r.from),to:String(r.to),type:String(r.type)}));
  }

  async function flushMemberRelationships(){
    const client=window.FB_SUPABASE?.client;
    const initial=currentUser();
    if(!client)throw new Error('Family Book is not connected to the family database yet.');
    if(!initial.memberId)throw new Error('Your family profile is not linked to this account yet.');

    // Coalesce all relationship helper calls into the latest complete state.
    // If another edit arrives while the request is in flight, send one more pass
    // with the newest generation before considering the save complete.
    while(true){
      const u=currentUser();
      const myId=String(u.memberId||'');
      if(!myId)throw new Error('Your family profile is not linked to this account yet.');
      const version=generation;
      const payload=memberPayload(stagedRows||[],myId);

      const {error}=await client.rpc('replace_my_family_relationships',{
        p_relationships:payload
      });

      if(error){
        console.error('Family member relationship sync failed:',error);
        throw new Error(error.message||'Could not save your family relationship. Please try again.');
      }

      if(version===generation)break;
    }

    try{await familyData.reload?.()}catch(err){
      console.warn('Relationship saved, but family refresh failed:',err);
    }

    stagedRows=null;
    const u=currentUser();
    window.dispatchEvent(new CustomEvent('familybook:family-data-updated',{
      detail:{reason:'relationship-saved',familyId:u.familyId||''}
    }));
    return true;
  }

  function scheduleFlush(){
    if(flushPromise)return flushPromise;
    // A zero-delay turn is intentional: app.js makes remove/add/final-save calls
    // in the same event turn. Waiting one turn lets us send only the final state.
    flushPromise=new Promise((resolve,reject)=>{
      setTimeout(()=>{
        flushMemberRelationships().then(resolve,reject).finally(()=>{
          flushPromise=null;
        });
      },0);
    });
    return flushPromise;
  }

  familyData.syncRelationships=function(rows){
    const u=currentUser();
    if(!u.familyId)return Promise.resolve();

    // Family Admins keep the existing queued full-tree save path.
    if(u.role==='admin')return originalSync?.(rows);

    if(!window.FB_SUPABASE?.client)throw new Error('Family Book is not connected to the family database yet.');
    if(!u.memberId)throw new Error('Your family profile is not linked to this account yet.');

    stagedRows=cloneRows(rows);
    generation++;
    return scheduleFlush();
  };
})();
