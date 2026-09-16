(()=>{
  if(window.__fbMemberProfileHeader)return;
  window.__fbMemberProfileHeader=true;

  function profileName(page){
    return page?.querySelector('.fb-basic-name h1,.fb-member-profile h1,.profile-view-card > h1')?.textContent?.trim()||'Profile';
  }

  function polish(){
    document.querySelectorAll('.member-profile-view:not(.history-profile-view):not(.account-profile-view)').forEach(page=>{
      const back=page.querySelector(':scope > .fu-back');
      if(!back)return;
      const name=profileName(page);
      back.classList.add('fb-member-profile-header');
      back.setAttribute('aria-label','Back to Members');
      back.innerHTML=`<i data-lucide="arrow-left"></i><span>${String(name).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}</span>`;
    });
    window.lucide?.createIcons?.();
  }

  const schedule=()=>requestAnimationFrame(polish);
  window.addEventListener('load',schedule);
  window.addEventListener('familybook:basic-member-profile-ready',schedule);
  window.addEventListener('familybook:family-data-updated',schedule);
  document.addEventListener('click',schedule);

  const start=()=>{
    polish();
    const screen=document.querySelector('#screen');
    if(screen)new MutationObserver(schedule).observe(screen,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();