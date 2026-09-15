(()=>{
  if(window.__fbMemoryEditorCleanup)return;
  window.__fbMemoryEditorCleanup=true;

  let scanQueued=false;

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
      // Two passes also normalize the legacy "camera -> edited" source back to manual.
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

      // memories.js can use File.lastModified for video or "now" for camera capture.
      // Those are not original capture metadata, so keep them out of the Memory date/time.
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
