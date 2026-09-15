(()=>{
  if(window.__fbMarriageAnniversaries)return;
  window.__fbMarriageAnniversaries=true;

  const h=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const familyData=()=>window.FB_FAMILY_DATA;
  const people=()=>{try{return window.ensureOwner?.()||familyData()?.getPeople?.()||[]}catch(_){return []}};
  const relationships=()=>{try{return familyData()?.getRelationships?.()||[]}catch(_){return []}};
  const person=id=>people().find(p=>String(p.id)===String(id));

  function marriageDate(a,b){
    const direct=window.FB_MARRIAGE_DATA?.getMarriageDate?.(a,b);
    if(direct)return direct;
    return relationships().find(r=>r?.type==="spouse_of"&&((String(r.from)===String(a)&&String(r.to)===String(b))||(String(r.from)===String(b)&&String(r.to)===String(a)))&&r.marriageDate)?.marriageDate||"";
  }

  function formatDate(value,short=false){
    const m=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return value||"";
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
    try{return new Intl.DateTimeFormat(undefined,short?{day:"numeric",month:"short",year:"numeric"}:{day:"numeric",month:"long",year:"numeric"}).format(d)}catch(_){return value}
  }

  function fromIdForRow(row){
    const form=row.closest("form");
    return form?.dataset?.memberId||form?.dataset?.historyId||"";
  }

  function ensureMarriageExtra(row){
    let extra=row.querySelector(".relationship-marriage-extra");
    if(extra)return extra;
    extra=document.createElement("div");
    extra.className="relationship-marriage-extra";
    extra.hidden=true;
    extra.innerHTML=`<label class="relationship-marriage-field"><span>Date of marriage <em>(optional)</em></span><input class="mfMarriageDate" type="date"></label><small>Used automatically in the Family Tree, Calendar and Family Countdown.</small>`;
    const remove=row.querySelector(".remove-rel");
    if(remove)row.insertBefore(extra,remove);else row.appendChild(extra);
    return extra;
  }

  function wireRelationshipRow(row){
    if(!row||row.dataset.marriageWired==="1")return;
    row.dataset.marriageWired="1";
    const type=row.querySelector(".mfRelType"),target=row.querySelector(".mfRelPerson"),extra=ensureMarriageExtra(row),date=extra.querySelector(".mfMarriageDate");
    if(!type||!target||!date)return;

    [...type.options].forEach(o=>{if(o.value==="spouse_of")o.textContent="Married to"});

    const sync=(hydrate=false)=>{
      const married=type.value==="spouse_of";
      extra.hidden=!married;
      if(!married)return;
      if(hydrate){
        const from=fromIdForRow(row),to=target.value;
        if(from&&to)date.value=marriageDate(from,to)||"";
      }
    };
    type.addEventListener("change",()=>sync(true));
    target.addEventListener("change",()=>sync(true));
    sync(true);
  }

  function wireRelationshipRows(scope=document){
    scope.querySelectorAll?.("[data-rel-row]").forEach(wireRelationshipRow);
  }

  document.addEventListener("submit",e=>{
    const form=e.target;
    if(!form?.matches?.("#memberForm,#editMemberForm,#historyProfileForm"))return;
    const dates=new Map();
    form.querySelectorAll("[data-rel-row]").forEach(row=>{
      const type=row.querySelector(".mfRelType")?.value||"";
      const to=row.querySelector(".mfRelPerson")?.value||"";
      if(type==="spouse_of"&&to)dates.set(`spouse_of|${to}`,row.querySelector(".mfMarriageDate")?.value||"");
    });
    window.__fbMarriagePlan={createdAt:Date.now(),dates};
  },true);

  function decorateTree(){
    document.querySelectorAll(".ct-couple").forEach(couple=>{
      const ids=[...couple.querySelectorAll("[data-view-member]")].map(x=>x.dataset.viewMember).filter(Boolean);
      if(ids.length<2)return;
      const date=marriageDate(ids[0],ids[1]);
      let badge=couple.querySelector(".ct-marriage-date");
      if(!date){badge?.remove();return;}
      if(!badge){
        badge=document.createElement("span");badge.className="ct-marriage-date";couple.appendChild(badge);
      }
      const text=`Married ${formatDate(date,true)}`;
      if(badge.textContent!==text)badge.textContent=text;
    });
  }

  function pairKey(a,b){return [String(a||""),String(b||"")].sort().join("|")}
  function anniversaryId(a,b){const [x,y]=[String(a),String(b)].sort();return `marriage_anniversary_${x}_${y}`}

  function derivedAnniversaries(baseEvents=[]){
    const seen=new Set(),out=[];
    relationships().forEach(r=>{
      if(r?.type!=="spouse_of"||!r.marriageDate||!r.from||!r.to)return;
      const pair=pairKey(r.from,r.to);if(seen.has(pair))return;seen.add(pair);
      const [a,b]=pair.split("|"),pa=person(a),pb=person(b);if(!pa||!pb)return;
      const memberIds=[a,b];
      const duplicate=(baseEvents||[]).some(ev=>{
        if(ev?.type!=="anniversary"||!ev?.date)return false;
        const sameDay=String(ev.date).slice(5)===String(r.marriageDate).slice(5);
        const ids=[...(ev.memberIds||[])].map(String).sort();
        return sameDay&&ids.length===2&&ids[0]===memberIds.slice().sort()[0]&&ids[1]===memberIds.slice().sort()[1];
      });
      if(duplicate)return;
      out.push({
        id:anniversaryId(a,b),title:`${pa.name} & ${pb.name} — Wedding Anniversary`,type:"anniversary",
        date:r.marriageDate,startTime:"",endTime:"",location:"",lat:null,lng:null,
        notes:"Automatically added from the marriage relationship in the Family Tree.",
        recurringYearly:true,memberIds,derivedMarriage:true,marriageDate:r.marriageDate
      });
    });
    return out;
  }

  function installOrganizerOverlay(){
    const org=window.FB_ORGANIZER_DATA;if(!org||org.__marriageOverlay)return;
    org.__marriageOverlay=true;
    const originalGetEvents=org.getEvents?.bind(org),originalGetEvent=org.getEvent?.bind(org);
    if(!originalGetEvents||!originalGetEvent)return;
    org.getEvents=()=>{const base=originalGetEvents();return [...base,...derivedAnniversaries(base)]};
    org.getEvent=id=>originalGetEvent(id)||derivedAnniversaries(originalGetEvents()).find(x=>x.id===String(id))||null;
  }

  function ordinal(n){
    const v=n%100;if(v>=11&&v<=13)return `${n}th`;
    return `${n}${n%10===1?"st":n%10===2?"nd":n%10===3?"rd":"th"}`;
  }

  function nextAnniversaryYear(value){
    const m=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    let y=now.getFullYear(),d=new Date(y,Number(m[2])-1,Number(m[3]));if(d<today)y++;
    return {year:y,years:y-Number(m[1])};
  }

  function installCalendarOverlay(){
    const cal=window.FB_CALENDAR,org=window.FB_ORGANIZER_DATA;if(!cal||!org||cal.__marriageOverlay)return;
    cal.__marriageOverlay=true;
    const originalPage=cal.pageShell?.bind(cal),originalDetail=cal.detailShell?.bind(cal);
    if(originalPage){
      cal.pageShell=()=>originalPage().replace("Birthdays are added automatically from family profiles. Add outings, anniversaries and important family dates here.","Birthdays and wedding anniversaries are added automatically from family profiles and marriage relationships. Add outings and other important family dates here.");
    }
    if(originalDetail){
      cal.detailShell=id=>{
        const row=org.getEvent?.(id);
        if(!row?.derivedMarriage)return originalDetail(id);
        const involved=(row.memberIds||[]).map(person).filter(Boolean);
        const info=nextAnniversaryYear(row.marriageDate);
        const heading=info?.years>0?`${ordinal(info.years)} Wedding Anniversary`:"Wedding Anniversary";
        return `<section class="calendar-detail-page"><button class="fu-back" data-r="calendar"><i data-lucide="arrow-left"></i> Calendar</button><div class="calendar-detail-card marriage-anniversary-detail"><div class="cal-detail-icon"><i data-lucide="heart"></i></div><p class="eyebrow">WEDDING ANNIVERSARY</p><h1>${h(heading)}</h1><p class="cal-detail-date">${h(involved.map(x=>x.name).join(" & "))}</p><div class="cal-detail-list"><div><i data-lucide="calendar-heart"></i><span><small>Date of marriage</small><strong>${h(formatDate(row.marriageDate))}</strong></span></div><div><i data-lucide="repeat-2"></i><span><small>Calendar</small><strong>Repeats automatically every year</strong></span></div></div><p class="marriage-auto-note">This anniversary comes automatically from the marriage relationship in your Family Tree.</p><div class="cal-detail-actions">${involved[0]?`<button class="secondary" data-r="view-member:${h(involved[0].id)}"><i data-lucide="users-round"></i>View family</button>`:""}</div></div></section>`;
      };
    }
  }

  function refreshVisible(){
    wireRelationshipRows();decorateTree();
    if(document.querySelector(".calendar-page"))window.go?.("calendar",{skipFamilyRefresh:true,preserveScroll:true});
  }

  installOrganizerOverlay();installCalendarOverlay();
  wireRelationshipRows();decorateTree();

  const root=document.getElementById("app");
  let observerScheduled=false;
  const observer=new MutationObserver(mutations=>{
    const relevant=mutations.some(m=>[...m.addedNodes].some(node=>{
      if(node.nodeType!==1&&node.nodeType!==11)return false;
      if(node.nodeType===1&&node.matches?.(".ct-marriage-date"))return false;
      return node.matches?.("[data-rel-row],.ct-couple,.coordinate-tree-page,.tree-page")||node.querySelector?.("[data-rel-row],.ct-couple");
    }));
    if(!relevant||observerScheduled)return;
    observerScheduled=true;
    queueMicrotask(()=>{
      observerScheduled=false;
      wireRelationshipRows();
      decorateTree();
    });
  });
  if(root)observer.observe(root,{childList:true,subtree:true});

  window.addEventListener("familybook:marriage-data-updated",refreshVisible);
})();
