(()=>{
  if(window.__fbMarriageRemembrance)return;
  window.__fbMarriageRemembrance=true;

  const h=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));
  const people=()=>{try{return window.ensureOwner?.()||window.FB_FAMILY_DATA?.getPeople?.()||[]}catch(_){return []}};
  const person=id=>people().find(p=>String(p.id)===String(id));

  function hasPassed(p){return !!(p&&(p.inMemory||p.passedDate))}
  function initials(name=''){
    const parts=String(name).trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0]||'F')+(parts.length>1?(parts.at(-1)?.[0]||''):'')).toUpperCase();
  }
  function lifeYears(p){
    if(!p)return '';
    const birth=String(p.birthday||'').slice(0,4);
    const passed=String(p.passedDate||'').slice(0,4);
    const showBirth=p.birthdayYearVisible!==false&&/^\d{4}$/.test(birth);
    if(showBirth&&passed)return `${birth}–${passed}`;
    if(passed)return `Remembered ${passed}`;
    if(showBirth)return `Born ${birth}`;
    return '';
  }
  function formatDate(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return value||'';
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
    try{return new Intl.DateTimeFormat(undefined,{day:'numeric',month:'long',year:'numeric'}).format(d)}catch(_){return value}
  }
  function ordinal(n){
    const v=n%100;if(v>=11&&v<=13)return `${n}th`;
    return `${n}${n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th'}`;
  }
  function anniversaryYears(value){
    const m=String(value||'').match(/^(\d{4})-/);if(!m)return 0;
    return Math.max(0,new Date().getFullYear()-Number(m[1]));
  }
  function statusFor(row){
    const involved=(row?.memberIds||[]).map(person).filter(Boolean);
    const passed=involved.filter(hasPassed);
    return {involved,passed,both:involved.length===2&&passed.length===2,one:involved.length===2&&passed.length===1};
  }
  function transformRow(row){
    if(!row?.derivedMarriage)return row;
    const s=statusFor(row);
    if(!s.both&&!s.one)return row;
    const names=s.involved.map(x=>x.name).join(' & ');
    return {...row,
      title:s.both?`${names} — Wedding Remembrance`:`${names} — Wedding Anniversary Remembrance`,
      remembranceMode:s.both?'memorial':'partial'
    };
  }

  function installOrganizer(){
    const org=window.FB_ORGANIZER_DATA;
    if(!org||org.__remembranceOverlay)return;
    const getEvents=org.getEvents?.bind(org),getEvent=org.getEvent?.bind(org);
    if(!getEvents||!getEvent)return;
    org.__remembranceOverlay=true;
    org.getEvents=()=>getEvents().map(transformRow);
    org.getEvent=id=>transformRow(getEvent(id));
  }

  function personCard(p){
    const years=lifeYears(p);
    return `<button type="button" class="marriage-remembrance-person" data-r="view-member:${h(p.id)}">
      <span class="marriage-remembrance-avatar">${h(initials(p.name))}</span>
      <span class="marriage-remembrance-person-copy"><strong>${h(p.name)}</strong>${years?`<small><i data-lucide="leaf"></i>${h(years)}</small>`:''}</span>
    </button>`;
  }

  function memorialDetail(row,s){
    const [a,b]=s.involved;
    return `<section class="calendar-detail-page"><button class="fu-back" data-r="calendar"><i data-lucide="arrow-left"></i> Calendar</button>
      <div class="calendar-detail-card marriage-anniversary-detail marriage-remembrance-detail is-memorial">
        <div class="cal-detail-icon marriage-remembrance-icon"><i data-lucide="heart"></i></div>
        <p class="eyebrow">IN LOVING MEMORY</p>
        <h1>Wedding Remembrance</h1>
        <div class="marriage-remembrance-couple">${personCard(a)}<span class="marriage-remembrance-heart"><i data-lucide="heart"></i></span>${personCard(b)}</div>
        <div class="marriage-remembrance-script"><span></span><em>In loving memory</em><span></span></div>
        <div class="cal-detail-list marriage-remembrance-list">
          <div><i data-lucide="calendar-heart"></i><span><small>Date of marriage</small><strong>${h(formatDate(row.marriageDate))}</strong></span></div>
          <div><i data-lucide="leaf"></i><span><small>Family remembrance</small><strong>Remembered automatically every year</strong></span></div>
        </div>
        <p class="marriage-remembrance-message">Today we remember the love, life and family they built together.</p>
        <p class="marriage-auto-note">This remembrance comes automatically from their marriage relationship and memorial profiles in your Family Tree.</p>
        <div class="cal-detail-actions"><button class="secondary" data-r="tree"><i data-lucide="git-fork"></i>View family tree</button></div>
      </div></section>`;
  }

  function partialDetail(row,s){
    const years=anniversaryYears(row.marriageDate);
    const passed=s.passed[0];
    const heading=years>0?`${ordinal(years)} Wedding Anniversary`:'Wedding Anniversary';
    return `<section class="calendar-detail-page"><button class="fu-back" data-r="calendar"><i data-lucide="arrow-left"></i> Calendar</button>
      <div class="calendar-detail-card marriage-anniversary-detail marriage-remembrance-detail is-partial">
        <div class="cal-detail-icon marriage-remembrance-icon"><i data-lucide="heart"></i></div>
        <p class="eyebrow">WEDDING ANNIVERSARY · IN REMEMBRANCE</p>
        <h1>${h(heading)}</h1>
        <p class="cal-detail-date">${h(s.involved.map(x=>x.name).join(' & '))}</p>
        <div class="marriage-remembrance-couple compact">${personCard(s.involved[0])}<span class="marriage-remembrance-heart"><i data-lucide="heart"></i></span>${personCard(s.involved[1])}</div>
        <div class="cal-detail-list marriage-remembrance-list">
          <div><i data-lucide="calendar-heart"></i><span><small>Date of marriage</small><strong>${h(formatDate(row.marriageDate))}</strong></span></div>
          <div><i data-lucide="leaf"></i><span><small>In remembrance</small><strong>Remembering ${h(passed?.name||'their loved one')}</strong></span></div>
        </div>
        <p class="marriage-remembrance-message">Remembering their wedding day and the life they shared together.</p>
        <div class="cal-detail-actions"><button class="secondary" data-r="tree"><i data-lucide="git-fork"></i>View family tree</button></div>
      </div></section>`;
  }

  function installCalendar(){
    const cal=window.FB_CALENDAR,org=window.FB_ORGANIZER_DATA;
    if(!cal||!org||cal.__remembranceOverlay)return;
    const detail=cal.detailShell?.bind(cal);if(!detail)return;
    cal.__remembranceOverlay=true;
    cal.detailShell=id=>{
      const row=org.getEvent?.(id);
      if(!row?.derivedMarriage)return detail(id);
      const s=statusFor(row);
      if(s.both)return memorialDetail(row,s);
      if(s.one)return partialDetail(row,s);
      return detail(id);
    };
  }

  function install(){installOrganizer();installCalendar()}
  install();
  window.addEventListener('familybook:family-data-updated',install);
})();
