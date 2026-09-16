(()=>{
  if(window.__fbMobileLogoForce)return;
  window.__fbMobileLogoForce=true;

  const MOBILE_MAX=759;
  const BUTTON_CLASS="fb-mobile-logo-home";

  function isMobile(){return window.innerWidth<=MOBILE_MAX}

  function ensureLogo(){
    const topbar=document.querySelector("#app>.app>.topbar");
    if(!topbar||!isMobile())return;

    let button=topbar.querySelector(`.${BUTTON_CLASS}`);
    if(!button){
      button=document.createElement("button");
      button.type="button";
      button.className=BUTTON_CLASS;
      button.setAttribute("aria-label","Go to Family Book Home");
      button.innerHTML='<img src="assets/logo/family-book-logo-dark.png" alt="Family Book">';
      topbar.appendChild(button);

      const goHome=event=>{
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if(typeof window.go==="function")window.go("home");
        else document.querySelector('[data-r="home"]')?.click?.();
      };
      button.addEventListener("click",goHome);
    }

    topbar.classList.add("fb-mobile-logo-dom-ready");
  }

  function sync(){
    if(!isMobile()){
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach(el=>el.remove());
      document.querySelectorAll(".fb-mobile-logo-dom-ready").forEach(el=>el.classList.remove("fb-mobile-logo-dom-ready"));
      return;
    }
    ensureLogo();
  }

  const style=document.createElement("style");
  style.textContent=`
    @media (max-width:${MOBILE_MAX}px){
      #app>.app>.topbar.fb-mobile-logo-dom-ready::before{display:none!important;content:none!important}
      #app>.app>.topbar>.brand-home{pointer-events:none!important}
      #app>.app>.topbar>.${BUTTON_CLASS}{
        position:absolute!important;
        z-index:26!important;
        left:12px!important;
        top:calc(50% + 4px)!important;
        transform:translateY(-50%)!important;
        width:min(220px,calc(100vw - 112px))!important;
        height:52px!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        background:transparent!important;
        display:flex!important;
        align-items:center!important;
        justify-content:flex-start!important;
        cursor:pointer!important;
        -webkit-tap-highlight-color:transparent!important;
        touch-action:manipulation!important;
      }
      #app>.app>.topbar>.${BUTTON_CLASS}>img{
        display:block!important;
        width:100%!important;
        height:100%!important;
        object-fit:contain!important;
        object-position:left center!important;
        pointer-events:none!important;
      }
      #app>.app>.topbar>.actions{z-index:30!important}
    }
    @media (max-width:380px){
      #app>.app>.topbar>.${BUTTON_CLASS}{
        left:10px!important;
        width:min(204px,calc(100vw - 108px))!important;
        height:50px!important;
      }
    }
  `;
  document.head.appendChild(style);

  const observer=new MutationObserver(()=>ensureLogo());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("resize",sync,{passive:true});
  document.addEventListener("DOMContentLoaded",sync,{once:true});
  sync();
})();
