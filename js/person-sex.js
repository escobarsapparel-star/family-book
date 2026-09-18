(()=>{
  if(window.__fbPersonSexInstalled)return;
  window.__fbPersonSexInstalled=true;

  const PENDING_SETUP_KEY='fb_pending_person_sex';
  const sexById=new Map();
  let loadedFamilyId='';
  let loading=null;
  let pendingPersist=null;
  let scheduled=false;

  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const valid=v=>v==='male'||v==='female';

  function ensureStyles(){
    if(document.getElementById('fbPersonSexStyles'))return;
    const style=document.createElement('style');
    style.id='fbPersonSexStyles';
    style.textContent=`
      .fb-person-sex-row{align-items:end}
      .fb-person-sex-field{display:flex;flex:1;flex-direction:column;gap:6px;min-width:0}
      .fb-person-sex-field select{width:100%;min-height:44px;box-sizing:border-box}
      .setup-field.fb-person-sex-field{margin-top:12px}
      .backend-invite-card .fb-person-sex-field{margin:12px 0}
    `;
    document.head.appendChild(style);
  }

  async function load(force=false){
    const familyId=String(auth().familyId||'');
    if(!familyId||!sb())return;
    if(!force&&loadedFamilyId===familyId)return;
    if(loading)return loading;
    loading=(async()=>{
      const {data,error}=await sb().rpc('get_family_person_sexes');
      if(error)throw error;
      sexById.clear();
      (Array.isArray(data)?data:[]).forEach(row=>{
        const id=String(row?.id||''),sex=String(row?.sex||'');
        if(id&&valid(sex))sexById.set(id,sex);
      });
      loadedFamilyId=familyId;
      decorateForms();
      window.dispatchEvent(new CustomEvent('familybook:person-sex-updated'));
    })().catch(err=>console.warn('Family Book person sex:',err?.message||err)).finally(()=>{loading=null});
    return loading;
  }

  async function set(id,sex){
    id=String(id||'');sex=String(sex||'');
    if(!id||!valid(sex))return false;
    const {error}=await sb().rpc('set_family_person_sex',{p_person_id:id,p_sex:sex});
    if(error)throw error;
    sexById.set(id,sex);
    window.dispatchEvent(new CustomEvent('familybook:person-sex-updated',{detail:{personId:id,sex}}));
    return true;
  }

  function get(id){return sexById.get(String(id||''))||''}

  function selectHtml(id,value,setup=false){
    const labelClass=setup?'setup-field fb-person-sex-field':'fb-person-sex-field';
    const labelText=setup?'<span class="setup-label-text">Sex</span>':'Sex';
    return `<label class="${labelClass}">${labelText}<select id="${id}" required aria-label="Sex"><option value="">Select Male or Female</option><option value="male" ${value==='male'?'selected':''}>Male</option><option value="female" ${value==='female'?'selected':''}>Female</option></select></label>`;
  }

  function insertMemberField(form,inputSelector,id,value){
    if(!form||form.querySelector(`#${id}`))return;
    const input=form.querySelector(inputSelector);
    const anchor=input?.closest('.field-row,.row,.form-row')||input?.closest('label');
    const html=`<div class="field-row fb-person-sex-row">${selectHtml(id,value,false)}</div>`;
    if(anchor)anchor.insertAdjacentHTML('afterend',html);
    else{
      const before=form.querySelector('.relationship-section,.relationship-editor,.form-actions,button[type="submit"]');
      if(before)before.insertAdjacentHTML('beforebegin',html);
      else form.insertAdjacentHTML('beforeend',html);
    }
  }

  function hydrate(select,id){
    if(!select)return;
    const known=get(id);
    if(!select.value&&known)select.value=known;
  }

  function decorateMemberForms(){
    const edit=document.querySelector('#editMemberForm');
    if(edit){
      const id=String(edit.dataset.memberId||'');
      insertMemberField(edit,'#mfLast, #mfFirst','mfSex',get(id));
      hydrate(edit.querySelector('#mfSex'),id);
    }

    const add=document.querySelector('#memberForm');
    if(add)insertMemberField(add,'#mfLast, #mfFirst','mfSex','');

    const history=document.querySelector('#historyProfileForm');
    if(history){
      const id=String(history.dataset.historyId||'');
      insertMemberField(history,'#hfLast, #hfFirst','hfSex',get(id));
      hydrate(history.querySelector('#hfSex'),id);
    }
  }

  function decorateSetupForms(){
    const create=document.querySelector('#backendCreateFamily');
    if(create&&!create.querySelector('#backendSex')){
      const nameGrid=create.querySelector('.setup-name-grid')||create.querySelector('#backendLast')?.closest('.row');
      const html=selectHtml('backendSex','',true);
      if(nameGrid)nameGrid.insertAdjacentHTML('afterend',html);
      else create.insertAdjacentHTML('afterbegin',html);
    }

    const joinCard=document.querySelector('#backendInvitePreview .backend-invite-card');
    if(joinCard&&!joinCard.querySelector('#backendJoinSex')){
      const submit=joinCard.querySelector('#backendJoinSubmit');
      const html=selectHtml('backendJoinSex','',true);
      if(submit)submit.insertAdjacentHTML('beforebegin',html);
      else joinCard.insertAdjacentHTML('beforeend',html);
    }
  }

  function decorateForms(){
    ensureStyles();
    decorateMemberForms();
    decorateSetupForms();
  }

  function chosenSex(){
    const edit=document.querySelector('#editMemberForm');
    if(edit){
      const sex=edit.querySelector('#mfSex')?.value||'';
      return valid(sex)?{mode:'edit',id:String(edit.dataset.memberId||''),sex}:null;
    }
    const add=document.querySelector('#memberForm');
    if(add){
      const sex=add.querySelector('#mfSex')?.value||'';
      return valid(sex)?{mode:'add',id:'',sex}:null;
    }
    const history=document.querySelector('#historyProfileForm');
    if(history){
      const sex=history.querySelector('#hfSex')?.value||'';
      return valid(sex)?{mode:'history',id:String(history.dataset.historyId||''),sex}:null;
    }
    return null;
  }

  function savePendingSex(sex){
    try{
      if(valid(sex))sessionStorage.setItem(PENDING_SETUP_KEY,sex);
      else sessionStorage.removeItem(PENDING_SETUP_KEY);
    }catch(_){}
  }

  function pendingSex(){
    try{
      const sex=sessionStorage.getItem(PENDING_SETUP_KEY)||'';
      return valid(sex)?sex:'';
    }catch(_){return ''}
  }

  async function persistPendingSetupSex(){
    if(pendingPersist)return pendingPersist;
    const sex=pendingSex(),personId=String(auth().memberId||'');
    if(!sex||!personId||!sb())return false;
    pendingPersist=(async()=>{
      try{
        await set(personId,sex);
        savePendingSex('');
        await load(true);
        return true;
      }catch(err){
        console.warn('Family Book setup sex:',err?.message||err);
        return false;
      }finally{pendingPersist=null}
    })();
    return pendingPersist;
  }

  function requireSelect(select,message='Choose Male or Female to continue.'){
    if(select&&valid(select.value)){
      select.setCustomValidity('');
      return true;
    }
    if(select){
      select.setCustomValidity(message);
      select.reportValidity();
      select.addEventListener('change',()=>select.setCustomValidity(''),{once:true});
    }
    return false;
  }

  function bindSetupCapture(){
    document.addEventListener('submit',event=>{
      const form=event.target;
      if(form?.id!=='backendCreateFamily')return;
      const select=form.querySelector('#backendSex');
      if(!requireSelect(select)){
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      savePendingSex(select.value);
    },true);

    document.addEventListener('click',event=>{
      const button=event.target?.closest?.('#backendJoinSubmit');
      if(!button)return;
      const select=document.querySelector('#backendJoinSex');
      if(!requireSelect(select)){
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      savePendingSex(select.value);
    },true);
  }

  function wrapFamilyData(){
    const data=window.FB_FAMILY_DATA;
    if(!data||data.__fbPersonSexWrapped)return false;
    const originalGet=typeof data.getPeople==='function'?data.getPeople.bind(data):null;
    const originalSync=typeof data.syncMembers==='function'?data.syncMembers.bind(data):null;
    if(!originalGet||!originalSync)return false;

    data.getPeople=()=>originalGet().map(p=>({...p,sex:get(p.id)||p.sex||''}));
    data.syncMembers=async list=>{
      const beforeIds=new Set(originalGet().map(p=>String(p.id)));
      const picked=chosenSex();
      if(picked){
        let target=null;
        if(picked.id)target=list.find(p=>String(p.id)===picked.id)||null;
        if(!target)target=list.find(p=>!beforeIds.has(String(p.id)))||null;
        if(target)target.sex=picked.sex;
      }

      const result=await originalSync(list);
      const updates=[];
      (list||[]).forEach(p=>{
        const id=String(p?.id||''),sex=String(p?.sex||'');
        if(id&&valid(sex)&&get(id)!==sex)updates.push([id,sex]);
      });
      for(const [id,sex] of updates)await set(id,sex);
      return result;
    };
    data.__fbPersonSexWrapped=true;
    return true;
  }

  function scheduleInstall(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      wrapFamilyData();
      decorateForms();
      persistPendingSetupSex();
    });
  }

  function install(){
    ensureStyles();
    bindSetupCapture();
    wrapFamilyData();
    decorateForms();
    load();
    persistPendingSetupSex();

    const app=document.getElementById('app');
    if(app)new MutationObserver(scheduleInstall).observe(app,{childList:true,subtree:true});
    window.addEventListener('familybook:family-data-updated',()=>{load(true);scheduleInstall()});
    window.addEventListener('familybook:auth-ready',()=>{load(true);scheduleInstall()});
  }

  window.FB_PERSON_SEX={load,get,set,valid,decorateForms};
  install();
})();