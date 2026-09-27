(()=>{
  const buttons=[...document.querySelectorAll('[data-screen]')];
  buttons.forEach(button=>button.addEventListener('click',()=>{
    buttons.forEach(item=>item.classList.toggle('active',item===button));
  }));
})();