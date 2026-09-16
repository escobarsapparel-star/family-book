(()=>{
  if(window.__fbCalendarDateAdd)return;
  window.__fbCalendarDateAdd=true;

  function openAddEvent(date){
    if(!date)return;
    if(window.FB_CALENDAR)window.FB_CALENDAR.prefillDate=date;
    if(typeof window.go==="function")window.go("add-event");
  }

  document.addEventListener("click",event=>{
    const cell=event.target?.closest?.(".calendar-day[data-cal-date]");
    if(!cell)return;

    // Existing events keep their own click action instead of opening Add event.
    if(event.target.closest("[data-cal-item],[data-cal-date-more],button,a,input,select,textarea,label"))return;

    openAddEvent(cell.dataset.calDate);
  });

  document.addEventListener("keydown",event=>{
    if(event.key!=="Enter"&&event.key!==" ")return;
    const cell=event.target?.closest?.(".calendar-day[data-cal-date]");
    if(!cell)return;
    event.preventDefault();
    openAddEvent(cell.dataset.calDate);
  });

  const style=document.createElement("style");
  style.textContent=`
    .calendar-day[data-cal-date]{cursor:pointer;touch-action:manipulation}
    .calendar-day[data-cal-date]:hover{background:rgba(126,166,137,.08)}
    .calendar-day[data-cal-date]:focus-visible{outline:2px solid #87b898;outline-offset:-2px}
    @media(max-width:759px){
      .calendar-day[data-cal-date]{-webkit-tap-highlight-color:rgba(126,166,137,.14)}
      .calendar-day[data-cal-date]:active{background:rgba(126,166,137,.13)}
    }
  `;
  document.head.appendChild(style);

  const makeFocusable=()=>{
    document.querySelectorAll(".calendar-day[data-cal-date]").forEach(cell=>{
      if(!cell.hasAttribute("tabindex"))cell.tabIndex=0;
      if(!cell.hasAttribute("role"))cell.setAttribute("role","button");
      if(!cell.hasAttribute("aria-label"))cell.setAttribute("aria-label",`Add event on ${cell.dataset.calDate}`);
    });
  };

  const observer=new MutationObserver(makeFocusable);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener("DOMContentLoaded",makeFocusable,{once:true});
  makeFocusable();
})();
