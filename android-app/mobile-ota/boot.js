/* Family Book stable-APK web hotfix channel.
   Optional web-only patches. Never mutates the native bridge or APK bundle.
   No update in the feed means the original app is unchanged. */
(()=>{
  "use strict";
  if(window.__fbMobileLiteOtaLoaded) return;
  window.__fbMobileLiteOtaLoaded=true;

  const base="https://raw.githubusercontent.com/escobarsapparel-star/family-book/main/mobile-ota/";
  const manifestUrl=base+"manifest.json";
  const channel="original-mobile-lite";
  const blockedKey="fb_mobile_ota_blocked";
  let activeCheck=null;
  let status="idle";

  function emit(next){
    status=next;
    try{window.dispatchEvent(new CustomEvent("familybook:ota",{detail:{status:next}}))}catch(_){}
  }
  function bytesToHex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("")}
  async function digest(data){
    if(!globalThis.crypto?.subtle)throw Error("Secure digest unavailable");
    return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256",data)));
  }
  async function fetchText(url){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(url,{cache:"no-store",signal:controller.signal});
      if(!response.ok)throw Error("Update fetch returned "+response.status);
      const data=await response.arrayBuffer();
      if(data.byteLength>300000)throw Error("Update file too large");
      return data;
    }finally{clearTimeout(timer)}
  }
  function validManifest(m){
    return m&&m.schema===1&&m.channel===channel&&Number.isSafeInteger(m.version)&&m.version>=0&&
      Array.isArray(m.assets)&&m.assets.length<=6&&m.assets.every(a=>
        a&&a.type==="css"||a&&a.type==="js"
      )&&m.assets.every(a=>
        typeof a.name==="string"&&/^[a-z0-9_-]+\.(?:js|css)$/.test(a.name)&&
        a.name.endsWith("."+a.type)&&/^[a-f0-9]{64}$/.test(a.sha256)
      );
  }
  async function applyFiles(version,assets){
    const staged=[];
    try{
      for(const a of assets){
        const url=base+"releases/"+version+"/"+a.name;
        const data=await fetchText(url);
        if(await digest(data)!==a.sha256)throw Error("Update checksum mismatch");
        staged.push({type:a.type,url:URL.createObjectURL(new Blob([data],{
          type:a.type==="css"?"text/css":"text/javascript"
        }))});
      }
      // Fetch+verify all parts before applying any of them.
      for(const asset of staged){
        await new Promise((resolve,reject)=>{
          const node=asset.type==="css"?document.createElement("link"):document.createElement("script");
          if(asset.type==="css"){node.rel="stylesheet";node.href=asset.url}
          else{node.src=asset.url;node.async=false}
          node.onload=resolve;
          node.onerror=()=>reject(Error("Update resource could not load"));
          document.head.appendChild(node);
        });
      }
      emit("applied");
      return "applied";
    }finally{
      // Blob URLs may be released after browser resource load.
      staged.forEach(x=>setTimeout(()=>URL.revokeObjectURL(x.url),2000));
    }
  }
  function checkNow(){
    if(activeCheck)return activeCheck;
    activeCheck=(async()=>{
      try{
        emit("checking");
        const data=await fetchText(manifestUrl+"?t="+Date.now());
        const manifest=JSON.parse(new TextDecoder().decode(data));
        if(!validManifest(manifest))throw Error("Invalid OTA manifest");
        if(manifest.version===0||manifest.assets.length===0){emit("unchanged");return "unchanged"}
        const blocked=Number(localStorage.getItem(blockedKey)||-1);
        if(manifest.version===blocked){emit("blocked");return "blocked"}
        emit("downloading");
        try{return await applyFiles(manifest.version,manifest.assets)}
        catch(err){
          localStorage.setItem(blockedKey,String(manifest.version));
          console.warn("Family Book web patch disabled after error:",err);
          emit("rejected");
          return "rejected";
        }
      }catch(err){
        console.warn("Family Book optional patch check:",err?.message||err);
        emit("unavailable");
        return "unavailable";
      }finally{activeCheck=null}
    })();
    return activeCheck;
  }
  window.FB_MOBILE_OTA={checkNow,getStatus:()=>status};
  // Delayed, optional check; nothing ever blocks login or home rendering.
  window.addEventListener("load",()=>setTimeout(()=>{void checkNow()},12000),{once:true});
})();