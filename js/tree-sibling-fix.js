(()=>{
  if(window.__fbTreeSiblingFix)return;
  window.__fbTreeSiblingFix=true;

  const originalFamilyGraph=window.familyGraph;
  const originalBuild=window.buildCoordinateTree;
  if(typeof originalFamilyGraph!=="function"||typeof originalBuild!=="function")return;

  const members=()=>{
    try{return typeof window.ensureOwner==="function"?window.ensureOwner():[]}catch(_){return []}
  };
  const relationships=()=>{
    try{return typeof window.migrateRelationships==="function"?window.migrateRelationships():[]}catch(_){return []}
  };

  function siblingEdges(){
    const valid=new Set(members().map(m=>String(m.id)));
    return relationships().filter(r=>r&&r.type==="sibling_of"&&valid.has(String(r.from))&&valid.has(String(r.to)));
  }

  function siblingMap(){
    const map={};
    siblingEdges().forEach(r=>{
      const a=String(r.from),b=String(r.to);
      if(a===b)return;
      (map[a]??=new Set()).add(b);
      (map[b]??=new Set()).add(a);
    });
    return map;
  }

  function siblingComponent(id){
    const start=String(id||"");
    const map=siblingMap();
    if(!start||!map[start])return [];
    const seen=new Set([start]),queue=[start];
    while(queue.length){
      const cur=queue.shift();
      (map[cur]||[]).forEach(next=>{
        if(!seen.has(next)){seen.add(next);queue.push(next)}
      });
    }
    return [...seen];
  }

  // If one sibling already has explicit parent links, use those same parents
  // for the other sibling in the DISPLAY graph only. Nothing is written back
  // to Supabase, so the saved relationship data remains exactly as entered.
  window.familyGraph=function(){
    const G=originalFamilyGraph();
    if(!G)return G;

    const parents={};
    Object.entries(G.parents||{}).forEach(([id,list])=>parents[id]=[...list]);
    const children={};
    Object.entries(G.children||{}).forEach(([id,list])=>children[id]=[...list]);

    const map=siblingMap();
    const visited=new Set();
    Object.keys(map).forEach(id=>{
      if(visited.has(id))return;
      const group=siblingComponent(id);
      group.forEach(x=>visited.add(x));
      const sharedParents=[...new Set(group.flatMap(x=>parents[x]||[]))];
      if(!sharedParents.length)return;
      group.forEach(child=>{
        parents[child]??=[];
        sharedParents.forEach(parent=>{
          if(!parents[child].includes(parent))parents[child].push(parent);
          children[parent]??=[];
          if(!children[parent].includes(child))children[parent].push(child);
        });
      });
    });

    return {...G,parents,children};
  };

  function containsPerson(html,id){
    const safe=String(id||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;");
    return String(html||"").includes(`data-view-member="${safe}"`);
  }

  function branchDrawing(id,baseRootId,baseDrawing){
    return String(id)===String(baseRootId)?baseDrawing:originalBuild(id,false);
  }

  // When a sibling group has no parent at all, there is no natural parent node
  // for the existing tree engine to hang them from. In that case, display each
  // sibling as a parallel branch on the same generation, connected by a sibling bar.
  window.buildCoordinateTree=function(rootId,focused=false){
    const base=originalBuild(rootId,focused);
    if(focused||!base?.html)return base;

    const group=siblingComponent(rootId);
    if(group.length<2)return base;

    const memberOrder=new Map(members().map((m,i)=>[String(m.id),i]));
    const missing=group
      .filter(id=>String(id)!==String(rootId)&&!containsPerson(base.html,id))
      .sort((a,b)=>(memberOrder.get(a)??9999)-(memberOrder.get(b)??9999));
    if(!missing.length)return base;

    const ids=[String(rootId),...missing];
    const branches=ids.map(id=>({id,drawing:branchDrawing(id,rootId,base)})).filter(x=>x.drawing?.html);
    if(branches.length<2)return base;

    const GAP=54,PAD=34,TOP_BAND=34;
    let x=PAD,maxH=0;
    branches.forEach((b,i)=>{
      b.left=x;
      b.center=x+(Number(b.drawing.width)||0)/2;
      maxH=Math.max(maxH,Number(b.drawing.height)||0);
      x+=(Number(b.drawing.width)||0)+(i<branches.length-1?GAP:0);
    });
    const width=Math.max(900,x+PAD);
    const height=Math.max(260,maxH+TOP_BAND);
    const centers=branches.map(b=>b.center);
    const railY=18,stemBottom=TOP_BAND+24;
    const lineColor="currentColor";
    const siblingLines=`<line x1="${Math.min(...centers)}" y1="${railY}" x2="${Math.max(...centers)}" y2="${railY}" class="ct-sibling-line"/>${centers.map(cx=>`<line x1="${cx}" y1="${railY}" x2="${cx}" y2="${stemBottom}" class="ct-sibling-line"/>`).join("")}`;
    const branchHtml=branches.map(b=>`<div class="ct-sibling-branch" style="left:${b.left}px;top:${TOP_BAND}px;width:${b.drawing.width}px;height:${b.drawing.height}px">${b.drawing.html}</div>`).join("");

    return {
      width,height,
      html:`<div class="ct-canvas ct-sibling-canvas" style="width:${width}px;height:${height}px">
        <svg class="ct-lines ct-sibling-lines" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${siblingLines}</svg>
        ${branchHtml}
      </div>`
    };
  };
})();