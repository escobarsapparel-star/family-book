(()=>{
  if(window.__fbLegalSettingsInstalled)return;
  window.__fbLegalSettingsInstalled=true;

  function install(){
    const page=document.querySelector('.settings-page');
    if(!page||document.getElementById('settingsLegal'))return;

    const section=document.createElement('section');
    section.className='settings-card';
    section.id='settingsLegal';
    section.innerHTML=`
      <div class="settings-card-head">
        <span class="settings-card-icon"><i data-lucide="scale"></i></span>
        <div><p>LEGAL & PRIVACY</p><h2>Policies & consent</h2><span>Review Family Book's current legal documents and family-media rules.</span></div>
      </div>
      <button type="button" class="settings-nav-row" data-legal-href="legal/privacy.html"><span><i data-lucide="shield-check"></i><strong>Privacy & POPIA Notice</strong></span><i data-lucide="chevron-right"></i></button>
      <button type="button" class="settings-nav-row" data-legal-href="legal/terms.html"><span><i data-lucide="file-text"></i><strong>Terms & Conditions</strong></span><i data-lucide="chevron-right"></i></button>
      <button type="button" class="settings-nav-row" data-legal-href="legal/child-media.html"><span><i data-lucide="users-round"></i><strong>Child & Family Media Rules</strong></span><i data-lucide="chevron-right"></i></button>
      <button type="button" class="settings-nav-row" data-legal-href="legal/paia.html"><span><i data-lucide="folder-search"></i><strong>PAIA Access Notice</strong></span><i data-lucide="chevron-right"></i></button>
      <p class="settings-note"><i data-lucide="badge-check"></i>Current legal version: 2026-09-19-v1. Your acceptance is stored securely with your Family Book account.</p>`;

    section.querySelectorAll('[data-legal-href]').forEach(btn=>{
      btn.addEventListener('click',()=>{ location.href=btn.dataset.legalHref; });
    });

    const familyCard=page.querySelector('.settings-family-card');
    if(familyCard)familyCard.insertAdjacentElement('beforebegin',section);
    else page.appendChild(section);
    window.icons?.();
  }

  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>install()).observe(app,{childList:true,subtree:true});
  window.addEventListener('familybook:settings',install);
  setTimeout(install,300);
})();
