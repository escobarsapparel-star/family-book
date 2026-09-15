(()=>{
  if(window.__fbMemoryEditorCleanup)return;
  window.__fbMemoryEditorCleanup=true;

  let scanQueued=false;
  let memoryAddOrigin='memories';

  document.addEventListener('click',event=>{
    const trigger=event.target?.closest?.('[data-r="add-memory"]');
    if(!trigger)return;
    const active=document.querySelector('.bottom [data-r].active, .bottom-nav [data-r].active');
    memoryAddOrigin=active?.dataset?.r==='home'?'home':'memories';
  },true);

  if(window.FB_MEMORIES?.editorShell){
    const originalEditorShell=window.FB_MEMORIES.editorShell.bind(window.FB_MEMORIES);
    window.FB_MEMORIES.editorShell=function(id=''){
      let html=originalEditorShell(id);
      if(id)return html;
      const target=memoryAddOrigin==='home'?'home':'memories';
      html=html.replaceAll('data-r="memories"',`data-r="${target}"`);
      if(target==='home')html=html.replace('Back to memories','Back to home');
      return html;
    };
  }

  function formatCapture(dateValue,timeValue){
    if(!dateValue)return '';
    const parts=String(dateValue).split('-').map(Number);
    if(parts.length<3||!parts[0]||!parts[1]||!parts[2])return '';
    const date=new Date(parts[0],parts[1]-1,parts[2],12,0,0,0);
    let dateLabel=dateValue;
    try{
      dateLabel=new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'}).format(date);
    }catch(_){}
    const time=String(timeValue||'').slice(0,5);
    if(!time)return dateLabel;
    const hm=time.split(':').map(Number);
    let timeLabel=time;
    if(hm.length>=2&&Number.isFinite(hm[0])&&Number.isFinite(hm[1])){
      const t=new Date(2000,0,1,hm[0],hm[1],0,0);
      try{timeLabel=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'}).format(t)}catch(_){}
    }
    return `${dateLabel} · ${timeLabel}`;
  }

  function enhanceEditor(card){
    if(!card||card.dataset.memoryCleanupReady==='1')return;
    const note=card.querySelector('#memoryMetaNote');
    const dateInput=card.querySelector('#memoryDate');
    const timeInput=card.querySelector('#memoryTime');
    const dateGrid=card.querySelector('.memory-date-grid');
    if(!note||!dateInput||!timeInput||!dateGrid)return;

    card.dataset.memoryCleanupReady='1';

    const titleCopy=card.querySelector('.memory-editor-title p');
    if(titleCopy)titleCopy.textContent='Add photos or video clips from a family moment. Original capture date and time are kept automatically when available.';

    const galleryButton=card.querySelector('#memoryGalleryBtn');
    galleryButton?.classList.add('memory-gallery-primary');
    dateGrid.classList.add('memory-clean-hidden-fields');
    dateGrid.setAttribute('aria-hidden','true');

    const tags=card.querySelector('.memory-tags');
    if(tags){
      tags.classList.add('memory-tags-clean');
      const intro=tags.querySelector(':scope > p');
      if(intro)intro.textContent='Choose the people who are in this memory. Family History tags link the photo to their profile.';
      const legend=tags.querySelector('legend');
      if(legend)legend.childNodes[0].textContent='People in this memory ';
    }

    const initialDate=dateInput.value||'';
    const state={updating:false};

    function setCompactMetadata(){
      const capture=formatCapture(dateInput.value,timeInput.value);
      if(!capture){
        note.classList.add('memory-meta-clean-hidden');
        return;
      }
      state.updating=true;
      note.classList.remove('memory-meta-clean-hidden');
      note.classList.add('detected','memory-meta-compact');
      note.innerHTML=`<i data-lucide="scan-line"></i><div><strong>Original capture found</strong><span>${capture}</span></div>`;
      window.icons?.();
      window.setTimeout(()=>{state.updating=false},0);
    }

    function clearGeneratedFallback(){
      if(initialDate||(!dateInput.value&&!timeInput.value))return;
      state.updating=true;
      dateInput.value='';
      timeInput.value='';
      const ev=()=>dateInput.dispatchEvent(new Event('change',{bubbles:true}));
      ev();
      ev();
      note.classList.add('memory-meta-clean-hidden');
      window.setTimeout(()=>{state.updating=false},0);
    }

    function syncMetadata(fromMutation=false){
      if(state.updating)return;
      const heading=(note.querySelector('strong')?.textContent||'').trim().toLowerCase();
      const trueCapture=heading.includes('date detected from photo')||heading.includes('original capture found');
      if(trueCapture&&dateInput.value){
        setCompactMetadata();
        return;
      }

      note.classList.add('memory-meta-clean-hidden');
      note.classList.remove('memory-meta-compact');

      if(fromMutation)clearGeneratedFallback();
    }

    const noteObserver=new MutationObserver(()=>syncMetadata(true));
    noteObserver.observe(note,{childList:true,subtree:true});
    syncMetadata(false);
  }

  function scan(){
    document.querySelectorAll('.memory-editor-card').forEach(enhanceEditor);
  }

  function queueScan(){
    if(scanQueued)return;
    scanQueued=true;
    queueMicrotask(()=>{
      scanQueued=false;
      scan();
    });
  }

  const root=document.getElementById('app');
  if(root)new MutationObserver(queueScan).observe(root,{childList:true,subtree:true});
  scan();
})();
