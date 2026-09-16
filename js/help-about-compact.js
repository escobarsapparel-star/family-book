(()=>{
  function styles(){
    if(document.querySelector('#fbHelpCompactStyles'))return;
    const s=document.createElement('style');
    s.id='fbHelpCompactStyles';
    s.textContent=`
      .fb-help-compact-intro{margin-top:14px;padding:15px 16px;border:1px solid var(--line);border-radius:14px;background:rgba(127,127,127,.035);color:var(--ink);line-height:1.55}
      .fb-help-compact-intro strong{color:var(--accent)}
      .fb-help-compact-title{margin:18px 0 10px;font-size:1rem;font-weight:900;color:var(--ink)}
      .fb-help-compact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .fb-help-compact-card{display:grid;grid-template-columns:40px minmax(0,1fr);gap:10px;align-items:start;padding:13px;border:1px solid var(--line);border-radius:13px;background:rgba(127,127,127,.025)}
      .fb-help-compact-card>span{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:var(--fb-shell-accent-soft,rgba(70,130,90,.14));color:var(--accent)}
      .fb-help-compact-card svg{width:20px;height:20px}
      .fb-help-compact-card strong{display:block;margin:1px 0 4px;font-size:.91rem;color:var(--ink)}
      .fb-help-compact-card small{display:block;color:var(--muted);font-size:.77rem;line-height:1.42}
      .fb-help-topic-list{display:grid;gap:8px}
      .fb-help-topic-list details{border:1px solid var(--line);border-radius:13px;background:rgba(127,127,127,.025);overflow:hidden}
      .fb-help-topic-list summary{list-style:none;cursor:pointer;padding:13px 42px 13px 14px;font-weight:850;position:relative;color:var(--ink)}
      .fb-help-topic-list summary::-webkit-details-marker{display:none}
      .fb-help-topic-list summary:after{content:'+';position:absolute;right:14px;top:50%;transform:translateY(-50%);width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--fb-shell-accent-soft,rgba(70,130,90,.14));color:var(--accent);font-weight:900}
      .fb-help-topic-list details[open] summary:after{content:'−'}
      .fb-help-topic-copy{padding:0 14px 14px;color:var(--muted);font-size:.84rem;line-height:1.55}
      .fb-help-topic-copy b{color:var(--ink)}
      .fb-help-compact-note{margin-top:14px;padding:12px 13px;border-radius:12px;background:var(--fb-shell-accent-soft,rgba(70,130,90,.12));color:var(--ink);font-size:.82rem;line-height:1.5}
      @media(max-width:759px){.fb-help-compact-grid{grid-template-columns:1fr}.fb-help-compact-intro{font-size:.88rem}.fb-help-compact-card{padding:11px}}
    `;
    document.head.appendChild(s);
  }

  function compact(){
    const card=document.querySelector('.settings-about-card.fb-help-ready');
    if(!card||card.dataset.compactHelp==='1')return;
    card.dataset.compactHelp='1';

    card.querySelectorAll(':scope > .fb-help-intro,:scope > .fb-help-title,:scope > .fb-help-grid,:scope > .fb-help-note,:scope > .fb-faq-list').forEach(n=>n.remove());

    const head=card.querySelector('.settings-card-head');
    if(head){
      const desc=head.querySelector('div>span');
      if(desc)desc.textContent='A quick guide to what Family Book is and how your family uses it.';
    }

    const html=`
      <div class="fb-help-compact-intro"><strong>Family Book</strong> is a private digital home for one family — a place to connect relatives, build the Family Tree, preserve photos and memories, share updates and keep important family dates together.</div>

      <h3 class="fb-help-compact-title">Start here</h3>
      <div class="fb-help-compact-grid">
        <div class="fb-help-compact-card"><span><i data-lucide="home"></i></span><div><strong>Create or join a family</strong><small>Create your family once, or join an existing family with a secure invite code or invite link.</small></div></div>
        <div class="fb-help-compact-card"><span><i data-lucide="git-fork"></i></span><div><strong>Build the Family Tree</strong><small>Connect parents, children, couples and siblings so everyone can see how the family is related.</small></div></div>
        <div class="fb-help-compact-card"><span><i data-lucide="ticket-plus"></i></span><div><strong>Invite relatives</strong><small>Family Admins can create a 7-day invite and share the code or link. A relative can claim their existing profile or create a new one.</small></div></div>
        <div class="fb-help-compact-card"><span><i data-lucide="images"></i></span><div><strong>Grow the family story</strong><small>Use the Family Wall, Memories, profiles and Calendar to keep everyday updates, photos and important dates together.</small></div></div>
      </div>

      <h3 class="fb-help-compact-title">Need help with something?</h3>
      <div class="fb-help-topic-list">
        <details><summary>Inviting or joining a family</summary><div class="fb-help-topic-copy"><b>Admins:</b> open Invite & family access, create an invite, then share the code or link. <b>Relatives:</b> sign in or register, choose Join a family, enter/check the invitation, then claim the correct existing profile or create a new Member profile.</div></details>
        <details><summary>Family Tree and Member profiles</summary><div class="fb-help-topic-copy">A person can already exist in the Family Tree before they have a login. When they join later, their account can be linked to that existing Member profile so you do not create duplicate people.</div></details>
        <details><summary>Photos, contact buttons and privacy</summary><div class="fb-help-topic-copy">Use the camera icons on a profile to manage profile and cover photos. Call, WhatsApp and Email only appear when that member has the matching contact information saved and their privacy settings allow it to be shown.</div></details>
      </div>

      <div class="fb-help-compact-note"><b>In short:</b> the Family Tree shows <i>who everyone is</i>, profiles show <i>who each person is</i>, Memories preserve <i>what happened</i>, the Calendar remembers <i>when</i>, and the Family Wall keeps the family connected day to day.</div>`;

    const version=card.querySelector('.settings-version-row');
    if(version)version.insertAdjacentHTML('beforebegin',html);
    else card.insertAdjacentHTML('beforeend',html);
    window.lucide?.createIcons?.();
  }

  styles();
  const run=()=>setTimeout(compact,0);
  window.addEventListener('load',run);
  document.addEventListener('click',run);
  window.addEventListener('familybook:family-data-updated',run);
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});
})();