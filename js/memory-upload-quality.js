(()=>{
  if(window.__fbMemoryUploadQuality)return;
  window.__fbMemoryUploadQuality=true;

  const nativeCreateImageBitmap=typeof window.createImageBitmap==="function"
    ? window.createImageBitmap.bind(window)
    : null;
  const nativeToBlob=window.HTMLCanvasElement?.prototype?.toBlob;

  if(!nativeCreateImageBitmap||!nativeToBlob)return;

  let currentMemoryFile=null;

  window.createImageBitmap=async function(source,...args){
    const isMemoryEditor=!!document.querySelector("#memoryEditorMount");
    const isImage=source instanceof Blob&&String(source.type||"").startsWith("image/");
    if(isMemoryEditor&&isImage)currentMemoryFile=source;
    return nativeCreateImageBitmap(source,...args);
  };

  window.HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){
    const isMemoryEditor=!!document.querySelector("#memoryEditorMount");
    const isMainMemoryEncode=isMemoryEditor
      &&currentMemoryFile
      &&String(type||"").toLowerCase()==="image/webp"
      &&Math.abs(Number(quality)-0.80)<0.001;

    if(!isMainMemoryEncode){
      return nativeToBlob.call(this,callback,type,quality);
    }

    const sourceFile=currentMemoryFile;
    currentMemoryFile=null;
    const fallbackCanvas=this;

    (async()=>{
      let bitmap=null;
      try{
        bitmap=await nativeCreateImageBitmap(sourceFile,{imageOrientation:"from-image"});
        const width=bitmap.width||0,height=bitmap.height||0;
        if(!width||!height)throw new Error("Unreadable image dimensions.");

        const max=2880;
        const scale=Math.min(1,max/Math.max(width,height));
        const w=Math.max(1,Math.round(width*scale));
        const h=Math.max(1,Math.round(height*scale));
        const canvas=document.createElement("canvas");
        canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext("2d",{alpha:false});
        ctx.fillStyle="#fff";
        ctx.fillRect(0,0,w,h);
        ctx.imageSmoothingEnabled=true;
        if("imageSmoothingQuality" in ctx)ctx.imageSmoothingQuality="high";
        ctx.drawImage(bitmap,0,0,w,h);

        nativeToBlob.call(canvas,blob=>{
          bitmap?.close?.();
          callback(blob||null);
        },"image/webp",.92);
      }catch(err){
        try{bitmap?.close?.()}catch(_){}
        console.warn("Family Book high-quality Memory preparation failed; standard quality will be used.",err);
        nativeToBlob.call(fallbackCanvas,callback,type,quality);
      }
    })();
  };
})();
