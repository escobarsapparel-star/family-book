(()=>{
  if(window.__fbCompactWidgetsDrawer)return;
  window.__fbCompactWidgetsDrawer=true;

  const MIN=760,MAX=1179;
  let marker=null,drawer=null,button=null,rail=null;

  const isCompact=()=>window.innerWidth>=MIN&&window.innerWidth<=MAX;

  function ensureDrawer(){
    if(drawer&&document.body.contains(drawer))return drawer;
    drawer=document.createElement('div');
    drawer.className='compact-widgets-drawer';
    drawer.hidden=true;
    drawer.innerHTML=`
      <div class="compact-widgets-backdrop" data-compact-widgets-close></div>
      <aside class="compact-widgets-panel" role="dialog" aria-modal="true" aria-label="Family widgets">
        <div class="compact-widgets-head">
          <div><strong>Family widgets</strong><span>Quick family information</span></div>
          <button type="button" data-compact-widgets-close aria-label="Close widgets"><i data-lucide="x"></i></button>
        </div>
        <div class="compact-widgets-body"></div>
      </aside>`;
    document.body.appendChild(drawer);
    drawer.querySelectorAll('[data-compact-widgets-close]').forEach(el=>el.addEventListener('click',close));
    drawer.addEventListener('click',e=>{if(e.target.closest('[data-desktop-route]'))close()});
    window.icons?.();
    return drawer;
  }

  function ensureButton(){
    const top=document.querySelector('#app>.app>.topbar');
    if(!top)return null;
    if(button&&document.body.contains(button))return button;
    button=document.createElement('button');
    button.type='button';
    button.className='compact-widgets-toggle';
    button.setAttribute('aria-label','Open family widgets');
    button.setAttribute('aria-expanded','false');
    button.innerHTML='<i data-lucide="layout-dashboard"></i><span>Widgets</span>';
    const actions=top.querySelector('.actions');
    if(actions)top.insertBefore(button,actions);else top.appendChild(button);
    button.addEventListener('click',()=>drawer?.hidden?open():close());
    window.icons?.();
    return button;
  }

  function findRail(){
    if(rail&&document.body.contains(rail))return rail;
    rail=document.querySelector('.desktop-right-rail');
    return rail;
  }

  function dockCompact(){
    const r=findRail();
    if(!r)return false;
    const d=ensureDrawer();
    const body=d.querySelector('.compact-widgets-body');
    if(!marker){
      marker=document.createComment('family-book-right-rail-home');
      r.parentNode?.insertBefore(marker,r);
    }
    if(r.parentNode!==body)body.appendChild(r);
    r.classList.add('compact-widgets-rail');
    ensureButton();
    return true;
  }

  function restoreRail(){
    const r=findRail();
    if(r&&marker?.parentNode){
      marker.parentNode.insertBefore(r,marker);
      marker.remove();
      marker=null;
      r.classList.remove('compact-widgets-rail');
    }
    close();
  }

  function open(){
    if(!isCompact())return;
    if(!dockCompact())return;
    drawer.hidden=false;
    document.documentElement.classList.add('compact-widgets-open');
    button?.setAttribute('aria-expanded','true');
    window.icons?.();
  }

  function close(){
    if(drawer)drawer.hidden=true;
    document.documentElement.classList.remove('compact-widgets-open');
    button?.setAttribute('aria-expanded','false');
  }

  function sync(){
    if(isCompact()){
      if(dockCompact()){
        if(button)button.hidden=false;
      }
    }else{
      restoreRail();
      if(button)button.hidden=true;
    }
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer?.hidden)close()});
  window.addEventListener('resize',()=>requestAnimationFrame(sync),{passive:true});

  const root=document.getElementById('app');
  const observer=new MutationObserver(()=>{
    if(isCompact()&&document.querySelector('.desktop-right-rail'))sync();
    if(isCompact()&&!button)ensureButton();
  });
  if(root)observer.observe(root,{childList:true,subtree:true});

  sync();
})();
