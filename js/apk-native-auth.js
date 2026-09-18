(()=>{
  if(window.__fbApkNativeAuthReady)return;
  const native=window.FB_NATIVE;
  const cap=native?.Capacitor;
  if(!cap?.isNativePlatform?.())return;

  const auth=window.FB_AUTH;
  const client=()=>window.FB_SUPABASE?.client;
  const redirect='com.familybook.app://login-callback/';
  let bound=false;

  async function handleUrl(raw){
    const url=String(raw||'');
    if(!url.startsWith(redirect))return false;
    const parsed=new URL(url);
    const query=new URLSearchParams(parsed.search);
    const hash=new URLSearchParams((parsed.hash||'').replace(/^#/,''));
    const value=k=>query.get(k)||hash.get(k)||'';
    const oauthError=value('error_description')||value('error');
    if(oauthError)throw new Error(decodeURIComponent(oauthError));

    const code=value('code');
    if(code){
      const {error}=await client().auth.exchangeCodeForSession(code);
      if(error)throw error;
    }else{
      const access_token=value('access_token');
      const refresh_token=value('refresh_token');
      if(!access_token||!refresh_token)throw new Error('Google returned to Family Book without a valid login session.');
      const {error}=await client().auth.setSession({access_token,refresh_token});
      if(error)throw error;
    }

    try{await native.Browser?.close?.()}catch(_){}
    await auth?.refresh?.();
    window.FB_APP_NATIVE_AUTH_COMPLETE?.();
    return true;
  }

  async function bind(){
    if(bound)return;
    if(!native.App?.addListener)throw new Error('Family Book could not start the Android login bridge.');
    bound=true;
    await native.App.addListener('appUrlOpen',event=>{
      handleUrl(event?.url).catch(err=>{
        console.error('Family Book native auth:',err);
        window.FB_APP_AUTH_ERROR?.(err);
      });
    });
    try{
      const launch=await native.App.getLaunchUrl?.();
      if(launch?.url)await handleUrl(launch.url);
    }catch(err){console.warn('Family Book launch URL:',err)}
  }

  if(auth?.signInWithGoogle){
    auth.signInWithGoogle=async()=>{
      await bind();
      const {data,error}=await client().auth.signInWithOAuth({
        provider:'google',
        options:{
          redirectTo:redirect,
          skipBrowserRedirect:true,
          queryParams:{prompt:'select_account'}
        }
      });
      if(error)throw error;
      if(!data?.url)throw new Error('Google did not return a sign-in URL.');
      if(!native.Browser?.open)throw new Error('Family Book could not open the Android sign-in browser.');
      await native.Browser.open({url:data.url});
    };
  }

  bind().catch(err=>console.warn('Family Book native auth bridge:',err));
  window.__fbApkNativeAuthReady=true;
})();