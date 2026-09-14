(function(){
  const providers=new Map();
  let activeProvider="supabase";
  let config={provider:"supabase"};

  function uniquePaths(paths){
    return [...new Set((paths||[]).filter(Boolean).map(String))];
  }

  function requireProvider(){
    const provider=providers.get(activeProvider);
    if(!provider)throw new Error(`Media provider "${activeProvider}" is not registered.`);
    return provider;
  }

  function registerProvider(name,adapter){
    if(!name||!adapter)throw new Error("A media provider name and adapter are required.");
    ["upload","remove","download","signedUrlMap"].forEach(fn=>{
      if(typeof adapter[fn]!=="function"){
        throw new Error(`Media provider "${name}" is missing ${fn}().`);
      }
    });
    providers.set(String(name),adapter);
    return api;
  }

  function configure(next={}){
    config={...config,...next};
    if(next.provider)useProvider(next.provider);
    return {...config,provider:activeProvider};
  }

  function useProvider(name){
    const key=String(name||"").trim();
    if(!providers.has(key))throw new Error(`Media provider "${key}" is not registered.`);
    activeProvider=key;
    config.provider=key;
    window.dispatchEvent(new CustomEvent("familybook:media-provider-changed",{detail:{provider:key}}));
    return key;
  }

  function providerName(){return activeProvider}

  function providerInfo(){
    const provider=requireProvider();
    return {
      provider:activeProvider,
      ...(typeof provider.info==="function"?provider.info():{})
    };
  }

  async function upload(path,blob,options={}){
    if(!path)throw new Error("A storage path is required.");
    if(!(blob instanceof Blob))throw new Error("A Blob/File is required for upload.");
    return requireProvider().upload(String(path),blob,options);
  }

  async function remove(paths,options={}){
    const list=uniquePaths(paths);
    if(!list.length)return {removed:[]};
    try{
      return await requireProvider().remove(list,options);
    }catch(err){
      if(options?.silent){
        console.warn("Family Book media cleanup:",err?.message||err);
        return {removed:[],error:err};
      }
      throw err;
    }
  }

  async function download(path){
    if(!path)throw new Error("A storage path is required.");
    return requireProvider().download(String(path));
  }

  async function signedUrlMap(paths,expiresIn=60*60*2){
    const list=uniquePaths(paths);
    if(!list.length)return new Map();
    return requireProvider().signedUrlMap(list,expiresIn);
  }

  async function getSignedUrl(path,expiresIn=60*60*2){
    if(!path)return "";
    const map=await signedUrlMap([path],expiresIn);
    return map.get(String(path))||"";
  }

  async function healthCheck(){
    const provider=requireProvider();
    if(typeof provider.healthCheck==="function")return provider.healthCheck();
    return {ok:true,...providerInfo()};
  }

  // ----------------------------------------------------------
  // Supabase provider
  // Kept as a read/delete fallback for any pre-B2 media.
  // ----------------------------------------------------------
  const supabaseProvider={
    client(){
      const client=window.FB_SUPABASE?.client;
      if(!client)throw new Error("Supabase is not ready.");
      return client;
    },
    bucket(){
      return window.FB_SUPABASE_CONFIG?.mediaBucket||"family-media";
    },
    info(){
      return {bucket:this.bucket(),clientReady:!!window.FB_SUPABASE?.client};
    },
    async upload(path,blob,options={}){
      const {error}=await this.client().storage.from(this.bucket()).upload(path,blob,{
        contentType:options.contentType||blob.type||"application/octet-stream",
        upsert:options.upsert===true,
        cacheControl:String(options.cacheControl||"3600")
      });
      if(error)throw new Error(error.message||"Could not upload family media.");
      return {provider:"supabase",bucket:this.bucket(),path};
    },
    async remove(paths){
      const {data,error}=await this.client().storage.from(this.bucket()).remove(paths);
      if(error)throw new Error(error.message||"Could not remove family media.");
      return {provider:"supabase",removed:paths,data};
    },
    async download(path){
      const {data,error}=await this.client().storage.from(this.bucket()).download(path);
      if(error)throw new Error(error.message||"Could not download private family media.");
      return data;
    },
    async signedUrlMap(paths,expiresIn){
      const {data,error}=await this.client().storage.from(this.bucket()).createSignedUrls(paths,expiresIn);
      if(error)throw new Error(error.message||"Could not open private family media.");
      const map=new Map();
      (data||[]).forEach((item,i)=>{
        const path=item.path||paths[i];
        if(path&&item.signedUrl)map.set(path,item.signedUrl);
      });
      return map;
    }
  };

  // ----------------------------------------------------------
  // Backblaze B2 provider
  // New uploads go directly browser -> B2 using short-lived URLs
  // signed by the authenticated Supabase Edge Function.
  // ----------------------------------------------------------
  const b2Provider={
    functionName:"b2-media-sign",

    client(){
      const client=window.FB_SUPABASE?.client;
      if(!client)throw new Error("Supabase is not ready.");
      return client;
    },

    info(){
      return {
        functionName:this.functionName,
        primaryStorage:"Backblaze B2",
        legacyReadFallback:"Supabase Storage"
      };
    },

    async invoke(action,payload={}){
      const {data,error}=await this.client().functions.invoke(this.functionName,{
        body:{action,...payload}
      });
      if(error)throw new Error(error.message||`B2 ${action} request failed.`);
      if(data?.error)throw new Error(data.error);
      return data||{};
    },

    async healthCheck(){
      return this.invoke("health");
    },

    async upload(path,blob,options={}){
      const contentType=options.contentType||blob.type||"application/octet-stream";
      const signed=await this.invoke("sign-upload",{path,contentType});

      if(!signed?.url)throw new Error("B2 did not return an upload URL.");

      const response=await fetch(signed.url,{
        method:"PUT",
        headers:{"Content-Type":signed.contentType||contentType},
        body:blob
      });

      if(!response.ok){
        const detail=await response.text().catch(()=>"");
        throw new Error(`B2 upload failed (${response.status})${detail?`: ${detail.slice(0,180)}`:""}`);
      }

      return {provider:"backblaze-b2",path};
    },

    async signedUrlMap(paths,expiresIn){
      const list=uniquePaths(paths);
      if(!list.length)return new Map();

      const signed=await this.invoke("sign-downloads",{
        paths:list,
        expiresIn:Number(expiresIn)||60*60*2
      });

      const map=new Map(Object.entries(signed?.urls||{}));
      const missing=[
        ...new Set([
          ...(Array.isArray(signed?.missing)?signed.missing:[]),
          ...list.filter(path=>!map.has(path))
        ])
      ];

      // Temporary transition safety:
      // media uploaded before the B2 switch can still load from Supabase.
      if(missing.length){
        try{
          const legacy=await supabaseProvider.signedUrlMap(missing,expiresIn);
          legacy.forEach((url,path)=>{
            if(url)map.set(path,url);
          });
        }catch(err){
          console.warn("Legacy Supabase media fallback:",err?.message||err);
        }
      }

      return map;
    },

    async download(path){
      const map=await this.signedUrlMap([path],60*60*2);
      const url=map.get(path);
      if(!url)throw new Error("This family media file could not be found.");

      const response=await fetch(url);
      if(!response.ok){
        // A legacy Supabase URL may have expired or B2 may have changed
        // between the existence check and fetch. Try Supabase once.
        try{return await supabaseProvider.download(path)}
        catch(_){throw new Error(`Could not download family media (${response.status}).`)}
      }
      return response.blob();
    },

    async remove(paths){
      const list=uniquePaths(paths);
      if(!list.length)return {provider:"backblaze-b2",removed:[]};

      const result=await this.invoke("delete",{paths:list});

      // While pre-B2 test media still exists, also clean the legacy bucket.
      // This is best-effort and can be removed once Supabase Storage is empty.
      try{await supabaseProvider.remove(list)}
      catch(err){console.warn("Legacy Supabase media cleanup:",err?.message||err)}

      return {
        provider:"backblaze-b2",
        removed:Array.isArray(result?.deleted)?result.deleted:list
      };
    }
  };

  const api={
    registerProvider,configure,useProvider,providerName,providerInfo,
    upload,remove,download,signedUrlMap,getSignedUrl,healthCheck
  };

  registerProvider("supabase",supabaseProvider);
  registerProvider("backblaze-b2",b2Provider);

  window.FB_MEDIA=api;

  // Production default from Build 5.9 onward.
  useProvider("backblaze-b2");
})();
