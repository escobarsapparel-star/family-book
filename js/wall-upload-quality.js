(()=>{
  if(window.__fbWallUploadQuality)return;
  window.__fbWallUploadQuality=true;

  const social=window.FB_SOCIAL_DATA;
  if(!social||typeof social.savePost!=="function")return;

  const selectedByScope=new Map();
  const fileKey=file=>`${file?.name||""}|${Number(file?.size)||0}|${file?.type||""}`;
  const metaKey=meta=>`${meta?.name||""}|${Number(meta?.size)||0}|${meta?.type||""}`;

  async function decodeImage(file){
    if("createImageBitmap" in window){
      try{
        const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
        return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()};
      }catch(_){ }
    }

    const url=URL.createObjectURL(file);
    try{
      const image=await new Promise((resolve,reject)=>{
        const img=new Image();
        img.onload=()=>resolve(img);
        img.onerror=()=>reject(new Error("This image could not be opened."));
        img.src=url;
      });
      return {source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>URL.revokeObjectURL(url)};
    }catch(err){
      URL.revokeObjectURL(url);
      throw err;
    }
  }

  function canvasBlob(source,width,height,max,quality){
    const scale=Math.min(1,max/Math.max(width,height));
    const w=Math.max(1,Math.round(width*scale));
    const h=Math.max(1,Math.round(height*scale));
    const canvas=document.createElement("canvas");
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d");
    ctx.imageSmoothingEnabled=true;
    if("imageSmoothingQuality" in ctx)ctx.imageSmoothingQuality="high";
    ctx.drawImage(source,0,0,w,h);
    return new Promise((resolve,reject)=>{
      canvas.toBlob(blob=>blob?resolve({blob,width:w,height:h}):reject(new Error("Could not prepare this image.")),"image/webp",quality);
    });
  }

  async function prepareHighQuality(file){
    const image=await decodeImage(file);
    try{
      if(!image.width||!image.height)throw new Error("This image has no readable dimensions.");
      const main=await canvasBlob(image.source,image.width,image.height,2880,.92);
      const thumb=await canvasBlob(image.source,image.width,image.height,720,.82);
      return {
        kind:"image",
        blob:main.blob,
        thumb:thumb.blob,
        meta:{
          name:file.name,
          type:file.type,
          size:file.size,
          width:main.width,
          height:main.height,
          uploadQuality:"high"
        }
      };
    }finally{
      image.close?.();
    }
  }

  document.addEventListener("change",event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||!input.matches("[data-wall-file]"))return;
    const file=input.files?.[0];
    const scope=input.dataset.wallFile||"home";
    if(!file||!String(file.type||"").startsWith("image/")){
      selectedByScope.delete(scope);
      return;
    }

    const key=fileKey(file);
    selectedByScope.set(scope,{
      key,
      promise:prepareHighQuality(file).catch(err=>{
        console.warn("Family Book high-quality wall image preparation failed; standard upload will be used.",err);
        return null;
      })
    });
  },true);

  document.addEventListener("click",event=>{
    const remove=event.target?.closest?.("[data-wall-remove-attachment]");
    if(remove)selectedByScope.delete(remove.dataset.wallRemoveAttachment||"home");
  },true);

  const originalSave=social.savePost.bind(social);
  social.savePost=async function(post,attachment){
    if(attachment?.kind!=="image")return originalSave(post,attachment);

    const wanted=metaKey(attachment.meta||{});
    let matchScope="",match=null;
    for(const [scope,entry] of selectedByScope){
      if(entry?.key===wanted){matchScope=scope;match=entry;break}
    }

    if(!match)return originalSave(post,attachment);

    const upgraded=await match.promise;
    const result=await originalSave(post,upgraded||attachment);
    if(matchScope)selectedByScope.delete(matchScope);
    return result;
  };
})();
