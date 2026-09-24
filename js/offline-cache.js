(()=>{
  if(window.FB_OFFLINE_CACHE)return;

  const DB_NAME="family-book-offline-v1";
  const STORE="snapshots";
  const FALLBACK_PREFIX="fb_offline_rpc_v1:";
  const READ_RPCS=new Set([
    "get_current_family_context",
    "get_family_people_bundle",
    "get_family_memories_bundle",
    "get_family_social_bundle",
    "get_family_organizer_bundle",
    "get_family_history_notes",
    "get_family_story_settings",
    "get_relationship_marriage_dates",
    "get_family_person_sexes",
    "get_my_notification_preferences",
    "get_my_notifications",
    "get_my_legal_acceptance",
    "get_current_family_inspiration"
  ]);

  function stable(value){
    if(value===null||value===undefined)return value;
    if(Array.isArray(value))return value.map(stable);
    if(typeof value==="object"){
      const out={};
      Object.keys(value).sort().forEach(k=>out[k]=stable(value[k]));
      return out;
    }
    return value;
  }

  function rpcKey(userId,fn,args){
    return `${String(userId||"anon")}:${String(fn)}:${JSON.stringify(stable(args||{}))}`;
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window))return reject(new Error("IndexedDB unavailable"));
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"key"})};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error("Offline cache unavailable"));
    });
  }

  async function putRecord(record){
    try{
      const db=await openDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).put(record);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error);
      });
      db.close();
    }catch(_){
      try{localStorage.setItem(FALLBACK_PREFIX+record.key,JSON.stringify(record))}catch(__){}
    }
  }

  async function getRecord(key){
    try{
      const db=await openDb();
      const value=await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readonly");
        const req=tx.objectStore(STORE).get(key);
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>reject(req.error);
      });
      db.close();
      if(value)return value;
    }catch(_){}
    try{return JSON.parse(localStorage.getItem(FALLBACK_PREFIX+key)||"null")}catch(_){return null}
  }

  async function deletePrefix(prefix){
    try{
      const db=await openDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,"readwrite");
        const store=tx.objectStore(STORE);
        const req=store.openCursor();
        req.onsuccess=()=>{
          const cursor=req.result;
          if(!cursor)return;
          if(String(cursor.key).startsWith(prefix))cursor.delete();
          cursor.continue();
        };
        req.onerror=()=>reject(req.error);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
      });
      db.close();
    }catch(_){}
    try{
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i);
        if(k?.startsWith(FALLBACK_PREFIX+prefix))localStorage.removeItem(k);
      }
    }catch(_){}
  }

  async function currentUserId(client){
    try{
      const {data}=await client.auth.getSession();
      return data?.session?.user?.id||"";
    }catch(_){return ""}
  }

  function isConnectivityError(err){
    if(navigator.onLine===false)return true;
    const status=Number(err?.status||err?.statusCode||0);
    if(status>=500)return true;
    return /failed to fetch|network|fetcherror|load failed|timeout|offline|connection/i.test(String(err?.message||err||""));
  }

  async function cachedRpc(client,original,fn,args,options){
    if(!READ_RPCS.has(String(fn)))return original(fn,args,options);
    const userId=await currentUserId(client);
    const key=rpcKey(userId,fn,args);

    try{
      const result=await original(fn,args,options);
      if(!result?.error){
        if(userId)await putRecord({key,userId,fn:String(fn),args:stable(args||{}),data:result?.data??null,savedAt:Date.now()});
        return result;
      }
      if(!isConnectivityError(result.error))return result;
      const cached=await getRecord(key);
      if(cached){
        window.dispatchEvent(new CustomEvent("familybook:offline-cache-used",{detail:{fn:String(fn),savedAt:cached.savedAt||0}}));
        return {...result,data:cached.data,error:null,status:200,statusText:"OFFLINE_CACHE",offline:true};
      }
      return result;
    }catch(err){
      if(isConnectivityError(err)){
        const cached=await getRecord(key);
        if(cached){
          window.dispatchEvent(new CustomEvent("familybook:offline-cache-used",{detail:{fn:String(fn),savedAt:cached.savedAt||0}}));
          return {data:cached.data,error:null,status:200,statusText:"OFFLINE_CACHE",count:null,offline:true};
        }
      }
      throw err;
    }
  }

  function install(){
    const client=window.FB_SUPABASE?.client;
    if(!client||client.__familyBookOfflineRpc)return false;
    const original=client.rpc.bind(client);
    client.rpc=(fn,args,options)=>cachedRpc(client,original,fn,args,options);
    client.__familyBookOfflineRpc=true;
    return true;
  }

  async function clearUser(userId){
    const id=String(userId||"");
    if(id)await deletePrefix(id+":");
  }

  async function clearAll(){
    try{indexedDB.deleteDatabase(DB_NAME)}catch(_){}
    try{
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i);
        if(k?.startsWith(FALLBACK_PREFIX))localStorage.removeItem(k);
      }
    }catch(_){}
  }

  window.FB_OFFLINE_CACHE={install,clearUser,clearAll,readFunctions:[...READ_RPCS]};
  install();
})();