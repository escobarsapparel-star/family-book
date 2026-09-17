(()=>{
  if(window.__fbDesktopDateTime)return;
  window.__fbDesktopDateTime=true;

  const DISPLAY_LOCALE="en-ZA";

  function markup(){
    return `<section class="desktop-widget desktop-date-time-card" id="desktopDateTimeCard" aria-label="Current date and time">
      <div class="desktop-date-time-icon"><i data-lucide="clock-3"></i></div>
      <div class="desktop-date-time-copy">
        <strong id="desktopLiveTime">--:--:--</strong>
        <span id="desktopLiveDate">Loading date…</span>
      </div>
    </section>`;
  }

  function update(){
    const time=document.querySelector('#desktopLiveTime');
    const date=document.querySelector('#desktopLiveDate');
    if(!time||!date)return;
    const now=new Date();
    try{
      time.textContent=new Intl.DateTimeFormat(DISPLAY_LOCALE,{hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(now);
      date.textContent=new Intl.DateTimeFormat(DISPLAY_LOCALE,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now);
    }catch(_){
      time.textContent=now.toLocaleTimeString(DISPLAY_LOCALE,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
      date.textContent=now.toLocaleDateString(DISPLAY_LOCALE,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    }
  }

  function install(){
    const rail=document.querySelector('.desktop-right-rail');
    if(!rail)return false;
    let card=rail.querySelector('#desktopDateTimeCard');
    if(!card){
      rail.insertAdjacentHTML('afterbegin',markup());
      card=rail.querySelector('#desktopDateTimeCard');
      window.icons?.();
    }
    update();
    return !!card;
  }

  const root=document.getElementById('app');
  const observer=new MutationObserver(()=>{
    if(document.querySelector('.desktop-right-rail')&&!document.querySelector('#desktopDateTimeCard'))install();
  });
  if(root)observer.observe(root,{childList:true,subtree:true});
  install();
  setInterval(update,1000);
})();

/* Global Lucide stability guard.
   Several desktop widgets update every second. Once Lucide placeholders have
   already been rendered, repeated full-page icon passes are unnecessary and
   can create MutationObserver feedback loops on heavier pages like Settings. */
(()=>{
  if(window.__fbIconRenderStability)return;
  window.__fbIconRenderStability=true;
  const original=window.icons;
  if(typeof original!=="function")return;
  let rendering=false;
  window.icons=function stableFamilyBookIcons(){
    if(rendering||!document.querySelector('[data-lucide]'))return;
    rendering=true;
    try{original()}catch(err){console.warn('Family Book icon render skipped:',err)}finally{rendering=false}
  };
})();
