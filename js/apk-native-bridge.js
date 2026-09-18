(()=>{
  if(window.__fbApkNativeBridgeReady)return;
  const cap=window.Capacitor;
  const isNative=()=>!!cap?.isNativePlatform?.();
  const register=name=>{
    try{return cap?.registerPlugin?.(name)||cap?.Plugins?.[name]||null}catch(_){return cap?.Plugins?.[name]||null}
  };

  const App=register('App');
  const Browser=register('Browser');
  const NavigationBar=register('NavigationBar');

  window.FB_NATIVE={Capacitor:cap,App,Browser,NavigationBar};
  window.__fbApkNativeBridgeReady=true;

  function markNative(){
    document.documentElement.classList.toggle('native-app',isNative());
  }

  async function syncNavigationBar(){
    if(!isNative()||!NavigationBar?.setNavigationBarColor)return;
    const dark=document.documentElement.dataset.theme==='dark';
    const color=dark?'#151813':'#D5D6D9';
    try{
      await NavigationBar.setNavigationBarColor({color,dividerColor:color,darkButtons:!dark});
    }catch(err){
      console.warn('Family Book navigation bar update:',err);
    }
  }

  function start(){
    markNative();
    syncNavigationBar();
    try{
      new MutationObserver(syncNavigationBar).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    }catch(_){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();