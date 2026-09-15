(()=>{
  if(window.__fbDesktopDateTime)return;
  window.__fbDesktopDateTime=true;

  function markup(){
    return `<section class="desktop-widget desktop-date-time-card" id="desktopDateTimeCard" aria-label="Current date and time">
      <div class="desktop-date-time-icon"><i data-lucide="clock-3"></i></div>
      <div class="desktop-date-time-copy">
        <strong id="desktopLiveTime">--:--</strong>
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
      time.textContent=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'}).format(now);
      date.textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now);
    }catch(_){
      time.textContent=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
      date.textContent=now.toDateString();
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
  setInterval(update,30000);
})();
