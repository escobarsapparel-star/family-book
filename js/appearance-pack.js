(()=>{
  if(window.__fbAppearancePackV2)return;
  window.__fbAppearancePackV2=true;

  const SITE_KEY='fb_site_theme_v2';
  const TREE_KEY='fb_tree_style_v2';
  const POSTER_W=1600,POSTER_H=900;
  const TREE_EXPORT_BACKGROUND='assets/tree/tree-export-background.png';

  const SITE_THEMES=[
    {id:'classic',name:'Family Book',desc:'Original Family Book palette'},
    {id:'forest-sage',name:'Forest Sage',desc:'Deep forest and soft sage'},
    {id:'crimson-noir',name:'Crimson Noir',desc:'Red, black and charcoal'},
    {id:'rose-violet',name:'Rose Violet',desc:'Pink, plum and purple'},
    {id:'warm-ivory',name:'Warm Ivory',desc:'Cream, olive and warm gold'},
    {id:'midnight-blue',name:'Midnight Blue',desc:'Navy, teal and silver'}
  ];

  const TREE_STYLES=[
    {id:'heritage',name:'Heritage Botanical',desc:'Tree of Life · cream & sage'},
    {id:'family-dark',name:'Family Book Dark',desc:'Modern dark Family Book'},
    {id:'ancestry',name:'Classic Ancestry',desc:'Warm parchment keepsake'},
    {id:'luxury-gold',name:'Luxury Gold',desc:'Black, forest & gold'},
    {id:'rose-garden',name:'Rose Garden',desc:'Rose, plum & soft gold'},
    {id:'crimson-legacy',name:'Crimson Legacy',desc:'Black, crimson & antique gold'}
  ];

  let queued=false;
  const safeGet=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch(_){return fallback}};
  const safeSet=(key,value)=>{try{localStorage.setItem(key,value)}catch(_){}};
  const siteTheme=()=>{const v=safeGet(SITE_KEY,'classic');return SITE_THEMES.some(x=>x.id===v)?v:'classic'};
  const treeStyle=()=>{const v=safeGet(TREE_KEY,'heritage');return TREE_STYLES.some(x=>x.id===v)?v:'heritage'};

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
      <div class="site-theme-pack-head"><div><strong>Colour theme</strong><small>Choose a full Family Book palette for this device.</small></div></div>
      <div class="site-theme-grid">${SITE_THEMES.map(t=>`<button type="button" class="site-theme-choice" data-site-theme-choice="${t.id}" aria-pressed="false"><span class="site-theme-swatch"></span><strong>${t.name}</strong><small>${t.desc}</small></button>`).join('')}</div>
    </div>`;
  }

  function mountSiteThemes(){
    const appearance=document.querySelector('#settingsAppearance');
    if(!appearance)return false;
    if(!document.querySelector('#siteThemePack')){
      appearance.insertAdjacentHTML('beforeend',siteThemeMarkup());
      document.querySelectorAll('[data-site-theme-choice]').forEach(btn=>btn.addEventListener('click',()=>applySiteTheme(btn.dataset.siteThemeChoice)));
    }
    applySiteTheme(siteTheme());
    return true;
  }

  function posterFamilyLabel(){
    return document.querySelector('.full-tree-top .eyebrow')?.textContent?.trim()||'FAMILY';
  }

  function buildPoster(canvas){
    if(!canvas||canvas.dataset.posterBuilt==='1')return;
    const stage=canvas.closest('#fullTreeStage');
    if(!stage)return;
    const sourceW=Number(stage.dataset.width)||canvas.offsetWidth||1000;
    const sourceH=Number(stage.dataset.height)||canvas.offsetHeight||620;

    canvas.dataset.posterBuilt='1';
    canvas.dataset.sourceWidth=String(sourceW);
    canvas.dataset.sourceHeight=String(sourceH);

    const familyLayer=document.createElement('div');
    familyLayer.className='ct-family-layer';
    familyLayer.style.width=`${sourceW}px`;
    familyLayer.style.height=`${sourceH}px`;
    [...canvas.children].filter(el=>el.classList?.contains('ct-lines')||el.classList?.contains('ct-node')).forEach(el=>familyLayer.appendChild(el));

    const art=document.createElement('img');
    art.className='ct-tree-art';
    art.src=TREE_EXPORT_BACKGROUND;
    art.alt='';
    art.setAttribute('aria-hidden','true');

    const familyName=document.createElement('div');
    familyName.className='ct-poster-family-name';
    familyName.textContent=posterFamilyLabel();

    const legacy=document.createElement('div');
    legacy.className='ct-poster-legacy';
    legacy.innerHTML='<span>FAMILY</span><span>A LEGACY</span><span>OF LOVE</span>';

    const quote=document.createElement('div');
    quote.className='ct-poster-quote';
    quote.innerHTML='<span>Generations</span><span>Grow Brighter</span><span>Together</span>';

    const brand=document.createElement('div');
    brand.className='ct-export-mark';
    brand.innerHTML='<strong>Family Book</strong><small>Our roots · Our story · Together always</small>';

    canvas.prepend(art);
    canvas.appendChild(familyLayer);
    canvas.appendChild(familyName);
    canvas.appendChild(legacy);
    canvas.appendChild(quote);
    canvas.appendChild(brand);

    const familyScale=Math.min(1.18,1260/sourceW,530/sourceH);
    const familyW=sourceW*familyScale;
    const x=Math.max(60,(POSTER_W-familyW)/2);
    const y=92;
    familyLayer.style.transform=`translate(${x}px,${y}px) scale(${familyScale})`;
    familyLayer.style.transformOrigin='top left';

    canvas.style.width=`${POSTER_W}px`;
    canvas.style.height=`${POSTER_H}px`;
    stage.dataset.width=String(POSTER_W);
    stage.dataset.height=String(POSTER_H);
    stage.style.width=`${POSTER_W}px`;
    stage.style.height=`${POSTER_H}px`;
  }

  function applyTreeStyle(id=treeStyle()){
    const value=TREE_STYLES.some(x=>x.id===id)?id:'heritage';
    safeSet(TREE_KEY,value);
    const canvas=document.querySelector('#fullTreeStage .ct-canvas');
    if(canvas){buildPoster(canvas);canvas.dataset.treeStyle=value;}
    document.querySelectorAll('[data-tree-style-choice]').forEach(btn=>{
      const active=btn.dataset.treeStyleChoice===value;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  function treePickerMarkup(){
    return `<section class="tree-style-picker" id="treeStylePicker" aria-label="Family tree style">
      <div class="tree-style-picker-head"><strong>Tree style</strong><span>What you see here is what Export PNG will use</span></div>
      <div class="tree-style-options">${TREE_STYLES.map(t=>`<button type="button" class="tree-style-option" data-tree-style-choice="${t.id}" aria-pressed="false"><span class="tree-style-thumb"></span><strong>${t.name}</strong><small>${t.desc}</small></button>`).join('')}</div>
    </section>`;
  }

  function installPosterControls(page){
    const vp=page?.querySelector('#fullTreeViewport');
    const stage=page?.querySelector('#fullTreeStage');
    const canvas=stage?.querySelector('.ct-canvas');
    if(!vp||!stage||!canvas)return;
    buildPoster(canvas);

    let scale=1;
    const apply=v=>{
      scale=Math.max(.18,Math.min(1.7,v));
      canvas.style.transform=`scale(${scale})`;
      canvas.style.transformOrigin='top left';
      stage.style.width=`${POSTER_W*scale}px`;
      stage.style.height=`${POSTER_H*scale}px`;
    };
    const fit=()=>{
      const sx=(vp.clientWidth-20)/POSTER_W;
      const sy=(vp.clientHeight-20)/POSTER_H;
      apply(Math.min(1,sx,sy));
      vp.scrollTo({left:0,top:0});
    };

    const zoomOut=page.querySelector('#treeZoomOut');
    const zoomIn=page.querySelector('#treeZoomIn');
    const fitBtn=page.querySelector('#treeFit');
    const exportBtn=page.querySelector('#treeExport');
    if(zoomOut)zoomOut.onclick=()=>apply(scale-.12);
    if(zoomIn)zoomIn.onclick=()=>apply(scale+.12);
    if(fitBtn)fitBtn.onclick=fit;
    if(exportBtn)exportBtn.onclick=async()=>{
      const old=exportBtn.innerHTML;
      exportBtn.disabled=true;
      exportBtn.textContent='Creating poster…';
      const oldTransform=canvas.style.transform;
      try{
        canvas.style.transform='none';
        const art=canvas.querySelector('.ct-tree-art');
        try{if(art&&!art.complete)await art.decode()}catch(_){}
        if(!window.html2canvas)throw new Error('Image export library is still loading. Try again in a moment.');
        const out=await html2canvas(canvas,{backgroundColor:null,scale:2,useCORS:true,allowTaint:false,logging:false,width:POSTER_W,height:POSTER_H,windowWidth:POSTER_W,windowHeight:POSTER_H});
        const a=document.createElement('a');
        const fam=(posterFamilyLabel()||'family').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
        a.download=`${fam||'family'}-family-tree.png`;
        a.href=out.toDataURL('image/png');
        a.click();
      }catch(err){
        alert(err?.message||'Could not export the family tree poster.');
      }finally{
        canvas.style.transform=oldTransform;
        exportBtn.disabled=false;
        exportBtn.innerHTML=old;
        window.icons?.();
      }
    };

    window.setTimeout(fit,120);
    if(!page.dataset.posterResizeBound){
      page.dataset.posterResizeBound='1';
      const ro=new ResizeObserver(()=>window.setTimeout(fit,30));
      ro.observe(vp);
    }
  }

  function mountTreeStyles(){
    const page=document.querySelector('.full-tree-page');
    const top=page?.querySelector('.full-tree-top');
    const canvas=page?.querySelector('#fullTreeStage .ct-canvas');
    if(!page||!top||!canvas)return false;
    buildPoster(canvas);
    if(!page.querySelector('#treeStylePicker')){
      top.insertAdjacentHTML('afterend',treePickerMarkup());
      page.querySelectorAll('[data-tree-style-choice]').forEach(btn=>btn.addEventListener('click',()=>applyTreeStyle(btn.dataset.treeStyleChoice)));
    }
    applyTreeStyle(treeStyle());
    installPosterControls(page);
    return true;
  }

  function mount(){mountSiteThemes();mountTreeStyles();}
  function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount()});}

  applySiteTheme(siteTheme());
  const root=document.getElementById('screen')||document.getElementById('app');
  if(root){
    new MutationObserver(mutations=>{
      const relevant=mutations.some(m=>[...m.addedNodes].some(node=>{
        if(node.nodeType!==1)return false;
        return node.matches?.('.settings-page,.full-tree-page,#settingsAppearance,#fullTreeStage,.ct-canvas')||node.querySelector?.('.settings-page,.full-tree-page,#settingsAppearance,#fullTreeStage,.ct-canvas');
      }));
      if(relevant)schedule();
    }).observe(root,{childList:true,subtree:true});
  }
  schedule();
})();
