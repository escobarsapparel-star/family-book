(function(){
  const host=String(location.hostname||"").toLowerCase();
  const protocol=String(location.protocol||"").toLowerCase();
  const isLocalAppOrigin=
    host==="localhost" ||
    host==="127.0.0.1" ||
    protocol==="capacitor:" ||
    protocol==="file:";

  // Temporary public-site gate. Set this to false when Family Book is ready to reopen.
  const WEB_MAINTENANCE=false;

  window.FB_WEB_MAINTENANCE=WEB_MAINTENANCE;
  window.FB_MAINTENANCE_MODE=WEB_MAINTENANCE&&!isLocalAppOrigin;
  document.documentElement.dataset.webMaintenance=window.FB_MAINTENANCE_MODE?"true":"false";
})();
