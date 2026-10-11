
  /* Native APK: open the same designed celebration card when an event is
     deliberately selected. Automatic birthday/anniversary welcome still runs
     only on the actual day; manual previews do not mark future events seen. */
  function showSelectedEventCard(id){
    const key=String(id||"");
    if(!key)return false;
    let row=routeEventRow("view-event:"+key);
    try {
      const instance=window.FB_CALENDAR?.getUpcoming?.(400)?.find?.(event=>String(event.id)===key);
      if(instance)row={...row,...instance};
    }catch(_){}
    if(!row)return false;
    const today=ymd();
    const isToday=String(row.date||"")===today;
    let html=welcomeMarkup(row);
    if(!isToday){
      const theme=eventTheme(row);
      const kicker=theme==="birthday"?"BIRTHDAY CELEBRATION":
        theme==="anniversary"?"ANNIVERSARY CELEBRATION":
        theme==="travel"?"FAMILY ADVENTURE":"SPECIAL FAMILY EVENT";
      const date=String(row.date||"");
      let label=date;
      if(/^\d{4}-\d{2}-\d{2}$/.test(date)){
        const parts=date.split("-").map(Number);
        const value=new Date(parts[0],parts[1]-1,parts[2]);
        if(!Number.isNaN(value.getTime()))
          label=new Intl.DateTimeFormat(undefined,{day:"numeric",month:"long",year:"numeric"}).format(value);
      }
      // A future event is not happening today. Preserve the scenic artwork,
      // but display its real date and an appropriate upcoming message.
      html=html
        .replace("TODAY WE CELEBRATE",kicker)
        .replace("CELEBRATING LOVE",kicker)
        .replace("TODAY'S FAMILY EVENT",kicker)
        .replace(/<p class="fb-event-meta">[\s\S]*?<\/p>/,
          '<p class="fb-event-meta">'+esc(label)+'</p>')
        .replace(/<strong class="fb-event-bonvoyage">[\s\S]*?<\/strong>/,
          '<strong class="fb-event-bonvoyage">'+
          (theme==="birthday"?"A birthday to look forward to!":
           theme==="anniversary"?"A special anniversary ahead!":
           theme==="travel"?"Adventure awaits!":"A special day is coming!")+'</strong>')
        .replace(/<button type="button" class="secondary fb-event-capture">[\s\S]*?<\/button>/,
          '<button type="button" class="secondary fb-event-dismiss"><span>Close</span></button>');
    }
    document.querySelector(".fb-event-day-overlay")?.remove();
    document.body.insertAdjacentHTML("beforeend",html);
    const overlay=document.querySelector(".fb-event-day-overlay");
    if(!overlay)return false;
    const close=()=>{
      if(isToday)markSeen(row);
      overlay.remove();
    };
    overlay.querySelector(".fb-event-day-close")?.addEventListener("click",close);
    overlay.querySelector(".fb-event-dismiss")?.addEventListener("click",close);
    overlay.querySelector(".fb-event-view")?.addEventListener("click",close);
    overlay.querySelector(".fb-event-capture")?.addEventListener("click",()=>{
      markSeen(row);
      openCapture(row);
    });
    overlay.addEventListener("click",event=>{if(event.target===overlay)close()});
    window.icons?.();
    return true;
  }
