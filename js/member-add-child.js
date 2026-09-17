(()=>{
  if(window.__fbMemberAddChild)return;
  window.__fbMemberAddChild=true;

  const auth=()=>window.FB_AUTH?.get?.()||{};
  const sb=()=>window.FB_SUPABASE?.client;
  const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#039;'}[c]));

  function currentSurname(){
    const u=auth();
    const person=window.FB_FAMILY_DATA?.getPeople?.().find(p=>String(p.id)===String(u.memberId||''));
    const name=String(person?.name||u.name||'').trim();
    const parts=name.split(/\s+/).filter(Boolean);
    return parts.length>1?parts.slice(1).join(' '):'';
  }

  function closeModal(){
    document.querySelector('.fb-add-child-backdrop')?.remove();
  }

  function showError(form,text){
    const el=form.querySelector('[data-child-error]');
    if(!el)return;
    el.textContent=text||'';
    el.hidden=!text;
  }

  function openModal(){
    closeModal();
    const u=auth();
    if(!u.memberId||!u.familyId){
      alert('Your Family Book member profile is not ready yet.');
      return;
    }

    const backdrop=document.createElement('div');
    backdrop.className='fb-add-child-backdrop';
    backdrop.innerHTML=`
      <section class="fb-add-child-card" role="dialog" aria-modal="true" aria-labelledby="fbAddChildTitle">
        <div class="fb-add-child-head">
          <div>
            <span>FAMILY TREE</span>
            <h2 id="fbAddChildTitle">Add your child</h2>
            <p>Create an unclaimed child profile linked directly to you.</p>
          </div>
          <button type="button" class="fb-add-child-close" aria-label="Close"><i data-lucide="x"></i></button>
        </div>

        <form class="fb-add-child-form">
          <div class="fb-add-child-note">
            <i data-lucide="shield-check"></i>
            <p><strong>They can claim this profile later.</strong><br>When they join this Family Book with an invitation, they can choose this existing profile instead of creating a duplicate.</p>
          </div>

          <div class="fb-add-child-grid">
            <label><span>First name</span><input name="first" autocomplete="off" maxlength="120" required></label>
            <label><span>Surname <small>(optional)</small></span><input name="surname" autocomplete="off" maxlength="120" value="${esc(currentSurname())}"></label>
          </div>
          <label><span>Birthday <small>(optional)</small></span><input name="birthday" type="date" max="${new Date().toISOString().slice(0,10)}"></label>

          <div class="fb-add-child-error" data-child-error hidden></div>

          <div class="fb-add-child-actions">
            <button type="button" class="secondary" data-child-cancel>Cancel</button>
            <button type="submit" class="primary"><i data-lucide="baby"></i><span>Add child</span></button>
          </div>
        </form>
      </section>`;

    document.body.appendChild(backdrop);
    window.icons?.();
    window.lucide?.createIcons?.();

    const card=backdrop.querySelector('.fb-add-child-card');
    const form=backdrop.querySelector('.fb-add-child-form');
    const first=form.querySelector('[name="first"]');
    first?.focus();

    backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal()});
    backdrop.querySelector('.fb-add-child-close')?.addEventListener('click',closeModal);
    backdrop.querySelector('[data-child-cancel]')?.addEventListener('click',closeModal);

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      showError(form,'');
      const submit=form.querySelector('button[type="submit"]');
      const firstName=String(form.elements.first?.value||'').trim();
      const surname=String(form.elements.surname?.value||'').trim();
      const birthday=String(form.elements.birthday?.value||'').trim();
      if(!firstName){first?.focus();return}

      const full=[firstName,surname].filter(Boolean).join(' ').toLowerCase();
      const duplicate=window.FB_FAMILY_DATA?.getPeople?.().find(p=>String(p.name||'').trim().toLowerCase()===full);
      if(duplicate&&!confirm(`${[firstName,surname].filter(Boolean).join(' ')} already appears in this family. Add another profile anyway?`))return;

      submit.disabled=true;
      const old=submit.innerHTML;
      submit.innerHTML='<span class="memory-spinner small"></span><span>Adding…</span>';
      try{
        const client=sb();
        if(!client)throw new Error('Family Book is not connected to Supabase.');
        const {data,error}=await client.rpc('create_my_child_profile',{
          p_first_name:firstName,
          p_surname:surname||null,
          p_birth_date:birthday||null
        });
        if(error)throw error;
        const row=Array.isArray(data)?data[0]:data;
        const childId=row?.child_id||'';
        await window.FB_FAMILY_DATA?.reload?.();
        closeModal();
        if(childId)window.go?.(`view-member:${childId}`);
        else window.go?.('members');
      }catch(err){
        console.error('Add child:',err);
        showError(form,err?.message||'Could not add this child profile.');
        submit.disabled=false;
        submit.innerHTML=old;
        window.icons?.();
        window.lucide?.createIcons?.();
      }
    });
  }

  function enhanceMembers(){
    const page=document.querySelector('.members-page');
    const head=page?.querySelector('.members-head');
    if(!page||!head||!auth().memberId)return;

    let actions=head.querySelector('.member-head-actions');
    if(!actions){
      actions=document.createElement('div');
      actions.className='member-head-actions';
      const existing=head.querySelector(':scope > .member-add')||head.querySelector('.member-add');
      if(existing)actions.appendChild(existing);
      head.appendChild(actions);
    }

    if(actions.querySelector('.member-child-add'))return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='secondary member-child-add';
    btn.setAttribute('aria-label','Add your child');
    btn.title='Add your child';
    btn.innerHTML='<i data-lucide="baby"></i><span>Add child</span>';
    btn.addEventListener('click',openModal);
    actions.appendChild(btn);
    window.icons?.();
    window.lucide?.createIcons?.();
  }

  const schedule=()=>requestAnimationFrame(enhanceMembers);
  window.addEventListener('load',schedule);
  document.addEventListener('click',schedule);
  const root=document.getElementById('app');
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  schedule();
})();
