(()=>{
  const isDisplay=v=>/^(data:|blob:|https?:)/i.test(String(v||"").trim());
  const auth=()=>{try{return window.FB_AUTH?.get?.()||{}}catch(_){return {}}};
  const ownMember=()=>{
    try{
      const u=auth(),id=u.memberId||"";
      const people=window.FB_FAMILY_DATA?.getPeople?.()||window.ensureOwner?.()||[];
      return (Array.isArray(people)?people:[]).find(p=>String(p?.id||"")===String(id))||null;
    }catch(_){return null}
  };
  const candidates=()=>{
    const out=[];
    try{out.push(window.currentUserPhoto?.()||"")}catch(_){}
    try{out.push(document.querySelector("#topProfileButton img")?.src||"")}catch(_){}
    try{out.push(ownMember()?.photo||"")}catch(_){}
    try{out.push(auth().photo||"")}catch(_){}
    return out.map(v=>String(v||"").trim()).filter(Boolean);
  };
  const direct=()=>candidates().find(isDisplay)||"";
  const rawPath=()=>candidates().find(v=>!isDisplay(v))||"";

  async function resolve(){
    const ready=direct();
    if(ready)return ready;
    const path=rawPath();
    if(!path)return "";
    try{
      const url=await window.FB_MEDIA?.getSignedUrl?.(path,7200);
      return isDisplay(url)?url:"";
    }catch(err){
      console.warn("Family Book profile photo could not be resolved:",err?.message||err);
      return "";
    }
  }

  window.FB_PROFILE_PHOTO={isDisplay,direct,rawPath,resolve};
})();