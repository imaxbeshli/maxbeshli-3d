(()=>{
  const dialog=document.getElementById('aboutDialog'),close=document.getElementById('aboutClose');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),hover=matchMedia('(hover: hover) and (pointer: fine)'),compact=matchMedia('(max-width:760px),(max-height:550px)');
  const blocks=[...dialog.querySelectorAll('.about-block')],pages=[...dialog.querySelectorAll('.about-tabs button')],chapters=[...dialog.querySelectorAll('.about-chapter')];
  const glass=createAboutGlass(dialog);
  let atmosphere=null;
  dialog.querySelector('.about-atmosphere').addEventListener('webglcontextrestored',()=>{atmosphere=createAboutAtmosphere(dialog);if(dialog.open)atmosphere.start()});
  let opener=null,current=0,closeTimer=null,openEpoch=0;
  // Preserve natural spacing, selection and line wrapping while styling each word.
  blocks.forEach(block=>{
    const fragment=document.createDocumentFragment();
    block.textContent.split(/(\s+)/).forEach(part=>{
      if(!part)return;
      if(/^\s+$/.test(part)){fragment.append(document.createTextNode(part));return}
      const word=document.createElement('span');word.className='about-word';word.textContent=part;fragment.append(word);
    });
    block.replaceChildren(fragment);
  });
  dialog.querySelectorAll('#aboutTitle>span').forEach((el,i)=>el.style.setProperty('--letter',i));
  blocks.forEach((el,i)=>el.style.setProperty('--delay',`${.95+(i%2)*.17}s`));
  function selectPage(index,animate=false){
    current=index;
    chapters.forEach((el,i)=>{el.getAnimations().forEach(a=>a.cancel());el.hidden=i!==index});
    pages.forEach((el,i)=>{el.setAttribute('aria-selected',String(i===index));el.tabIndex=i===index?0:-1});
    dialog.style.setProperty('--chapter-light',`${index*6}px`);
    if(animate){
      blocks.forEach(el=>{el.getAnimations().forEach(a=>a.cancel());el.style.animation='none'});
      chapters[index].animate([{opacity:0,transform:reduced.matches?'none':'translateY(12px)'},{opacity:1,transform:'none'}],{duration:550,easing:'cubic-bezier(.2,.7,.2,1)'});
    }
  }
  pages.forEach((button,i)=>button.addEventListener('click',()=>selectPage(i,true)));
  dialog.querySelector('.about-tabs').addEventListener('keydown',e=>{
    const i=pages.indexOf(document.activeElement);if(i<0)return;
    let next;if(e.key==='ArrowRight')next=(i+1)%3;else if(e.key==='ArrowLeft')next=(i+2)%3;else if(e.key==='Home')next=0;else if(e.key==='End')next=2;else return;
    e.preventDefault();e.stopPropagation();selectPage(next,true);pages[next].focus({preventScroll:true});
  });
  function resetParallax(){dialog.style.setProperty('--px','0px');dialog.style.setProperty('--py','0px')}
  function requestClose(){
    if(!dialog.open||dialog.classList.contains('is-closing'))return;
    openEpoch++;glass.stop();atmosphere?.stop();
    dialog.style.setProperty('--exit-opacity',getComputedStyle(dialog).opacity);
    dialog.classList.add('is-closing');
    closeTimer=setTimeout(()=>{if(dialog.open)dialog.close()},1200);
  }
  dialog.addEventListener('animationend',e=>{if(e.target===dialog&&e.animationName==='aboutExit'&&dialog.open)dialog.close()});
  window.MBAbout={open(){
    if(dialog.open)return;clearTimeout(closeTimer);opener=document.activeElement;dialog.classList.remove('is-entering','is-closing','glass-ready');blocks.forEach(el=>el.style.animation='');selectPage(0);resetParallax();dialog.showModal();dialog.scrollTop=0;
    const epoch=++openEpoch;glass.start().then(ok=>{if(epoch!==openEpoch||!dialog.open||dialog.classList.contains('is-closing'))return;dialog.classList.add('glass-ready');if(!ok)dialog.querySelector('.about-glass-status').textContent='Не удалось загрузить стекло. Обновите страницу.'});
    if(!atmosphere)atmosphere=createAboutAtmosphere(dialog);atmosphere.start();
    void dialog.offsetWidth;dialog.classList.add('is-entering');close.focus({preventScroll:true});
  },close:requestClose};
  close.addEventListener('click',requestClose);
  dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();requestClose()});
  dialog.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.stopPropagation();return}
    if(e.key!=='Tab')return;
    const focusable=[...dialog.querySelectorAll('button:not([disabled]):not([tabindex="-1"]),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('[hidden]'));
    const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  });
  dialog.addEventListener('close',()=>{if(dialog.open)return;clearTimeout(closeTimer);openEpoch++;glass.stop();atmosphere?.stop();dialog.classList.remove('is-entering','is-closing','glass-ready');dialog.querySelectorAll('.about-block').forEach(el=>el.getAnimations().forEach(a=>a.cancel()));resetParallax();opener?.focus({preventScroll:true})});
  dialog.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'&&!hover.matches)return;
    const strength=(reduced.matches?.65:1)*(compact.matches?.5:1);
    const r=dialog.getBoundingClientRect();dialog.style.setProperty('--px',`${((e.clientX-r.left)/r.width-.5)*40*strength}px`);dialog.style.setProperty('--py',`${((e.clientY-r.top)/r.height-.5)*24*strength}px`);
  });dialog.addEventListener('pointerleave',resetParallax);
})();
