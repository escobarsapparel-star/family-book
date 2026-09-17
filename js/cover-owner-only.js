(()=>{
  if(window.__fbCoverOwnerOnly)return;
  window.__fbCoverOwnerOnly=true;

  const auth=()=>window.FB_AUTH?.get?.()||{};
  const familyData=()=>window.FB_FAMILY_DATA;
  const page=()=>document.querySelector('.member-profile-view:not(.history-profile-view):not(.account-profile-view)');
  const memberId=()=>page()?.querySelector('.fb-member-profile')?.dataset.profileMemberId||'';

  function memberById(id){
    return familyData()?.getPeople?.().find(m=>String(m.id)===String(id))||null;
  }

  function isOwner(){
    const id=memberId(),u=auth();
    if(!id)return false;
    if(String(u.memberId||'')===String(id))return true;
    const member=memberById(id);
    return !!member?.accountId&&!!u.supabaseUserId&&String(member.accountId)===String(u.supabaseUserId);
  }

  function enforce(){
    const p=page();
    const cover=p?.querySelector('[data-basic-cover]');
    if(!p)return;

    const owner=isOwner();
    p.classList.toggle('fb-viewing-own-profile',owner);
    p.classList.toggle('fb-viewing-readonly-profile',!owner);

    if(owner){
      cover?.classList.remove('fb-cover-owner-only-readonly');
      return;
    }

    if(cover){
      cover.classList.add('fb-cover-owner-only-readonly');
      cover.classList.remove('is-editable-empty');
      cover.querySelector('.fb-cover-edit')?.remove();
      if(!cover.classList.contains('has-cover-photo'))cover.querySelector('.fb-basic-cover-empty')?.remove();
    }

    /* Public member profiles are read-only for everyone except the linked account owner.
       Admin/member maintenance stays in the management areas instead. */
    p.querySelectorAll('.fb-profile-edit-button,.fb-profile-photo-edit').forEach(el=>el.remove());
    p.querySelectorAll('[data-edit-member]').forEach(el=>{
      if(!el.closest('.fb-profile-edit-button'))el.hidden=true;
    });
  }

  function readonlyProfileTarget(target){
    const p=page();
    if(!p||isOwner())return null;
    return p.contains(target)?p:null;
  }

  document.addEventListener('click',e=>{
    const p=readonlyProfileTarget(e.target);
    if(!p)return;

    const cover=e.target.closest?.('[data-basic-cover]');
    if(cover){
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
        return;
      }
    }

    if(e.target.closest('.fb-profile-edit-button,.fb-profile-photo-edit,[data-edit-member]')){
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }

    const avatar=e.target.closest('.profile-view-avatar');
    if(avatar&&p.contains(avatar)){
      e.preventDefault();
      e.stopImmediatePropagation();
      const img=avatar.querySelector('img');
      const src=img?.currentSrc||img?.src||'';
      const name=p.querySelector('.fb-basic-name h1')?.textContent?.trim()||'Profile';
      if(src&&typeof window.FB_PROFILE_MEDIA_VIEWER==='function')window.FB_PROFILE_MEDIA_VIEWER(src,`${name} profile photo`);
    }
  },true);

  document.addEventListener('keydown',e=>{
    if(e.key!=='Enter'&&e.key!==' ')return;
    const p=readonlyProfileTarget(e.target);
    if(!p)return;

    const open=e.target.closest('.fb-cover-open');
    if(open){
      e.preventDefault();
      e.stopImmediatePropagation();
      const img=open.querySelector('img');
      const src=img?.currentSrc||img?.src||'';
      if(src&&typeof window.FB_PROFILE_MEDIA_VIEWER==='function')window.FB_PROFILE_MEDIA_VIEWER(src,'Cover photo');
      return;
    }

    const avatar=e.target.closest('.profile-view-avatar');
    if(avatar){
      e.preventDefault();
      e.stopImmediatePropagation();
      const img=avatar.querySelector('img');
      const src=img?.currentSrc||img?.src||'';
      const name=p.querySelector('.fb-basic-name h1')?.textContent?.trim()||'Profile';
      if(src&&typeof window.FB_PROFILE_MEDIA_VIEWER==='function')window.FB_PROFILE_MEDIA_VIEWER(src,`${name} profile photo`);
    }
  },true);

  const schedule=()=>queueMicrotask(enforce);
  window.addEventListener('load',schedule);
  window.addEventListener('familybook:basic-member-profile-ready',schedule);
  window.addEventListener('familybook:family-data-updated',schedule);
  document.addEventListener('click',schedule);

  const start=()=>{
    enforce();
    const screen=document.querySelector('#screen');
    if(screen)new MutationObserver(schedule).observe(screen,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-profile-member-id']});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
