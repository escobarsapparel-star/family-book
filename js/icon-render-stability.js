(()=>{
  if(window.__fbIconRenderStability)return;
  window.__fbIconRenderStability=true;

  const original=window.icons;
  if(typeof original!=="function")return;
  let rendering=false;

  window.icons=function stableFamilyBookIcons(){
    if(rendering)return;
    // Lucide only needs work while unrendered placeholders still exist.
    // This prevents timer/widget observers from repeatedly reprocessing the
    // whole page every second after the icons are already rendered.
    if(!document.querySelector("[data-lucide]"))return;
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
