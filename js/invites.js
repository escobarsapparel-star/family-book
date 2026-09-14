(function(){
  const e=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const current=()=>window.FB_AUTH?.get?.()||{};
  const sb=()=>window.FB_SUPABASE?.client;
  const lastInviteKey=()=>`fb_backend_last_invite_${current().familyId||"family"}`;

  function roleLabel(v){return v==="admin"?"Family Admin":"Adult Member"}

  function pageShell(){
    const u=current(),admin=u.role==="admin";
    return `<section class="family-access-page">
      <div class="family-access-head">
        <button class="back-link" data-r="settings"><i data-lucide="arrow-left"></i>Settings</button>
        <p class="eyebrow">${e((u.family||"FAMILY").toUpperCase())}</p>
        <h1>Invite & family access</h1>
        <p>${admin?"Invite relatives and manage signed-in accounts for this family.":"View the accounts connected to your family."}</p>
      </div>

      ${admin?`<section class="family-access-card">
        <div class="family-access-card-head"><span><i data-lucide="ticket-plus"></i></span><div><h2>Invite a relative</h2><p>Create a secure 7-day invitation. The plain code is shown only when it is created.</p></div></div>
        <button type="button" class="primary" id="createBackendInvite"><i data-lucide="plus"></i>Create invite</button>
        <div id="backendInviteResult"></div>
      </section>`:""}

      <section class="family-access-card">
        <div class="family-access-card-head"><span><i data-lucide="users-round"></i></span><div><h2>Connected accounts</h2><p>Removing access keeps the Person profile and Family Tree data.</p></div></div>
        <div id="backendAccountList" class="family-account-list"><div class="family-access-loading">Loading accounts…</div></div>
      </section>

      ${admin?`<section class="family-access-card">
        <div class="family-access-card-head"><span><i data-lucide="tickets"></i></span><div><h2>Invitations</h2><p>Active, expired and revoked invitations.</p></div></div>
        <div id="backendInviteList" class="family-invite-history"><div class="family-access-loading">Loading invitations…</div></div>
      </section>`:""}
    </section>`;
  }

  function inviteLink(code){
    const u=new URL(location.href);u.search="";u.hash="";u.searchParams.set("familybookInvite",code);return u.toString();
  }
  function formatWhen(v){
    if(!v)return "";
    try{return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(v))}
    catch(_){return v}
  }
  function lastPlainInvite(){try{return JSON.parse(sessionStorage.getItem(lastInviteKey())||"null")}catch(_){return null}}
  function saveLastPlainInvite(v){v?sessionStorage.setItem(lastInviteKey(),JSON.stringify(v)):sessionStorage.removeItem(lastInviteKey())}

  async function renderAccounts(){
    const mount=document.querySelector("#backendAccountList");if(!mount)return;
    const u=current();
    try{
      const {data:memberships,error}=await sb().from("family_memberships")
        .select("id,user_id,person_id,role,status,joined_at")
        .eq("family_id",u.familyId)
        .eq("status","active")
        .order("joined_at",{ascending:true});
      if(error)throw error;

      const ids=(memberships||[]).map(x=>x.person_id);
      let people=[];
      if(ids.length){
        const res=await sb().from("persons").select("id,first_name,surname,photo_path").in("id",ids);
        if(res.error)throw res.error;
        people=res.data||[];
      }

      const byId=Object.fromEntries(people.map(p=>[p.id,p]));
      mount.innerHTML=(memberships||[]).map(m=>{
        const p=byId[m.person_id]||{};
        const name=[p.first_name,p.surname].filter(Boolean).join(" ")||"Family member";
        const own=m.id===u.membershipId;
        return `<article class="family-account-row">
          <span class="family-account-avatar">${p.photo_path?`<img src="${e(p.photo_path)}" alt="">`:e(((p.first_name||"F")[0]+((p.surname||"")[0]||"")).toUpperCase())}</span>
          <div><strong>${e(name)}</strong><small>${own?"This account":"Connected family account"}</small></div>
          ${u.role==="admin"&&!own?`<div class="family-account-controls">
            <select data-backend-role="${e(m.id)}"><option value="member" ${m.role!=="admin"?"selected":""}>Adult Member</option><option value="admin" ${m.role==="admin"?"selected":""}>Family Admin</option></select>
            <button type="button" class="account-remove-access" data-backend-remove="${e(m.id)}"><i data-lucide="user-x"></i>Remove access</button>
          </div>`:`<span class="account-role-badge ${m.role==="admin"?"admin":""}">${roleLabel(m.role)}</span>`}
        </article>`;
      }).join("")||`<div class="family-access-empty">No connected accounts found.</div>`;

      mount.querySelectorAll("[data-backend-role]").forEach(sel=>sel.onchange=async()=>{
        const previous=sel.value==="admin"?"member":"admin";
        try{
          const {error}=await sb().rpc("set_family_member_role",{p_membership_id:sel.dataset.backendRole,p_role:sel.value});
          if(error)throw error;
        }catch(ex){
          alert(ex.message||"Could not change this role.");
          sel.value=previous;
        }
      });

      mount.querySelectorAll("[data-backend-remove]").forEach(btn=>btn.onclick=async()=>{
        const membership=memberships.find(x=>x.id===btn.dataset.backendRemove);
        const p=byId[membership?.person_id]||{};
        const name=[p.first_name,p.surname].filter(Boolean).join(" ")||"this family member";
        if(!confirm(`Remove Family Book access for ${name}?\n\nTheir Member profile and family data will stay intact and become unclaimed.`))return;
        try{
          const {error}=await sb().rpc("remove_family_access",{p_membership_id:btn.dataset.backendRemove});
          if(error)throw error;
          await renderAccounts();
        }catch(ex){
          alert(ex.message||"Could not remove family access.");
        }
      });

      window.icons?.();
    }catch(ex){
      mount.innerHTML=`<div class="family-access-error">${e(ex.message||"Could not load connected accounts.")}</div>`;
    }
  }

  async function renderInvites(){
    const mount=document.querySelector("#backendInviteList");if(!mount)return;
    const u=current();
    try{
      const {data,error}=await sb().from("family_invites")
        .select("id,expires_at,revoked_at,use_count,max_uses,created_at")
        .eq("family_id",u.familyId)
        .order("created_at",{ascending:false});
      if(error)throw error;

      mount.innerHTML=(data||[]).map(inv=>{
        const expired=new Date(inv.expires_at)<=new Date();
        const status=inv.revoked_at?"Revoked":expired?"Expired":"Active";
        return `<article class="family-invite-history-row">
          <div><strong>${status}</strong><small>Created ${e(formatWhen(inv.created_at))} · ${Number(inv.use_count||0)} / ${Number(inv.max_uses||0)} uses</small></div>
          <span>${e(formatWhen(inv.expires_at))}</span>
          ${!inv.revoked_at&&!expired?`<button type="button" data-revoke-backend-invite="${e(inv.id)}">Revoke</button>`:""}
        </article>`;
      }).join("")||`<div class="family-access-empty">No invitations created yet.</div>`;

      mount.querySelectorAll("[data-revoke-backend-invite]").forEach(btn=>btn.onclick=async()=>{
        if(!confirm("Revoke this invitation?"))return;
        try{
          const {error}=await sb().rpc("revoke_family_invite",{p_invite_id:btn.dataset.revokeBackendInvite});
          if(error)throw error;
          await renderInvites();
        }catch(ex){
          alert(ex.message||"Could not revoke the invitation.");
        }
      });
    }catch(ex){
      mount.innerHTML=`<div class="family-access-error">${e(ex.message||"Could not load invitations.")}</div>`;
    }
  }

  function showLastInvite(){
    const mount=document.querySelector("#backendInviteResult");if(!mount)return;
    const row=lastPlainInvite();
    if(!row){mount.innerHTML="";return}
    mount.innerHTML=`<div class="backend-created-invite">
      <p class="eyebrow">INVITE READY</p>
      <strong>${e(row.code)}</strong>
      <small>Expires ${e(formatWhen(row.expires_at))}</small>
      <div><button type="button" class="secondary" id="copyBackendCode"><i data-lucide="copy"></i>Copy code</button><button type="button" class="secondary" id="copyBackendLink"><i data-lucide="link"></i>Copy invite link</button></div>
      <p>Keep this code somewhere safe if you need it again. Supabase stores only the secure hash.</p>
    </div>`;
    document.querySelector("#copyBackendCode").onclick=()=>navigator.clipboard?.writeText(row.code);
    document.querySelector("#copyBackendLink").onclick=()=>navigator.clipboard?.writeText(inviteLink(row.code));
    window.icons?.();
  }

  async function bindPage(){
    const u=current();
    showLastInvite();

    document.querySelector("#createBackendInvite")?.addEventListener("click",async ev=>{
      const btn=ev.currentTarget;btn.disabled=true;btn.textContent="Creating…";
      try{
        const {data,error}=await sb().rpc("create_family_invite",{p_expires_hours:168,p_max_uses:10});
        if(error)throw error;
        const row=Array.isArray(data)?data[0]:data;
        saveLastPlainInvite(row?{id:row.invite_id,code:row.invite_code,expires_at:row.expires_at}:null);
        showLastInvite();
        await renderInvites();
      }catch(ex){
        alert(ex.message||"Could not create an invite.");
      }finally{
        btn.disabled=false;btn.innerHTML='<i data-lucide="plus"></i>Create invite';window.icons?.();
      }
    });

    await Promise.all([renderAccounts(),u.role==="admin"?renderInvites():Promise.resolve()]);
    window.icons?.();
  }

  function joinCodeFromUrl(){return new URLSearchParams(location.search).get("familybookInvite")||""}
  function ensureCurrentAccount(){}
  function syncCurrentAccount(){return true}

  window.FB_INVITES={pageShell,bindPage,joinCodeFromUrl,ensureCurrentAccount,syncCurrentAccount,roleLabel};
})();
