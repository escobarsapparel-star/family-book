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

// Small UI enhancement loader. Kept separate from Wall/backend logic so
// media permissions and storage behaviour stay unchanged.
(()=>{
  if(window.__FB_WALL_VIEWER_LOADER__)return;
  window.__FB_WALL_VIEWER_LOADER__=true;

  if(!document.querySelector('link[data-fb-wall-viewer]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/wall-image-viewer.css?v=wall-image-viewer-1';
    link.dataset.fbWallViewer='1';
    document.head.appendChild(link);
  }

  if(!document.querySelector('script[data-fb-wall-viewer]')){
    const script=document.createElement('script');
    script.src='js/wall-image-viewer.js?v=wall-image-viewer-1';
    script.dataset.fbWallViewer='1';
    document.body.appendChild(script);
  }
})();
