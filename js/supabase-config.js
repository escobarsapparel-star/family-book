window.FB_SUPABASE_CONFIG={
  url:"https://tuxfbyzeyocfbrtwizdq.supabase.co",
  publishableKey:"sb_publishable_2MMLkqzf9QxP8J1qiDGUxg_VY4NvKPi",
  mediaBucket:"family-media",
  productionUrl:"https://familybook.co.za/"
};

(function(){
  const cfg=window.FB_SUPABASE_CONFIG;
  if(!window.supabase?.createClient){
    console.error("Supabase client library did not load.");
    return;
  }
  window.FB_SUPABASE={
    client:window.supabase.createClient(cfg.url,cfg.publishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    }),
    config:cfg
  };
})();
