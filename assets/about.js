(()=>{
  const dialog=document.getElementById('aboutDialog'),close=document.getElementById('aboutClose');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),hover=matchMedia('(hover: hover) and (pointer: fine)'),compact=matchMedia('(max-width:760px),(max-height:550px)');
  const blocks=[...dialog.querySelectorAll('.about-block')],pages=[...dialog.querySelectorAll('.about-pages button')];
  let opener=null,current=0;
  dialog.querySelectorAll('#aboutTitle>span').forEach((el,i)=>el.style.setProperty('--letter',i));
  blocks.forEach((el,i)=>el.style.setProperty('--delay',`${1+i*.18}s`));
  function selectPage(index,animate=false){
    current=index;
    if(dialog.open)blocks.forEach(el=>{el.getAnimations().forEach(a=>a.cancel());el.style.animation='none'});
    blocks.forEach((el,i)=>{el.hidden=compact.matches&&i!==index});
    pages.forEach((el,i)=>{if(i===index)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current')});
    if(animate&&compact.matches)blocks[index].animate([{opacity:0,transform:reduced.matches?'none':'translateY(8px)'},{opacity:1,transform:'none'}],{duration:450,easing:'ease-out'});
  }
  pages.forEach((button,i)=>button.addEventListener('click',()=>selectPage(i,true)));
  compact.addEventListener('change',()=>selectPage(current));
  function resetParallax(){dialog.style.setProperty('--px','0px');dialog.style.setProperty('--py','0px')}
  window.MBAbout={open(){
    if(dialog.open)return;opener=document.activeElement;dialog.classList.remove('is-entering');blocks.forEach(el=>el.style.animation='');selectPage(0);resetParallax();dialog.showModal();dialog.scrollTop=0;
    void dialog.offsetWidth;dialog.classList.add('is-entering');close.focus({preventScroll:true});
  },close(){if(dialog.open)dialog.close()}};
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();dialog.close()});
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.stopPropagation();return}
    if(e.key!=='Tab')return;
    const focusable=[...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  });
  dialog.addEventListener('close',()=>{dialog.classList.remove('is-entering');dialog.querySelectorAll('.about-block').forEach(el=>el.getAnimations().forEach(a=>a.cancel()));resetParallax();opener?.focus({preventScroll:true})});
  dialog.addEventListener('pointermove',e=>{
    if(reduced.matches||!hover.matches||compact.matches)return;
    const r=dialog.getBoundingClientRect();dialog.style.setProperty('--px',`${((e.clientX-r.left)/r.width-.5)*20}px`);dialog.style.setProperty('--py',`${((e.clientY-r.top)/r.height-.5)*12}px`);
  });dialog.addEventListener('pointerleave',resetParallax);
  document.getElementById('aboutContact').addEventListener('click',()=>{dialog.close();document.querySelector('#mainHeader a[href="#contact"]').click()});
})();
