(function(){
  function ensureStyles(){
    if(document.getElementById('familyFunHomeFixStyles'))return;
    const style=document.createElement('style');
    style.id='familyFunHomeFixStyles';
    style.textContent=`
      .family-fun-home-entry{margin:16px 0 18px}
      .family-fun-home-launch{width:100%;display:flex;align-items:center;gap:14px;text-align:left;padding:16px 18px;border:1px solid rgba(49,92,67,.14);border-radius:18px;background:var(--card,#fff);color:inherit;box-shadow:0 8px 24px rgba(32,52,40,.06);cursor:pointer;position:relative}
      .family-fun-home-launch:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(32,52,40,.09)}
      .family-fun-home-launch-icon{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;flex:0 0 auto;background:rgba(49,92,67,.10);color:#315c43}
      .family-fun-home-launch-copy{min-width:0;display:flex;flex-direction:column;gap:2px}
      .family-fun-home-launch-copy strong{font-size:1rem}
      .family-fun-home-launch-copy small{color:var(--muted,#66736b);font-size:.82rem}
      .family-fun-home-launch-badge{margin-left:auto;margin-right:24px;font-size:.62rem;font-weight:800;letter-spacing:.06em;padding:4px 7px;border-radius:999px;background:#fff2b3;color:#6c5200;border:1px solid #e8cf67}
      .family-fun-home-launch-arrow{position:absolute;right:14px;display:grid;place-items:center;color:var(--muted,#66736b)}
      @media(max-width:620px){.family-fun-home-entry{margin:12px 0 14px}.family-fun-home-launch{padding:14px 15px;border-radius:16px}.family-fun-home-launch-icon{width:42px;height:42px}.family-fun-home-launch-badge{margin-right:20px}}
    `;
    document.head.appendChild(style);
  }

  function inject(){
    const screen=document.getElementById('screen');
    if(!screen||screen.querySelector('[data-family-fun-home-fix]'))return;
    const hero=screen.querySelector('.home-hero');
    if(!hero)return;
    ensureStyles();
    const wrap=document.createElement('section');
    wrap.className='family-fun-home-entry';
    wrap.setAttribute('data-family-fun-home-fix','');
    wrap.innerHTML=`<button type="button" class="family-fun-home-launch" aria-label="Open Family Fun videos">
      <span class="family-fun-home-launch-icon"><i data-lucide="clapperboard"></i></span>
      <span class="family-fun-home-launch-copy"><strong>Family Fun</strong><small>Videos & family moments</small></span>
      <span class="family-fun-home-launch-badge">TEST</span>
      <span class="family-fun-home-launch-arrow"><i data-lucide="chevron-right"></i></span>
    </button>`;
    wrap.querySelector('button')?.addEventListener('click',()=>window.go?.('family-fun'));
    hero.insertAdjacentElement('afterend',wrap);
    try{window.lucide?.createIcons({attrs:{'stroke-width':1.9}})}catch(_){ }
  }

  inject();
  const observer=new MutationObserver(()=>inject());
  observer.observe(document.body,{childList:true,subtree:true});
})();
