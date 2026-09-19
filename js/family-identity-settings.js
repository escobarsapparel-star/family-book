(()=>{
  if(window.__fbFamilyIdentitySettings)return;
  window.__fbFamilyIdentitySettings=true;

  const e=(v="")=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const auth=()=>window.FB_AUTH?.get?.()||{};
  const sb=()=>window.FB_SUPABASE?.client;

  function shortFamilyName(value){
    return String(value||"").trim().replace(/(?:\s+Family)+$/i,"").replace(/^The\s+/i,"").trim();
  }

  function setMessage(el,text,type=""){
    if(!el)return;
    el.textContent=text||"";
    el.dataset.type=type;
    el.hidden=!text;
  }

  function panelHtml(){
    const u=auth();
    const family=window.familyLabel?.()||u.family||"Family";
    return `<div class="family-identity-settings" data-family-identity-settings>
      <div class="family-identity-block">
        <div class="family-identity-copy">
          <span class="family-identity-icon"><i data-lucide="badge-family"></i></span>
          <div><strong>Family identity</strong><small>The family name is a shared display name. It does not decide who is the head of the Family Tree.</small></div>
        </div>
        <form id="familyRenameForm" class="family-identity-form">
          <label for="familyIdentityName"><span>Family name</span><input id="familyIdentityName" maxlength="70" autocomplete="off" value="${e(shortFamilyName(family))}" placeholder="e.g. Davids"></label>
          <button type="submit" class="secondary" id="familyRenameSave"><i data-lucide="save"></i>Save name</button>
        </form>
        <div class="family-identity-message" id="familyRenameMessage" hidden></div>
        <p class="family-identity-hint">Family Book automatically displays the name with “Family” at the end.</p>
      </div>

      <div class="family-identity-divider"></div>

      <div class="family-identity-block">
        <div class="family-identity-copy">
          <span class="family-identity-icon"><i data-lucide="shield-check"></i></span>
          <div><strong>Change Family Admin</strong><small>Transfer your own admin responsibility to another connected family account.</small></div>
        </div>
        <div class="family-admin-transfer-form">
          <label for="familyAdminTransferSelect"><span>New Family Admin</span><select id="familyAdminTransferSelect"><option value="">Loading connected accounts…</option></select></label>
          <button type="button" class="secondary" id="familyAdminTransferButton" disabled><i data-lucide="arrow-right-left"></i>Transfer my admin role</button>
        </div>
        <div class="family-identity-message" id="familyAdminTransferMessage" hidden></div>
        <p class="family-identity-hint"><i data-lucide="info"></i>You will become an Adult Member. The selected account becomes a Family Admin. Other existing admins stay admins, and the Family Tree is not changed.</p>
      </div>
    </div>`;
  }

  async function loadTransferCandidates(){
    const select=document.querySelector("#familyAdminTransferSelect");
    const button=document.querySelector("#familyAdminTransferButton");
    if(!select||!button)return;
    const u=auth();
    try{
      const {data:memberships,error}=await sb().from("family_memberships")
        .select("id,person_id,role,status,joined_at")
        .eq("family_id",u.familyId)
        .eq("status","active")
        .neq("id",u.membershipId)
        .order("joined_at",{ascending:true});
      if(error)throw error;

      let people=[];
      try{people=window.FB_FAMILY_DATA?.getPeople?.()||[]}catch(_){}
      const needed=(memberships||[]).map(m=>m.person_id).filter(Boolean);
      const known=new Set(people.map(p=>String(p.id)));
      const missing=needed.filter(id=>!known.has(String(id)));
      if(missing.length){
        const res=await sb().from("persons").select("id,first_name,surname").in("id",missing);
        if(res.error)throw res.error;
        people=people.concat((res.data||[]).map(p=>({id:p.id,name:[p.first_name,p.surname].filter(Boolean).join(" ")})));
      }
      const byId=Object.fromEntries(people.map(p=>[String(p.id),p]));
      const rows=(memberships||[]).map(m=>{
        const p=byId[String(m.person_id)]||{};
        const name=String(p.name||[p.first_name,p.surname].filter(Boolean).join(" ")||"Family member").trim();
        return {...m,name};
      }).sort((a,b)=>a.name.localeCompare(b.name));

      select.innerHTML='<option value="">Choose a connected family member</option>'+rows.map(r=>`<option value="${e(r.id)}">${e(r.name)}${r.role==="admin"?" — Family Admin":" — Adult Member"}</option>`).join("");
      if(!rows.length){
        select.innerHTML='<option value="">No other connected accounts available</option>';
        select.disabled=true;
      }
      select.onchange=()=>{button.disabled=!select.value};
      button.dataset.candidates=JSON.stringify(rows.map(r=>({id:r.id,name:r.name,role:r.role})));
    }catch(err){
      select.innerHTML='<option value="">Could not load connected accounts</option>';
      select.disabled=true;
      setMessage(document.querySelector("#familyAdminTransferMessage"),err?.message||"Could not load family accounts.","error");
    }
  }

  function bindRename(){
    const form=document.querySelector("#familyRenameForm");
    if(!form)return;
    form.onsubmit=async ev=>{
      ev.preventDefault();
      const input=document.querySelector("#familyIdentityName");
      const btn=document.querySelector("#familyRenameSave");
      const msg=document.querySelector("#familyRenameMessage");
      const value=String(input?.value||"").trim();
      if(value.length<2){setMessage(msg,"Enter a family name with at least 2 characters.","error");return}
      const old=btn?.innerHTML||"";
      try{
        setMessage(msg,"");
        if(btn){btn.disabled=true;btn.textContent="Saving…"}
        const {data,error}=await sb().rpc("rename_current_family",{p_family_name:value});
        if(error)throw error;
        await window.FB_AUTH?.refresh?.();
        window.dispatchEvent(new CustomEvent("familybook:family-identity-updated",{detail:data||{}}));
        window.go?.("settings",{replaceHistory:true});
      }catch(err){
        setMessage(msg,err?.message||"Could not rename the family.","error");
        if(btn){btn.disabled=false;btn.innerHTML=old;window.icons?.()}
      }
    };
  }

  function bindTransfer(){
    const button=document.querySelector("#familyAdminTransferButton");
    const select=document.querySelector("#familyAdminTransferSelect");
    if(!button||!select)return;
    button.onclick=async()=>{
      if(!select.value)return;
      let candidates=[];
      try{candidates=JSON.parse(button.dataset.candidates||"[]")}catch(_){}
      const target=candidates.find(x=>x.id===select.value);
      const name=target?.name||"this family member";
      if(!confirm(`Transfer your Family Admin role to ${name}?\n\nYou will become an Adult Member. Family Tree positions, relationships, memories and photos will not change.`))return;
      const msg=document.querySelector("#familyAdminTransferMessage");
      const old=button.innerHTML;
      try{
        setMessage(msg,"");
        button.disabled=true;
        button.textContent="Transferring…";
        const {data,error}=await sb().rpc("transfer_current_family_admin",{p_target_membership_id:select.value});
        if(error)throw error;
        await window.FB_AUTH?.refresh?.();
        alert(`${data?.new_admin_name||name} is now a Family Admin. Your account is now an Adult Member.`);
        window.go?.("settings",{replaceHistory:true});
      }catch(err){
        setMessage(msg,err?.message||"Could not transfer the Family Admin role.","error");
        button.disabled=false;
        button.innerHTML=old;
        window.icons?.();
      }
    };
  }

  async function install(){
    const card=document.querySelector(".settings-family-card");
    if(!card||card.querySelector("[data-family-identity-settings]"))return false;
    const u=auth();
    if(String(u.role||"member").toLowerCase()!=="admin")return false;
    const head=card.querySelector(".settings-card-head");
    const wrap=document.createElement("div");
    wrap.innerHTML=panelHtml();
    const panel=wrap.firstElementChild;
    if(head)head.insertAdjacentElement("afterend",panel);else card.prepend(panel);
    bindRename();
    bindTransfer();
    await loadTransferCandidates();
    window.icons?.();
    return true;
  }

  const root=document.getElementById("app")||document.body;
  new MutationObserver(()=>install()).observe(root,{childList:true,subtree:true});
  install();
})();