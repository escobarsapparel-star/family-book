(()=>{
  if(window.__fbApkNativeEnhancementsReady)return;
  const native=window.FB_NATIVE;
  if(!native?.Capacitor?.isNativePlatform?.())return;
  window.__fbApkNativeEnhancementsReady=true;

  const tabs=['home','memories','tree','calendar','members','profile'];
  const blockedSelector="input,textarea,select,button,a,[contenteditable='true'],canvas,.cropper-backdrop,.photo-action-backdrop,.fb-profile-media-viewer,.member-cover-editor,.full-tree-viewport,.memory-strip,.home-composer-modal,[data-fb-no-swipe]";

  function currentRoute(){
    return String(window.FB_APP_HISTORY?.current?.()||history.state?.fbRoute||'home');
  }

  function closeOverlay(){
    const visible=el=>el&&getComputedStyle(el).display!=='none'&&!el.hidden;
    const candidates=[
      ['.home-composer-modal:not([hidden])','[data-home-close-composer]'],
      ['.fb-profile-media-viewer','.fb-profile-media-close'],
      ['.cropper-backdrop','.crop-cancel'],
      ['.photo-action-backdrop','.photo-cancel'],
      ['.member-cover-editor','[data-cover-close]'],
      ['.fb-qm-tag-popover','[data-qm-tag-close]']
    ];
    for(const [root,close] of candidates){
      const host=document.querySelector(root);
      if(!visible(host))continue;
      const btn=host.querySelector(close);
      if(btn){btn.click();return true}
      host.remove();return true;
    }
    return false;
  }

  async function bindBackButton(){
    const App=native.App;
    if(!App?.addListener||window.__fbAndroidBackBound)return;
    window.__fbAndroidBackBound=true;
    try{
      await App.addListener('backButton',()=>{
        if(closeOverlay())return;
        if(!document.querySelector('#screen')){
          App.exitApp?.();
          return;
        }
        const route=currentRoute();
        if(route!=='home'){
          try{
            if(history.length>1){history.back();return}
          }catch(_){}
          window.go?.('home',{replaceHistory:true});
          return;
        }
        App.exitApp?.();
      });
    }catch(err){console.warn('Family Book Android back button:',err)}
  }

  function bindSwipe(){
    if(window.__fbMainTabSwipeBound)return;
    window.__fbMainTabSwipeBound=true;
    let g=null,animating=false;

    const screen=()=>document.querySelector('#screen');
    const clear=()=>{
      const s=screen();
      if(s){s.style.transition='';s.style.transform='';s.style.opacity=''}
      g=null;
    };

    document.addEventListener('touchstart',ev=>{
      if(animating||ev.touches?.length!==1)return;
      if(document.body.classList.contains('home-composer-open'))return;
      const route=currentRoute();
      if(!tabs.includes(route))return;
      if(ev.target?.closest?.(blockedSelector))return;
      const t=ev.touches[0];
      g={x:t.clientX,y:t.clientY,dx:0,dy:0,route,axis:null};
    },{passive:true});

    document.addEventListener('touchmove',ev=>{
      if(!g||animating||ev.touches?.length!==1)return;
      const t=ev.touches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;
      g.dx=dx;g.dy=dy;
      if(!g.axis){
        const ax=Math.abs(dx),ay=Math.abs(dy);
        if(ax<8&&ay<8)return;
        g.axis=ax>ay*1.35?'x':'y';
      }
      if(g.axis!=='x')return;
      const i=tabs.indexOf(g.route),next=i+(dx<0?1:-1);
      if(next<0||next>=tabs.length)return;
      const s=screen();if(!s)return;
      const drag=Math.max(-92,Math.min(92,dx*.28));
      s.style.transition='none';
      s.style.transform=`translate3d(${drag}px,0,0)`;
      s.style.opacity=String(Math.max(.82,1-Math.abs(drag)/520));
    },{passive:true});

    document.addEventListener('touchend',()=>{
      if(!g||animating)return;
      const data=g;g=null;
      const s=screen();
      if(data.axis!=='x'||Math.abs(data.dx)<68||Math.abs(data.dx)<Math.abs(data.dy)*1.25){clear();return}
      const i=tabs.indexOf(data.route),dir=data.dx<0?1:-1,next=i+dir;
      if(next<0||next>=tabs.length){clear();return}
      animating=true;
      if(s){
        s.style.transition='transform .11s ease-out,opacity .11s ease-out';
        s.style.transform=`translate3d(${dir<0?'42':'-42'}px,0,0)`;
        s.style.opacity='.72';
      }
      try{window.FB_SOUNDS?.swish?.(dir)}catch(_){}
      setTimeout(()=>{
        try{window.go?.(tabs[next])}finally{
          requestAnimationFrame(()=>{clear();animating=false});
        }
      },105);
    },{passive:true});

    document.addEventListener('touchcancel',clear,{passive:true});
  }

  function start(){bindBackButton();bindSwipe()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
