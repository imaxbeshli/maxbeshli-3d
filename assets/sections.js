/* Section UI: reuse the existing media, pause hidden scenes, keep all content offline. */
(()=>{
  const root=document.getElementById('ecosystem-modal'),contact=document.getElementById('infoDialog');
  const $=id=>document.getElementById(id);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const definitions=[
    {title:'Истории в движении',description:'Съёмка, монтаж и AI. От идеи до готового фильма.',tabs:['Съёмка','Монтаж','AI-видео'],details:[
      'Помогаю найти визуальный язык проекта. Продумываю кадр, свет и движение, снимаю людей, продукты и пространство.',
      'Собираю материал в цельную историю: структура, ритм, цвет и звук. Готовлю версии для сайта, презентации и социальных сетей.',
      'Создаю сцены, оживляю изображения и добавляю эффекты, которые расширяют возможности съёмки и монтажа.'
    ]},
    {title:'Сайты с характером',description:'Не просто страницы — визуальные истории для вашего бизнеса.',tabs:['Вступление','Визуальные направления','Процесс'],details:[
      'Начинаю с содержания и структуры. Выстраиваю понятный путь от знакомства с компанией до обращения.',
      'Превращаю просмотр в взаимодействие: движение камеры, объёмные объекты и анимация, которая помогает раскрыть продукт.',
      'Для телефона меняются композиция, масштаб и управление. Содержание остаётся читаемым, а действия — удобными для касания.',
      'Структура, дизайн, разработка и запуск — в одном процессе.'
    ]},
    {title:'Бизнес внутри Telegram',description:'Мини-приложения, боты и автоматизация — в одной системе.',tabs:['Приложение','Бот','CRM'],details:[
      'Приложение знакомит с услугами. Ниже можно записаться через бота, а в CRM — увидеть результат.',
      'Выберите услугу и время вместе с ботом. Подтверждённая запись появится в CRM.',
      'Здесь собраны заявки и расписание. Откройте карточку клиента, чтобы изменить или отменить запись.'
    ]}
  ];
  let index=-1,active=false,tab=0,webMode=0,raf=0,last=0,x=0,y=0,tx=0,ty=0,video=null,contactReturn=null,resumeVideo=false,wasMediaVisible=true;
  document.querySelectorAll('[data-section-image]').forEach(img=>img.src=window.MB_SECTION_IMAGES[img.dataset.sectionImage]);
  function tiles(){return window.__MB?.slateObjects||[]}
  function stopMedia(){window.MBWebStudio.suspend();tiles().forEach(o=>o.setPlaybackActive(false));if(video)video.pause()}
  function applyTab(n,focus=false){
    tab=n;const d=definitions[index];$('sectionDetail').textContent=d.details[n];
    [...$('sectionOptions').children].forEach((b,i)=>{b.setAttribute('aria-selected',String(i===n));b.tabIndex=i===n?0:-1;if(focus&&i===n)b.focus()});
    if(index===0)window.MBFilmStudio.setView(n,video);
    if(index===1){webMode=n;window.MBWebStudio.setView(n)}
    if(index===2){['telegramApp','telegramBot','telegramCRM'].forEach((id,i)=>$(id).hidden=window.MBSectionScroll.active?false:i!==n);if(n!==0)tiles()[2]?.phoneDemo.update(false);window.MBTelegramStudio.setView(n)}
  }
  let tabTransition=0,tabAnimations=[];
  function cancelTabTransition(){
    tabTransition++;tabAnimations.forEach(a=>a.cancel());tabAnimations=[];
    root.querySelector('.section-presentation').inert=false;
    root.removeAttribute('aria-busy');
  }
  async function setTab(n,focus=false){
    if(window.MBSectionScroll.active)return window.MBSectionScroll.navigate(n);
    cancelTabTransition();const token=tabTransition;
    if((index!==0&&index!==2)||n===tab||reduced.matches){applyTab(n,focus);return true}
    const panel=root.querySelector('.section-presentation'),detail=$('sectionDetail');
    if(panel.contains(document.activeElement))$('sectionOptions').children[n]?.focus({preventScroll:true});
    panel.inert=true;root.setAttribute('aria-busy','true');
    const fade=(from,to,duration)=>{
      tabAnimations=[panel,detail].map(el=>el.animate([{opacity:from},{opacity:to}],{duration,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'}));
      return Promise.all(tabAnimations.map(a=>a.finished.catch(()=>{})));
    };
    await fade(1,0,180);if(token!==tabTransition)return false;
    applyTab(n,focus);
    // The layout changes only while invisible; the glass receives fresh bounds.
    tabAnimations.forEach(a=>a.cancel());
    await fade(0,1,320);if(token!==tabTransition)return false;
    tabAnimations.forEach(a=>a.cancel());tabAnimations=[];panel.inert=false;root.removeAttribute('aria-busy');return true;
  }
  function open(n){
    cancelTabTransition();index=n;active=true;stopMedia();document.body.classList.add('section-open');root.dataset.scene=String(n);root.scrollTop=0;
    x=y=tx=ty=0;root.style.setProperty('--sx','0px');root.style.setProperty('--sy','0px');
    const d=definitions[n];$('modalTitle').textContent=d.title;$('modalDesc').textContent=d.description;
    $('sectionOptions').replaceChildren(...d.tabs.map((label,i)=>{const b=document.createElement('button');b.type='button';b.role='tab';b.textContent=label;b.addEventListener('click',()=>setTab(i));return b}));
    ['filmScene','webScene','telegramScene'].forEach((id,i)=>$(id).hidden=i!==n);
    if(n===0){
      video=tiles()[0].video;video.controls=true;video.muted=true;video.playsInline=true;video.setAttribute('aria-label','Showreel MAX BESHLI');$('sectionVideoSlot').append(video);
      video.onplay=()=>{$('filmStart').hidden=true};video.onpause=()=>{$('filmStart').hidden=false};
      $('filmStart').hidden=false;video.play().catch(()=>{$('filmStart').hidden=false});
    }
    if(n===1){const c=tiles()[1].screenMat.map.image;c.setAttribute('aria-label','Строительство дома в 3D');$('architectureSlot').append(c);window.MBWebStudio.open(tiles()[1].architectureDemo)}
    if(n===2){const c=tiles()[2].screenMat.map.image;c.setAttribute('aria-label','Мини-приложение AVTOLAB77');$('phoneSlot').append(c)}
    window.MBSectionScroll.open(n,applyTab);if(!window.MBSectionScroll.active)applyTab(0);last=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
  }
  function close(){
    window.MBSectionScroll.close();cancelTabTransition();active=false;cancelAnimationFrame(raf);stopMedia();document.body.classList.remove('section-open');
    window.MBFilmStudio.setView(-1);
    if(video){video.controls=false;video.onplay=video.onpause=null;video.remove()}
  }
  function tick(now){
    if(!active)return;raf=requestAnimationFrame(tick);
    const dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(document.hidden||contact.open||$('aboutDialog').open){stopMedia();return}
    const ease=1-Math.exp(-4*dt);x+=(tx-x)*ease;y+=(ty-y)*ease;
    root.style.setProperty('--sx',x.toFixed(3)+'px');root.style.setProperty('--sy',y.toFixed(3)+'px');
    const visible=window.MBSectionScroll.active?window.MBSectionScroll.update(now):true;
    if(!visible){stopMedia();wasMediaVisible=false;return}
    if(index===0){if(!wasMediaVisible)window.MBFilmStudio.resume();window.MBFilmStudio.update(now,dt);}
    wasMediaVisible=true;
    if(index===1)window.MBWebStudio.update(now);
    if(index===2)window.MBTelegramStudio.update(now,dt);
    if(index===2&&tab===0){
      const demo=tiles()[2].phoneDemo;demo.update(true,now);
      const time=demo.state.time,stage=time<7.2?0:time<14.2?1:2;
      document.querySelectorAll('.flow-step').forEach((el,i)=>el.classList.toggle('is-current',stage===i));
    }
  }
  root.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||reduced.matches||innerWidth<901)return;tx=(e.clientX/innerWidth-.5)*12;ty=(e.clientY/innerHeight-.5)*8});
  root.addEventListener('pointerleave',()=>{tx=ty=0});
  root.addEventListener('keydown',e=>{
    if(e.key==='Tab'){
      const all=[...root.querySelectorAll('button,a,input,select,textarea,video[controls]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
      const first=all[0],end=all.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus()}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus()}
    }
    const list=e.target.closest('[role="tablist"]');
    if(list&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
      e.preventDefault();const buttons=[...list.querySelectorAll('button')],old=buttons.indexOf(e.target);
      const n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(old+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
      buttons[n].click();buttons[n].focus();
    }
  });
  $('filmStart').addEventListener('click',()=>video?.play().catch(()=>{}));
  document.querySelectorAll('[data-film-time]').forEach(b=>b.addEventListener('click',async()=>{if(!video)return;if(window.MBSectionScroll.active&&tab!==0&&!await setTab(0))return;video.currentTime=Math.min(+b.dataset.filmTime,Number.isFinite(video.duration)?video.duration-.1:Infinity);video.play().catch(()=>{})}));
  function openContact(){
    if(contact.open)return;
    contactReturn=document.activeElement;resumeVideo=Boolean(active&&index===0&&video&&!video.paused);
    stopMedia();document.body.classList.add('contact-open');
    contact.classList.remove('is-closing');contact.showModal();contact.scrollTop=0;
  }
  let closingContact=false;
  function closeContact(){
    if(!contact.open||closingContact)return;closingContact=true;contact.classList.add('is-closing');
    setTimeout(()=>{contact.close();contact.classList.remove('is-closing');document.body.classList.remove('contact-open');closingContact=false;contactReturn?.focus({preventScroll:true});if(resumeVideo)window.MBFilmStudio.resume()},reduced.matches?0:350);
  }
  $('sectionContact').addEventListener('click',openContact);
  $('infoClose').addEventListener('click',closeContact);
  contact.addEventListener('click',e=>{if(!e.target.closest('.contact-panel'))closeContact()});
  contact.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();closeContact()});
  contact.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMedia();else if(active&&index===0&&!contact.open&&!$('aboutDialog').open)window.MBFilmStudio.resume()});
  window.MBSections={open,close,openContact,closeContact,selectTab:setTab,get state(){return {active,index,tab,webMode,contactOpen:contact.open}}};
})();
