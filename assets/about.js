(()=>{
  const dialog=document.getElementById('aboutDialog'),visual=dialog.querySelector('.about-visual'),close=document.getElementById('aboutClose');
  let opener=null,opening=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),hover=matchMedia('(hover: hover) and (pointer: fine)');
  const buttons=[...dialog.querySelectorAll('.about-direction>button')];
  dialog.querySelectorAll('#aboutTitle>span').forEach((el,i)=>el.style.setProperty('--letter',i));
  function expand(button){
    buttons.forEach(b=>{const expanded=b===button,panel=document.getElementById(b.getAttribute('aria-controls'));b.setAttribute('aria-expanded',expanded);panel.classList.toggle('is-expanded',expanded);panel.inert=!expanded});
  }
  buttons.forEach(button=>{
    button.addEventListener('click',()=>expand(button));
    button.addEventListener('pointerenter',()=>{if(hover.matches)expand(button)});
  });
  function resetParallax(){visual.style.setProperty('--px','0px');visual.style.setProperty('--py','0px')}
  window.MBAbout={open(){
    if(dialog.open)return;opener=document.activeElement;dialog.classList.remove('is-entering');dialog.showModal();dialog.scrollTop=0;
    expand(buttons[0]);resetParallax();const token=++opening;
    requestAnimationFrame(()=>{if(token===opening&&dialog.open)dialog.classList.add('is-entering')});close.focus({preventScroll:true});
  },close(){if(dialog.open)dialog.close()}};
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();dialog.close()});
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.stopPropagation();return}
    if(e.key!=='Tab')return;
    const focusable=[...dialog.querySelectorAll('button:not([disabled]),a[href],input,textarea,select,[tabindex="0"]')].filter(el=>!el.closest('[inert]')&&el.getClientRects().length);
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  });
  dialog.addEventListener('close',()=>{opening++;dialog.classList.remove('is-entering');resetParallax();opener?.focus({preventScroll:true})});
  dialog.addEventListener('pointermove',e=>{
    if(reduced.matches||!hover.matches)return;
    const r=dialog.getBoundingClientRect();visual.style.setProperty('--px',`${((e.clientX-r.left)/r.width-.5)*12}px`);visual.style.setProperty('--py',`${((e.clientY-r.top)/r.height-.5)*8}px`);
  });dialog.addEventListener('pointerleave',resetParallax);
  document.getElementById('aboutContact').addEventListener('click',()=>{dialog.close();document.querySelector('#mainHeader a[href="#contact"]').click()});
  document.getElementById('aboutWorks').addEventListener('click',()=>{dialog.close();document.querySelector('#mainHeader a[href="#works"]').click()});
})();
