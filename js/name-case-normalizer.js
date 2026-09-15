(()=>{
  if(window.__fbNameCaseNormalizer)return;
  window.__fbNameCaseNormalizer=true;

  const nameSelector=[
    '#first','#last','#mfFirst','#mfLast','#hfFirst','#hfLast',
    'input[name="first_name"]','input[name="last_name"]',
    'input[autocomplete="given-name"]','input[autocomplete="family-name"]',
    'input[data-fb-name-case]'
  ].join(',');

  function isAllCaps(value){
    const s=String(value||'').trim();
    if(!s)return false;
    // Only adjust values that contain letters and are genuinely all-uppercase.
    // Mixed-case names are preserved exactly as the person entered them.
    return /\p{L}/u.test(s) && s===s.toLocaleUpperCase() && s!==s.toLocaleLowerCase();
  }

  function titleFromCaps(value){
    const lower=String(value||'').trim().toLocaleLowerCase();
    return lower.replace(/(^|[\s\-’'])(\p{L})/gu,(m,sep,letter)=>sep+letter.toLocaleUpperCase());
  }

  function normalizeValue(value){
    const s=String(value||'').trim();
    return isAllCaps(s)?titleFromCaps(s):s;
  }

  function normalizeInput(input){
    if(!(input instanceof HTMLInputElement)||!input.matches(nameSelector))return false;
    const next=normalizeValue(input.value);
    if(next===input.value)return false;
    input.value=next;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }

  function normalizeForm(form){
    if(!(form instanceof HTMLFormElement))return;
    form.querySelectorAll(nameSelector).forEach(normalizeInput);
  }

  function scan(root=document){
    root.querySelectorAll?.(nameSelector).forEach(input=>{
      // Normalize pre-filled ALL-CAPS member names when an edit form opens.
      if(input.value)normalizeInput(input);
    });
  }

  // Run before the app's form submit handlers so the cleaned values are what get saved.
  document.addEventListener('submit',event=>normalizeForm(event.target),true);
  document.addEventListener('focusout',event=>normalizeInput(event.target),true);

  const app=document.getElementById('app');
  if(app){
    new MutationObserver(records=>{
      for(const record of records){
        for(const node of record.addedNodes){
          if(node.nodeType!==1)continue;
          if(node.matches?.(nameSelector))normalizeInput(node);
          scan(node);
        }
      }
    }).observe(app,{childList:true,subtree:true});
  }

  scan();
  window.FB_NAME_CASE={normalize:normalizeValue,isAllCaps};
})();
