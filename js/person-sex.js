(()=>{
  if(window.__fbPersonSexInstalled)return;
  window.__fbPersonSexInstalled=true;

  const sexById=new Map();
  let loadedFamilyId='';
  let loading=null;

  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const valid=v=>v==='male'||v==='female';

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

  function fieldHtml(id,value,label='Sex'){
    return `<label class="fb-person-sex-field">${label}<select id="${id}" required><option value="">Select</option><option value="male" ${value==='male'?'selected':''}>Male</option><option value="female" ${value==='female'?'selected':''}>Female</option></select></label>`;
  }

  function insertAfterFirstRow(form,html){
    const rows=form.querySelectorAll(':scope > .field-row');
    const anchor=rows[0]||form.querySelector('.field-row');
    if(anchor)anchor.insertAdjacentHTML('afterend',html);
    else form.insertAdjacentHTML('afterbegin',html);
  }

  function decorateForms(){
    const edit=document.querySelector('#editMemberForm');
    if(edit&&!edit.querySelector('#mfSex')){
      const id=String(edit.dataset.memberId||'');
      insertAfterFirstRow(edit,fieldHtml('mfSex',get(id)));
    }else if(edit?.querySelector('#mfSex')){
      const id=String(edit.dataset.memberId||'');
      const el=edit.querySelector('#mfSex');
      if(!el.value&&get(id))el.value=get(id);
    }

    const add=document.querySelector('#memberForm');
    if(add&&!add.querySelector('#mfSex'))insertAfterFirstRow(add,fieldHtml('mfSex',''));

    const history=document.querySelector('#historyProfileForm');
    if(history&&!history.querySelector('#hfSex')){
      const id=String(history.dataset.historyId||'');
      insertAfterFirstRow(history,fieldHtml('hfSex',get(id)));
    }else if(history?.querySelector('#hfSex')){
      const id=String(history.dataset.historyId||'');
      const el=history.querySelector('#hfSex');
      if(!el.value&&get(id))el.value=get(id);
    }
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

  function install(){
    wrapFamilyData();
    decorateForms();
    load();
  }

  const screen=document.getElementById('screen');
  if(screen)new MutationObserver(()=>decorateForms()).observe(screen,{childList:true});
  window.addEventListener('familybook:family-data-updated',()=>load(true));
  window.addEventListener('familybook:auth-ready',()=>load(true));

  window.FB_PERSON_SEX={load,get,set,valid};
  install();
})();