(()=>{
  const ORDER=["members","memories","tree","calendar"];

  function reorder(){
    const rail=document.querySelector(".desktop-left-rail");
    const nav=rail?.querySelector(".desktop-side-nav");
    if(!nav)return false;

    const buttons=new Map(
      Array.from(nav.querySelectorAll("[data-desktop-route]")).map(btn=>[btn.dataset.desktopRoute,btn])
    );

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
