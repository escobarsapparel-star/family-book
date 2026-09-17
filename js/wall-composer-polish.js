(()=>{
  if(window.__fbWallComposerPolish)return;
  window.__fbWallComposerPolish=true;

  function cleanUrl(raw){
    let value=String(raw||'').trim();
    while(/[.,!?;:)\]]$/.test(value))value=value.slice(0,-1);
    return value;
  }

  function firstUrl(text){
    const match=String(text||'').match(/https?:\/\/[^\s<>"']+/i);
    if(!match)return null;
    const raw=cleanUrl(match[0]);
    try{
      const url=new URL(raw);
      if(!['http:','https:'].includes(url.protocol))return null;
      return {raw,url};
    }catch(_){return null}
  }

  function youtubeId(url){
    const host=url.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');
    let id='';
    if(host==='youtu.be')id=url.pathname.split('/').filter(Boolean)[0]||'';
    else if(host==='youtube.com'||host==='youtube-nocookie.com'){
      if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
      else{
        const parts=url.pathname.split('/').filter(Boolean);
        if(['shorts','embed','live'].includes(parts[0]))id=parts[1]||'';
      }
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(id)?id:'';
  }

  function previewMount(input){
    let mount=input.parentElement?.querySelector('.fb-composer-link-preview');
    if(!mount){
      mount=document.createElement('div');
      mount.className='fb-composer-link-preview';
      mount.hidden=true;
      input.insertAdjacentElement('afterend',mount);
    }
    return mount;
  }

  function renderPreview(input){
    if(!input)return;
    const mount=previewMount(input);
    const info=firstUrl(input.value);
    if(!info){mount.hidden=true;mount.innerHTML='';return}

    const id=youtubeId(info.url);
    const card=document.createElement('a');
    card.className='fb-composer-link-card';
    card.href=info.raw;
    card.target='_blank';
    card.rel='noopener noreferrer';
    card.setAttribute('aria-label',id?'Preview YouTube video':'Open link');

    if(id){
      const media=document.createElement('div');
      media.className='fb-composer-link-media';
      const img=document.createElement('img');
      img.src=`https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      img.alt='YouTube video thumbnail';
      img.loading='lazy';
      img.decoding='async';
      const play=document.createElement('span');
      play.className='fb-composer-link-play';
      media.append(img,play);
      card.appendChild(media);
    }

    const copy=document.createElement('div');
    copy.className='fb-composer-link-copy';
    const icon=document.createElement('span');
    icon.textContent=id?'▶':'↗';
    const text=document.createElement('span');
    const strong=document.createElement('strong');
    strong.textContent=id?'YouTube video':info.url.hostname.replace(/^www\./,'');
    const small=document.createElement('small');
    small.textContent=info.raw;
    text.append(strong,small);
    copy.append(icon,text);
    card.appendChild(copy);

    mount.innerHTML='';
    mount.appendChild(card);
    mount.hidden=false;
  }

  function closeHomeComposer(){
    document.querySelectorAll('[data-home-composer-modal]').forEach(modal=>{modal.hidden=true});
    document.body.classList.remove('home-composer-open');
  }

  function installInput(input){
    if(!input||input.dataset.fbComposerPolish==='1')return;
    input.dataset.fbComposerPolish='1';
    const update=()=>renderPreview(input);
    input.addEventListener('input',update);
    input.addEventListener('paste',()=>setTimeout(update,0));
    renderPreview(input);
  }

  function patchSavePost(){
    const api=window.FB_SOCIAL_DATA;
    if(!api?.savePost||api.savePost.__fbComposerWrapped)return false;
    const original=api.savePost.bind(api);
    const wrapped=async function(...args){
      const result=await original(...args);
      window.dispatchEvent(new CustomEvent('fb:wall-post-saved',{detail:{post:args[0]||null}}));
      return result;
    };
    wrapped.__fbComposerWrapped=true;
    api.savePost=wrapped;
    return true;
  }

  function scan(){
    document.querySelectorAll('#wallHomeText').forEach(installInput);
    patchSavePost();
  }

  window.addEventListener('fb:wall-post-saved',()=>{
    const input=document.querySelector('#wallHomeText');
    if(input){
      input.value='';
      renderPreview(input);
    }
    closeHomeComposer();
  });

  const root=document.getElementById('app');
  if(root)new MutationObserver(scan).observe(root,{childList:true,subtree:true});
  scan();
})();
