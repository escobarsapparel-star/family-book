(()=>{
  const sameId=(a,b)=>String(a||"")===String(b||"");

  const wrap=name=>{
    const wall=window.FB_WALL;
    if(!wall||typeof wall[name]!=="function")return;

    const original=wall[name].bind(wall);

    wall[name]=async function(member,...args){
      const social=window.FB_SOCIAL_DATA;
      if(!social||typeof social.getPosts!=="function")return original(member,...args);

      const originalGetPosts=social.getPosts.bind(social);
      const memberId=String(member?.id||"");

      // Personal Wall activity must be matched only by the unique person_id.
      // Keep the original post payload intact so rich Watching/Listening/
      // Feeling activity renderers can parse it correctly.
      social.getPosts=()=>originalGetPosts().filter(item=>sameId(item?.authorId,memberId));

      try{return await original(member,...args)}
      finally{social.getPosts=originalGetPosts}
    };
  };

  wrap("bindMemberActivity");
  wrap("bindMemberWall");
})();
