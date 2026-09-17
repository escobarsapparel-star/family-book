(()=>{
  const DISPLAY_LOCALE="en-ZA";
  function activity(ts){
    const n=Number(ts||0);
    if(!Number.isFinite(n)||n<=0)return "Earlier";
    const diff=Math.max(0,Date.now()-n),mins=Math.floor(diff/60000);
    if(mins<1)return "Just now";
    if(mins<60)return `${mins} min ago`;
    const hours=Math.floor(mins/60);
    if(hours<24)return `${hours}h ago`;
    try{
      const d=new Date(n),now=new Date();
      return new Intl.DateTimeFormat(DISPLAY_LOCALE,{day:"numeric",month:"short",year:d.getFullYear()===now.getFullYear()?undefined:"numeric"}).format(d);
    }catch(_){return "Earlier"}
  }
  function exact(ts){
    try{return new Intl.DateTimeFormat(DISPLAY_LOCALE,{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(Number(ts||0)))}catch(_){return ""}
  }
  window.FB_TIME={activity,exact};
})();