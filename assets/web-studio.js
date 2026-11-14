/* The existing FORMA website is visible and playing immediately on entry. */
(()=>{
  const $=id=>document.getElementById(id),root=$('webScene'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let demo=null,view=-1,paused=reduced.matches,lastLabel=-1;
  $('webExplore').addEventListener('click',()=>window.MBSections.selectTab(1));
  root.querySelectorAll('[data-web-contact]').forEach(b=>b.addEventListener('click',()=>window.MBSections.openContact()));
  function button(){const b=$('webMotionPause');b.textContent=paused?'Продолжить':'Пауза';b.setAttribute('aria-label',paused?'Продолжить строительство':'Приостановить строительство')}
  function sync(){
    if(!demo)return;const t=demo.state.time;
    if(document.activeElement!==$('webMotionSeek'))$('webMotionSeek').value=String(Math.min(29.9,t));
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
    open(source){demo=source;view=0;paused=reduced.matches;demo.update(false);demo.seek(reduced.matches?18:0);button();sync()},
    setView(n){if(view!==n)demo?.update(false);view=n;sync()},
    suspend(){demo?.update(false)},
    update(now){
      const r=$('architectureSlot').getBoundingClientRect();
      if(paused||document.hidden||r.bottom<90||r.top>innerHeight){demo?.update(false);return}
      demo?.update(true,now);sync();
    },
    get state(){return {view,paused,time:demo?.state.time??0}}
  };
})();
