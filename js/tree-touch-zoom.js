/* Normal tree only: fullscreen retains its existing zoom and export handlers. */
(()=>{
  if(window.__fbTreeTouchZoom)return;
  window.__fbTreeTouchZoom=true;
  function install(){
    const page=document.querySelector('.coordinate-tree-page');
    const board=page?.querySelector('.ct-board');
    const canvas=board?.querySelector(':scope > .ct-canvas');
    if(!board||!canvas)return;
    const width=canvas.offsetWidth,height=canvas.offsetHeight;
    if(!width||!height)return;
    const stage=document.createElement('div');
    stage.className='tree-touch-stage';
    board.insertBefore(stage,canvas);stage.appendChild(canvas);
    board.classList.add('tree-touch-board');
    const description=page.querySelector('.tree-head>div:first-child>p:last-child');
    if(description&&!description.classList.contains('eyebrow'))description.textContent='Your family, across generations.';
    page.querySelectorAll('.tree-head-actions button').forEach(button=>{
      button.setAttribute('aria-label',button.textContent.trim());
      button.title=button.textContent.trim();
    });
    const hint=document.createElement('p');
    hint.className='tree-touch-hint';hint.textContent='Pinch to zoom · Swipe to explore';
    board.before(hint);
    let scale=1,gesture=null,blockClickUntil=0;
    const clamp=value=>Math.max(.2,Math.min(2.25,value));
    function apply(value){
      scale=clamp(value);
      stage.style.width=`${width*scale}px`;stage.style.height=`${height*scale}px`;
      canvas.style.transform=`scale(${scale})`;
    }
    function points(touches){
      const a=touches[0],b=touches[1],rect=stage.getBoundingClientRect();
      return {distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),
        x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2,rect};
    }
    board.addEventListener('touchstart',event=>{
      if(event.touches.length!==2)return;
      event.preventDefault();
      const p=points(event.touches);
      gesture={distance:Math.max(1,p.distance),scale,x:(p.x-p.rect.left)/scale,y:(p.y-p.rect.top)/scale};
      blockClickUntil=Date.now()+600;
    },{passive:false});
    board.addEventListener('touchmove',event=>{
      if(!gesture||event.touches.length!==2)return;
      event.preventDefault();
      const p=points(event.touches);
      apply(gesture.scale*p.distance/gesture.distance);
      const rect=stage.getBoundingClientRect();
      board.scrollLeft+=rect.left+gesture.x*scale-p.x;
      board.scrollTop+=rect.top+gesture.y*scale-p.y;
      blockClickUntil=Date.now()+600;
    },{passive:false});
    const end=event=>{if(gesture&&event.touches.length<2){gesture=null;blockClickUntil=Date.now()+600}};
    board.addEventListener('touchend',end);board.addEventListener('touchcancel',end);
    board.addEventListener('click',event=>{
      if(Date.now()<blockClickUntil){event.preventDefault();event.stopImmediatePropagation()}
    },true);
    apply(1);
  }
  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})};
  new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  schedule();
})();
