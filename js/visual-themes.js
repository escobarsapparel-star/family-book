/* Family Book optional visual theme engine.
   The visual theme is deliberately separate from the existing Light/Dark/System setting.
   No visual theme selected = current Family Book appearance. */

(function(){
  "use strict";

  const KEY="fb_visual_theme";
  const THEMES={
    classic:{label:"Classic Family",description:"Keep the current Family Book design."},
    "midnight-aurora":{label:"Midnight Aurora",description:"A glowing midnight interface with cyan, violet and aurora effects."}
  };

  function getTheme(){
    try{
      const value=localStorage.getItem(KEY)||"classic";
      return THEMES[value]?value:"classic";
    }catch(_){return "classic"}
  }

  function applyTheme(theme){
    const next=THEMES[theme]?theme:"classic";
    const root=document.documentElement;
    if(next==="classic")root.removeAttribute("data-fb-visual-theme");
    else root.setAttribute("data-fb-visual-theme",next);
    root.dataset.fbVisualTheme=next;
    try{localStorage.setItem(KEY,next)}catch(_){}
    document.dispatchEvent(new CustomEvent("familybook:visual-theme",{detail:{theme:next}}));
    return next;
  }

  function refreshChoices(){
    const current=getTheme();
    document.querySelectorAll("[data-visual-theme]").forEach(button=>{
      const active=button.dataset.visualTheme===current;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",active?"true":"false");
      const check=button.querySelector(".fb-theme-check");
      if(check)check.style.opacity=active?"1":"0";
    });
  }

  function choice(theme){
    applyTheme(theme);
    refreshChoices();
  }

  function makeCard(current){
    const card=document.createElement("section");
    card.className="settings-card fb-visual-theme-card";
    card.id="settingsVisualThemes";
    card.innerHTML=
      '<div class="settings-card-head">'+
        '<span class="settings-card-icon"><i data-lucide="sparkles"></i></span>'+
        '<div><p>FAMILY THEMES</p><h2>Theme collection</h2><span>Optional visual themes can change the colours, surfaces, buttons, icons and effects without changing Family Book features.</span></div>'+
      '</div>'+
      '<div class="fb-visual-theme-grid">'+
        themeButton("classic","palette","Classic Family","Current Family Book design.")+
        themeButton("midnight-aurora","sparkles","Midnight Aurora","Premium theme preview — test version.")+
      '</div>'+
      '<p class="settings-note"><i data-lucide="info"></i>These themes are currently a preview feature. Classic Family remains the default.</p>';
    return card;

    function themeButton(id,icon,title,desc){
      const active=current===id;
      return '<button type="button" class="fb-visual-theme-choice '+(active?"active":"")+'" data-visual-theme="'+id+'" aria-pressed="'+(active?"true":"false")+'">'+
        '<span class="fb-theme-preview fb-theme-preview-'+id+'"><i data-lucide="'+icon+'"></i></span>'+
        '<span class="fb-theme-copy"><strong>'+title+'</strong><small>'+desc+'</small></span>'+
        '<i class="fb-theme-check" data-lucide="check-circle-2" style="opacity:'+(active?"1":"0")+'"></i>'+
      '</button>';
    }
  }

  function installThemeSection(){
    const appearance=document.getElementById("settingsAppearance");
    if(!appearance || document.getElementById("settingsVisualThemes"))return;
    appearance.insertAdjacentElement("afterend",makeCard(getTheme()));
    if(window.lucide?.createIcons)window.lucide.createIcons();
    refreshChoices();
  }

  function bind(){
    document.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-visual-theme]");
      if(!button)return;
      event.preventDefault();
      choice(button.dataset.visualTheme||"classic");
    });

    window.addEventListener("familybook:settings",refreshChoices);
    installThemeSection();

    let lastApp=document.getElementById("app");
    const observer=new MutationObserver(()=>{
      installThemeSection();
      refreshChoices();
    });
    if(lastApp)observer.observe(lastApp,{childList:true,subtree:true});
  }

  applyTheme(getTheme());
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
  window.FB_VISUAL_THEME={get:getTheme,apply:applyTheme,themes:THEMES};
})();