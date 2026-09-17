(()=>{
  // Stability hotfix: use the browser/device native date controls only.
  // The custom Family Book date modal is intentionally disabled because it could
  // leave the page trapped behind its backdrop after opening or selecting a date.
  document.documentElement.classList.remove('fb-date-open');
  document.querySelectorAll('.fb-date-overlay').forEach(node=>node.remove());
  window.__fbLocalDatePicker=true;
})();
