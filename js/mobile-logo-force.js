(()=>{
  if(window.__fbMobileLogoForce)return;
  window.__fbMobileLogoForce=true;

  const STYLE_ID='fbMobileLogoForceStyle';
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      @media (max-width:759px){
        #app>.app>.topbar>.brand-home{display:none!important}
        #app>.app>.topbar>.mobile-forced-brand{
          display:flex!important;
          align-items:center!important;
          justify-content:flex-start!important;
          flex:1 1 auto!important;
          min-width:0!important;
          height:56px!important;
          margin:0!important;
          padding:0!important;
          border:0!important;
          background:transparent!important;
          overflow:visible!important;
        }
        #app>.app>.topbar>.mobile-forced-brand img{
          display:block!important;
          width:172px!important;
          max-width:calc(100vw - 105px)!important;
          height:auto!important;
          max-height:44px!important;
          object-fit:contain!important;
          object-position:left center!important;
          opacity:1!important;
          visibility:visible!important;
        }
        #app>.app>.topbar>.mobile-forced-brand+.actions{margin-left:auto!important}
      }
      @media (min-width:760px){#app>.app>.topbar>.mobile-forced-brand{display:none!important}}
      @media (max-width:380px){#app>.app>.topbar>.mobile-forced-brand img{width:156px!important;max-width:calc(100vw - 101px)!important}}
    `;
    document.head.appendChild(style);
  }

  function ensure(){
    const topbar=document.querySelector('#app>.app>.topbar');
    if(!topbar)return false;
    let brand=topbar.querySelector(':scope > .mobile-forced-brand');
    if(!brand){
      brand=document.createElement('button');
      brand.type='button';
      brand.className='mobile-forced-brand';
      brand.setAttribute('aria-label','Go to Family Book Home');
      const img=document.createElement('img');
      img.src='assets/logo/family-book-logo-dark-header.png';
      img.alt='Family Book';
      brand.appendChild(img);
      brand.addEventListener('click',()=>window.go?.('home'));
      const actions=topbar.querySelector(':scope > .actions');
      topbar.insertBefore(brand,actions||topbar.firstChild);
    }
    return true;
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;ensure()});
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  ensure();
  setTimeout(ensure,80);
  setTimeout(ensure,400);
})();
