(()=>{
  if(window.__fbMarriageData)return;
  window.__fbMarriageData=true;

  const base=window.FB_FAMILY_DATA;
  if(!base)return;

  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const original={
    init:base.init?.bind(base),
    reload:base.reload?.bind(base),
    getRelationships:base.getRelationships?.bind(base),
    syncRelationships:base.syncRelationships?.bind(base)
  };

  let dates=new Map();
  let migrationReady=false;

  const key=(a,b,t="spouse_of")=>`${String(a||"")}|${String(t||"")}|${String(b||"")}`;
  const isSpouse=r=>r&&r.type==="spouse_of"&&r.from&&r.to;

  function mapsEqual(a,b){
    if(a.size!==b.size)return false;
    for(const [k,v] of a){if(b.get(k)!==v)return false;}
    return true;
  }

  function commitDates(next){
    const changed=!mapsEqual(dates,next);
    dates=next;
    migrationReady=true;
    if(changed)window.dispatchEvent(new CustomEvent("familybook:marriage-data-updated"));
    return changed;
  }

  function currentPlan(){
    const p=window.__fbMarriagePlan;
    if(!p||Date.now()-(p.createdAt||0)>10000)return null;
    return p;
  }

  function applyPlan(rows){
    const out=(rows||[]).map(r=>({...r}));
    const plan=currentPlan();
    if(!plan?.dates)return out;

    const pairDates=new Map();
    out.forEach(r=>{
      if(!isSpouse(r))return;
      const planKey=`spouse_of|${String(r.to)}`;
      if(plan.dates.has(planKey)){
        const canonical=[String(r.from),String(r.to)].sort().join("|");
        pairDates.set(canonical,plan.dates.get(planKey)||"");
      }
    });

    out.forEach(r=>{
      if(!isSpouse(r))return;
      const canonical=[String(r.from),String(r.to)].sort().join("|");
      if(pairDates.has(canonical))r.marriageDate=pairDates.get(canonical);
    });
    return out;
  }

  async function refreshDates(){
    const client=sb(),u=auth();
    if(!client||!u.familyId){
      const hadDates=dates.size>0;
      dates=new Map();
      migrationReady=false;
      if(hadDates)window.dispatchEvent(new CustomEvent("familybook:marriage-data-updated"));
      return false;
    }
    const {data,error}=await client.rpc("get_relationship_marriage_dates");
    if(error){
      migrationReady=false;
      console.warn("Family Book marriage dates are not available yet:",error.message||error);
      return false;
    }
    const next=new Map();
    (Array.isArray(data)?data:[]).forEach(r=>{
      if(r?.from&&r?.to&&r?.type==="spouse_of"&&r?.marriageDate){
        next.set(key(r.from,r.to,r.type),String(r.marriageDate));
      }
    });
    commitDates(next);
    return true;
  }

  if(original.init){
    base.init=async(...args)=>{
      const result=await original.init(...args);
      await refreshDates();
      return result;
    };
  }

  if(original.reload){
    base.reload=async(...args)=>{
      const result=await original.reload(...args);
      await refreshDates();
      return result;
    };
  }

  if(original.getRelationships){
    base.getRelationships=()=>original.getRelationships().map(r=>({
      ...r,
      marriageDate:dates.get(key(r.from,r.to,r.type))||r.marriageDate||""
    }));
  }

  if(original.syncRelationships){
    base.syncRelationships=async rows=>{
      const enriched=applyPlan(rows);
      const result=await original.syncRelationships(enriched);
      const client=sb();
      if(!client)return result;

      const spousePayload=enriched.filter(isSpouse).map(r=>({
        from:r.from,to:r.to,type:r.type,marriageDate:r.marriageDate||null
      }));
      const {error}=await client.rpc("set_relationship_marriage_dates",{p_relationships:spousePayload});
      if(error){
        migrationReady=false;
        console.warn("Could not save marriage dates:",error.message||error);
        return result;
      }

      const next=new Map();
      spousePayload.forEach(r=>{
        if(r.marriageDate)next.set(key(r.from,r.to,r.type),String(r.marriageDate));
      });
      commitDates(next);
      return result;
    };
  }

  window.addEventListener("familybook:family-data-updated",()=>{refreshDates().catch(()=>{})});

  window.FB_MARRIAGE_DATA={
    refresh:refreshDates,
    isReady:()=>migrationReady,
    getMarriageDate:(from,to)=>dates.get(key(from,to,"spouse_of"))||dates.get(key(to,from,"spouse_of"))||""
  };
})();
