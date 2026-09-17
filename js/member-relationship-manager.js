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
  const MEMBER_EDITABLE=new Set(['child_of','parent_of','sibling_of','spouse_of']);
  const SUMMARY_LIMIT=3;

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

  function groupMarkup(label,names){
    const unique=[...new Set(names)];
    const hidden=Math.max(0,unique.length-SUMMARY_LIMIT);
    const chips=unique.map((name,index)=>`<span class="relationship-person-chip ${index>=SUMMARY_LIMIT?'relationship-person-overflow':''}">${escapeHtml(name)}</span>`).join('');
    const more=hidden?`<button type="button" class="relationship-more-chip" data-rel-more aria-expanded="false" data-more-count="${hidden}">+${hidden} more</button>`:'';
    return `<div class="relationship-summary-group"><span class="relationship-summary-label"><span>${escapeHtml(label)}</span><small>${unique.length}</small></span><div class="relationship-summary-people">${chips}${more}</div></div>`;
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
      summary.innerHTML='<div class="relationship-empty-summary"><span><strong>No family connections added yet</strong><small>Use Manage relationships to add your immediate family connections.</small></span></div>';
    }else{
      summary.innerHTML=labels.map(label=>groupMarkup(label,groups[label])).join('');
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

  function applyMemberLimits(section){
    rowsOf(section).forEach(row=>{
      const type=row.querySelector('.mfRelType');
      const current=type?.value||'';
      const systemOnly=!!current&&!MEMBER_EDITABLE.has(current);
      row.classList.toggle('relationship-system-row',systemOnly);
      if(type){
        [...type.options].forEach(option=>{
          if(!option.value)return;
          const allowed=MEMBER_EDITABLE.has(option.value);
          option.disabled=!allowed;
          option.hidden=!allowed;
        });
      }
      const remove=row.querySelector('.remove-rel');
      if(remove&&systemOnly)remove.style.display='none';
    });
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

      if(!isAdmin&&!ownProfile){
        section.dataset.compactManager='member-view';
        section.style.display='none';
        return true;
      }

      const limitedMember=ownProfile&&!isAdmin;
      section.dataset.compactManager=limitedMember?'member-self':'admin';
      section.classList.add('relationship-compact-manager');
      if(limitedMember){
        section.classList.add('relationship-member-limited');
        form.classList.add('member-self-profile-editor');
        const heading=form.closest('.member-form-card')?.querySelector('.form-title h1');
        const copy=form.closest('.member-form-card')?.querySelector('.form-title p');
        if(heading)heading.textContent='Edit Profile';
        if(copy)copy.textContent='Update your profile details and your immediate family connections.';
      }

      const titleText=section.querySelector('.relationship-title p');
      if(titleText)titleText.textContent=limitedMember
        ? 'Manage relationships connected directly to you. Other family-tree structure remains protected.'
        : 'Family connections are grouped below. Open Manage relationships only when you need to make changes.';

      const controls=document.createElement('div');
      controls.className='relationship-compact-controls';
      controls.innerHTML='<button type="button" class="relationship-manage-toggle" aria-expanded="false"><i data-lucide="settings-2"></i><span data-rel-action>Manage relationships</span><span class="relationship-count" data-rel-count>0</span></button>';
      const summary=document.createElement('div');
      summary.className='relationship-compact-summary';

      section.insertBefore(controls,rows);
      section.insertBefore(summary,rows);
      rows.classList.add('relationship-editor-scroll');

      if(limitedMember)applyMemberLimits(section);

      summary.addEventListener('click',event=>{
        const more=event.target.closest('[data-rel-more]');
        if(!more)return;
        const group=more.closest('.relationship-summary-group');
        if(!group)return;
        const expanded=group.classList.toggle('relationship-group-expanded');
        more.setAttribute('aria-expanded',expanded?'true':'false');
        const hidden=Number(more.dataset.moreCount||0);
        more.textContent=expanded?'Show less':`+${hidden} more`;
      });

      controls.querySelector('.relationship-manage-toggle')?.addEventListener('click',()=>{
        if(limitedMember)applyMemberLimits(section);
        setOpen(section,!section.classList.contains('relationship-manager-open'));
      });
      section.addEventListener('change',()=>{
        if(limitedMember)applyMemberLimits(section);
        render(section);
      });
      section.addEventListener('click',event=>{
        if(event.target.closest('#addRelationship,.remove-rel')){
          setTimeout(()=>{
            if(limitedMember)applyMemberLimits(section);
            render(section);
          },0);
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
