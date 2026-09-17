(()=>{
  if(window.__fbTreeAgeOrder)return;
  window.__fbTreeAgeOrder=true;

  const original=window.familyGraph;
  if(typeof original!=="function")return;

  function birthTime(person){
    if(!person)return Number.POSITIVE_INFINITY;
    const raw=String(person.birthday||person.birthDate||"").trim();
    const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(iso){
      const t=Date.UTC(Number(iso[1]),Number(iso[2])-1,Number(iso[3]));
      return Number.isFinite(t)?t:Number.POSITIVE_INFINITY;
    }
    const year=Number(person.birthYear||person.yearBorn||0);
    return year>0?Date.UTC(year,0,1):Number.POSITIVE_INFINITY;
  }

  window.familyGraph=function(){
    const graph=original.apply(this,arguments);
    if(!graph?.children||!graph?.byId)return graph;

    Object.keys(graph.children).forEach(parentId=>{
      const ids=graph.children[parentId];
      if(!Array.isArray(ids)||ids.length<2)return;
      ids.sort((a,b)=>{
        const at=birthTime(graph.byId[a]);
        const bt=birthTime(graph.byId[b]);
        if(at===bt)return 0;
        return at-bt;
      });
    });

    return graph;
  };
})();
