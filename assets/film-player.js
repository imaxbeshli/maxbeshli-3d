/* Click-to-reveal controls and one animated viewer for showreel and future works. */
(()=>{
  const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const shooting=$('filmShooting'),slot=$('sectionVideoSlot'),controls=$('filmControls');
  const dialog=$('filmFullscreen'),stage=$('filmFullscreenStage'),message=$('filmPlayerMessage');
  const events=['play','pause','ended','timeupdate','durationchange','loadedmetadata','volumechange'];
  const icons={play:'m8 5 11 7-11 7Z',pause:'M8 5v14M16 5v14',muted:'M11 5 6 9H3v6h3l5 4Z M16 9l5 6m0-6-5 6',sound:'M11 5 6 9H3v6h3l5 4Z M16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14'};
  let main=null,media=null,work=null,home=null,float=null,returnFocus=null,animation=null,transition=0;
  let active=false,wasPlaying=false,resumeVisible=false,workRequest=0;
  // Supply each work's src, title and optional poster here when its video is ready.
  // Empty slots remain honest, non-interactive previews and load no media.
  const defaults=[
    {src:'',title:'Работа 01',poster:window.MB_SECTION_IMAGES['film-0']},
    {src:'',title:'Работа 02',poster:window.MB_SECTION_IMAGES['film-1']},
    {src:'',title:'Работа 03',poster:window.MB_SECTION_IMAGES['film-2']}
  ];
  let works=defaults;
  const format=value=>{const n=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`};
  function sync(){
    if(!media)return;
    $('filmPlay').setAttribute('aria-label',media.paused?'Воспроизвести':'Пауза');
    $('filmPlay').querySelector('path').setAttribute('d',media.paused?icons.play:icons.pause);
    $('filmMute').setAttribute('aria-label',media.muted?'Включить звук':'Выключить звук');
    $('filmMute').querySelector('path').setAttribute('d',media.muted?icons.muted:icons.sound);
    const duration=Number.isFinite(media.duration)?media.duration:0;
    $('filmSeek').disabled=!duration;
    $('filmSeek').value=duration?String(media.currentTime/duration*100):'0';
    $('filmSeek').setAttribute('aria-valuetext',`${format(media.currentTime)} из ${format(duration)}`);
    $('filmTime').textContent=`${format(media.currentTime)} / ${format(duration)}`;
    $('filmStart').hidden=!media.paused||!!work;
  }
  function bind(next){
    if(media)events.forEach(event=>media.removeEventListener(event,sync));
    media=next;if(media){media.controls=false;events.forEach(event=>media.addEventListener(event,sync));sync()}
  }
  function hideControls(){controls.hidden=true;$('filmReveal').hidden=false;$('filmReveal').setAttribute('aria-expanded','false')}
  function reveal(){if(!active)return;controls.hidden=false;$('filmReveal').hidden=true;$('filmReveal').setAttribute('aria-expanded','true');sync()}
  function play(){return media?.play().catch(()=>{})}
  function expandedLabel(value){$('filmExpand').setAttribute('aria-label',value?'Свернуть видео':'На весь экран');$('filmExpand').setAttribute('aria-expanded',String(value))}
  function transformFor(rect){const bounds=stage.getBoundingClientRect();return `translate(${rect.left-bounds.left}px,${rect.top-bounds.top}px) scale(${rect.width/bounds.width},${rect.height/bounds.height})`}
  function move(from,to,closing){
    animation?.cancel();
    animation=shooting.animate([{transform:from,borderRadius:closing?'0px':'8px'},{transform:to,borderRadius:closing?'8px':'0px'}],{duration:reduced.matches?0:520,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    return animation.finished.catch(()=>{});
  }
  async function expand(origin=$('filmExpand')){
    if(!active||!main||dialog.open)return;
    const rect=(origin.matches('[data-film-work]')?origin:shooting).getBoundingClientRect();
    home=shooting.parentElement;float=home.closest('.section-float');float?.classList.add('is-player-expanded');returnFocus=origin;
    dialog.classList.remove('is-closing');dialog.showModal();stage.append(shooting);reveal();expandedLabel(true);
    const token=++transition;
    await move(transformFor(rect),'none',false);
    if(token!==transition)return;
    animation?.cancel();animation=null;
  }
  function restoreWork(){
    workRequest++;
    if(!work)return;
    work.pause();work.removeAttribute('src');work.load();work.remove();work=null;
    main.style.removeProperty('display');bind(main);
    if(wasPlaying&&active&&!document.hidden)play();
    message.hidden=true;
  }
  function finishCollapse(focus){
    animation?.cancel();animation=null;
    if(home)home.append(shooting);
    float?.classList.remove('is-player-expanded');
    if(dialog.open)dialog.close();dialog.classList.remove('is-closing');
    restoreWork();expandedLabel(false);
    if(focus&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
    home=float=returnFocus=null;
  }
  async function collapse(immediate=false,focus=true){
    if(!dialog.open)return;
    const token=++transition;
    if(immediate){finishCollapse(focus);return}
    const from=getComputedStyle(shooting).transform;
    dialog.classList.add('is-closing');
    await move(from==='none'?'none':from,transformFor(home.getBoundingClientRect()),true);
    if(token===transition)finishCollapse(focus);
  }
  async function openWork(index,button){
    const item=works[index];if(!active||!item?.src||dialog.open)return;
    wasPlaying=!main.paused;main.pause();main.style.display='none';
    work=document.createElement('video');work.playsInline=true;work.preload='metadata';work.poster=item.poster||'';work.src=item.src;work.setAttribute('aria-label',item.title);
    slot.append(work);bind(work);dialog.setAttribute('aria-label',item.title);message.hidden=true;
    const token=++workRequest;
    work.addEventListener('error',()=>{if(token!==workRequest)return;message.textContent='Не удалось загрузить видео. Попробуйте открыть его ещё раз.';message.hidden=false});
    expand(button);
    try{await work.play()}catch(e){if(token===workRequest)sync()}
  }
  function setWorks(items){
    works=defaults.map((item,i)=>({...item,...items?.[i]}));
    document.querySelectorAll('[data-film-work]').forEach((button,i)=>{
      const item=works[i],ready=!!item.src;button.disabled=!ready;
      button.setAttribute('aria-label',ready?`Смотреть: ${item.title}`:`${item.title} — скоро`);
      button.querySelector('img').src=item.poster||defaults[i].poster;
      button.querySelector('img').removeAttribute('data-section-image');
      button.querySelector('b').textContent=item.title;
      button.querySelector('small').textContent=ready?'Смотреть':'Скоро';
    });
  }
  function setActive(value){active=value;if(!value){collapse(true,false);hideControls()}}
  function open(video){close();main=video;active=true;bind(video);hideControls();dialog.setAttribute('aria-label','Полноэкранный просмотр видео')}
  function close(){active=false;collapse(true,false);bind(null);main=null;hideControls()}
  $('filmReveal').addEventListener('click',reveal);
  $('filmPlay').addEventListener('click',()=>{if(!media)return;media.paused?play():media.pause()});
  $('filmMute').addEventListener('click',()=>{if(media){media.muted=!media.muted;sync()}});
  $('filmSeek').addEventListener('input',()=>{if(media&&Number.isFinite(media.duration))media.currentTime=Number($('filmSeek').value)/100*media.duration;sync()});
  $('filmExpand').addEventListener('click',()=>dialog.open?collapse():expand());
  $('filmFullscreenClose').addEventListener('click',()=>collapse());
  dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();collapse()});
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  shooting.addEventListener('keydown',e=>{
    if(e.target.matches('button,input')||!media)return;
    if(e.key===' '||e.key==='k'){e.preventDefault();media.paused?play():media.pause()}
  });
  document.querySelectorAll('[data-film-work]').forEach((button,i)=>button.addEventListener('click',()=>openWork(i,button)));
  document.addEventListener('visibilitychange',()=>{
    if(!work)return;
    if(document.hidden){resumeVisible=!work.paused;work.pause()}
    else if(resumeVisible&&dialog.open)play();
  });
  window.addEventListener('resize',()=>animation?.finish());
  reduced.addEventListener('change',()=>animation?.finish());
  setWorks(window.MB_FILM_WORKS||defaults);
  window.MBFilmPlayer={open,close,setActive,reveal,play,setWorks,get workOpen(){return !!work},get expanded(){return dialog.open}};
})();
