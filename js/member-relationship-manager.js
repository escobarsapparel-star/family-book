(()=>{
  if(window.__fbMemberRelationshipManager)return;
  window.__fbMemberRelationshipManager=true;

  const GROUPS={
    child_of:'Parents',
    parent_of:'Children',
    sibling_of:'Siblings',
    spouse_of:'Partner',
    grandchild_of:'Grandparents',
    grandparent_of:'Grandchildren'
  };
  const ORDER=['Parents','Partner','Children','Siblings','Grandparents','Grandchildren'];

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function rowsOf(section){
    return [...section.querySelectorAll('#relationshipRows [data-rel-row]')];
  }

  function read(section){
    const groups={};
    let count=0;
    rowsOf(section).forEach(row=>{
      const type=row.querySelector('.mfRelType');
      const person=row.querySelector('.mfRelPerson');
      const t=type?.value||'';
      const p=person?.value||'';
      if(!t||!p)return;
      const label=GROUPS[t]||type?.selectedOptions?.[0]?.textContent?.trim()||'Other';
      const name=person?.selectedOptions?.[0]?.textContent?.trim()||'';
      if(!name)return;
      (groups[label]??=[]).push(name);
      count++;
    });
    return {groups,count};
  }

  function render(section){
    const summary=section.querySelector('.relationship-compact-summary');
    const button=section.querySelector('.relationship-manage-toggle');
    if(!summary||!button)return;
    const {groups,count}=read(section);
    const countEl=button.querySelector('[data-rel-count]');
    if(countEl)countEl.textContent=String(count);

    const labels=[...ORDER.filter(x=>groups[x]?.length),...Object.keys(groups).filter(x=>!ORDER.includes(x))];
    if(!labels.length){
      summary.innerHTML='<div class="relationship-empty-summary"><span><strong>No family connections added yet</strong><small>Use Manage relationships to add one.</small></span></div>';
    }else{
      summary.innerHTML=labels.map(label=>{
        const names=[...new Set(groups[label])];
        return `<div class="relationship-summary-group"><span class="relationship-summary-label">${escapeHtml(label)}</span><div class="relationship-summary-people">${names.map(name=>`<span class="relationship-person-chip">${escapeHtml(name)}</span>`).join('')}</div></div>`;
      }).join('');
    }
  }

  function setOpen(section,open){
    section.classList.toggle('relationship-manager-open',!!open);
    const button=section.querySelector('.relationship-manage-toggle');
    if(button){
      button.setAttribute('aria-expanded',open?'true':'false');
      const label=button.querySelector('[data-rel-action]');
      if(label)label.textContent=open?'Done':'Manage relationships';
    }
    if(!open)render(section);
  }

  function install(){
    try{
      const form=document.querySelector('#editMemberForm');
      const section=form?.querySelector('.relationship-section');
      const rows=form?.querySelector('#relationshipRows');
      if(!form||!section||!rows)return false;
      if(section.dataset.compactManager)return true;

      const auth=window.FB_AUTH?.get?.()||{};
      const memberId=String(form.dataset.memberId||'');
      const ownProfile=!!memberId&&String(auth.memberId||'')===memberId;
      const isAdmin=String(auth.role||'').toLowerCase()==='admin';

      // A normal member's Edit Profile page is for personal details only.
      // Keep the existing relationship inputs in the DOM so the current save
      // logic preserves them, but do not expose family-graph editing here.
      if(ownProfile&&!isAdmin){
        section.dataset.compactManager='self-profile';
        section.style.display='none';
        form.classList.add('member-self-profile-editor');
        const heading=form.closest('.member-form-card')?.querySelector('.form-title h1');
        const copy=form.closest('.member-form-card')?.querySelector('.form-title p');
        if(heading)heading.textContent='Edit Profile';
        if(copy)copy.textContent='Update your personal profile details.';
        return true;
      }

      // Non-admins should never manage another member's graph from this page.
      if(!isAdmin){
        section.dataset.compactManager='member-view';
        section.style.display='none';
        return true;
      }

      section.dataset.compactManager='admin';
      section.classList.add('relationship-compact-manager');

      const titleText=section.querySelector('.relationship-title p');
      if(titleText)titleText.textContent='Family connections are grouped below. Open Manage relationships only when you need to make changes.';

      const controls=document.createElement('div');
      controls.className='relationship-compact-controls';
      controls.innerHTML='<button type="button" class="relationship-manage-toggle" aria-expanded="false"><i data-lucide="settings-2"></i><span data-rel-action>Manage relationships</span><span class="relationship-count" data-rel-count>0</span></button>';
      const summary=document.createElement('div');
      summary.className='relationship-compact-summary';

      section.insertBefore(controls,rows);
      section.insertBefore(summary,rows);
      rows.classList.add('relationship-editor-scroll');

      controls.querySelector('.relationship-manage-toggle')?.addEventListener('click',()=>{
        setOpen(section,!section.classList.contains('relationship-manager-open'));
      });
      section.addEventListener('change',()=>render(section));
      section.addEventListener('click',event=>{
        if(event.target.closest('#addRelationship,.remove-rel')){
          setTimeout(()=>render(section),0);
        }
      });

      render(section);
      setOpen(section,false);
      window.icons?.();
      return true;
    }catch(err){
      console.error('Family Book relationship manager:',err);
      return false;
    }
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>install()).observe(app,{childList:true,subtree:true});
  install();
})();
