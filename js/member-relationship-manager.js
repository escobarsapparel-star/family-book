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

  function rowsOf(section){
    return [...(section.querySelectorAll('#relationshipRows [data-rel-row]')||[])];
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
    button.querySelector('[data-rel-count]').textContent=String(count);

    const labels=[...ORDER.filter(x=>groups[x]?.length),...Object.keys(groups).filter(x=>!ORDER.includes(x))];
    if(!labels.length){
      summary.innerHTML='<div class="relationship-empty-summary"><i data-lucide="users-round"></i><span><strong>No family connections added yet</strong><small>Use Manage relationships to add one.</small></span></div>';
    }else{
      summary.innerHTML=labels.map(label=>{
        const names=[...new Set(groups[label])];
        return `<div class="relationship-summary-group"><span class="relationship-summary-label">${label}</span><div class="relationship-summary-people">${names.map(name=>`<span class="relationship-person-chip">${escapeHtml(name)}</span>`).join('')}</div></div>`;
      }).join('');
    }
    window.icons?.();
  }

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function setOpen(section,open){
    section.classList.toggle('relationship-manager-open',!!open);
    const button=section.querySelector('.relationship-manage-toggle');
    if(button){
      button.setAttribute('aria-expanded',open?'true':'false');
      const label=button.querySelector('[data-rel-action]');
      if(label)label.textContent=open?'Done':'Manage relationships';
      const icon=button.querySelector('i');
      if(icon)icon.setAttribute('data-lucide',open?'check':'settings-2');
    }
    if(!open)render(section);
    window.icons?.();
  }

  function install(){
    const form=document.querySelector('#editMemberForm');
    const section=form?.querySelector('.relationship-section');
    const rows=form?.querySelector('#relationshipRows');
    if(!form||!section||!rows||section.dataset.compactManager==='1')return false;
    section.dataset.compactManager='1';
    section.classList.add('relationship-compact-manager');

    const titleText=section.querySelector('.relationship-title p');
    if(titleText)titleText.textContent='Family connections are grouped below. Open Manage relationships only when you need to make changes.';

    const controls=document.createElement('div');
    controls.className='relationship-compact-controls';
    controls.innerHTML=`<button type="button" class="relationship-manage-toggle" aria-expanded="false"><i data-lucide="settings-2"></i><span data-rel-action>Manage relationships</span><span class="relationship-count" data-rel-count>0</span></button>`;
    const summary=document.createElement('div');
    summary.className='relationship-compact-summary';

    section.insertBefore(controls,rows);
    section.insertBefore(summary,rows);
    rows.classList.add('relationship-editor-scroll');

    controls.querySelector('.relationship-manage-toggle').addEventListener('click',()=>{
      setOpen(section,!section.classList.contains('relationship-manager-open'));
    });
    section.addEventListener('change',()=>render(section));
    new MutationObserver(()=>render(section)).observe(rows,{childList:true,subtree:true});

    render(section);
    setOpen(section,false);
    return true;
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(install).observe(app,{childList:true,subtree:true});
  install();
})();
