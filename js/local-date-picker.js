(()=>{
  if(window.__fbLocalDatePicker)return;
  window.__fbLocalDatePicker=true;

  // Keep the unstable custom modal permanently out of this implementation.
  document.documentElement.classList.remove('fb-date-open');
  document.querySelectorAll('.fb-date-overlay').forEach(node=>node.remove());

  const pad=n=>String(n).padStart(2,'0');

  function parseISO(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return null;
    const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
    const date=new Date(y,mo-1,d);
    return date.getFullYear()===y&&date.getMonth()===mo-1&&date.getDate()===d?date:null;
  }

  function parseDisplay(value){
    const raw=String(value||'').trim();
    if(!raw)return null;
    let m=raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if(!m&&/^\d{8}$/.test(raw))m=[raw,raw.slice(0,2),raw.slice(2,4),raw.slice(4,8)];
    if(!m)return null;
    const d=Number(m[1]),mo=Number(m[2]),y=Number(m[3]);
    const date=new Date(y,mo-1,d);
    return date.getFullYear()===y&&date.getMonth()===mo-1&&date.getDate()===d?date:null;
  }

  const toISO=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  const toDisplay=value=>{
    const date=parseISO(value);
    return date?`${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}`:'';
  };

  function formatTypedDate(value){
    const digits=String(value||'').replace(/\D/g,'').slice(0,8);
    if(digits.length<=2)return digits;
    if(digits.length<=4)return `${digits.slice(0,2)}/${digits.slice(2)}`;
    return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
  }

  function clearInvalid(display){
    display.classList.remove('fb-date-invalid');
    display.removeAttribute('aria-invalid');
    display.setCustomValidity('');
  }

  function markInvalid(display){
    display.classList.add('fb-date-invalid');
    display.setAttribute('aria-invalid','true');
    display.setCustomValidity('Enter a valid date as DD/MM/YYYY.');
  }

  function syncDisplay(source){
    const display=source.closest('.fb-date-field')?.querySelector('.fb-date-display');
    if(!display)return;
    display.value=toDisplay(source.value);
    clearInvalid(display);
  }

  function setSourceValue(source,date){
    const next=date?toISO(date):'';
    if(source.value===next){
      syncDisplay(source);
      return;
    }
    source.value=next;
    syncDisplay(source);
    source.dispatchEvent(new Event('input',{bubbles:true}));
    source.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function commitTypedDate(display,source,{allowEmpty=true}={}){
    const raw=display.value.trim();
    if(!raw){
      if(!allowEmpty){
        markInvalid(display);
        return false;
      }
      setSourceValue(source,null);
      clearInvalid(display);
      return true;
    }

    const date=parseDisplay(raw);
    const min=parseISO(source.min);
    const max=parseISO(source.max);
    const valid=!!date&&(!min||date>=min)&&(!max||date<=max);
    if(!valid){
      markInvalid(display);
      return false;
    }

    setSourceValue(source,date);
    display.value=`${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}`;
    clearInvalid(display);
    return true;
  }

  function calendarIcon(){
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  }

  function openNativePicker(source){
    try{
      if(typeof source.showPicker==='function'){
        source.showPicker();
        return;
      }
    }catch(_){ }
    try{
      source.focus({preventScroll:true});
      source.click();
    }catch(_){ }
  }

  function installFormValidation(form){
    if(!form||form.dataset.fbDateValidation==='1')return;
    form.dataset.fbDateValidation='1';
    form.addEventListener('submit',event=>{
      const displays=[...form.querySelectorAll('.fb-date-display')];
      const invalid=displays.find(display=>{
        const source=display.closest('.fb-date-field')?.querySelector('.fb-date-source');
        if(!source)return false;
        return !commitTypedDate(display,source,{allowEmpty:source.dataset.fbDateRequired!=='1'});
      });
      if(!invalid)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      invalid.focus();
      invalid.reportValidity?.();
    },true);
  }

  function enhance(source){
    if(!source||source.dataset.fbDateEnhanced==='1')return;
    source.dataset.fbDateEnhanced='1';
    source.dataset.fbDateRequired=source.required?'1':'0';
    source.required=false;
    source.lang='en-ZA';
    source.classList.add('fb-date-source');

    const wrapper=document.createElement('div');
    wrapper.className='fb-date-field';
    source.parentNode.insertBefore(wrapper,source);
    wrapper.appendChild(source);

    const display=document.createElement('input');
    display.type='text';
    display.className='fb-date-display';
    display.placeholder='dd/mm/yyyy';
    display.inputMode='numeric';
    display.maxLength=10;
    display.autocomplete='off';
    display.setAttribute('aria-label',source.getAttribute('aria-label')||'Date in DD/MM/YYYY format');
    display.value=toDisplay(source.value);

    const button=document.createElement('button');
    button.type='button';
    button.className='fb-date-button';
    button.setAttribute('aria-label','Choose date');
    button.innerHTML=calendarIcon();

    wrapper.append(display,button);

    display.addEventListener('input',()=>{
      display.value=formatTypedDate(display.value);
      clearInvalid(display);
    });
    display.addEventListener('blur',()=>{
      commitTypedDate(display,source,{allowEmpty:source.dataset.fbDateRequired!=='1'});
    });
    display.addEventListener('keydown',event=>{
      if(event.key==='Enter'){
        if(commitTypedDate(display,source,{allowEmpty:source.dataset.fbDateRequired!=='1'}))display.blur();
      }
    });
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      commitTypedDate(display,source,{allowEmpty:source.dataset.fbDateRequired!=='1'});
      openNativePicker(source);
    });
    source.addEventListener('change',()=>syncDisplay(source));

    installFormValidation(source.closest('form'));
  }

  function scan(root=document){
    root.querySelectorAll?.('input[type="date"]:not([data-fb-date-enhanced="1"])').forEach(enhance);
  }

  document.documentElement.lang='en-ZA';
  scan();

  const app=document.getElementById('app');
  if(app){
    new MutationObserver(mutations=>{
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node.nodeType===1)scan(node);
        }
      }
    }).observe(app,{childList:true,subtree:true});
  }
})();
