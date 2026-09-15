(()=>{
  const ORDER=["members","memories","tree","calendar"];

  function reorder(){
    const rail=document.querySelector(".desktop-left-rail");
    const nav=rail?.querySelector(".desktop-side-nav");
    if(!nav)return false;

    const current=Array.from(nav.querySelectorAll(":scope > [data-desktop-route]"));
    const currentOrder=current.map(btn=>btn.dataset.desktopRoute).filter(route=>ORDER.includes(route));
    const alreadyCorrect=ORDER.every((route,index)=>currentOrder[index]===route);
    if(alreadyCorrect)return true;

    const buttons=new Map(current.map(btn=>[btn.dataset.desktopRoute,btn]));
    ORDER.forEach(route=>{
      const btn=buttons.get(route);
      if(btn)nav.appendChild(btn);
    });
    return true;
  }

  const root=document.getElementById("app");
  const observer=new MutationObserver(()=>{
    if(document.querySelector(".desktop-left-rail"))reorder();
  });
  if(root)observer.observe(root,{childList:true,subtree:true});
  reorder();
})();
