(()=>{
  if(window.__fbHomeFeedCleanupInstalled)return;
  window.__fbHomeFeedCleanupInstalled=true;

  const INITIAL_COUNT=6;
  const BATCH_SIZE=6;
  let scheduled=false;

  function removeLegacyBottom(screen){
    const title=screen?.querySelector?.('#homeActivityTitle');
    if(!title)return;
    const head=title.closest('.section-head');
    const columns=head?.nextElementSibling;
    if(columns?.classList?.contains('columns'))columns.remove();
    head?.remove();
  }

  function wallItems(feed){
    return [...(feed?.children||[])].filter(node=>node.matches?.('.wall-post'));
  }

  function ensureFooter(feed){
    let footer=feed.nextElementSibling;
    if(!footer?.classList?.contains('family-wall-pager')){
      footer=document.createElement('div');
      footer.className='family-wall-pager';
      feed.insertAdjacentElement('afterend',footer);
    }
    return footer;
  }

  function updatePager(feed){
    const items=wallItems(feed);
    if(!items.length){
      feed.nextElementSibling?.classList?.contains('family-wall-pager')&&feed.nextElementSibling.remove();
      delete feed.dataset.fbVisibleCount;
      return;
    }

    let visible=Number(feed.dataset.fbVisibleCount||INITIAL_COUNT);
    if(!Number.isFinite(visible)||visible<INITIAL_COUNT)visible=INITIAL_COUNT;
    visible=Math.min(visible,items.length);
    feed.dataset.fbVisibleCount=String(visible);

    items.forEach((item,index)=>{item.hidden=index>=visible});

    const remaining=Math.max(0,items.length-visible);
    const footer=ensureFooter(feed);
    const signature=`${visible}/${items.length}`;
    if(footer.dataset.fbPagerSignature===signature)return;
    footer.dataset.fbPagerSignature=signature;

    if(remaining>0){
      const next=Math.min(BATCH_SIZE,remaining);
      footer.innerHTML=`<button type="button" class="family-wall-load-more"><i data-lucide="chevrons-down"></i><span>Load more</span><small>${next} of ${remaining}</small></button>`;
      footer.querySelector('.family-wall-load-more')?.addEventListener('click',()=>{
        feed.dataset.fbVisibleCount=String(Math.min(items.length,visible+BATCH_SIZE));
        footer.dataset.fbPagerSignature='';
        updatePager(feed);
      });
    }else{
      footer.innerHTML='<div class="family-wall-end"><i data-lucide="circle-check"></i><span>You’re all caught up — no more family activity to show.</span></div>';
    }
    window.icons?.();
  }

  function enhance(){
    const screen=document.querySelector('#screen');
    if(!screen)return;
    removeLegacyBottom(screen);
    const feed=screen.querySelector('#familyWallFeed');
    if(feed)updatePager(feed);
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      enhance();
    });
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('familybook:family-data-updated',schedule);
  window.addEventListener('familybook:memories-updated',schedule);
  window.addEventListener('familybook:wall-updated',schedule);

  enhance();
})();
