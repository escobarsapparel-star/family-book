(()=>{
  if(window.__fbDatePickerDMY)return;
  window.__fbDatePickerDMY=true;

  const pad=n=>String(n).padStart(2,'0');
  const parseIso=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?{y:+m[1],m:+m[2],d:+m[3]}:null};
  const display=v=>{const p=parseIso(v);return p?`${pad(p.d)}/${pad(p.m)}/${p.y}`:''};
  const daysIn=(y,m)=>new Date(y,m,0).getDate();

  let active=null;

  function modal(){
    let el=document.getElementById('fbDatePickerModal');
    if(el)return el;
    el=document.createElement('div');
    el.id='fbDatePickerModal';
    el.className='fb-date-modal hidden';
    el.innerHTML=`<div class="fb-date-backdrop" data-date-close></div><section class="fb-date-sheet" role="dialog" aria-modal="true" aria-labelledby="fbDateTitle"><div class="fb-date-sheet-head"><div><small>SELECT DATE</small><h2 id="fbDateTitle">Day / Month / Year</h2></div><button type="button" class="fb-date-close" data-date-close aria-label="Close">×</button></div><div class="fb-date-selects"><label>Day<select id="fbDateDay"></select></label><label>Month<select id="fbDateMonth"></select></label><label>Year<select id="fbDateYear"></select></label></div><div class="fb-date-actions"><button type="button" class="secondary" id="fbDateClear">Clear</button><button type="button" class="secondary" data-date-close>Cancel</button><button type="button" class="primary" id="fbDateSet">Set date</button></div></section>`;
    document.body.appendChild(el);
    el.addEventListener('click',e=>{if(e.target.closest('[data-date-close]'))close()});
    document.getElementById('fbDateSet').addEventListener('click',setDate);
    document.getElementById('fbDateClear').addEventListener('click',clearDate);
    ['fbDateMonth','fbDateYear'].forEach(id=>document.getElementById(id).addEventListener('change',refreshDays));
    return el;
  }

  function fillSelects(parts){
    const now=new Date(),yNow=now.getFullYear();
    const d=document.getElementById('fbDateDay'),m=document.getElementById('fbDateMonth'),y=document.getElementById('fbDateYear');
    m.innerHTML=Array.from({length:12},(_,i)=>`<option value="${i+1}">${pad(i+1)}</option>`).join('');
    y.innerHTML=Array.from({length:131},(_,i)=>{const v=yNow+10-i;return `<option value="${v}">${v}</option>`}).join('');
    m.value=String(parts.m);y.value=String(parts.y);
    refreshDays(parts.d);
  }

  function refreshDays(preferred){
    const d=document.getElementById('fbDateDay'),m=+document.getElementById('fbDateMonth').value,y=+document.getElementById('fbDateYear').value;
    const old=preferred||+d.value||1,max=daysIn(y,m);
    d.innerHTML=Array.from({length:max},(_,i)=>`<option value="${i+1}">${pad(i+1)}</option>`).join('');
    d.value=String(Math.min(old,max));
  }

  function open(original){
    active=original;
    const now=new Date();
    const p=parseIso(original.value)||{y:now.getFullYear(),m:now.getMonth()+1,d:now.getDate()};
    const el=modal();
    fillSelects(p);
    el.classList.remove('hidden');
    document.documentElement.classList.add('fb-date-open');
  }

  function close(){
    const el=document.getElementById('fbDatePickerModal');
    if(el)el.classList.add('hidden');
    document.documentElement.classList.remove('fb-date-open');
    active=null;
  }

  function sync(original){
    const proxy=original.parentElement?.querySelector('.fb-date-display');
    if(proxy)proxy.value=display(original.value);
  }

  function setDate(){
    if(!active)return close();
    const d=+document.getElementById('fbDateDay').value,m=+document.getElementById('fbDateMonth').value,y=+document.getElementById('fbDateYear').value;
    active.value=`${y}-${pad(m)}-${pad(d)}`;
    sync(active);
    active.dispatchEvent(new Event('input',{bubbles:true}));
    active.dispatchEvent(new Event('change',{bubbles:true}));
    close();
  }

  function clearDate(){
    if(!active)return close();
    active.value='';sync(active);
    active.dispatchEvent(new Event('input',{bubbles:true}));
    active.dispatchEvent(new Event('change',{bubbles:true}));
    close();
  }

  function enhance(input){
    if(input.dataset.fbDmyEnhanced==='1')return;
    input.dataset.fbDmyEnhanced='1';
    const required=input.required;
    input.required=false;
    input.type='hidden';
    const wrap=document.createElement('div');
    wrap.className='fb-date-input-wrap';
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(input);
    const proxy=document.createElement('input');
    proxy.type='text';proxy.readOnly=true;proxy.className='fb-date-display';proxy.placeholder='DD/MM/YYYY';proxy.value=display(input.value);proxy.setAttribute('aria-label','Date in day month year format');
    if(required)proxy.required=true;
    const btn=document.createElement('button');
    btn.type='button';btn.className='fb-date-button';btn.setAttribute('aria-label','Choose date');btn.innerHTML='<i data-lucide="calendar-days"></i>';
    wrap.append(proxy,btn);
    const launch=()=>open(input);
    proxy.addEventListener('click',launch);btn.addEventListener('click',launch);
    window.icons?.();
  }

  function scan(root=document){
    root.querySelectorAll?.('input[type="date"]:not([data-fb-dmy-enhanced="1"])').forEach(enhance);
  }

  scan();
  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>scan(app)).observe(app,{childList:true,subtree:true});
})();
