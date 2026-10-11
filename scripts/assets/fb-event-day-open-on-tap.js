/* Show celebration cards when selecting real upcoming events in Android.
   Do not alter original Dark theme, data, permissions or backend. */
(()=>{
  "use strict";
  if(window.__fbNativeSelectedEventCard)return;
  window.__fbNativeSelectedEventCard=true;
  const originalGo=window.go;
  if(typeof originalGo!=="function")return;
  const opening=new Set();
  window.go=function(route,...rest){
    const text=String(route||"");
    const isEvent=text.startsWith("view-event:");
    const id=isEvent?text.slice("view-event:".length):"";
    const skip=window.__fbSkipNativeEventPreview===true;
    if(skip)window.__fbSkipNativeEventPreview=false;
    const result=originalGo.call(this,route,...rest);
    if(!id||skip||opening.has(id))return result;
    opening.add(id);
    const open=()=>{
      try{return Boolean(window.FB_EVENT_DAY?.showSelectedEventCard?.(id))}
      catch(err){console.warn("Family Book special event preview:",err);return false}
    };
    // The normal event-detail route must render first. Then show its animated
    // celebration card. A delayed organizer load gets one retry.
    Promise.resolve().then(()=>{
      if(open())return;
      const loader=window.FB_ORGANIZER_DATA?.init;
      if(typeof loader==="function")
        return Promise.resolve(loader.call(window.FB_ORGANIZER_DATA))
          .then(()=>open());
    }).catch(err=>console.warn("Family Book event preview data:",err))
      .finally(()=>opening.delete(id));
    return result;
  };
})();
