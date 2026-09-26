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

  // If one sibling already has an explicit parent, use that same parent for
  // sibling positioning in the DISPLAY graph only. Saved Supabase data is untouched.
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

  // The original tree engine always returns at least a 900px canvas. That is
  // correct for a standalone tree but far too wide when several sibling branches
  // are combined. Crop the logical canvas to the actual node bounds first.
  function compactDrawing(drawing){
    if(!drawing?.html)return drawing;
    const host=document.createElement("div");
    host.innerHTML=drawing.html;
    const canvas=host.querySelector(".ct-canvas");
    if(!canvas)return drawing;

    const nodes=[...canvas.querySelectorAll(".ct-node")];
    if(!nodes.length)return drawing;
    const boxes=nodes.map(node=>({
      left:Number.parseFloat(node.style.left)||0,
      width:Number.parseFloat(node.style.width)||176
    }));
    const minLeft=Math.min(...boxes.map(b=>b.left));
    const maxRight=Math.max(...boxes.map(b=>b.left+b.width));
    const PAD=20;
    const shift=Math.max(0,minLeft-PAD);
    const width=Math.max(216,Math.ceil(maxRight-minLeft+PAD*2));

    nodes.forEach(node=>{
      const left=Number.parseFloat(node.style.left)||0;
      node.style.left=`${left-shift}px`;
    });

    const svg=canvas.querySelector(".ct-lines");
    if(svg&&shift){
      svg.innerHTML=`<g transform="translate(${-shift} 0)">${svg.innerHTML}</g>`;
      svg.setAttribute("width",String(width));
      const height=Number.parseFloat(svg.getAttribute("height"))||Number(drawing.height)||260;
      svg.setAttribute("viewBox",`0 0 ${width} ${height}`);
    }else if(svg){
      svg.setAttribute("width",String(width));
      const height=Number.parseFloat(svg.getAttribute("height"))||Number(drawing.height)||260;
      svg.setAttribute("viewBox",`0 0 ${width} ${height}`);
    }

    canvas.style.width=`${width}px`;
    return {...drawing,width,html:canvas.outerHTML};
  }

  function branchDrawing(id,baseRootId,baseDrawing){
    const drawing=String(id)===String(baseRootId)?baseDrawing:originalBuild(id,false);
    return compactDrawing(drawing);
  }

  // When siblings have no recorded parent yet, show each sibling as a compact,
  // parallel branch on the same generation. Their own children/spouses stay attached.
  window.buildCoordinateTree=function(rootId,focused=false){
    const rawBase=originalBuild(rootId,focused);
    if(focused||!rawBase?.html)return rawBase;
    const base=compactDrawing(rawBase);

    const group=siblingComponent(rootId);
    if(group.length<2)return rawBase;

    const memberList=members();
    const memberOrder=new Map(memberList.map((m,i)=>[String(m.id),i]));
    const memberById=new Map(memberList.map(m=>[String(m.id),m]));
    const birthKey=id=>{
      const raw=String(memberById.get(String(id))?.birthday||"").trim();
      const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return iso?Number(iso[1])*10000+Number(iso[2])*100+Number(iso[3]):Number.POSITIVE_INFINITY;
    };
    const missing=group
      .filter(id=>String(id)!==String(rootId)&&!containsPerson(rawBase.html,id))
      .sort((a,b)=>{
        const aBirth=birthKey(a),bBirth=birthKey(b);
        if(aBirth!==bBirth)return aBirth-bBirth;
        return (memberOrder.get(a)??9999)-(memberOrder.get(b)??9999);
      });
    if(!missing.length)return rawBase;

    const ids=[String(rootId),...missing];
    const branches=ids.map(id=>({id,drawing:branchDrawing(id,rootId,base)})).filter(x=>x.drawing?.html);
    if(branches.length<2)return rawBase;

    const GAP=44,PAD=34,TOP_BAND=38;
    let x=PAD,maxH=0;
    branches.forEach((b,i)=>{
      b.left=x;
      b.center=x+(Number(b.drawing.width)||0)/2;
      maxH=Math.max(maxH,Number(b.drawing.height)||0);
      x+=(Number(b.drawing.width)||0)+(i<branches.length-1?GAP:0);
    });

    const contentWidth=x+PAD;
    const width=Math.max(900,contentWidth);
    const centerOffset=Math.max(0,(width-contentWidth)/2);
    if(centerOffset){
      branches.forEach(b=>{b.left+=centerOffset;b.center+=centerOffset});
    }

    const height=Math.max(260,maxH+TOP_BAND);
    const centers=branches.map(b=>b.center);
    const railY=20,stemBottom=TOP_BAND+24;
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