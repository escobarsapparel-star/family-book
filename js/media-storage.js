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
    return {ok:true,...providerInfo()};
  }

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
        if(path)map.set(path,item.signedUrl||"");
      });
      return map;
    }
  };

  const api={
    registerProvider,configure,useProvider,providerName,providerInfo,
    upload,remove,download,signedUrlMap,getSignedUrl,healthCheck
  };

  registerProvider("supabase",supabaseProvider);
  window.FB_MEDIA=api;

  // Future provider example:
  // FB_MEDIA.registerProvider("r2",{upload,remove,download,signedUrlMap,info});
})();
