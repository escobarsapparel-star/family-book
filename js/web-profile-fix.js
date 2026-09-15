(()=>{
  const sameId=(a,b)=>String(a||"")===String(b||"");

  const cleanActivityText=item=>{
    const raw=String(item?.text||"");
    const markers=[
      ["[[FB_LISTENING]]","listening"],
      ["[[FB_WATCHING]]","watching"]
    ];

    for(const [marker,type] of markers){
      if(!raw.startsWith(marker)) continue;

      const rest=raw.slice(marker.length);
      const lineBreak=rest.indexOf("\n");
      const metaText=(lineBreak>=0?rest.slice(0,lineBreak):rest).trim();
      const note=(lineBreak>=0?rest.slice(lineBreak+1):"").trim();

      let title="";
      try{
        const meta=JSON.parse(metaText);
        title=String(meta?.title||meta?.track_name||meta?.name||"").trim();
      }catch(_){}

      return {
        ...item,
        activity:type,
        text:[title,note].filter(Boolean).join("\n")
      };
    }

    return item;
  };

  const wrap=name=>{
    const wall=window.FB_WALL;
    if(!wall||typeof wall[name]!=="function") return;

    const original=wall[name].bind(wall);

    wall[name]=async function(member,...args){
      const social=window.FB_SOCIAL_DATA;
      if(!social||typeof social.getPosts!=="function"){
        return original(member,...args);
      }

      const originalGetPosts=social.getPosts.bind(social);
      const memberId=String(member?.id||"");

      // Critical duplicate-name fix:
      // Personal Wall posts now match only the unique person_id.
      social.getPosts=()=>originalGetPosts()
        .filter(item=>sameId(item?.authorId,memberId))
        .map(cleanActivityText);

      try{
        return await original(member,...args);
      }finally{
        social.getPosts=originalGetPosts;
      }
    };
  };

  wrap("bindMemberActivity");
  wrap("bindMemberWall");
})();
