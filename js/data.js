window.FB_DATA={family:"Willemse Family",memories:[["Family Braai","12 family members"],["Old family album","Memories from years ago"],["Sunday together","8 family members"]],events:[["19","JUN","Kiano's Birthday","Birthday"],["28","SEP","Family Anniversary","Anniversary"],["04","OCT","Family Braai","Family event"]],people:["Theodore","Kiano","Mom","Dad","Grandma"]};

(()=>{
  const icons=[
    {sizes:"32x32",href:"assets/icons/familybook-favicon-32.png?v=2"},
    {sizes:"192x192",href:"assets/icons/familybook-icon-192.png?v=2"}
  ];
  icons.forEach(icon=>{
    let link=document.querySelector(`link[rel~="icon"][sizes="${icon.sizes}"]`);
    if(!link){
      link=document.createElement("link");
      link.rel="icon";
      link.type="image/png";
      link.sizes=icon.sizes;
      document.head.appendChild(link);
    }
    link.href=icon.href;
  });
})();