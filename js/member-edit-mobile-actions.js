(()=>{
  if(window.__fbMemberEditMobileActions)return;
  window.__fbMemberEditMobileActions=true;

  const mq=window.matchMedia('(max-width:560px)');

  function position(form){
    if(!form)return;
    const actions=form.querySelector('.form-actions');
    if(!actions)return;

    if(!actions.__fbOriginalAnchor){
      const anchor=document.createComment('family-book-form-actions-anchor');
      actions.parentNode?.insertBefore(anchor,actions);
      actions.__fbOriginalAnchor=anchor;
    }

    const anchor=actions.__fbOriginalAnchor;
    if(mq.matches){
      if(form.firstChild!==actions)form.insertBefore(actions,form.firstChild);
      actions.classList.add('form-actions-mobile-top');
    }else{
      if(anchor?.parentNode)anchor.parentNode.insertBefore(actions,anchor.nextSibling);
      actions.classList.remove('form-actions-mobile-top');
    }
  }

  function scan(){
    document.querySelectorAll('#editMemberForm').forEach(position);
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(scan).observe(app,{childList:true,subtree:true});
  mq.addEventListener?.('change',scan);
  scan();
})();
