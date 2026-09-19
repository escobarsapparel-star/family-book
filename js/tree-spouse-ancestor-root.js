(()=>{
  if(window.__fbTreeSpouseAncestorRootFix)return;
  window.__fbTreeSpouseAncestorRootFix=true;

  const original=window.findTreeRoot;
  if(typeof original!=='function')return;

  window.findTreeRoot=function(startId,G){
    const graph=G||window.familyGraph?.();
    if(!graph)return original(startId,G);
    const {byId={},parents={},spouse={}}=graph;
    if(!startId||!byId[startId])return startId;

    let bestId=startId;
    let bestDepth=0;

    function walk(id,depth,path){
      if(!id||!byId[id]||path.has(id))return;
      if(depth>bestDepth){
        bestDepth=depth;
        bestId=id;
      }

      const next=new Set(path);
      next.add(id);

      // Parents are one generation higher.
      (parents[id]||[]).filter(pid=>byId[pid]).forEach(pid=>walk(pid,depth+1,next));

      // A spouse is the same generation. Traverse across the couple so the
      // spouse's parents can become the visible tree root when the founder has
      // no recorded parents of their own.
      const partnerId=spouse[id];
      if(partnerId&&byId[partnerId]&&!next.has(partnerId)){
        walk(partnerId,depth,next);
      }
    }

    walk(startId,0,new Set());
    return bestId;
  };
})();
