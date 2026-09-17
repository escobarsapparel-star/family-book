(()=>{
  if(window.__fbWebWallActivityOrder)return;
  window.__fbWebWallActivityOrder=true;

  const styleId='fb-wall-link-preview-style';
  if(!document.getElementById(styleId)){
    const style=document.createElement('style');
    style.id=styleId;
    style.textContent=`
      .wall-link-preview{display:block;margin:10px 0 4px;border:1px solid var(--line);border-radius:16px;background:var(--cream);color:inherit;text-decoration:none;overflow:hidden;transition:transform .14s ease,border-color .14s ease,background .14s ease}
      .wall-link-preview:hover{transform:translateY(-1px);border-color:rgba(49,92,67,.45)}
      .wall-link-preview-media{position:relative;aspect-ratio:16/9;background:#111;overflow:hidden}
      .wall-link-preview-media img{display:block;width:100%;height:100%;object-fit:cover}
      .wall-link-preview-play{position:absolute;left:50%;top:50%;width:54px;height:54px;transform:translate(-50%,-50%);border-radius:50%;background:rgba(0,0,0,.68);display:grid;place-items:center;box-shadow:0 5px 20px rgba(0,0,0,.28)}
      .wall-link-preview-play:after{content:"";width:0;height:0;border-top:9px solid transparent;border-bottom:9px solid transparent;border-left:14px solid #fff;margin-left:3px}
      .wall-link-preview-copy{display:flex;align-items:center;gap:11px;padding:11px 13px;min-width:0}
      .wall-link-preview-copy>span:first-child{width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:rgba(49,92,67,.12);display:grid;place-items:center;font-size:1rem;font-weight:900;color:var(--green)}
      .wall-link-preview-copy>span:last-child{min-width:0;display:flex;flex-direction:column;gap:2px}
      .wall-link-preview-copy strong{font-size:.86rem;line-height:1.2;color:var(--ink)}
      .wall-link-preview-copy small{font-size:.7rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      html[data-theme="dark"] .wall-link-preview{background:#20251f;border-color:#394037}
      html[data-theme="dark"] .wall-link-preview:hover{background:#252b24;border-color:#526157}
      html[data-theme="dark"] .wall-link-preview-copy>span:first-child{background:#26392d;color:#b9d7a9}
      html[data-theme="dark"] .wall-link-preview-copy strong{color:#f3ecdd}
      html[data-theme="dark"] .wall-link-preview-copy small{color:#bdb4a8}
      @media(max-width:560px){.wall-link-preview{border-radius:14px}.wall-link-preview-copy{padding:10px 11px}.wall-link-preview-play{width:48px;height:48px}}
    `;
    document.head.appendChild(style);
  }

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
      if(url.protocol!=='http:'&&url.protocol!=='https:')return null;
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

  function createPreview(urlInfo){
    const {raw,url}=urlInfo;
    const id=youtubeId(url);
    const link=document.createElement('a');
    link.className='wall-link-preview'+(id?' youtube':' generic');
    link.href=raw;
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.setAttribute('aria-label',id?'Open YouTube video':'Open link');

    if(id){
      const media=document.createElement('div');
      media.className='wall-link-preview-media';
      const img=document.createElement('img');
      img.src=`https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      img.alt='YouTube video thumbnail';
      img.loading='lazy';
      img.decoding='async';
      const play=document.createElement('span');
      play.className='wall-link-preview-play';
      media.append(img,play);
      link.appendChild(media);
    }

    const copy=document.createElement('div');
    copy.className='wall-link-preview-copy';
    const icon=document.createElement('span');
    icon.textContent=id?'▶':'↗';
    const text=document.createElement('span');
    const title=document.createElement('strong');
    title.textContent=id?'YouTube video':url.hostname.replace(/^www\./,'');
    const small=document.createElement('small');
    small.textContent=raw;
    text.append(title,small);
    copy.append(icon,text);
    link.appendChild(copy);
    return link;
  }

  function enhanceLinkPreview(body){
    if(!body||body.dataset.wallLinkPreview==='1')return;
    if(body.closest('.wall-memory-post')){body.dataset.wallLinkPreview='1';return}
    if(body.querySelector('.wall-link-preview')){body.dataset.wallLinkPreview='1';return}
    const p=body.querySelector(':scope > p');
    const text=String(p?.textContent||'').trim();
    if(!text||text.startsWith('[[FB_')){body.dataset.wallLinkPreview='1';return}
    const info=firstUrl(text);
    if(!info){body.dataset.wallLinkPreview='1';return}

    const preview=createPreview(info);
    const anchor=body.querySelector('.wall-post-attachment,.wall-map-link,.reaction-bar,.reaction-controls,.comment-thread');
    if(anchor)body.insertBefore(preview,anchor);else body.appendChild(preview);
    body.dataset.wallLinkPreview='1';
  }

  const fix=()=>document.querySelectorAll('.wall-post-body').forEach(body=>{
    const card=body.querySelector('.web-wall-rich-card');
    const reactions=body.querySelector('.reaction-bar');
    if(card&&reactions&&card.nextElementSibling!==reactions)body.insertBefore(card,reactions);
    enhanceLinkPreview(body);
  });

  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{queued=false;fix()});
  };

  const root=document.getElementById('app');
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  fix();
})();
