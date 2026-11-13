/* Working website previews and controls for the existing architecture renderer. */
(()=>{
  const $=id=>document.getElementById(id),root=$('webScene'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let demo=null,view=-1,paused=reduced.matches,lastLabel=-1;
  root.querySelectorAll('[data-web-site]').forEach(site=>{
    site.append($('webSiteTemplate').content.cloneNode(true));
    site.dataset.page='0';
    site.querySelectorAll('[data-web-page]').forEach(button=>button.addEventListener('click',()=>{
      const n=button.dataset.webPage;if(site.dataset.page===n)return;site.dataset.page=n;
      site.querySelectorAll('[data-web-page-panel]').forEach(panel=>{
        panel.hidden=panel.dataset.webPagePanel!==n;
        if(!panel.hidden&&!reduced.matches)panel.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'cubic-bezier(.2,.6,.3,1)'});
      });
      site.querySelectorAll('nav [data-web-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.webPage===n)));
    }));
  });
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
  root.querySelectorAll('[data-web-contact]').forEach(b=>b.addEventListener('click',()=>window.MBSections.openContact()));
  reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;demo?.update(false);button()}});
  window.MBWebStudio={
    open(source){demo=source;view=0;paused=reduced.matches;demo.update(false);demo.seek(reduced.matches?18:0);button();sync()},
    setView(n){if(view!==n)demo?.update(false);view=n;sync()},
    suspend(){demo?.update(false)},
    update(now){if(view!==1||paused||document.hidden){demo?.update(false);return}demo?.update(true,now);sync()},
    get state(){return {view,paused,time:demo?.state.time??0}}
  };
})();
