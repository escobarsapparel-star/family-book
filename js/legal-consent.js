(()=>{
  if(window.__fbLegalConsentInstalled)return;
  window.__fbLegalConsentInstalled=true;

  const VERSION='2026-09-19-v1';
  const sb=()=>window.FB_SUPABASE?.client;
  let checking=false;
  let lastUserId='';
  let acceptedUserId='';

  function e(v=''){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

  function injectFooter(){
    if(document.getElementById('fbLegalFooter'))return;
    const footer=document.createElement('footer');
    footer.id='fbLegalFooter';
    footer.className='fb-legal-footer';
    footer.innerHTML=`<div class="fb-legal-footer-inner">
      <span>© 2026 Family Book · Private Family Beta</span>
      <a href="legal/privacy.html" target="_blank" rel="noopener">Privacy & POPIA</a>
      <a href="legal/terms.html" target="_blank" rel="noopener">Terms</a>
      <a href="legal/child-media.html" target="_blank" rel="noopener">Child & Family Media</a>
      <span class="fb-legal-version">Legal version ${VERSION}</span>
    </div>`;
    document.body.appendChild(footer);
  }

  function removeGate(){
    document.getElementById('fbLegalConsent')?.remove();
    document.body.classList.remove('fb-legal-locked');
  }

  function updateAcceptButton(){
    const gate=document.getElementById('fbLegalConsent');
    if(!gate)return;
    const checks=[...gate.querySelectorAll('input[data-legal-check]')];
    const btn=gate.querySelector('#fbLegalAccept');
    if(btn)btn.disabled=!checks.length||checks.some(x=>!x.checked);
  }

  function showGate(){
    if(document.getElementById('fbLegalConsent'))return;
    document.body.classList.add('fb-legal-locked');
    const wrap=document.createElement('div');
    wrap.id='fbLegalConsent';
    wrap.className='fb-legal-gate';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');
    wrap.setAttribute('aria-labelledby','fbLegalTitle');
    wrap.innerHTML=`<section class="fb-legal-card">
      <span class="fb-legal-badge">Privacy & family safety</span>
      <h2 id="fbLegalTitle">Before you continue</h2>
      <p>Family Book stores private family information, photos and Memories. Please confirm the rules below before using this version of the app.</p>

      <div class="fb-legal-links">
        <a href="legal/terms.html" target="_blank" rel="noopener">Read Terms</a>
        <a href="legal/privacy.html" target="_blank" rel="noopener">Read Privacy Notice</a>
        <a href="legal/child-media.html" target="_blank" rel="noopener">Read Child & Family Media Rules</a>
      </div>

      <div class="fb-legal-checks">
        <label class="fb-legal-check">
          <input type="checkbox" data-legal-check id="fbLegalTerms">
          <span><strong>I have read and accept the Family Book Terms & Conditions.</strong><small>This includes responsible account use, family-only sharing, content rules and the Beta-service terms.</small></span>
        </label>
        <label class="fb-legal-check">
          <input type="checkbox" data-legal-check id="fbLegalPrivacy">
          <span><strong>I have read the Privacy & POPIA Notice.</strong><small>I understand what Family Book processes, why it is processed, who may receive it and my privacy rights.</small></span>
        </label>
        <label class="fb-legal-check">
          <input type="checkbox" data-legal-check id="fbLegalChildren">
          <span><strong>I will only upload or share a child’s image or identifying information when I am entitled to do so.</strong><small>Where required, I will obtain permission from a parent, guardian or other competent person and will respect the child’s best interests and removal requests.</small></span>
        </label>
        <label class="fb-legal-check">
          <input type="checkbox" data-legal-check id="fbLegalAge">
          <span><strong>I am 18 or older, or I have permission from my parent or guardian to use Family Book.</strong><small>Family Book is a family service and younger users should use it with appropriate adult permission and supervision.</small></span>
        </label>
      </div>

      <div id="fbLegalError" class="fb-legal-error" hidden></div>
      <div class="fb-legal-actions">
        <button type="button" class="fb-legal-decline" id="fbLegalDecline">Decline & sign out</button>
        <button type="button" class="fb-legal-accept" id="fbLegalAccept" disabled>Accept & continue</button>
      </div>
      <p class="fb-legal-note">Acceptance is recorded with the policy version and time so Family Book can request fresh acceptance if the legal terms materially change.</p>
    </section>`;

    document.body.appendChild(wrap);
    wrap.querySelectorAll('input[data-legal-check]').forEach(x=>x.addEventListener('change',updateAcceptButton));

    wrap.querySelector('#fbLegalDecline').onclick=async()=>{
      const btn=wrap.querySelector('#fbLegalDecline');
      btn.disabled=true;
      try{await window.FB_NATIVE_PUSH?.unregister?.()}catch(_){}
      try{await window.FB_AUTH?.logout?.()}catch(_){}
      location.reload();
    };

    wrap.querySelector('#fbLegalAccept').onclick=async()=>{
      const btn=wrap.querySelector('#fbLegalAccept');
      const err=wrap.querySelector('#fbLegalError');
      err.hidden=true;
      btn.disabled=true;
      btn.textContent='Saving acceptance…';
      try{
        const client=sb();
        if(!client)throw new Error('Privacy service is not ready yet.');
        const {data,error}=await client.rpc('accept_current_legal_terms',{
          p_terms_accepted:true,
          p_privacy_acknowledged:true,
          p_child_media_acknowledged:true,
          p_age_guardian_acknowledged:true,
          p_user_agent:String(navigator.userAgent||'').slice(0,500)
        });
        if(error)throw error;
        if(!data?.accepted)throw new Error('Acceptance could not be confirmed.');
        const session=await client.auth.getSession();
        acceptedUserId=String(session?.data?.session?.user?.id||lastUserId||'');
        removeGate();
        window.dispatchEvent(new CustomEvent('familybook:legal-accepted',{detail:{version:VERSION}}));
      }catch(ex){
        err.textContent=ex?.message||'Could not save your acceptance. Please try again.';
        err.hidden=false;
        btn.disabled=false;
        btn.textContent='Accept & continue';
      }
    };
  }

  async function syncConsent(force=false){
    if(checking)return;
    const client=sb();
    if(!client)return;
    checking=true;
    try{
      const {data,error}=await client.auth.getSession();
      if(error)throw error;
      const session=data?.session;
      const userId=String(session?.user?.id||'');
      if(!userId){
        lastUserId='';
        acceptedUserId='';
        removeGate();
        return;
      }
      if(!force&&acceptedUserId===userId)return;
      if(!force&&lastUserId===userId&&document.getElementById('fbLegalConsent'))return;
      lastUserId=userId;

      const result=await client.rpc('get_my_legal_acceptance');
      if(result.error)throw result.error;
      if(result.data?.accepted){
        acceptedUserId=userId;
        removeGate();
      }else{
        acceptedUserId='';
        showGate();
      }
    }catch(err){
      console.warn('Family Book legal acceptance check:',err?.message||err);
      if(lastUserId)showGate();
      const box=document.getElementById('fbLegalError');
      if(box){box.textContent='Family Book could not verify your legal acceptance. Check your connection and try again.';box.hidden=false;}
    }finally{
      checking=false;
    }
  }

  injectFooter();
  window.addEventListener('familybook:auth-ready',()=>syncConsent(true));
  window.addEventListener('familybook:family-data-updated',()=>syncConsent(false));
  window.addEventListener('familybook:legal-recheck',()=>syncConsent(true));
  window.addEventListener('load',()=>setTimeout(()=>syncConsent(true),700));
  setTimeout(()=>syncConsent(true),1000);
  setInterval(()=>syncConsent(false),5000);

  window.FB_LEGAL={version:VERSION,recheck:()=>syncConsent(true)};
})();
