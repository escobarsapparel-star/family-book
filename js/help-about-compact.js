(()=>{
  const topics={
    getting:{title:'Getting started',icon:'home',intro:'Create your Family Book space or join the private family that already exists.',sections:[
      ['Create a family','The first family member can create the family and becomes part of that private Family Book space.'],
      ['Join a family','If your family already exists, use the invite link or Family Book invite code shared by a Family Admin.'],
      ['Your account and Member profile','Your sign-in account gives you access to Family Book. Your Member profile represents you inside the family and Family Tree.']
    ]},
    tree:{title:'Family Tree',icon:'git-fork',intro:'The Family Tree is the shared map of how everyone in your family is connected.',sections:[
      ['Build relationships','Connect parents, children, couples and siblings to build the family structure.'],
      ['Profiles can exist before logins','A relative can already have a Member profile in the tree even if they have not joined Family Book yet.'],
      ['Open family profiles','Use a person in the tree to open their profile and move through different family branches.']
    ]},
    invites:{title:'Invites & family access',icon:'ticket-plus',intro:'Family Admins can securely bring relatives into the correct family using an invite code or invite link.',sections:[
      ['Create an invite','Open Invite & family access and choose Create invite. The current invitation is valid for 7 days unless it is revoked earlier.'],
      ['Share the code or link','Send the relative either the generated Family Book code or the invite link.'],
      ['Join the correct person','After signing in or registering, the relative checks the invitation and can claim their existing Member profile if it genuinely belongs to them.'],
      ['No existing profile?','They can create a new Member profile and join the family without changing the rest of the Family Tree.'],
      ['Removing access','Removing account access does not delete that person from the Family Tree. Their family record remains intact.']
    ]},
    story:{title:'Wall, Memories & Calendar',icon:'images',intro:'These are the everyday parts of Family Book that let the whole family grow the family story together.',sections:[
      ['Family Wall','Share family updates. Tap or click a person’s round profile photo or name to open their profile.'],
      ['Memories','Save family photos and important moments so they become part of the family history rather than disappearing in a chat.'],
      ['Calendar','Keep birthdays, family events, outings and important dates in one shared place.']
    ]},
    profile:{title:'Profiles, photos & privacy',icon:'user-round',intro:'Each family member can have their own profile while keeping control of their personal information.',sections:[
      ['Profile and cover photos','Use the camera buttons on your profile to upload, take, view or remove photos. Cover photos can also be repositioned.'],
      ['Contact actions','Call, WhatsApp and Email appear only when the matching contact information exists and the member’s privacy settings allow it to be shown.'],
      ['Privacy','Members can control visibility of information such as their phone number, email address, birthday year and check-ins.']
    ]}
  };

  function styles(){
    if(document.querySelector('#fbHelpCompactStyles'))return;
    const s=document.createElement('style');
    s.id='fbHelpCompactStyles';
    s.textContent=`
      .settings-about-card.fb-help-ready .settings-card-icon{width:44px!important;height:44px!important;min-width:44px!important;border-radius:13px!important;background:var(--fb-shell-accent-soft,rgba(70,130,90,.14))!important;color:var(--accent)!important;display:grid!important;place-items:center!important;overflow:hidden!important}
      .settings-about-card.fb-help-ready .settings-card-icon svg{width:22px!important;height:22px!important;padding:0!important;background:transparent!important;color:currentColor!important}
      .fb-help-compact-intro{margin-top:14px;padding:15px 16px;border:1px solid var(--line);border-radius:14px;background:rgba(127,127,127,.035);color:var(--ink);line-height:1.55}
      .fb-help-compact-intro strong{color:var(--accent)}
      .fb-help-compact-title{margin:18px 0 10px;font-size:1rem;font-weight:900;color:var(--ink)}
      .fb-help-compact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .fb-help-compact-card{appearance:none;width:100%;display:grid;grid-template-columns:40px minmax(0,1fr) 22px;gap:10px;align-items:center;padding:13px;border:1px solid var(--line);border-radius:13px;background:rgba(127,127,127,.025);color:inherit;text-align:left;cursor:pointer}
      .fb-help-compact-card:hover{background:var(--fb-shell-accent-soft,rgba(70,130,90,.09))}
      .fb-help-compact-card>span:first-child{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:var(--fb-shell-accent-soft,rgba(70,130,90,.14));color:var(--accent)}
      .fb-help-compact-card svg{width:20px;height:20px}
      .fb-help-compact-card>div{min-width:0}
      .fb-help-compact-card strong{display:block;margin:1px 0 3px;font-size:.91rem;color:var(--ink)}
      .fb-help-compact-card small{display:block;color:var(--muted);font-size:.77rem;line-height:1.38}
      .fb-help-card-chevron{color:var(--muted)}
      .fb-help-compact-note{margin-top:14px;padding:12px 13px;border-radius:12px;background:var(--fb-shell-accent-soft,rgba(70,130,90,.12));color:var(--ink);font-size:.82rem;line-height:1.5}

      .fb-help-topic-page{position:fixed;inset:0;z-index:2500;background:rgba(0,0,0,.42);display:grid;place-items:center;padding:24px}
      .fb-help-topic-window{width:min(820px,100%);max-height:min(88vh,900px);overflow:auto;border:1px solid var(--line);border-radius:20px;background:var(--paper);color:var(--ink);box-shadow:0 24px 70px rgba(0,0,0,.36)}
      .fb-help-topic-head{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);background:var(--paper)}
      .fb-help-topic-back{width:44px;height:44px;border:0;border-radius:50%;background:var(--fb-shell-accent-soft,rgba(70,130,90,.14));color:var(--accent);display:grid;place-items:center;cursor:pointer}
      .fb-help-topic-back svg{width:22px;height:22px}
      .fb-help-topic-head p{margin:0 0 2px;font-size:.72rem;font-weight:900;letter-spacing:.08em;color:var(--muted)}
      .fb-help-topic-head h2{margin:0;font-size:1.28rem;line-height:1.15}
      .fb-help-topic-body{padding:18px}
      .fb-help-topic-lead{margin:0 0 16px;padding:15px 16px;border-radius:14px;background:var(--fb-shell-accent-soft,rgba(70,130,90,.1));line-height:1.55}
      .fb-help-topic-sections{display:grid;gap:10px}
      .fb-help-topic-section{padding:14px 15px;border:1px solid var(--line);border-radius:14px;background:rgba(127,127,127,.025)}
      .fb-help-topic-section h3{margin:0 0 5px;font-size:.95rem}
      .fb-help-topic-section p{margin:0;color:var(--muted);font-size:.86rem;line-height:1.5}
      @media(max-width:759px){
        .fb-help-compact-grid{grid-template-columns:1fr}.fb-help-compact-intro{font-size:.88rem}.fb-help-compact-card{padding:11px}
        .fb-help-topic-page{padding:0;background:var(--paper);place-items:stretch}
        .fb-help-topic-window{width:100%;height:100%;max-height:none;border:0;border-radius:0;box-shadow:none}
        .fb-help-topic-head{padding:12px 14px;grid-template-columns:40px minmax(0,1fr)}
        .fb-help-topic-back{width:40px;height:40px}
        .fb-help-topic-head h2{font-size:1.12rem}
        .fb-help-topic-body{padding:14px}
      }
    `;
    document.head.appendChild(s);
  }

  function closeTopic(){
    document.querySelector('.fb-help-topic-page')?.remove();
    document.body.classList.remove('fb-help-topic-open');
    document.body.style.overflow='';
  }

  function openTopic(key){
    const t=topics[key];if(!t)return;
    closeTopic();
    const page=document.createElement('section');
    page.className='fb-help-topic-page';
    page.setAttribute('role','dialog');page.setAttribute('aria-modal','true');page.setAttribute('aria-label',t.title);
    page.innerHTML=`<div class="fb-help-topic-window">
      <header class="fb-help-topic-head"><button type="button" class="fb-help-topic-back" aria-label="Back to Help"><i data-lucide="arrow-left"></i></button><div><p>HELP & ABOUT</p><h2>${t.title}</h2></div></header>
      <div class="fb-help-topic-body"><p class="fb-help-topic-lead">${t.intro}</p><div class="fb-help-topic-sections">${t.sections.map(([h,p])=>`<section class="fb-help-topic-section"><h3>${h}</h3><p>${p}</p></section>`).join('')}</div></div>
    </div>`;
    document.body.appendChild(page);
    document.body.classList.add('fb-help-topic-open');
    document.body.style.overflow='hidden';
    page.querySelector('.fb-help-topic-back')?.addEventListener('click',closeTopic);
    page.addEventListener('click',ev=>{if(ev.target===page&&matchMedia('(min-width:760px)').matches)closeTopic()});
    window.lucide?.createIcons?.();
  }

  function compact(){
    const card=document.querySelector('.settings-about-card.fb-help-ready');
    if(!card||card.dataset.compactHelp==='2')return;
    card.dataset.compactHelp='2';
    card.querySelectorAll(':scope > .fb-help-intro,:scope > .fb-help-title,:scope > .fb-help-grid,:scope > .fb-help-note,:scope > .fb-faq-list,:scope > .fb-help-compact-intro,:scope > .fb-help-compact-title,:scope > .fb-help-compact-grid,:scope > .fb-help-topic-list,:scope > .fb-help-compact-note').forEach(n=>n.remove());

    const head=card.querySelector('.settings-card-head');
    if(head){
      const icon=head.querySelector('.settings-card-icon');
      if(icon)icon.innerHTML='<i data-lucide="circle-help"></i>';
      const desc=head.querySelector('div>span');
      if(desc)desc.textContent='Choose a topic to open its Family Book guide.';
    }

    const html=`
      <div class="fb-help-compact-intro"><strong>Family Book</strong> is a private digital home for one family — connecting relatives, the Family Tree, Memories, profiles, family updates and important dates in one shared place.</div>
      <h3 class="fb-help-compact-title">Help topics</h3>
      <div class="fb-help-compact-grid">
        <button type="button" class="fb-help-compact-card" data-help-topic="getting"><span><i data-lucide="home"></i></span><div><strong>Getting started</strong><small>Create or join your family</small></div><i class="fb-help-card-chevron" data-lucide="chevron-right"></i></button>
        <button type="button" class="fb-help-compact-card" data-help-topic="tree"><span><i data-lucide="git-fork"></i></span><div><strong>Family Tree</strong><small>People, relationships and branches</small></div><i class="fb-help-card-chevron" data-lucide="chevron-right"></i></button>
        <button type="button" class="fb-help-compact-card" data-help-topic="invites"><span><i data-lucide="ticket-plus"></i></span><div><strong>Invites & family access</strong><small>Codes, links and claiming profiles</small></div><i class="fb-help-card-chevron" data-lucide="chevron-right"></i></button>
        <button type="button" class="fb-help-compact-card" data-help-topic="story"><span><i data-lucide="images"></i></span><div><strong>Wall, Memories & Calendar</strong><small>Grow and preserve the family story</small></div><i class="fb-help-card-chevron" data-lucide="chevron-right"></i></button>
        <button type="button" class="fb-help-compact-card" data-help-topic="profile"><span><i data-lucide="user-round"></i></span><div><strong>Profiles, photos & privacy</strong><small>Your profile and personal information</small></div><i class="fb-help-card-chevron" data-lucide="chevron-right"></i></button>
      </div>
      <div class="fb-help-compact-note"><b>Tip:</b> tap any topic above. It opens as its own Help page, so the main Help & About screen stays simple.</div>`;

    const version=card.querySelector('.settings-version-row');
    if(version)version.insertAdjacentHTML('beforebegin',html);else card.insertAdjacentHTML('beforeend',html);
    card.querySelectorAll('[data-help-topic]').forEach(btn=>btn.addEventListener('click',()=>openTopic(btn.dataset.helpTopic)));
    window.lucide?.createIcons?.();
  }

  styles();
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeTopic()});
  const run=()=>setTimeout(compact,0);
  window.addEventListener('load',run);
  document.addEventListener('click',run);
  window.addEventListener('familybook:family-data-updated',run);
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();