/* Editorial showcase: independent concepts, responsive presentation, one existing 3D renderer. */
(()=>{
  const $=id=>document.getElementById(id),root=$('webScene'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let demo=null,view=-1,paused=reduced.matches,lastLabel=-1,direction='space',mode='design',device='desktop',spacePage='exterior',detail=false;
  function heading(el,lines){el.replaceChildren(...lines.flatMap((text,i)=>i?[document.createElement('br'),document.createTextNode(text)]:[document.createTextNode(text)]))}
  function reveal(el){if(!reduced.matches)el.animate([{opacity:.35},{opacity:1}],{duration:450,easing:'ease-out'})}
  function caption(){
    $('webCaseCaption').textContent=direction==='space'?'FORMA — концепция архитектурного сайта':'ARC — концепция сайта предметного бренда';
    $('webCaseHint').textContent=mode==='3d'?'Управляйте строительством и светом с помощью ползунка.':direction==='space'?'Откройте интерьер или исследуйте 3D-сцену.':'Рассмотрите объект и его детали.';
  }
  function setMode(value){
    mode=value;root.dataset.mode=mode;
    $('webSpaceConcept').hidden=mode==='3d'||direction!=='space';$('webObjectConcept').hidden=mode==='3d'||direction!=='object';$('webMotion').hidden=mode!=='3d';
    $('webMode3D').setAttribute('aria-pressed',String(mode==='3d'));$('webMode3D').textContent=mode==='3d'?'Дизайн':'3D-сцена';
    if(mode==='3d'){setDevice('desktop',false);reveal($('webMotion'))}else demo?.update(false);
    caption();
  }
  function setDevice(value,reset=true){device=value;root.dataset.device=device;root.querySelectorAll('[data-web-device]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.webDevice===device)));if(reset&&mode==='3d')setMode('design')}
  function setDirection(value){
    direction=value;root.dataset.direction=direction;
    root.querySelectorAll('[data-web-direction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.webDirection===direction)));
    $('webMode3D').hidden=direction!=='space';setMode('design');reveal($(direction==='space'?'webSpaceConcept':'webObjectConcept'));
  }
  function setSpacePage(value){
    spacePage=value;$('webSpaceConcept').dataset.page=spacePage;
    const interior=spacePage==='interior';root.querySelector('.web-case-exterior').hidden=interior;root.querySelector('.web-case-interior').hidden=!interior;
    heading($('webSpaceTitle'),interior?['Свет. Тишина.','Дом.']:['Пространство','для жизни.']);
    $('webSpaceNext').firstChild.textContent=interior?'Вернуться к дому':'Открыть интерьер';
    root.querySelectorAll('[data-space-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.spacePage===spacePage)));
    reveal(root.querySelector(interior?'.web-case-interior':'.web-case-exterior'));
  }
  function setDetail(value){
    detail=value;$('webObjectConcept').dataset.detail=String(detail);$('webObjectDetail').setAttribute('aria-pressed',String(detail));
    heading($('webObjectTitle'),detail?['Чистая','геометрия.']:['Форма.','Свет.','Ничего лишнего.']);
    $('webObjectDetail').firstChild.textContent=detail?'Весь объект':'Рассмотреть детали';
  }
  root.querySelectorAll('[data-web-direction]').forEach(b=>b.addEventListener('click',()=>setDirection(b.dataset.webDirection)));
  root.querySelectorAll('[data-web-device]').forEach(b=>b.addEventListener('click',()=>setDevice(b.dataset.webDevice)));
  root.querySelectorAll('[data-space-page]').forEach(b=>b.addEventListener('click',()=>setSpacePage(b.dataset.spacePage)));
  $('webSpaceNext').addEventListener('click',()=>setSpacePage(spacePage==='exterior'?'interior':'exterior'));
  $('webObjectDetail').addEventListener('click',()=>setDetail(!detail));
  $('webMode3D').addEventListener('click',()=>setMode(mode==='3d'?'design':'3d'));
  $('webExplore').addEventListener('click',()=>window.MBSections.selectTab(1));
  root.querySelectorAll('[data-web-contact]').forEach(b=>b.addEventListener('click',()=>window.MBSections.openContact()));
  function button(){const b=$('webMotionPause');b.textContent=paused?'Продолжить':'Пауза';b.setAttribute('aria-label',paused?'Продолжить строительство':'Приостановить строительство')}
  function sync(){
    if(!demo)return;const t=demo.state.time;
    if(document.activeElement!==$('webMotionSeek'))$('webMotionSeek').value=String(Math.min(27.5,t));
    const stage=t<5?0:t<16?1:2;
    if(stage!==lastLabel){lastLabel=stage;$('webMotionStage').textContent=['От основания к форме','Архитектура приобретает объём','Свет меняет пространство'][stage];root.querySelectorAll('[data-web-seek]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===stage)))}
    $('webMotionSeek').setAttribute('aria-valuetext',`${Math.round(t)} из 30 секунд`);
  }
  function seek(t){if(!demo)return;paused=true;demo.update(false);demo.seek(t);button();sync()}
  $('webMotionSeek').addEventListener('input',e=>seek(+e.target.value));
  root.querySelectorAll('[data-web-seek]').forEach(b=>b.addEventListener('click',()=>seek(+b.dataset.webSeek)));
  $('webMotionPause').addEventListener('click',()=>{paused=!paused;if(paused)demo?.update(false);button()});
  $('webMotionRestart').addEventListener('click',()=>{if(!demo)return;demo.seek(0);paused=false;button();sync()});
  reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;demo?.update(false);button()}});
  window.MBWebStudio={
    open(source){demo=source;view=0;paused=reduced.matches;demo.update(false);demo.seek(reduced.matches?18:0);setDirection('space');setDevice('desktop');button();sync()},
    setView(n){if(view!==n)demo?.update(false);view=n;sync()},
    suspend(){demo?.update(false)},
    update(now){
      const r=$('architectureSlot').getBoundingClientRect();
      if(view!==1||mode!=='3d'||paused||document.hidden||r.bottom<90||r.top>innerHeight){demo?.update(false);return}
      demo?.update(true,now);sync();
    },
    get state(){return {view,paused,time:demo?.state.time??0,direction,mode,device,spacePage,detail}}
  };
})();
