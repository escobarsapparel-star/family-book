(()=>{
  if(window.__fbFamilyCountdown)return;
  window.__fbFamilyCountdown=true;

  const DAY=86400000;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const members=()=>{try{return window.ensureOwner?.()||window.FB_FAMILY_DATA?.getPeople?.()||[]}catch(_){return []}};
  const events=()=>{try{return window.FB_ORGANIZER_DATA?.getEvents?.()||[]}catch(_){return []}};

  function dayKey(d){return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAY}
  function localDate(y,m,d){return new Date(y,m-1,d,12,0,0,0)}
  function parseYmd(value){
    const p=String(value||'').split('-').map(Number);
    if(p.length<3||!p[0]||!p[1]||!p[2])return null;
    const d=localDate(p[0],p[1],p[2]);
    return Number.isNaN(d.getTime())?null:d;
  }
  function nextYearly(value){
    const p=String(value||'').split('-').map(Number);
    if(p.length<3||!p[1]||!p[2])return null;
    const now=new Date(),today=dayKey(now);
    let d=localDate(now.getFullYear(),p[1],p[2]);
    if(dayKey(d)<today)d=localDate(now.getFullYear()+1,p[1],p[2]);
    return d;
  }
  function daysUntil(date){return Math.max(0,Math.round(dayKey(date)-dayKey(new Date())))}
  function dateLabel(date){
    try{return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:date.getFullYear()!==new Date().getFullYear()?'numeric':undefined}).format(date)}
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
  function countdownText(days){
    if(days===0)return {big:'Today!',small:'' ,cls:'is-today'};
    if(days===1)return {big:'Tomorrow',small:'',cls:'is-tomorrow'};
    return {big:String(days),small:'days to go',cls:''};
  }

  function collect(){
    const now=new Date(),today=dayKey(now),items=[];

    events().forEach(ev=>{
      let date=ev?.recurringYearly?nextYearly(ev?.date):parseYmd(ev?.date);
      if(!date||dayKey(date)<today)return;
      items.push({
        kind:'event',
        title:shortEventTitle(ev?.title),
        fullTitle:String(ev?.title||'Family event'),
        date,
        days:daysUntil(date),
        detail:ev?.startTime?`${dateLabel(date)} · ${ev.startTime}`:dateLabel(date)
      });
    });

    members().forEach(m=>{
      if(!m||m.profileType==='history'||!m.birthday)return;
      const date=nextYearly(m.birthday);if(!date)return;
      const name=String(m.name||'Family member').trim();
      const first=name.split(/\s+/)[0]||name;
      items.push({
        kind:'birthday',
        title:`${first}’s birthday`,
        fullTitle:`${name} birthday`,
        date,
        days:daysUntil(date),
        detail:dateLabel(date)
      });
    });

    items.sort((a,b)=>a.days-b.days||a.date-b.date||a.title.localeCompare(b.title));
    return items.slice(0,3);
  }

  function goCalendar(){try{window.go?.('calendar')}catch(_){} }

  function markup(){
    return `<section class="desktop-widget family-countdown-widget" id="familyCountdownWidget" aria-label="Family countdown">
      <div class="desktop-widget-head family-countdown-head">
        <h3><i data-lucide="hourglass"></i> Family Countdown</h3>
        <button type="button" data-family-countdown-calendar>Calendar</button>
      </div>
      <div id="familyCountdownBody"></div>
    </section>`;
  }

  function bodyHtml(){
    const list=collect();
    if(!list.length)return `<p class="family-countdown-empty">Add a birthday or family calendar event to start a countdown.</p><button class="family-countdown-empty-action" type="button" data-family-countdown-calendar>Add event</button>`;
    const [hero,...rest]=list,t=countdownText(hero.days);
    return `<button class="family-countdown-hero" type="button" data-family-countdown-calendar title="${esc(hero.fullTitle)}">
      <span class="family-countdown-icon"><i data-lucide="${esc(iconFor(hero))}"></i></span>
      <span class="family-countdown-copy"><strong>${esc(hero.title)}</strong><small>${esc(hero.detail)}</small></span>
      <span class="family-countdown-value ${esc(t.cls)}"><strong>${esc(t.big)}</strong>${t.small?`<span>${esc(t.small)}</span>`:''}</span>
    </button>${rest.length?`<div class="family-countdown-more">${rest.map(item=>`<button class="family-countdown-row" type="button" data-family-countdown-calendar title="${esc(item.fullTitle)}"><span class="family-countdown-row-icon"><i data-lucide="${esc(iconFor(item))}"></i></span><span class="family-countdown-row-copy"><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span><span class="family-countdown-row-days">${item.days===0?'Today':item.days===1?'Tomorrow':`${item.days} days`}</span></button>`).join('')}</div>`:''}`;
  }

  function bind(card){
    card.querySelectorAll('[data-family-countdown-calendar]').forEach(btn=>{
      if(btn.dataset.countdownBound)return;
      btn.dataset.countdownBound='1';btn.addEventListener('click',goCalendar);
    });
  }

  function refresh(){
    const card=document.querySelector('#familyCountdownWidget');
    if(!card)return install();
    const body=card.querySelector('#familyCountdownBody');
    if(body){const html=bodyHtml();if(body.innerHTML!==html)body.innerHTML=html;}
    bind(card);window.icons?.();return true;
  }

  function install(){
    const rail=document.querySelector('.desktop-right-rail');if(!rail)return false;
    let card=rail.querySelector('#familyCountdownWidget');
    if(!card){
      const dateCard=rail.querySelector('#desktopDateTimeCard');
      if(dateCard)dateCard.insertAdjacentHTML('afterend',markup());
      else rail.insertAdjacentHTML('afterbegin',markup());
      card=rail.querySelector('#familyCountdownWidget');
    }
    refresh();return !!card;
  }

  const root=document.getElementById('app');
  const observer=new MutationObserver(()=>{
    if(document.querySelector('.desktop-right-rail')&&!document.querySelector('#familyCountdownWidget'))install();
  });
  if(root)observer.observe(root,{childList:true,subtree:true});

  window.addEventListener('familybook:family-data-updated',refresh);
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  setInterval(refresh,60000);
  install();
})();
