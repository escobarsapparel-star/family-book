(()=>{
  if(window.__fbApkHomePostSuccessInstalled)return;
  window.__fbApkHomePostSuccessInstalled=true;

  function visibleHolder(){
    return [...document.querySelectorAll('.home-status-composer-shell')].find(holder=>{
      const modal=holder.querySelector('[data-home-composer-modal]');
      return modal&&!modal.hidden;
    })||null;
  }

  function hasAttachment(holder){
    const preview=holder?.querySelector('[data-wall-preview="home"]');
    return !!preview&&!preview.hidden&&preview.childElementCount>0;
  }

  function closeComposer(holder){
    const modal=holder?.querySelector('[data-home-composer-modal]');
    if(!modal||modal.hidden)return;
    if(modal.dataset.historyPushed==='1'&&history.state?.fbComposerOpen){
      try{history.back();return}catch(_){}
    }
    modal.hidden=true;
    modal.dataset.historyPushed='0';
    document.body.classList.remove('home-composer-open');
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#wallHomePost');
    if(!button)return;
    const holder=button.closest('.home-status-composer-shell')||visibleHolder();
    if(!holder)return;

    const input=holder.querySelector('#wallHomeText');
    const place=holder.querySelector('[data-checkin-place="home"]');
    const before={
      text:String(input?.value||'').trim(),
      place:String(place?.value||'').trim(),
      attachment:hasAttachment(holder)
    };
    const hadPayload=!!(before.text||before.place||before.attachment);
    let sawDisabled=false;
    let ticks=0;

    const timer=setInterval(()=>{
      ticks++;
      if(button.disabled)sawDisabled=true;
      if(sawDisabled&&!button.disabled){
        const afterText=String(input?.value||'').trim();
        const afterPlace=String(place?.value||'').trim();
        const afterAttachment=hasAttachment(holder);
        clearInterval(timer);
        if(hadPayload&&!afterText&&!afterPlace&&!afterAttachment){
          closeComposer(holder);
        }
        return;
      }
      if(ticks>=200)clearInterval(timer);
    },100);
  },true);
})();
