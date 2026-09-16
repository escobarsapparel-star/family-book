(()=>{
  if(window.__fbMemberProfilePullRefresh)return;
  window.__fbMemberProfilePullRefresh=true;

  const mobile=()=>window.matchMedia('(max-width:759px)').matches;
  const profile=()=>document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
  const nav=()=>document.querySelector('#app>.app>.bottom');
  let startY=0,pull=0,tracking=false,refreshing=false;

  function indicator(){
    let el=document.querySelector('.fb-profile-refresh-indicator');
    if(el)return el;
    el=document.createElement('div');
    el.className='fb-profile-refresh-indicator';
    el.innerHTML='<i data-lucide="rotate-cw"></i><span>Pull to refresh</span>';
    document.body.appendChild(el);
    window.lucide?.createIcons?.();
    return el;
  }

  function setIndicator(distance=0,state='pull'){
    const el=indicator();
    const visible=distance>4||state!=='pull';
    const y=Math.min(52,Math.max(0,distance*.38));
    el.classList.toggle('is-visible',visible);
    el.classList.toggle('is-ready',state==='ready');
    el.classList.toggle('is-refreshing',state==='refreshing');
    el.style.transform=`translate(-50%,${-46+y}px) scale(${.94+Math.min(.06,distance/1200)})`;
    el.querySelector('span').textContent=state==='refreshing'?'Refreshing…':state==='ready'?'Release to refresh':'Pull to refresh';
  }

  function resetPull(){
    const page=profile();
    if(page)page.style.transform='';
    pull=0;tracking=false;
    if(!refreshing){
      const el=document.querySelector('.fb-profile-refresh-indicator');
      if(el){
        el.classList.remove('is-visible','is-ready','is-refreshing');
        el.style.transform='translate(-50%,-48px) scale(.94)';
      }
    }
  }

  function fixGap(){
    if(!mobile())return;
    const page=profile(),header=page?.querySelector(':scope > .fb-member-profile-header'),topNav=nav();
    if(!page||!header||!topNav)return;
    const current=Number(page.dataset.fbProfileGapFix||0);
    const observed=header.getBoundingClientRect().top-topNav.getBoundingClientRect().bottom;
    const rawGap=observed+current;
    const desired=Math.max(0,Math.round(rawGap-2));
    if(Math.abs(desired-current)>1){
      page.dataset.fbProfileGapFix=String(desired);
      page.style.setProperty('--fb-profile-gap-fix',`${desired}px`);
    }
  }

  async function refresh(){
    if(refreshing)return;
    refreshing=true;
    setIndicator(90,'refreshing');
    const page=profile();
    if(page)page.style.transform='translateY(18px)';
    try{
      await window.FB_FAMILY_DATA?.reload?.();
      window.dispatchEvent(new CustomEvent('familybook:family-data-updated',{detail:{reason:'manual-profile-refresh'}}));
      const el=indicator();
      el.querySelector('span').textContent='Updated';
      await new Promise(r=>setTimeout(r,420));
    }catch(err){
      console.warn('Profile refresh:',err);
      const el=indicator();
      el.querySelector('span').textContent='Could not refresh';
      await new Promise(r=>setTimeout(r,700));
    }finally{
      refreshing=false;
      resetPull();
      requestAnimationFrame(()=>requestAnimationFrame(fixGap));
    }
  }

  function sync(){
    const page=profile();
    document.body.classList.toggle('fb-member-profile-mobile',!!page&&mobile());
    if(!page){document.querySelector('.fb-profile-refresh-indicator')?.remove();return}
    indicator();
    requestAnimationFrame(()=>requestAnimationFrame(fixGap));
  }

  document.addEventListener('touchstart',e=>{
    if(!mobile()||refreshing||!profile()||window.scrollY>1||e.touches.length!==1)return;
    if(e.target.closest('input,textarea,select,[contenteditable="true"],.photo-action-sheet,.member-cover-editor'))return;
    startY=e.touches[0].clientY;pull=0;tracking=true;
  },{passive:true});

  document.addEventListener('touchmove',e=>{
    if(!tracking||refreshing||e.touches.length!==1)return;
    const dy=e.touches[0].clientY-startY;
    if(dy<=0){resetPull();return}
    if(window.scrollY>1){resetPull();return}
    e.preventDefault();
    pull=Math.min(120,dy);
    const page=profile();
    if(page)page.style.transform=`translateY(${Math.min(34,pull*.28)}px)`;
    setIndicator(pull,pull>=72?'ready':'pull');
  },{passive:false});

  document.addEventListener('touchend',()=>{
    if(!tracking||refreshing)return;
    const shouldRefresh=pull>=72;
    tracking=false;
    if(shouldRefresh)refresh();
    else resetPull();
  },{passive:true});

  document.addEventListener('touchcancel',()=>{if(!refreshing)resetPull()},{passive:true});
  window.addEventListener('resize',sync);
  window.addEventListener('load',sync);
  window.addEventListener('familybook:basic-member-profile-ready',sync);
  window.addEventListener('familybook:family-data-updated',sync);
  document.addEventListener('click',()=>setTimeout(sync,0));

  const start=()=>{
    sync();
    const screen=document.querySelector('#screen');
    if(screen)new MutationObserver(sync).observe(screen,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
