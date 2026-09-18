window.FB_SUPABASE_CONFIG={
  url:"https://tuxfbyzeyocfbrtwizdq.supabase.co",
  publishableKey:"sb_publishable_2MMLkqzf9QxP8J1qiDGUxg_VY4NvKPi",
  mediaBucket:"family-media",
  productionUrl:"https://escobarsapparel-star.github.io/family-book/"
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

/* APK-only bootstrap. In a normal browser this block exits immediately, so the
   GitHub Pages build remains the same. Inside Capacitor it restores the native
   bridge, Android Google sign-in, sounds, swipe navigation and hardware Back. */
(function(){
  const cap=window.Capacitor;
  if(!cap?.isNativePlatform?.())return;
  if(window.__fbApkBootstrapReady)return;
  window.__fbApkBootstrapReady=true;

  const register=name=>{
    try{return cap.registerPlugin?.(name)||cap.Plugins?.[name]||null}
    catch(_){return cap.Plugins?.[name]||null}
  };

  window.FB_NATIVE={
    Capacitor:cap,
    App:register('App'),
    Browser:register('Browser'),
    NavigationBar:register('NavigationBar')
  };
  document.documentElement.classList.add('native-app');

  const style=document.createElement('link');
  style.rel='stylesheet';
  style.href='css/apk-native.css?v=apk-next-sync-1';
  style.dataset.fbApkNativeStyle='1';
  document.head.appendChild(style);

  const app=document.getElementById('app');
  if(app&&!app.children.length){
    app.innerHTML='<div class="fb-apk-startup" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#151813;color:#dce8df;font-family:Arial,sans-serif;padding:24px;box-sizing:border-box"><img src="assets/logo/family-book-logo-dark.png" alt="Family Book" style="width:min(330px,84vw);height:auto;display:block"><div style="width:34px;height:34px;border:3px solid rgba(220,232,223,.20);border-top-color:#7fb58f;border-radius:50%;animation:fbStartupSpin .8s linear infinite"></div><small style="font-weight:700;letter-spacing:.05em">Opening Family Book…</small><style>@keyframes fbStartupSpin{to{transform:rotate(360deg)}}</style></div>';
  }

  const loaded=new Set();
  function load(src,key){
    if(loaded.has(key)||document.querySelector(`script[data-fb-apk="${key}"]`))return;
    loaded.add(key);
    const s=document.createElement('script');
    s.src=src;
    s.dataset.fbApk=key;
    document.head.appendChild(s);
  }

  load('js/apk-sounds.js?v=apk-next-sync-1','sounds');

  const timer=setInterval(()=>{
    if(window.FB_AUTH)load('js/apk-native-auth.js?v=apk-next-sync-1','auth');
    if(window.go&&window.FB_APP_HISTORY){
      load('js/apk-native-enhancements.js?v=apk-next-sync-1','enhancements');
      clearInterval(timer);
    }
  },25);
  setTimeout(()=>clearInterval(timer),15000);

  async function syncNavigationBar(){
    const nav=window.FB_NATIVE?.NavigationBar;
    if(!nav?.setNavigationBarColor)return;
    const dark=document.documentElement.dataset.theme==='dark';
    const color=dark?'#151813':'#D5D6D9';
    try{await nav.setNavigationBarColor({color,dividerColor:color,darkButtons:!dark})}
    catch(err){console.warn('Family Book navigation bar update:',err)}
  }
  syncNavigationBar();
  try{new MutationObserver(syncNavigationBar).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']})}catch(_){}
})();
