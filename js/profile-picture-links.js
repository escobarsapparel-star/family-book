(()=>{
  if(window.__fbProfilePictureLinks)return;
  window.__fbProfilePictureLinks=true;

  const AVATAR_SELECTOR=[
    '.wall-avatar',
    '.comment-avatar',
    '.comment-composer-avatar',
    '.member-avatar',
    '.member-wall-avatar',
    '.profile-popover-avatar',
    '.settings-account-avatar'
  ].join(',');

  const NAME_SELECTOR=[
    '.wall-post-head > div:nth-child(2) > strong',
    '.comment-meta strong'
  ].join(',');

  const norm=v=>String(v||'').trim().replace(/\s+/g,' ').toLowerCase();
  const currentId=()=>String(window.FB_AUTH?.get?.()?.memberId||'');
  const people=()=>window.FB_FAMILY_DATA?.getPeople?.()||[];

  function uniqueMemberIdByName(name){
    const wanted=norm(name);
    if(!wanted)return '';
    const matches=people().filter(m=>norm(m.name)===wanted);
    return matches.length===1?String(matches[0].id||''):'';
  }

  function displayNameForAvatar(avatar){
    const card=avatar.closest('[data-view-member]');
    if(card){
      const id=card.dataset.viewMember;
      return people().find(m=>String(m.id)===String(id))?.name||'family member';
    }
    const post=avatar.closest('.wall-post-head');
    if(post)return post.querySelector(':scope > div:nth-child(2) > strong')?.textContent?.trim()||'family member';
    const comment=avatar.closest('.comment-item');
    if(comment)return comment.querySelector('.comment-meta strong')?.textContent?.trim()||'family member';
    const hero=avatar.closest('.member-wall-hero');
    if(hero)return hero.querySelector('h1')?.textContent?.trim()||'family member';
    const me=window.FB_AUTH?.get?.();
    return me?.name||'your profile';
  }

  function resolveMemberId(avatar){
    const explicit=avatar.closest('[data-profile-member]')?.dataset.profileMember;
    if(explicit)return String(explicit);

    const memberTrigger=avatar.closest('[data-view-member]');
    if(memberTrigger?.dataset.viewMember)return String(memberTrigger.dataset.viewMember);

    if(avatar.matches('.comment-composer-avatar,.profile-popover-avatar,.settings-account-avatar'))return currentId();
    if(avatar.matches('.wall-avatar')&&avatar.closest('.wall-composer'))return currentId();

    const post=avatar.closest('.wall-post-head');
    if(post){
      const name=post.querySelector(':scope > div:nth-child(2) > strong')?.textContent||'';
      return uniqueMemberIdByName(name);
    }

    const comment=avatar.closest('.comment-item');
    if(comment){
      const name=comment.querySelector('.comment-meta strong')?.textContent||'';
      return uniqueMemberIdByName(name);
    }

    const hero=avatar.closest('.member-wall-hero');
    if(hero)return uniqueMemberIdByName(hero.querySelector('h1')?.textContent||'');

    return '';
  }

  function resolveNameMemberId(nameEl){
    const postHead=nameEl.closest('.wall-post-head');
    if(postHead){
      const avatar=postHead.querySelector('.wall-avatar');
      const explicit=avatar?.dataset.profileMember;
      if(explicit)return String(explicit);
    }
    const comment=nameEl.closest('.comment-item');
    if(comment){
      const avatar=comment.querySelector('.comment-avatar');
      const explicit=avatar?.dataset.profileMember;
      if(explicit)return String(explicit);
    }
    return uniqueMemberIdByName(nameEl.textContent||'');
  }

  function excluded(avatar){
    // On the profile itself the round photo intentionally opens the
    // upload/take/view/remove photo menu instead of navigating away.
    return !!avatar.closest('.fb-member-profile,.member-photo-picker,.member-form-page,.history-profile-view');
  }

  function decorate(root=document){
    root.querySelectorAll?.(AVATAR_SELECTOR).forEach(avatar=>{
      if(excluded(avatar))return;
      const id=resolveMemberId(avatar);
      if(!id)return;
      avatar.classList.add('fb-profile-picture-link');
      avatar.dataset.profileMember=id;
      if(!avatar.closest('button,a,[role="button"]')){
        avatar.tabIndex=0;
        avatar.setAttribute('role','button');
        avatar.setAttribute('aria-label',`Open ${displayNameForAvatar(avatar)} profile`);
      }
    });

    root.querySelectorAll?.(NAME_SELECTOR).forEach(nameEl=>{
      const id=resolveNameMemberId(nameEl);
      if(!id)return;
      nameEl.classList.add('fb-profile-name-link');
      nameEl.dataset.profileMember=id;
      nameEl.tabIndex=0;
      nameEl.setAttribute('role','link');
      nameEl.setAttribute('aria-label',`Open ${nameEl.textContent.trim()} profile`);
    });
  }

  function openMember(id,event){
    if(!id||typeof window.go!=='function')return false;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    window.go(`view-member:${id}`);
    return true;
  }

  function openFromAvatar(avatar,event){
    if(!avatar||excluded(avatar))return false;
    const id=resolveMemberId(avatar);
    if(!id)return false;

    // Member cards already navigate correctly through their parent button.
    if(avatar.closest('[data-view-member]'))return false;
    return openMember(id,event);
  }

  document.addEventListener('click',event=>{
    const nameEl=event.target.closest?.(NAME_SELECTOR);
    if(nameEl){
      const id=nameEl.dataset.profileMember||resolveNameMemberId(nameEl);
      if(openMember(id,event))return;
    }
    const avatar=event.target.closest?.(AVATAR_SELECTOR);
    if(avatar)openFromAvatar(avatar,event);
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const nameEl=event.target.closest?.(NAME_SELECTOR);
    if(nameEl){
      const id=nameEl.dataset.profileMember||resolveNameMemberId(nameEl);
      if(openMember(id,event))event.preventDefault();
      return;
    }
    const avatar=event.target.closest?.(AVATAR_SELECTOR);
    if(!avatar||avatar.closest('button,a'))return;
    if(openFromAvatar(avatar,event))event.preventDefault();
  });

  const observer=new MutationObserver(records=>{
    for(const record of records){
      record.addedNodes.forEach(node=>{
        if(node.nodeType===1)decorate(node);
      });
    }
  });

  const start=()=>{
    decorate();
    observer.observe(document.body,{childList:true,subtree:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.addEventListener('familybook:family-data-updated',()=>setTimeout(()=>decorate(),0));
})();