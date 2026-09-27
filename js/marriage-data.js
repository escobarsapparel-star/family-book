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
    syncRelationships:base.syncRelationships?.bind(base),
    syncPersonRelationships:base.syncPersonRelationships?.bind(base)
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

  if(original.syncPersonRelationships){
    base.syncPersonRelationships=async(personId,rows)=>{
      const enriched=applyPlan(rows);
      const result=await original.syncPersonRelationships(personId,enriched);
      const client=sb(),u=auth();
      if(!client||u.role!=="admin")return result;

      const spousePayload=[];
      const seen=new Set();
      enriched.filter(isSpouse).forEach(r=>{
        const date=r.marriageDate||null;
        [
          {from:r.from,to:r.to,type:"spouse_of",marriageDate:date},
          {from:r.to,to:r.from,type:"spouse_of",marriageDate:date}
        ].forEach(item=>{
          const k=key(item.from,item.to,item.type);
          if(seen.has(k))return;
          seen.add(k);
          spousePayload.push(item);
        });
      });

      const {error}=await client.rpc("set_relationship_marriage_dates",{p_relationships:spousePayload});
      if(error){
        migrationReady=false;
        console.warn("Could not save marriage dates:",error.message||error);
        return result;
      }

      const target=String(personId||"");
      const next=new Map(dates);
      for(const k of [...next.keys()]){
        const [from,type,to]=String(k).split("|");
        if(type==="spouse_of"&&(from===target||to===target))next.delete(k);
      }
      spousePayload.forEach(r=>{
        if(r.marriageDate)next.set(key(r.from,r.to,r.type),String(r.marriageDate));
      });
      commitDates(next);
      return result;
    };
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
