(()=>{
  const dialog=document.getElementById('aboutDialog'),close=document.getElementById('aboutClose');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),hover=matchMedia('(hover: hover) and (pointer: fine)'),compact=matchMedia('(max-width:760px),(max-height:550px)');
  const blocks=[...dialog.querySelectorAll('.about-block')],pages=[...dialog.querySelectorAll('.about-tabs button')],chapters=[...dialog.querySelectorAll('.about-chapter')];
  const glass=createAboutGlass(dialog);
  let atmosphere=null;
  dialog.querySelector('.about-atmosphere').addEventListener('webglcontextrestored',()=>{atmosphere=createAboutAtmosphere(dialog);if(dialog.open)atmosphere.start()});
  let opener=null,current=0,closeTimer=null,openEpoch=0;
  const mobileLayout=matchMedia('(max-width:760px) and (orientation:portrait)'),mobileCopy=matchMedia('(max-width:760px), (max-height:550px) and (max-width:1000px)');
  const identity=dialog.querySelector('.about-identity'),story=dialog.querySelector('.about-story'),visual=dialog.querySelector('.about-visual');
  const desktopText=blocks.map(el=>el.textContent),shortText=[
    'Снимаю и монтирую видео. Соединяю визуальный опыт и современные технологии.',
    'Работаю с кадром, светом и ритмом, чтобы передать характер человека, продукта или компании.',
    'Видео: съёмка, монтаж и AI — от исходных кадров до готовой истории.',
    'Сайты нового уровня с объёмом и анимацией. Telegram-боты и мини-приложения — от идеи до запуска.',
    'Сам веду проект и отвечаю за результат.',
    'Современные технологии позволяют объединить задачи. Главное — продуманный подход и ответственность.'
  ];
  function wrapWords(block,text){
    const fragment=document.createDocumentFragment();
    text.split(/(\s+)/).forEach(part=>{
      if(!part)return;
      if(/^\s+$/.test(part)){fragment.append(document.createTextNode(part));return}
      const word=document.createElement('span');word.className='about-word';word.textContent=part;fragment.append(word);
    });
    block.replaceChildren(fragment);
  }
  function updatePresentation(){
    if(mobileLayout.matches)visual.append(identity);else story.before(identity);
    blocks.forEach((block,i)=>wrapWords(block,mobileCopy.matches?shortText[i]:desktopText[i]));
    close.textContent=mobileCopy.matches?'Назад':'Назад в пространство';
    dialog.dataset.layout=mobileLayout.matches?'mobile':'desktop';
  }
  mobileLayout.addEventListener('change',updatePresentation);mobileCopy.addEventListener('change',updatePresentation);updatePresentation();
  // Keep keyboard focus visible, without the ring caused by programmatic focus on touch.
  document.addEventListener('keydown',e=>{if(['Tab','Enter',' '].includes(e.key))dialog.classList.add('using-keyboard')},true);
  document.addEventListener('pointerdown',()=>dialog.classList.remove('using-keyboard'),true);
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
  // One critically damped motion drives every depth layer. Pointer events only
  // update the destination; velocity stays continuous when the cursor reverses.
  const motion={x:0,y:0,vx:0,vy:0,tx:0,ty:0,frame:0,last:0};
  function paintParallax(){dialog.style.setProperty('--px',`${motion.x.toFixed(4)}px`);dialog.style.setProperty('--py',`${motion.y.toFixed(4)}px`)}
  function stopParallax(){cancelAnimationFrame(motion.frame);motion.frame=0;motion.last=0}
  function resetParallax(){stopParallax();Object.assign(motion,{x:0,y:0,vx:0,vy:0,tx:0,ty:0});paintParallax()}
  function animateParallax(now){
    motion.frame=0;
    if(!dialog.open||dialog.classList.contains('is-closing')||document.hidden){motion.last=0;return}
    // Bound catch-up after a stalled frame so resuming never teleports a layer.
    const dt=motion.last?Math.min((now-motion.last)/1000,.05):1/60;
    motion.last=now;
    const frequency=reduced.matches?7:9,decay=Math.exp(-frequency*dt);
    for(const [position,velocity,target] of [['x','vx','tx'],['y','vy','ty']]){
      const distance=motion[position]-motion[target],impulse=motion[velocity]+frequency*distance;
      motion[position]=motion[target]+(distance+impulse*dt)*decay;
      motion[velocity]=(motion[velocity]-frequency*impulse*dt)*decay;
    }
    const moving=Math.abs(motion.tx-motion.x)+Math.abs(motion.ty-motion.y)>.002||Math.abs(motion.vx)+Math.abs(motion.vy)>.01;
    if(!moving){motion.x=motion.tx;motion.y=motion.ty;motion.vx=motion.vy=0;motion.last=0}
    paintParallax();if(moving)motion.frame=requestAnimationFrame(animateParallax);
  }
  function aimParallax(x=0,y=0){
    motion.tx=x;motion.ty=y;
    if(dialog.open&&!dialog.classList.contains('is-closing')&&!document.hidden&&!motion.frame)motion.frame=requestAnimationFrame(animateParallax);
  }
  function requestClose(){
    if(!dialog.open||dialog.classList.contains('is-closing'))return;
    openEpoch++;stopParallax();glass.stop();atmosphere?.stop();
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
  dialog.addEventListener('close',()=>{if(dialog.open)return;clearTimeout(closeTimer);openEpoch++;stopParallax();glass.stop();atmosphere?.stop();dialog.classList.remove('is-entering','is-closing','glass-ready');dialog.querySelectorAll('.about-block').forEach(el=>el.getAnimations().forEach(a=>a.cancel()));resetParallax();opener?.focus({preventScroll:true})});
  dialog.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'||!hover.matches||!dialog.open||dialog.classList.contains('is-closing'))return;
    const strength=(reduced.matches?.65:1)*(compact.matches?.5:1),clamp=n=>Math.max(-1,Math.min(1,n));
    aimParallax(clamp(e.clientX/innerWidth*2-1)*14*strength,clamp(e.clientY/innerHeight*2-1)*8*strength);
  },{passive:true});
  dialog.addEventListener('pointerleave',()=>aimParallax());
  window.addEventListener('blur',()=>aimParallax());
  window.addEventListener('resize',()=>aimParallax());
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopParallax();motion.tx=motion.ty=motion.vx=motion.vy=0}else if(dialog.open)aimParallax()});
})();
