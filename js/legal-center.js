(()=>{
  if(window.__fbLegalCentreInstalled)return;
  window.__fbLegalCentreInstalled=true;

  const POLICY_VERSION='2026-09-19-v1';
  const UPDATED='19 September 2026';
  const sb=()=>window.FB_SUPABASE?.client;
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  const docs={
    privacy:{
      title:'Privacy Policy & POPIA Notice',
      kicker:'PRIVACY • SOUTH AFRICA',
      html:`
        <p class="fb-legal-meta">Effective and last updated: ${UPDATED}</p>
        <p class="fb-legal-note"><strong>Plain-language summary:</strong> Family Book is a private family-sharing service. We use personal information only to provide family profiles, relationships, Memories, the Family Wall, calendars, reminders, notifications and related features. We do not sell family members’ personal information.</p>

        <h3>1. Who is responsible for your information?</h3>
        <p>For purposes of the Protection of Personal Information Act 4 of 2013 (“POPIA”), Family Book is operated in South Africa by the Family Book administrator who determines how the service processes personal information. Formal privacy requests may be directed to the Family Book administrator who provided or manages your access.</p>

        <h3>2. Information Family Book may process</h3>
        <ul>
          <li>Account information such as name, surname, email address and authentication details.</li>
          <li>Family profile information such as family relationships, birthdays, anniversaries, biography and profile/cover photographs.</li>
          <li>Contact details that a member chooses to add, including a telephone number.</li>
          <li>Family content including photographs, videos, Memories, captions, tags, Family Wall posts, comments and reactions.</li>
          <li>Calendar information such as birthdays, outings, events, times and locations that members choose to add.</li>
          <li>Notification and device information needed to deliver app and push notifications.</li>
          <li>Limited technical records needed for security, troubleshooting and consent records.</li>
        </ul>

        <h3>3. Why we process this information</h3>
        <p>Information is processed to create and secure accounts, connect family members, display the family tree, store and share family Memories, run the Family Wall and calendar, deliver reminders and notifications, support contact actions such as Call/WhatsApp where a number is supplied, prevent misuse, and maintain the service.</p>

        <h3>4. Lawful processing and choice</h3>
        <p>Family Book aims to process personal information lawfully, reasonably and only for a defined family-service purpose. Information that is optional should only be supplied when the member chooses to provide it. Members may ask for inaccurate information to be corrected and may request deletion where legally appropriate.</p>

        <h3>5. Children’s personal information</h3>
        <p>POPIA gives additional protection to children’s personal information. Family Book treats information about anyone under 18, including identifiable photographs, as sensitive family content. A person uploading a child’s information or image must be the child’s parent/guardian or must have appropriate authority or consent from a competent person. Users under 18 must use Family Book with approval from a parent or guardian.</p>

        <h3>6. Family photographs, video and tagging</h3>
        <p>Identifiable photographs and videos can be personal information. Family Book uses manual family tagging to organise Memories; it does not use facial recognition to identify family members. Media is intended for the relevant private family group, not for public advertising or sale. A parent, guardian or affected member may ask the family administrator to remove content concerning them or a child under their care.</p>

        <h3>7. Service providers and storage</h3>
        <p>Family Book uses technology providers to operate the service, including Supabase for authentication/database services, Backblaze B2 for media storage, Firebase Cloud Messaging for Android push notifications and GitHub Pages for web application hosting. These providers process information only as needed to provide their technical services.</p>

        <h3>8. Cross-border processing</h3>
        <p>Some technology providers may store or process information outside South Africa. Where cross-border processing occurs, Family Book intends to apply the safeguards required by POPIA, including the requirements governing transfers of personal information outside the Republic.</p>

        <h3>9. Security</h3>
        <p>Family Book uses authenticated access, database access controls and private service credentials intended to protect family information. No online service can guarantee absolute security. Suspected unauthorised access or a personal-information breach should be reported to the Family Book administrator as soon as possible.</p>

        <h3>10. Retention and deletion</h3>
        <p>Information is kept only for as long as it is reasonably required for the family service, legal obligations, security or legitimate record-keeping. Members may request deletion of their account/profile information or specific content, subject to information that must lawfully be retained.</p>

        <h3>11. Your POPIA rights</h3>
        <p>Depending on the circumstances, a data subject may ask whether Family Book holds personal information about them, request access, request correction or deletion, object to certain processing, withdraw consent where consent is the legal basis, and lodge a complaint with the Information Regulator (South Africa).</p>

        <h3>12. Complaints</h3>
        <p>The Information Regulator (South Africa) is the supervisory authority for POPIA and PAIA. Current public contact details published by the Regulator include telephone 010 023 5200 and enquiries@inforegulator.org.za.</p>

        <h3>13. Changes to this policy</h3>
        <p>If Family Book materially changes how personal information is processed, the policy version may be updated and members may be asked to review and accept the updated terms again.</p>`
    },
    terms:{
      title:'Terms & Conditions of Use',
      kicker:'FAMILY BOOK • TERMS',
      html:`
        <p class="fb-legal-meta">Effective and last updated: ${UPDATED}</p>
        <p class="fb-legal-note">Family Book is currently a beta family application. By using it, you agree to use the service responsibly and respect the privacy and rights of every family member.</p>

        <h3>1. Family-only service</h3>
        <p>Family Book is designed for invited family groups to share family information, Memories, photographs, events and communication. Access should not be shared with people who are not authorised members of the relevant family group.</p>

        <h3>2. Age and guardian approval</h3>
        <p>A user under 18 must have the approval of a parent or guardian to use Family Book. Adults who create or manage child profiles must act in the child’s best interests and must have authority to provide the child’s information.</p>

        <h3>3. Account responsibility</h3>
        <p>You are responsible for keeping your login details secure and for activity performed through your account. Do not impersonate another family member, claim a profile that is not yours, or deliberately interfere with another member’s account.</p>

        <h3>4. Your content</h3>
        <p>You keep ownership of content you upload. You grant Family Book a limited permission to host, process, resize, display and transmit that content only as reasonably necessary to operate the family service. This permission ends when content is deleted, subject to reasonable backups and legal retention requirements.</p>

        <h3>5. Photos and information about other people</h3>
        <p>Only upload, tag or publish another person’s information where you have a reasonable right or permission to do so. Extra care is required for children. Do not upload a child’s identifiable image or information unless you are the parent/guardian or have appropriate authorisation from a competent person.</p>

        <h3>6. Acceptable use</h3>
        <p>Do not use Family Book to harass family members, unlawfully disclose private information, upload material you have no right to share, attempt to bypass security, introduce malicious code, or use the service for unlawful purposes.</p>

        <h3>7. Calls, WhatsApp, links and third-party services</h3>
        <p>Family Book may open your device’s phone, WhatsApp, YouTube, browser, maps or other third-party apps. Those services operate under their own terms and privacy practices. Family Book does not control third-party content or availability.</p>

        <h3>8. Beta service and availability</h3>
        <p>Family Book is currently provided as a beta service. Features may change, contain errors or occasionally be unavailable. Reasonable efforts are made to protect family data and keep the service available, but uninterrupted or error-free operation is not guaranteed.</p>

        <h3>9. Removal and suspension</h3>
        <p>Access may be limited or removed where necessary to protect family members, comply with law, investigate misuse or maintain security. A family administrator may also remove access to that family group.</p>

        <h3>10. South African law</h3>
        <p>These terms are governed by the laws of the Republic of South Africa, including applicable provisions of POPIA, PAIA and the Electronic Communications and Transactions Act 25 of 2002.</p>

        <h3>11. Updates</h3>
        <p>Material changes to these terms may require members to accept a newer policy version before continuing to use Family Book.</p>`
    },
    children:{
      title:'Children & Family Media Consent',
      kicker:'PHOTOS • CHILDREN • FAMILY PRIVACY',
      html:`
        <p class="fb-legal-meta">Effective and last updated: ${UPDATED}</p>
        <p class="fb-legal-note"><strong>Important:</strong> Family Book is built around family photographs, which may include children. The person uploading a child’s image is responsible for having the necessary authority or consent.</p>

        <h3>1. What counts as child information?</h3>
        <p>For this policy, a child means a person under 18. Names, birthdays, family relationships, photographs, videos, captions, tags and location-related information about a child may all be personal information.</p>

        <h3>2. Uploading a child’s photo or information</h3>
        <p>By uploading or adding information about a child, you confirm that you are the child’s parent/guardian or that you have appropriate permission or authority from a competent person to share that information within the family group.</p>

        <h3>3. Best interests of the child</h3>
        <p>Members should avoid content that could embarrass, endanger, exploit or unfairly expose a child. Do not add unnecessary sensitive details, and do not post precise location information about a child unless there is a clear family reason and it is safe to do so.</p>

        <h3>4. Family-group use only</h3>
        <p>Child media uploaded to Family Book is intended for authorised members of the relevant family group. Family Book does not obtain permission to use children’s photos for public advertising, marketing or sale merely because they were uploaded to the app.</p>

        <h3>5. Tagging</h3>
        <p>Family Book may allow a child or family member to be manually tagged in a Memory. Tags are used to organise family content and create notifications. Family Book does not use facial recognition to automatically identify people.</p>

        <h3>6. Removal requests</h3>
        <p>A parent, guardian or affected family member may ask the Family Book administrator or the member who uploaded the content to remove a child’s image or information. Requests should be handled promptly, especially where safety or privacy is involved.</p>

        <h3>7. Users under 18</h3>
        <p>A user under 18 should only use Family Book with parent or guardian approval. A minor user should not upload another child’s personal information unless a responsible adult has approved the sharing.</p>`
    },
    paia:{
      title:'Access to Information (PAIA) Notice',
      kicker:'PAIA • ACCESS TO RECORDS',
      html:`
        <p class="fb-legal-meta">Effective and last updated: ${UPDATED}</p>
        <p>The Promotion of Access to Information Act 2 of 2000 (“PAIA”) provides a framework for requesting access to records held by public and private bodies where the legal requirements are met.</p>

        <h3>1. Family Book records</h3>
        <p>Depending on the user and family group, Family Book may hold records relating to accounts, memberships, profiles, relationships, contact details, Memories and media, tags, Family Wall activity, calendar events, notifications, privacy settings, invitations and legal-consent records.</p>

        <h3>2. Requesting your own personal information</h3>
        <p>A member may request access to personal information about themselves and may request correction or deletion where provided for by POPIA. Family Book may need to verify identity before disclosing records.</p>

        <h3>3. Requests for other records</h3>
        <p>A request for records that concern another person or family member will not automatically be granted. Family Book must consider privacy, confidentiality and any grounds for refusal or protection that apply under South African law.</p>

        <h3>4. How to make a request</h3>
        <p>Submit the request to the Family Book administrator who manages or provided your access. The request should identify the record sought, explain the requester’s relationship to the record, provide enough information to verify identity, and provide preferred contact details for the response.</p>

        <h3>5. Formal PAIA process</h3>
        <p>Where a formal PAIA request is legally required, the prescribed PAIA forms and procedures published by the Information Regulator may apply. Any statutory fee, proof of identity or further information required by law may also apply.</p>

        <h3>6. Information Regulator</h3>
        <p>PAIA guidance, request forms and complaint procedures are available from the Information Regulator (South Africa). Public contact details currently include 010 023 5200 and enquiries@inforegulator.org.za.</p>

        <h3>7. Formal manual</h3>
        <p>Family Book is presently operated as a private beta family service. If its legal structure or operations require a formal PAIA section 51 manual, that manual should be completed using the Information Regulator’s prescribed guidance and published with the responsible party’s formal contact details.</p>`
    }
  };

  function closeLegal(){document.querySelector('.fb-legal-backdrop[data-fb-legal-doc]')?.remove()}
  function openLegal(key){
    const d=docs[key];if(!d)return;
    closeLegal();
    const wrap=document.createElement('div');
    wrap.className='fb-legal-backdrop';
    wrap.dataset.fbLegalDoc=key;
    wrap.innerHTML=`<section class="fb-legal-sheet" role="dialog" aria-modal="true" aria-labelledby="fbLegalTitle">
      <header class="fb-legal-head"><div><p>${esc(d.kicker)}</p><h2 id="fbLegalTitle">${esc(d.title)}</h2></div><button class="fb-legal-close" type="button" aria-label="Close">×</button></header>
      <div class="fb-legal-body">${d.html}</div>
    </section>`;
    wrap.addEventListener('click',ev=>{if(ev.target===wrap||ev.target.closest('.fb-legal-close'))closeLegal()});
    document.body.appendChild(wrap);
  }

  function footer(){
    if(document.querySelector('.fb-legal-footer'))return;
    const el=document.createElement('footer');
    el.className='fb-legal-footer';
    el.innerHTML=`<strong>Family Book • Private family service</strong><div class="fb-legal-footer-links">
      <button class="fb-legal-link" data-legal="privacy">Privacy & POPIA</button>
      <button class="fb-legal-link" data-legal="terms">Terms & Conditions</button>
      <button class="fb-legal-link" data-legal="children">Children & Media</button>
      <button class="fb-legal-link" data-legal="paia">PAIA Access Notice</button>
    </div>`;
    el.addEventListener('click',ev=>{const b=ev.target.closest('[data-legal]');if(b)openLegal(b.dataset.legal)});
    document.body.appendChild(el);
  }

  function removeConsent(){document.querySelector('.fb-consent-backdrop')?.remove()}
  function showConsent(){
    if(document.querySelector('.fb-consent-backdrop'))return;
    const wrap=document.createElement('div');
    wrap.className='fb-legal-backdrop fb-consent-backdrop';
    wrap.innerHTML=`<section class="fb-consent-card" role="dialog" aria-modal="true" aria-labelledby="fbConsentTitle">
      <div class="fb-consent-icon">✓</div>
      <h2 id="fbConsentTitle">Family Book privacy & family consent</h2>
      <p>Before continuing, please review the rules that protect family information and children’s photos.</p>
      <div class="fb-consent-links">
        <button class="fb-legal-link" data-legal="terms">Terms & Conditions</button>
        <button class="fb-legal-link" data-legal="privacy">Privacy & POPIA</button>
        <button class="fb-legal-link" data-legal="children">Children & Media Consent</button>
        <button class="fb-legal-link" data-legal="paia">PAIA Notice</button>
      </div>
      <label class="fb-consent-check">
        <input id="fbLegalConsentCheck" type="checkbox">
        <span>I agree to the Terms & Conditions and Privacy Policy. I confirm that I will only upload information or images of children where I am the parent/guardian or have appropriate authority or consent. If I am under 18, my parent or guardian has approved my use of Family Book.</span>
      </label>
      <div class="fb-consent-actions"><button id="fbLegalAccept" class="fb-consent-accept" type="button" disabled>Agree & continue</button></div>
      <div id="fbLegalConsentError" class="fb-consent-error" hidden></div>
      <div class="fb-consent-version">Policy version ${esc(POLICY_VERSION)}</div>
    </section>`;
    wrap.addEventListener('click',ev=>{const b=ev.target.closest('[data-legal]');if(b)openLegal(b.dataset.legal)});
    document.body.appendChild(wrap);
    const check=wrap.querySelector('#fbLegalConsentCheck');
    const btn=wrap.querySelector('#fbLegalAccept');
    check.addEventListener('change',()=>btn.disabled=!check.checked);
    btn.addEventListener('click',async()=>{
      if(!check.checked||!sb())return;
      const err=wrap.querySelector('#fbLegalConsentError');
      err.hidden=true;btn.disabled=true;btn.textContent='Saving acceptance…';
      try{
        const {error}=await sb().rpc('accept_family_book_legal_terms',{p_policy_version:POLICY_VERSION});
        if(error)throw error;
        removeConsent();
        window.dispatchEvent(new CustomEvent('familybook:legal-consent-accepted',{detail:{policyVersion:POLICY_VERSION}}));
      }catch(ex){
        err.textContent=ex?.message||'Could not save your acceptance. Please try again.';err.hidden=false;
        btn.disabled=!check.checked;btn.textContent='Agree & continue';
      }
    });
  }

  let checkedUser='';
  async function checkConsent(force=false){
    const me=auth();
    const userId=String(me.supabaseUserId||'');
    if(!userId||!sb()){checkedUser='';removeConsent();return}
    if(!force&&checkedUser===userId)return;
    checkedUser=userId;
    try{
      const {data,error}=await sb().rpc('get_my_legal_consent_status',{p_policy_version:POLICY_VERSION});
      if(error)throw error;
      if(data?.accepted)removeConsent();else showConsent();
    }catch(err){
      checkedUser='';
      console.warn('Family Book legal consent check:',err?.message||err);
    }
  }

  window.FB_LEGAL={version:POLICY_VERSION,open:openLegal,check:()=>checkConsent(true)};
  window.addEventListener('familybook:auth-ready',()=>checkConsent(true));
  window.addEventListener('familybook:auth-changed',()=>checkConsent(true));
  document.addEventListener('click',ev=>{const b=ev.target.closest?.('[data-fb-legal]');if(b)openLegal(b.dataset.fbLegal)});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{footer();setTimeout(()=>checkConsent(true),1800)});
  else{footer();setTimeout(()=>checkConsent(true),1800)}
  setInterval(()=>checkConsent(false),3000);
})();
