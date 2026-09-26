(()=>{
  if(window.__fbIconRenderStability)return;
  window.__fbIconRenderStability=true;

  const original=window.icons;
  if(typeof original!=="function")return;
  let rendering=false;

  window.icons=function stableFamilyBookIcons(){
    if(rendering)return;
    // Lucide-rendered SVGs keep a data-lucide attribute, so checking
    // [data-lucide] is not enough. Only <i> placeholders still need work.
    if(!document.querySelector("i[data-lucide]"))return;
    rendering=true;
    try{
      original();
    }catch(err){
      console.warn("Family Book icon render skipped:",err);
    }finally{
      rendering=false;
    }
  };
})();
