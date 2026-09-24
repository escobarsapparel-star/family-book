(function(){
  const PENDING_INVITE="fb_supabase_pending_invite";
  let current=null,session=null,ready=false;
  const client=()=>window.FB_SUPABASE?.client;
  const e=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const slug=v=>String(v||"family").toLowerCase().replace(/[^a-z0-9]+/g,"_");

  function metadataName(user){
    const m=user?.user_metadata||{};
    return String(m.full_name||m.name||[m.first_name,m.last_name].filter(Boolean).join(" ")||user?.email?.split("@")[0]||"Family member").trim();
  }
  function splitName(v){
    const p=String(v||"").trim().split(/\s+/).filter(Boolean);
    return {first:p.shift()||"",last:p.join(" ")};
  }
  function authRedirectUrl(){
    if(location.protocol==="file:")return null;
    const u=new URL(location.href);u.search="";u.hash="";return u.toString();
  }
  function setPendingInvite(code){
    const clean=String(code||"").trim();
    clean?sessionStorage.setItem(PENDING_INVITE,clean):sessionStorage.removeItem(PENDING_INVITE);
  }
  function pendingInvite(){
    return sessionStorage.getItem(PENDING_INVITE)||new URLSearchParams(location.search).get("familybookInvite")||"";
  }
  function clearInviteFromUrl(){
    const params=new URLSearchParams(location.search);
    if(!params.has("familybookInvite"))return;
    const u=new URL(location.href);
    u.searchParams.delete("familybookInvite");
    history.replaceState({},document.title,u.pathname+(u.search||"")+u.hash);
  }
  function normalizeFamily(v){
    let raw=String(v||"").trim().replace(/^The\s+/i,"").replace(/(?:\s+Family)+$/i,"").trim();
    return raw?`${raw} Family`:"Family";
  }

  async function loadContext(){
    if(!session?.user){current=null;return null}
    const user=session.user;
    const {data,error}=await client().rpc("get_current_family_context");
    if(error)throw new Error(error.message||"Could not load your Family Book membership.");

    if(!data?.has_membership){
      current={backend:"supabase",needsSetup:true,supabaseUserId:user.id,email:user.email||"",name:metadataName(user),role:"member",memberId:"",family:"",familyId:"",membershipId:""};
      return current;
    }

    const name=[data.first_name,data.surname].filter(Boolean).join(" ").trim()||metadataName(user);
    current={
      backend:"supabase",needsSetup:false,supabaseUserId:user.id,email:user.email||"",name,
      family:data.family_name||"Family",familyId:data.family_id||"",memberId:data.person_id||"",
      membershipId:data.membership_id||"",role:data.role||"member",photo:data.photo_path||""
    };
    return current;
  }

  async function refresh(){
    if(!client())throw new Error("Supabase is not configured.");
    const {data,error}=await client().auth.getSession();
    if(error)throw error;
    session=data.session||null;
    await loadContext();
    ready=true;
    return current;
  }

  async function init(){
    if(ready)return current;
    const invite=new URLSearchParams(location.search).get("familybookInvite");
    if(invite)setPendingInvite(invite);
    await refresh();

    client().auth.onAuthStateChange((event,nextSession)=>{
      session=nextSession||null;
      setTimeout(async()=>{
        try{
          await loadContext();
          window.FB_APP_AUTH_CHANGED?.(event);
        }catch(err){
          console.error(err);
          window.FB_APP_AUTH_ERROR?.(err);
        }
      },0);
    });

    return current;
  }

  async function signInWithPassword(email,password){
    const {data,error}=await client().auth.signInWithPassword({
      email:String(email||"").trim(),
      password:String(password||"")
    });
    if(error)throw error;
    session=data.session||null;
    await loadContext();
    return current;
  }

  async function signUp({first,last,email,password}){
    const redirect=authRedirectUrl()||window.FB_SUPABASE_CONFIG?.productionUrl;
    const fullName=[first,last].filter(Boolean).join(" ").trim();
    const {data,error}=await client().auth.signUp({
      email:String(email||"").trim(),
      password:String(password||""),
      options:{
        emailRedirectTo:redirect,
        data:{first_name:String(first||"").trim(),last_name:String(last||"").trim(),full_name:fullName}
      }
    });
    if(error)throw error;
    session=data.session||null;
    if(session)await loadContext();
    return {current,needsConfirmation:!data.session,email:data.user?.email||email};
  }

  async function signInWithGoogle(){
    const redirect=authRedirectUrl();
    if(!redirect)throw new Error("Google sign-in cannot run from a file:// address. Open Family Book with VS Code Live Server first.");
    const invite=pendingInvite();
    if(invite)setPendingInvite(invite);
    const {error}=await client().auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo:redirect,queryParams:{prompt:"select_account"}}
    });
    if(error)throw error;
  }

  async function createFamily({familyName,first,last}){
    const {data,error}=await client().rpc("create_family_for_current_user",{
      p_family_name:normalizeFamily(familyName),
      p_first_name:String(first||"").trim(),
      p_surname:String(last||"").trim()||null
    });
    if(error)throw error;
    await refresh();
    setPendingInvite("");
    clearInviteFromUrl();
    return data;
  }

  async function previewInvite(code){
    const clean=String(code||"").trim();
    if(!clean)throw new Error("Enter the family invite code.");
    setPendingInvite(clean);
    const {data,error}=await client().rpc("preview_family_invite",{p_code:clean});
    if(error)throw error;
    return data;
  }

  async function joinFamily({code,claimPersonId=null,first=null,last=null}){
    const {data,error}=await client().rpc("join_family_with_invite",{
      p_code:String(code||"").trim(),
      p_claim_person_id:claimPersonId||null,
      p_first_name:first||null,
      p_surname:last||null
    });
    if(error)throw error;
    await refresh();
    setPendingInvite("");
    clearInviteFromUrl();
    return data;
  }

  async function logout(){
    const userId=session?.user?.id||current?.supabaseUserId||"";
    try{await client()?.auth.signOut({scope:"local"})}
    finally{
      try{await window.FB_OFFLINE_CACHE?.clearUser?.(userId)}catch(_){}
      current=null;
      session=null;
      sessionStorage.removeItem(PENDING_INVITE);
    }
  }

  function update(patch){
    if(!current)return null;
    current={...current,...patch};
    if(patch?.name&&session?.user){
      client()?.auth.updateUser({data:{full_name:patch.name}}).catch(()=>{});
    }
    return current;
  }

  function familyStorageKey(){
    return slug(current?.familyId||current?.family||"family");
  }

  function setupShell(){
    const me=current||{},names=splitName(me.name),invite=pendingInvite();
    return `<main class="join-page supabase-setup-page"><section class="join-card join-card-wide">
      <div class="join-family-mark"><i data-lucide="shield-check"></i></div>
      <p class="eyebrow">SECURE FAMILY SETUP</p>
      <h1>Welcome to Family Book</h1>
      <p>Your account is signed in. Now create your family or join one using an invitation.</p>

      <div class="backend-account-chip"><i data-lucide="circle-user-round"></i><span><strong>${e(me.name||"Family member")}</strong><small>${e(me.email||"")}</small></span></div>

      <div class="setup-choice-tabs">
        <button type="button" class="${invite?"":"active"}" data-setup-tab="create">Create a family</button>
        <button type="button" class="${invite?"active":""}" data-setup-tab="join">Join a family</button>
      </div>

      <form id="backendCreateFamily" class="${invite?"hidden":""}">
        <div class="setup-name-grid">
          <label class="setup-field">
            <span class="setup-label-text">First name</span>
            <input id="backendFirst" required value="${e(names.first)}">
          </label>
          <label class="setup-field">
            <span class="setup-label-text">Surname</span>
            <input id="backendLast" value="${e(names.last)}">
          </label>
        </div>

        <label class="setup-field setup-family-field">
          <span class="setup-label-text">Family name</span>
          <input id="backendFamilyName" required placeholder="e.g. Smith">
          <small class="field-hint">Family Book will display this as “Smith Family”.</small>
        </label>

        <div class="backend-form-error" id="backendCreateError" hidden></div>
        <button class="primary full setup-create-button" type="submit">
          <i data-lucide="users-round"></i>
          <span>Create my family</span>
        </button>
      </form>

      <form id="backendJoinFamily" class="${invite?"":"hidden"}">
        <label class="setup-field">
          <span class="setup-label-text">Invite code</span>
          <input id="backendInviteCode" required value="${e(invite)}" placeholder="FB-AB12-CD34-EF56">
        </label>
        <button class="secondary full" type="button" id="backendPreviewInvite"><i data-lucide="search"></i>Check invitation</button>
        <div id="backendInvitePreview"></div>
        <div class="backend-form-error" id="backendJoinError" hidden></div>
      </form>

      <button type="button" class="setup-signout" id="backendSetupSignout"><i data-lucide="log-out"></i>Sign out</button>
    </section></main>`;
  }

  function renderSetup(appEl,onComplete,onSignOut){
    appEl.innerHTML=setupShell();
    window.icons?.();

    const showTab=name=>{
      document.querySelectorAll("[data-setup-tab]").forEach(b=>b.classList.toggle("active",b.dataset.setupTab===name));
      document.querySelector("#backendCreateFamily")?.classList.toggle("hidden",name!=="create");
      document.querySelector("#backendJoinFamily")?.classList.toggle("hidden",name!=="join");
    };
    document.querySelectorAll("[data-setup-tab]").forEach(b=>b.onclick=()=>showTab(b.dataset.setupTab));

    const createForm=document.querySelector("#backendCreateFamily");
    createForm.onsubmit=async ev=>{
      ev.preventDefault();
      const btn=createForm.querySelector("button[type=submit]"),err=document.querySelector("#backendCreateError");
      err.hidden=true;btn.disabled=true;btn.textContent="Creating family…";
      try{
        await createFamily({
          familyName:document.querySelector("#backendFamilyName").value,
          first:document.querySelector("#backendFirst").value,
          last:document.querySelector("#backendLast").value
        });
        onComplete?.();
      }catch(ex){
        err.textContent=ex.message||"Could not create the family.";
        err.hidden=false;
      }finally{
        btn.disabled=false;
        btn.innerHTML='<i data-lucide="users-round"></i>Create my family';
        window.icons?.();
      }
    };

    const previewBtn=document.querySelector("#backendPreviewInvite");
    const joinErr=document.querySelector("#backendJoinError");
    const previewMount=document.querySelector("#backendInvitePreview");

    async function preview(){
      joinErr.hidden=true;previewBtn.disabled=true;previewBtn.textContent="Checking…";
      try{
        const code=document.querySelector("#backendInviteCode").value.trim();
        const info=await previewInvite(code);
        const profiles=Array.isArray(info?.claimable_profiles)?info.claimable_profiles:[];
        const meNames=splitName(current?.name||"");

        previewMount.innerHTML=`<div class="backend-invite-card">
          <p class="eyebrow">INVITATION FOUND</p>
          <h2>${e(info.family_name||"Family")}</h2>
          <p>Choose an existing profile only if it is genuinely yours. Otherwise create your own Member profile.</p>
          <div class="backend-claim-list">${profiles.map(p=>`<label class="backend-claim"><input type="radio" name="backendJoinMode" value="claim:${e(p.person_id)}"><span>${p.photo_path?`<img src="${e(p.photo_path)}" alt="">`:`<b>${e(((p.first_name||"F")[0]+((p.surname||"")[0]||"")).toUpperCase())}</b>`}<strong>${e([p.first_name,p.surname].filter(Boolean).join(" "))}</strong></span></label>`).join("")}</div>
          <label class="backend-claim backend-new-profile"><input type="radio" name="backendJoinMode" value="create" ${profiles.length?"":"checked"}><span><i data-lucide="user-plus"></i><strong>Create my Member profile</strong></span></label>
          <div id="backendJoinNames" class="${profiles.length?"hidden":""}"><div class="row"><label>First name<input id="backendJoinFirst" value="${e(meNames.first)}"></label><label>Surname<input id="backendJoinLast" value="${e(meNames.last)}"></label></div></div>
          <button type="button" class="primary full" id="backendJoinSubmit"><i data-lucide="log-in"></i>Join ${e(info.family_name||"family")}</button>
        </div>`;

        previewMount.querySelectorAll('input[name="backendJoinMode"]').forEach(r=>r.onchange=()=>{
          previewMount.querySelector("#backendJoinNames")?.classList.toggle("hidden",r.value!=="create");
        });

        previewMount.querySelector("#backendJoinSubmit").onclick=async()=>{
          const chosen=previewMount.querySelector('input[name="backendJoinMode"]:checked');
          if(!chosen){
            joinErr.textContent="Choose your existing profile or create a new one.";
            joinErr.hidden=false;
            return;
          }
          const submit=previewMount.querySelector("#backendJoinSubmit");
          submit.disabled=true;submit.textContent="Joining…";
          try{
            const value=chosen.value;
            await joinFamily({
              code,
              claimPersonId:value.startsWith("claim:")?value.slice(6):null,
              first:value==="create"?previewMount.querySelector("#backendJoinFirst")?.value.trim():null,
              last:value==="create"?previewMount.querySelector("#backendJoinLast")?.value.trim():null
            });
            onComplete?.();
          }catch(ex){
            joinErr.textContent=ex.message||"Could not join the family.";
            joinErr.hidden=false;
            submit.disabled=false;
            submit.innerHTML='<i data-lucide="log-in"></i>Join family';
            window.icons?.();
          }
        };
        window.icons?.();
      }catch(ex){
        previewMount.innerHTML="";
        joinErr.textContent=ex.message||"Could not check that invitation.";
        joinErr.hidden=false;
      }finally{
        previewBtn.disabled=false;
        previewBtn.innerHTML='<i data-lucide="search"></i>Check invitation';
        window.icons?.();
      }
    }

    previewBtn.onclick=preview;
    document.querySelector("#backendSetupSignout").onclick=async()=>{
      await logout();
      onSignOut?.();
    };

    if(pendingInvite()){
      showTab("join");
      preview().catch(()=>{});
    }
  }

  window.FB_AUTH={
    normalizeFamily,
    init,refresh,
    get:()=>current,
    getSession:()=>session,
    isReady:()=>ready,
    needsSetup:()=>!!current?.needsSetup,
    signInWithPassword,signUp,signInWithGoogle,
    createFamily,previewInvite,joinFamily,
    pendingInvite,setPendingInvite,
    renderSetup,
    update,logout,
    familyStorageKey,
    isSession:()=>!!session,
    backend:()=>true
  };
})();
