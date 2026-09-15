(()=>{
  if(window.__fbFamilyPrayerWidget)return;
  window.__fbFamilyPrayerWidget=true;

  const VERSES=[
    {text:'Be still, and know that I am God.',ref:'Psalm 46:10',version:'KJV'},
    {text:'Trust in the Lord with all thine heart.',ref:'Proverbs 3:5',version:'KJV'},
    {text:'I can do all things through Christ which strengtheneth me.',ref:'Philippians 4:13',version:'KJV'},
    {text:'Rejoicing in hope; patient in tribulation; continuing instant in prayer.',ref:'Romans 12:12',version:'KJV'},
    {text:'Peace I leave with you, my peace I give unto you.',ref:'John 14:27',version:'KJV'},
    {text:'Let all your things be done with charity.',ref:'1 Corinthians 16:14',version:'KJV'},
    {text:'The Lord is my shepherd; I shall not want.',ref:'Psalm 23:1',version:'KJV'},
    {text:'With God all things are possible.',ref:'Matthew 19:26',version:'KJV'},
    {text:'Pray without ceasing.',ref:'1 Thessalonians 5:17',version:'KJV'},
    {text:'We love him, because he first loved us.',ref:'1 John 4:19',version:'KJV'}
  ];

  const ENCOURAGEMENTS=[
    'Take a moment today to encourage someone in the family.',
    'A small message of kindness can change someone’s whole day.',
    'Make space today for gratitude, patience and grace with one another.',
    'Remember one good thing your family has come through together.',
    'Reach out to someone you have not checked in on for a while.'
  ];

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  let shared=null,slideIndex=0,loading=false,rotationTimer=null,mountQueued=false;

  function prefKey(){
    const u=auth();
    const who=String(u.supabaseUserId||u.memberId||u.email||u.name||'member').toLowerCase().replace(/[^a-z0-9_-]+/g,'_');
    return `fb_family_prayer_widget_${who}`;
  }
  function enabled(){try{return localStorage.getItem(prefKey())!=='0'}catch(_){return true}}
  function setEnabled(value){
    try{localStorage.setItem(prefKey(),value?'1':'0')}catch(_){}
    applyVisibility();
  }
  function dayOfYear(){
    const now=new Date(),start=new Date(now.getFullYear(),0,0);
    return Math.floor((now-start)/86400000);
  }
  function dailyVerse(){return VERSES[dayOfYear()%VERSES.length]}
  function dailyEncouragement(){return ENCOURAGEMENTS[(dayOfYear()+3)%ENCOURAGEMENTS.length]}

  function slides(){
    const verse=dailyVerse();
    const list=[{
      kind:'scripture',label:'SCRIPTURE FOR TODAY',icon:'book-heart',
      text:verse.text,meta:`${verse.ref} · ${verse.version}`
    }];
    if(shared?.body){
      list.push({
        kind:shared.kind,
        label:shared.kind==='prayer'?'FAMILY PRAYER REQUEST':'FAMILY ENCOURAGEMENT',
        icon:shared.kind==='prayer'?'heart-handshake':'sparkles',
        text:shared.body,
        meta:'Shared with the family'
      });
    }
    list.push({
      kind:'encouragement',label:'A LITTLE ENCOURAGEMENT',icon:'sun-medium',
      text:dailyEncouragement(),meta:'Family Book'
    });
    return list;
  }

  function cardHtml(){
    return `<section class="desktop-widget family-prayer-widget" id="familyPrayerWidget" aria-label="Family Prayer and Scripture">
      <div class="desktop-widget-head family-prayer-head">
        <h3><span class="family-prayer-emoji" aria-hidden="true">🙏</span> Family Prayer</h3>
        <button type="button" data-family-prayer-share>Share</button>
      </div>
      <div class="family-prayer-stage" id="familyPrayerStage" aria-live="polite"></div>
      <div class="family-prayer-footer">
        <span class="family-prayer-dots" id="familyPrayerDots" aria-hidden="true"></span>
        <button type="button" class="family-prayer-next" data-family-prayer-next><i data-lucide="refresh-cw"></i><span>Next</span></button>
      </div>
    </section>`;
  }

  function renderSlide(animate=true){
    const stage=document.querySelector('#familyPrayerStage');
    const dots=document.querySelector('#familyPrayerDots');
    if(!stage)return;
    const list=slides();
    if(!list.length)return;
    slideIndex=((slideIndex%list.length)+list.length)%list.length;
    const item=list[slideIndex];
    const html=`<div class="family-prayer-slide ${esc(item.kind)}">
      <div class="family-prayer-label"><span><i data-lucide="${esc(item.icon)}"></i></span>${esc(item.label)}</div>
      <p>${esc(item.text)}</p>
      <small>${esc(item.meta)}</small>
    </div>`;
    if(animate){
      stage.classList.add('switching');
      window.setTimeout(()=>{
        stage.innerHTML=html;
        stage.classList.remove('switching');
        window.icons?.();
      },120);
    }else{
      stage.innerHTML=html;
      window.icons?.();
    }
    if(dots)dots.innerHTML=list.map((_,i)=>`<i class="${i===slideIndex?'active':''}"></i>`).join('');
  }

  function nextSlide(){
    const list=slides();
    if(!list.length)return;
    slideIndex=(slideIndex+1)%list.length;
    renderSlide(true);
  }

  function bindCard(card){
    const next=card.querySelector('[data-family-prayer-next]');
    if(next&&!next.dataset.bound){next.dataset.bound='1';next.addEventListener('click',nextSlide)}
    const share=card.querySelector('[data-family-prayer-share]');
    if(share&&!share.dataset.bound){share.dataset.bound='1';share.addEventListener('click',openModal)}
  }

  function placeUnderClock(card,rail){
    const clock=rail.querySelector('#desktopDateTimeCard');
    if(!clock)return false;
    if(clock.nextElementSibling!==card)clock.insertAdjacentElement('afterend',card);
    return true;
  }

  function mountWidget(){
    if(!enabled()){
      document.querySelector('#familyPrayerWidget')?.remove();
      return false;
    }
    const rail=document.querySelector('.desktop-right-rail');
    if(!rail)return false;
    const clock=rail.querySelector('#desktopDateTimeCard');
    if(!clock)return false;

    let card=document.querySelector('#familyPrayerWidget');
    if(!card){
      clock.insertAdjacentHTML('afterend',cardHtml());
      card=document.querySelector('#familyPrayerWidget');
      if(card){renderSlide(false);window.icons?.()}
    }
    if(!card)return false;
    placeUnderClock(card,rail);
    bindCard(card);
    return true;
  }

  function applyVisibility(){
    if(enabled())mountWidget();
    else document.querySelector('#familyPrayerWidget')?.remove();
    injectSettingsToggle();
  }

  async function loadShared(){
    if(loading||!sb())return;
    loading=true;
    try{
      const {data,error}=await sb().rpc('get_current_family_inspiration');
      if(error)throw error;
      shared=data&&typeof data==='object'?data:null;
      const list=slides();if(slideIndex>=list.length)slideIndex=0;
      renderSlide(false);
    }catch(err){
      console.warn('Family inspiration load:',err?.message||err);
    }finally{loading=false}
  }

  function modalHtml(){
    const kind=shared?.kind==='prayer'?'prayer':'encouragement';
    return `<div class="family-prayer-modal-backdrop" id="familyPrayerModal">
      <section class="family-prayer-modal" role="dialog" aria-modal="true" aria-labelledby="familyPrayerModalTitle">
        <button type="button" class="family-prayer-modal-close" data-family-prayer-close aria-label="Close"><i data-lucide="x"></i></button>
        <div class="family-prayer-modal-icon">🙏</div>
        <p class="eyebrow">OPTIONAL FAMILY SPACE</p>
        <h2 id="familyPrayerModalTitle">Share with the family</h2>
        <p class="family-prayer-modal-intro">Add one current prayer request or a short encouragement. It will rotate gently with the daily Scripture.</p>
        <form id="familyPrayerForm">
          <label>Type
            <select id="familyPrayerKind">
              <option value="prayer" ${kind==='prayer'?'selected':''}>Prayer request</option>
              <option value="encouragement" ${kind==='encouragement'?'selected':''}>Encouragement</option>
            </select>
          </label>
          <label>Message
            <textarea id="familyPrayerText" rows="4" maxlength="500" required placeholder="Write something for the family…">${esc(shared?.body||'')}</textarea>
          </label>
          <div class="family-prayer-modal-message" id="familyPrayerMessage" hidden></div>
          <div class="family-prayer-modal-actions">
            ${shared?.body?'<button type="button" class="family-prayer-clear" data-family-prayer-clear>Clear shared note</button>':'<span></span>'}
            <div><button type="button" class="secondary" data-family-prayer-close>Cancel</button><button type="submit" class="primary">Share</button></div>
          </div>
        </form>
      </section>
    </div>`;
  }

  function closeModal(){document.querySelector('#familyPrayerModal')?.remove()}
  function modalMessage(text,type='error'){
    const el=document.querySelector('#familyPrayerMessage');if(!el)return;
    el.textContent=text;el.dataset.type=type;el.hidden=!text;
  }
  function openModal(){
    closeModal();
    document.body.insertAdjacentHTML('beforeend',modalHtml());
    const modal=document.querySelector('#familyPrayerModal');
    modal?.querySelectorAll('[data-family-prayer-close]').forEach(b=>b.addEventListener('click',closeModal));
    modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});
    document.querySelector('#familyPrayerForm')?.addEventListener('submit',saveShared);
    document.querySelector('[data-family-prayer-clear]')?.addEventListener('click',clearShared);
    window.icons?.();
    document.querySelector('#familyPrayerText')?.focus();
  }

  async function saveShared(e){
    e.preventDefault();
    const form=e.currentTarget,btn=form.querySelector('button[type="submit"]');
    const kind=document.querySelector('#familyPrayerKind')?.value||'encouragement';
    const body=document.querySelector('#familyPrayerText')?.value?.trim()||'';
    if(!body){modalMessage('Write a short message first.');return}
    btn.disabled=true;btn.textContent='Sharing…';modalMessage('');
    try{
      const {error}=await sb().rpc('save_current_family_inspiration',{p_kind:kind,p_body:body});
      if(error)throw error;
      await loadShared();
      closeModal();
      slideIndex=1;renderSlide(true);
    }catch(err){modalMessage(err?.message||'Could not share this right now.');btn.disabled=false;btn.textContent='Share'}
  }

  async function clearShared(){
    const btn=document.querySelector('[data-family-prayer-clear]');if(btn){btn.disabled=true;btn.textContent='Clearing…'}
    modalMessage('');
    try{
      const {error}=await sb().rpc('clear_current_family_inspiration');
      if(error)throw error;
      shared=null;slideIndex=0;renderSlide(false);closeModal();
    }catch(err){modalMessage(err?.message||'Could not clear this note.');if(btn){btn.disabled=false;btn.textContent='Clear shared note'}}
  }

  function injectSettingsToggle(){
    const page=document.querySelector('.settings-page');if(!page)return false;
    let card=document.querySelector('#settingsFamilyPrayer');
    if(!card){
      const appearance=document.querySelector('#settingsAppearance');
      const html=`<section class="settings-card family-prayer-settings" id="settingsFamilyPrayer">
        <div class="settings-card-head"><span class="settings-card-icon"><span aria-hidden="true">🙏</span></span><div><p>FAMILY SPACE</p><h2>Prayer & Scripture</h2><span>Keep this optional widget visible on your Family Book home screen.</span></div></div>
        <label class="settings-toggle-row" for="setFamilyPrayerWidget">
          <span><strong>Show Family Prayer / Scripture</strong><small>Rotate a daily Scripture, family prayer request and encouragement in the widget area.</small></span>
          <span class="settings-switch"><input id="setFamilyPrayerWidget" type="checkbox" ${enabled()?'checked':''}><i></i></span>
        </label>
        <p class="settings-note"><i data-lucide="heart"></i>This setting only changes what you see. Other family members can choose for themselves.</p>
      </section>`;
      if(appearance)appearance.insertAdjacentHTML('afterend',html);else page.insertAdjacentHTML('beforeend',html);
      card=document.querySelector('#settingsFamilyPrayer');
    }
    const input=card?.querySelector('#setFamilyPrayerWidget');
    if(input){input.checked=enabled();if(!input.dataset.bound){input.dataset.bound='1';input.addEventListener('change',()=>setEnabled(input.checked))}}
    window.icons?.();return true;
  }

  function queueMount(){
    if(mountQueued)return;
    mountQueued=true;
    queueMicrotask(()=>{
      mountQueued=false;
      mountWidget();
      injectSettingsToggle();
    });
  }

  const root=document.getElementById('app');
  const observer=new MutationObserver(queueMount);
  if(root)observer.observe(root,{childList:true,subtree:true});

  window.addEventListener('familybook:settings',queueMount);
  window.addEventListener('focus',()=>{queueMount();loadShared()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){queueMount();loadShared()}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('#familyPrayerModal'))closeModal()});

  rotationTimer=window.setInterval(()=>{if(!document.hidden&&document.querySelector('#familyPrayerWidget'))nextSlide()},14000);
  queueMount();
  window.setTimeout(loadShared,400);
})();
