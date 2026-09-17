(()=>{
  if(window.__fbCoverOwnerOnly)return;
  window.__fbCoverOwnerOnly=true;

  const auth=()=>window.FB_AUTH?.get?.()||{};
  const page=()=>document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
  const memberId=()=>page()?.querySelector('.fb-member-profile')?.dataset.profileMemberId||'';
  const isOwner=()=>{
    const id=memberId(),u=auth();
    return !!id&&String(u.memberId||'')===String(id);
  };

  function enforce(){
    const p=page();
    const cover=p?.querySelector('[data-basic-cover]');
    if(!cover)return;

    const owner=isOwner();
    cover.classList.toggle('fb-cover-owner-only-readonly',!owner);
    if(owner)return;

    cover.querySelector('.fb-cover-edit')?.remove();
    cover.classList.remove('is-editable-empty');

    if(!cover.classList.contains('has-cover-photo')){
      cover.querySelector('.fb-basic-cover-empty')?.remove();
    }
  }

  function readonlyCoverTarget(target){
    const p=page();
    if(!p||isOwner())return null;
    const cover=target?.closest?.('[data-basic-cover]');
    if(!cover||!p.contains(cover))return null;
    return cover;
  }

  document.addEventListener('click',e=>{
    const cover=readonlyCoverTarget(e.target);
    if(!cover)return;

    if(e.target.closest('.fb-cover-edit,.fb-basic-cover-empty')){
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    const open=e.target.closest('.fb-cover-open');
    if(open){
      e.preventDefault();
      e.stopImmediatePropagation();
      const img=open.querySelector('img');
      const src=img?.currentSrc||img?.src||'';
      if(src&&typeof window.FB_PROFILE_MEDIA_VIEWER==='function')window.FB_PROFILE_MEDIA_VIEWER(src,'Cover photo');
    }
  },true);

  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const cover=readonlyCoverTarget(e.target);
    if(!cover)return;
    const open=e.target.closest('.fb-cover-open');
    if(!open)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const img=open.querySelector('img');
    const src=img?.currentSrc||img?.src||'';
    if(src&&typeof window.FB_PROFILE_MEDIA_VIEWER==='function')window.FB_PROFILE_MEDIA_VIEWER(src,'Cover photo');
  },true);

  const schedule=()=>queueMicrotask(enforce);
  window.addEventListener('load',schedule);
  window.addEventListener('familybook:basic-member-profile-ready',schedule);
  window.addEventListener('familybook:family-data-updated',schedule);
  document.addEventListener('click',schedule);

  const start=()=>{
    enforce();
    const screen=document.querySelector('#screen');
    if(screen)new MutationObserver(schedule).observe(screen,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
