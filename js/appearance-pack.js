(()=>{
  if(window.__fbAppearancePack)return;
  window.__fbAppearancePack=true;

  const SITE_KEY='fb_site_theme_v1';
  const TREE_KEY='fb_tree_style_v1';
  const SITE_THEMES=[
    {id:'classic',name:'Family Book',desc:'Use your current Light / Dark setting'},
    {id:'forest-sage',name:'Forest Sage',desc:'Deep green and soft sage'},
    {id:'warm-ivory',name:'Warm Ivory',desc:'Cream, olive and warm gold'},
    {id:'midnight-blue',name:'Midnight Blue',desc:'Navy, teal and silver'}
  ];
  const TREE_STYLES=[
    {id:'heritage',name:'Heritage Botanical',desc:'Tree of life · cream & sage'},
    {id:'family-dark',name:'Family Book Dark',desc:'Clean modern Family Book'},
    {id:'ancestry',name:'Classic Ancestry',desc:'Warm parchment keepsake'},
    {id:'luxury-gold',name:'Luxury Gold',desc:'Dark green with gold detail'}
  ];
  let queued=false;

  function safeGet(key,fallback){try{return localStorage.getItem(key)||fallback}catch(_){return fallback}}
  function safeSet(key,value){try{localStorage.setItem(key,value)}catch(_){} }
  function siteTheme(){const value=safeGet(SITE_KEY,'classic');return SITE_THEMES.some(x=>x.id===value)?value:'classic'}
  function treeStyle(){const value=safeGet(TREE_KEY,'heritage');return TREE_STYLES.some(x=>x.id===value)?value:'heritage'}

  function applySiteTheme(id=siteTheme()){
    const value=SITE_THEMES.some(x=>x.id===id)?id:'classic';
    document.documentElement.dataset.siteTheme=value;
    safeSet(SITE_KEY,value);
    document.querySelectorAll('[data-site-theme-choice]').forEach(btn=>{
      const active=btn.dataset.siteThemeChoice===value;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  function siteThemeMarkup(){
    return `<div class="site-theme-pack" id="siteThemePack">
      <div class="site-theme-pack-head"><div><strong>Colour theme</strong><small>Choose the Family Book look on this device.</small></div></div>
      <div class="site-theme-grid">${SITE_THEMES.map(t=>`<button type="button" class="site-theme-choice" data-site-theme-choice="${t.id}" aria-pressed="false"><span class="site-theme-swatch"></span><strong>${t.name}</strong><small>${t.desc}</small></button>`).join('')}</div>
    </div>`;
  }

  function mountSiteThemes(){
    const appearance=document.querySelector('#settingsAppearance');
    if(!appearance||document.querySelector('#siteThemePack'))return false;
    appearance.insertAdjacentHTML('beforeend',siteThemeMarkup());
    document.querySelectorAll('[data-site-theme-choice]').forEach(btn=>{
      btn.addEventListener('click',()=>applySiteTheme(btn.dataset.siteThemeChoice));
    });
    applySiteTheme(siteTheme());
    return true;
  }

  function ensureTreeDecor(canvas){
    if(!canvas)return;
    let art=canvas.querySelector(':scope > .ct-tree-art');
    if(!art){
      art=document.createElement('img');
      art.className='ct-tree-art';
      art.src='assets/tree/tree-of-life.svg';
      art.alt='';
      art.setAttribute('aria-hidden','true');
      canvas.prepend(art);
    }
    let mark=canvas.querySelector(':scope > .ct-export-mark');
    if(!mark){
      mark=document.createElement('div');
      mark.className='ct-export-mark';
      mark.setAttribute('aria-hidden','true');
      mark.innerHTML='Family Book<small>Our roots · Our story · Together</small>';
      canvas.appendChild(mark);
    }
  }

  function applyTreeStyle(id=treeStyle()){
    const value=TREE_STYLES.some(x=>x.id===id)?id:'heritage';
    safeSet(TREE_KEY,value);
    const canvas=document.querySelector('#fullTreeStage .ct-canvas');
    if(canvas){
      ensureTreeDecor(canvas);
      canvas.dataset.treeStyle=value;
    }
    document.querySelectorAll('[data-tree-style-choice]').forEach(btn=>{
      const active=btn.dataset.treeStyleChoice===value;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  function treePickerMarkup(){
    return `<section class="tree-style-picker" id="treeStylePicker" aria-label="Family tree style">
      <div class="tree-style-picker-head"><strong>Tree style</strong><span>Preview your style before Export PNG</span></div>
      <div class="tree-style-options">${TREE_STYLES.map(t=>`<button type="button" class="tree-style-option" data-tree-style-choice="${t.id}" aria-pressed="false"><span class="tree-style-thumb"></span><strong>${t.name}</strong><small>${t.desc}</small></button>`).join('')}</div>
    </section>`;
  }

  function mountTreeStyles(){
    const page=document.querySelector('.full-tree-page');
    const top=page?.querySelector('.full-tree-top');
    const canvas=page?.querySelector('#fullTreeStage .ct-canvas');
    if(!page||!top||!canvas)return false;
    ensureTreeDecor(canvas);
    if(!page.querySelector('#treeStylePicker')){
      top.insertAdjacentHTML('afterend',treePickerMarkup());
      page.querySelectorAll('[data-tree-style-choice]').forEach(btn=>{
        btn.addEventListener('click',()=>applyTreeStyle(btn.dataset.treeStyleChoice));
      });
    }
    applyTreeStyle(treeStyle());
    return true;
  }

  function mount(){
    mountSiteThemes();
    mountTreeStyles();
  }
  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{queued=false;mount()});
  }

  applySiteTheme(siteTheme());
  const screen=document.getElementById('screen')||document.getElementById('app');
  if(screen){
    new MutationObserver(mutations=>{
      const relevant=mutations.some(m=>[...m.addedNodes].some(node=>{
        if(node.nodeType!==1)return false;
        return node.matches?.('.settings-page,.full-tree-page,#settingsAppearance,#fullTreeStage,.ct-canvas') ||
          node.querySelector?.('.settings-page,.full-tree-page,#settingsAppearance,#fullTreeStage,.ct-canvas');
      }));
      if(relevant)schedule();
    }).observe(screen,{childList:true,subtree:true});
  }
  schedule();
})();
