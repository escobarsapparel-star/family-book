(function(){
  function ensureStyles(){
    if(document.getElementById('familyFunHomeFixStyles'))return;
    const style=document.createElement('style');
    style.id='familyFunHomeFixStyles';
    style.textContent=`
      .family-fun-home-entry{margin:0 0 16px;display:block!important;width:100%!important;visibility:visible!important;opacity:1!important;position:relative;z-index:5}
      .family-fun-home-launch{width:100%;display:flex!important;align-items:center;gap:14px;text-align:left;padding:16px 18px;border:1px solid rgba(49,92,67,.18);border-radius:18px;background:#fff;color:#172019;box-shadow:0 8px 24px rgba(32,52,40,.08);cursor:pointer;position:relative;min-height:76px}
      .family-fun-home-launch-icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;flex:0 0 auto;background:rgba(49,92,67,.10);color:#315c43;font-size:22px}
      .family-fun-home-launch-copy{min-width:0;display:flex;flex-direction:column;gap:3px}
      .family-fun-home-launch-copy strong{font-size:1rem;font-weight:800}.family-fun-home-launch-copy small{color:#66736b;font-size:.82rem}
      .family-fun-home-launch-badge{margin-left:auto;margin-right:26px;font-size:.62rem;font-weight:900;letter-spacing:.06em;padding:4px 7px;border-radius:999px;background:#fff2b3;color:#6c5200;border:1px solid #e8cf67}
      .family-fun-home-launch-arrow{position:absolute;right:14px;color:#66736b;font-size:21px}
      @media(max-width:620px){.family-fun-home-entry{margin:0 0 12px}.family-fun-home-launch{padding:14px 15px;border-radius:16px;min-height:70px}.family-fun-home-launch-icon{width:42px;height:42px}.family-fun-home-launch-badge{margin-right:20px}}
    `;
    document.head.appendChild(style);
  }

  function isHome(){
    const active=document.querySelector('.bottom .nav.active');
    return !active || active.getAttribute('data-r')==='home';
  }

  function inject(){
    const screen=document.getElementById('screen');
    if(!screen)return;
    const existing=screen.querySelector('[data-family-fun-home-fix]');
    if(!isHome()){
      existing?.remove();
      return;
    }
    if(existing)return;
    ensureStyles();
    const wrap=document.createElement('section');
    wrap.className='family-fun-home-entry';
    wrap.setAttribute('data-family-fun-home-fix','');
    wrap.innerHTML=`<button type="button" class="family-fun-home-launch" aria-label="Open Family Fun videos">
      <span class="family-fun-home-launch-icon">🎬</span>
      <span class="family-fun-home-launch-copy"><strong>Family Fun</strong><small>Videos & family moments</small></span>
      <span class="family-fun-home-launch-badge">TEST</span>
      <span class="family-fun-home-launch-arrow">›</span>
    </button>`;
    wrap.querySelector('button').addEventListener('click',()=>{window.location.href='family-fun.html';});
    screen.prepend(wrap);
  }

  function schedule(){requestAnimationFrame(()=>requestAnimationFrame(inject));}
  schedule();
  window.addEventListener('load',schedule);
  window.addEventListener('pageshow',schedule);
  document.addEventListener('click',e=>{if(e.target.closest('[data-r]'))setTimeout(schedule,0)},true);
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
