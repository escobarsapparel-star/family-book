(()=>{
  if(window.__fbMemberSexPositionInstalled)return;
  window.__fbMemberSexPositionInstalled=true;

  let scheduled=false;

  function moveSexRow(form,selector){
    if(!form)return;
    const sexRow=form.querySelector('.fb-person-sex-row');
    const input=form.querySelector(selector);
    const nameRow=input?.closest('.field-row,.row,.form-row')||input?.closest('label');
    if(!sexRow||!nameRow||sexRow===nameRow)return;
    if(sexRow.nextElementSibling===nameRow)return;
    nameRow.insertAdjacentElement('beforebegin',sexRow);
  }

  function apply(){
    moveSexRow(document.querySelector('#editMemberForm'),'#mfFirst, #mfLast');
    moveSexRow(document.querySelector('#memberForm'),'#mfFirst, #mfLast');
    moveSexRow(document.querySelector('#historyProfileForm'),'#hfFirst, #hfLast');
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      apply();
    });
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('familybook:person-sex-updated',schedule);
  window.addEventListener('familybook:family-data-updated',schedule);
  apply();
})();
