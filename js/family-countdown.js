(()=>{
  if(window.__fbFamilyCountdown)return;
  window.__fbFamilyCountdown=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const members=()=>{try{return window.ensureOwner?.()||window.FB_FAMILY_DATA?.getPeople?.()||[]}catch(_){return []}};
  const events=()=>{try{return window.FB_ORGANIZER_DATA?.getEvents?.()||[]}catch(_){return []}};
  let activeKey='',lastSecond=-1;

  function localStart(y,m,d){return new Date(y,m-1,d,0,0,0,0)}
  function parseYmd(value){
    const p=String(value||'').split('-').map(Number);
    if(p.length<3||!p[0]||!p[1]||!p[2])return null;
    const d=localStart(p[0],p[1],p[2]);
    return Number.isNaN(d.getTime())?null:d;
  }
  function nextYearly(value,now=new Date()){
    const p=String(value||'').split('-').map(Number);
    if(p.length<3||!p[1]||!p[2])return null;
    let d=localStart(now.getFullYear(),p[1],p[2]);
    if(d<=now)d=localStart(now.getFullYear()+1,p[1],p[2]);
    return d;
  }
  function dateLabel(date){
    try{return new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short',year:date.getFullYear()!==new Date().getFullYear()?'numeric':undefined}).format(date)}
    catch(_){return date.toLocaleDateString()}
  }
  function shortEventTitle(title){
    const t=String(title||'Family event').trim();
    const trip=t.match(/\b(?:trip|holiday|vacation)\s+to\s+(.+)$/i);
    if(trip?.[1])return trip[1].trim();
    return t;
  }
  function iconFor(item){
    if(item.kind==='birthday')return 'cake-slice';
    const t=String(item.fullTitle||item.title||'').toLowerCase();
    if(/trip|holiday|vacation|travel|flight|airport/.test(t))return 'plane';
    if(/anniversary|wedding|married|engagement/.test(t))return 'heart';
    if(/reunion|family day|gathering/.test(t))return 'users-round';
    if(/birthday|party|celebrat/.test(t))return 'party-popper';
    return 'calendar-days';
  }
  function remaining(target,now=new Date()){
    const ms=Math.max(0,target-now);
    const days=Math.floor(ms/86400000);
    const hours=Math.floor((ms%86400000)/3600000);
    const minutes=Math.floor((ms%3600000)/60000);
    const seconds=Math.floor((ms%60000)/1000);
    return {ms,days,hours,minutes,seconds};
  }
  const pad=n=>String(Math.max(0,Number(n)||0)).padStart(2,'0');

  function collect(){
    const now=new Date(),items=[];

    events().forEach(ev=>{
      let date=ev?.recurringYearly?nextYearly(ev?.date,now):parseYmd(ev?.date);
      if(!date||date<=now)return;
      items.push({
        key:`event:${ev?.id||ev?.title||''}:${ev?.date||''}`,
        kind:'event',
        title:shortEventTitle(ev?.title),
        fullTitle:String(ev?.title||'Family event'),
        date,
        detail:ev?.startTime?`${dateLabel(date)} · ${ev.startTime}`:dateLabel(date)
      });
    });

    members().forEach(m=>{
      if(!m||m.profileType==='history'||!m.birthday)return;
      const date=nextYearly(m.birthday,now);if(!date)return;
      const name=String(m.name||'Family member').trim();
      const first=name.split(/\s+/)[0]||name;
      items.push({
        key:`birthday:${m.id||name}:${m.birthday}`,
        kind:'birthday',
        title:`${first}’s birthday`,
        fullTitle:`${name} birthday`,
        date,
        detail:dateLabel(date)
      });
    });

    items.sort((a,b)=>a.date-b.date||a.title.localeCompare(b.title));
    return items.slice(0,2);
  }

  function goCalendar(){try{window.go?.('calendar')}catch(_){} }

  function innerMarkup(){
    return `<div class="desktop-widget-head family-countdown-head">
      <h3><i data-lucide="hourglass"></i> Family Countdown</h3>
      <button type="button" data-family-countdown-calendar>View calendar</button>
    </div>
    <div id="familyCountdownBody"></div>`;
  }

  function emptyHtml(){
    return `<p class="family-countdown-empty">Add a birthday or family calendar event to start a countdown.</p><button class="family-countdown-empty-action" type="button" data-family-countdown-calendar>Add event</button>`;
  }

  function heroHtml(item){
    return `<button class="family-countdown-hero" type="button" data-family-countdown-calendar title="${esc(item.fullTitle)}">
      <span class="family-countdown-hero-top">
        <span class="family-countdown-icon"><i data-lucide="${esc(iconFor(item))}"></i></span>
        <span class="family-countdown-copy"><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span>
      </span>
      <span class="family-countdown-clock" aria-label="Live countdown">
        <span class="family-countdown-unit"><strong data-countdown-days>0</strong><small>Days</small></span>
        <span class="family-countdown-sep">:</span>
        <span class="family-countdown-unit"><strong data-countdown-hours>00</strong><small>Hours</small></span>
        <span class="family-countdown-sep">:</span>
        <span class="family-countdown-unit"><strong data-countdown-minutes>00</strong><small>Min</small></span>
        <span class="family-countdown-sep">:</span>
        <span class="family-countdown-unit family-countdown-seconds"><strong data-countdown-seconds>00</strong><small>Sec</small></span>
      </span>
    </button>`;
  }

  function nextHtml(item){
    if(!item)return '';
    const r=remaining(item.date);
    const label=r.days===0?'Later today':r.days===1?'Tomorrow':`${r.days} days`;
    return `<div class="family-countdown-next-wrap"><span class="family-countdown-next-label">Next up</span><button class="family-countdown-row" type="button" data-family-countdown-calendar title="${esc(item.fullTitle)}"><span class="family-countdown-row-icon"><i data-lucide="${esc(iconFor(item))}"></i></span><span class="family-countdown-row-copy"><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span><span class="family-countdown-row-days">${esc(label)}</span></button></div>`;
  }

  function bind(card){
    card.querySelectorAll('[data-family-countdown-calendar]').forEach(btn=>{
      if(btn.dataset.countdownBound)return;
      btn.dataset.countdownBound='1';
      btn.addEventListener('click',goCalendar);
    });
  }

  function renderQueue(list){
    const body=document.querySelector('#familyCountdownBody');if(!body)return;
    if(!list.length){body.innerHTML=emptyHtml();activeKey='';bind(body);window.icons?.();return;}
    const key=list.map(x=>x.key).join('|');
    if(key!==activeKey){
      body.innerHTML=heroHtml(list[0])+nextHtml(list[1]);
      activeKey=key;
      bind(body);window.icons?.();
    }
  }

  function updateClock(item){
    if(!item)return;
    const r=remaining(item.date);
    const d=document.querySelector('[data-countdown-days]');
    const h=document.querySelector('[data-countdown-hours]');
    const m=document.querySelector('[data-countdown-minutes]');
    const s=document.querySelector('[data-countdown-seconds]');
    if(d)d.textContent=String(r.days);
    if(h)h.textContent=pad(r.hours);
    if(m)m.textContent=pad(r.minutes);
    if(s){
      s.textContent=pad(r.seconds);
      if(r.seconds!==lastSecond){
        const unit=s.closest('.family-countdown-seconds');
        unit?.classList.remove('tick');void unit?.offsetWidth;unit?.classList.add('tick');
        lastSecond=r.seconds;
      }
    }
  }

  function findOrConvertHost(){
    let card=document.querySelector('#familyCountdownWidget');
    if(card)return card;
    const upcoming=document.querySelector('#desktopUpcomingRows')?.closest('.desktop-widget');
    if(!upcoming)return null;
    upcoming.id='familyCountdownWidget';
    upcoming.classList.add('family-countdown-widget');
    upcoming.setAttribute('aria-label','Family countdown');
    upcoming.innerHTML=innerMarkup();
    return upcoming;
  }

  function refresh(){
    const card=findOrConvertHost();if(!card)return false;
    const list=collect();renderQueue(list);updateClock(list[0]);bind(card);window.icons?.();return true;
  }

  const root=document.getElementById('app');
  const observer=new MutationObserver(()=>{
    if(document.querySelector('.desktop-right-rail')&&!document.querySelector('#familyCountdownWidget'))refresh();
  });
  if(root)observer.observe(root,{childList:true,subtree:true});

  window.addEventListener('familybook:family-data-updated',refresh);
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  setInterval(refresh,1000);
  refresh();
})();
